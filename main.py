"""
main.py
Okul Öncesi - Minik Eller Atölyesi ile Çizim
=========================================
Ana uygulama döngüsü.

Kontroller:
  El Jesti:
    ☝️  İşaret parmağı        → Çiz
    ✌️  İki parmak             → Silgi
    🖐️  Açık el               → Temizle
    🤙  Baş + serçe parmak    → Kaydet
    👊  Yumruk                → Sonraki renk

  Klavye:
    D → Çizim modu
    E → Silgi modu
    C → Canvas'ı temizle
    S → Kaydet
    N → Sonraki renk
    P → Önceki renk
    + → Fırça büyüt
    - → Fırça küçült
    Q / ESC → Çıkış
"""

import cv2
import numpy as np
import time
import os

from hand_detector import HandDetector
from canvas import DrawingCanvas
from ui import DrawingUI
from gesture_icons import draw_active_gesture_display
from menu import MainMenu
from game import BalloonGame
from ui_engine import PointerParticleSystem, draw_neon_text, draw_login_screen, draw_glass_panel
from face_detector import FaceDetector
from emotion_game import EmotionGame


# -----------------------------------------------------------------------


# -----------------------------------------------------------------------
# Ayarlar
# -----------------------------------------------------------------------

CAMERA_INDEX = 0        # Kamera ID (0: varsayılan)
WIN_WIDTH  = 1280
WIN_HEIGHT = 720
WINDOW_TITLE = "Minik Eller Atolyesi | Q=Cikis"

# Mesaj gösterim süresi (saniye)
MSG_DURATION = 2.0

# -----------------------------------------------------------------------
# Yardımcı: Ekran mesajı
# -----------------------------------------------------------------------

def draw_message(frame, text, color=(0, 255, 180)):
    """Ekran ortasında geçici bilgi mesajı gösterir."""
    h, w = frame.shape[:2]
    size, _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 2)
    x = (w - size[0]) // 2
    y = h // 2
    # Arkaplan
    cv2.rectangle(frame, (x - 16, y - size[1] - 10),
                  (x + size[0] + 16, y + 10), (20, 20, 20), -1)
    cv2.putText(frame, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX,
                1.0, color, 2, cv2.LINE_AA)


# -----------------------------------------------------------------------
# Ana döngü
# -----------------------------------------------------------------------

def main():
    # Windows'ta MSMF çökme hatalarını (-1072875772) önlemek için DirectShow (DSHOW) kullanıyoruz
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print("[HATA] Kamera açılamadı! Kamera bağlı mı?")
        return

    # Bazı Windows kameralarında `cap.set()` MSMF backend'ini çökerttiği için
    # kameranın doğal çözünürlüğünde bırakıyoruz. 
    # Sonrasında `main` döngüsü içinde görüntüyü ekran UI için 1280x720'ye büyüteceğiz.

    # UI tasarımı 1280x720'ye göre yapıldı, bunu sabitliyoruz.
    w = 1280
    h = 720

    detector = HandDetector(max_hands=2)
    
    # Uygulama Durumları ve Sınıfları
    current_state = 'login'
    
    canvas   = DrawingCanvas(w, h)
    ui       = DrawingUI(w, h)
    menu     = MainMenu(w, h)
    game     = None 
    magic_vfx = PointerParticleSystem(max_particles=150)
    face_detector = FaceDetector()  # Yüz tanıma modülü

    # Durum değişkenleri (Çizim Modu)
    msg_text   = ""
    msg_expire = 0.0
    last_color_gesture_time = 0.0   
    COLOR_CHANGE_COOLDOWN = 1.2     
    last_magic_toggle_time = 0.0
    smile_progress = 0.0  # Gülümseme doluluk oranı (0.0 - 1.0)

    # İkonları yükle (Küçük yardımcı ikonlar)
    icon_home = cv2.imread('icon_home.png')
    if icon_home is not None: icon_home = cv2.resize(icon_home, (50, 50))
    
    cv2.namedWindow(WINDOW_TITLE, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(WINDOW_TITLE, w, h)

    print("=" * 50)
    print("  Minik Eller Atölyesi - El Hareketi ile Çizim")
    print("=" * 50)
    print("  Q veya ESC -> Cikis")
    print("  S          -> Kaydet")
    print("  C          -> Temizle")
    print("  D/E        -> Cizim / Silgi")
    print("  N/P        -> Sonraki / Onceki renk")
    print("  + / -      -> Firca buyut / kucult")
    print("=" * 50)

    while True:
        now = time.time()
        ret, frame = cap.read()
        if not ret:
            print("[UYARI] Kameradan görüntü alınamadı.")
            break

        # Aynalama (daha doğal hissettirmek için)
        frame = cv2.flip(frame, 1)  # Ayna görüntüsü
        frame = cv2.resize(frame, (w, h)) # Kameradan ne gelirse gelsin UI için 1280x720 yap

        # --- Yüz Tanıma ve Karşılama (Face Greeting) ---
        if current_state != 'login' and face_detector.is_face_present(frame):
            # Ekranın en üstünde neon karşılama mesajı (Sadece menü ve çizimdeyken)
            welcome_msg = "HOS GELDIN KUCUK RESSAM! "
            draw_neon_text(frame, welcome_msg, 450, 40, cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 100, 255), 2)

        # --- El Algılama / Pose Algılama ---
        if current_state == 'pose_game':
            if 'pose_detector' not in locals():
                from pose_detector import PoseDetector
                pose_detector = PoseDetector()
            pose_detector.find_pose(frame, draw=True)
            nose_pos = pose_detector.get_nose()
            stable_gesture = 'none'
            all_hands = []
            index_tips = []
        else:
            hand_found = detector.find_hands(frame, draw=True)

            # --- Jest Belirleme ---
            # Geriye dönük uyumluluk (Kontrol arayüzü için 1. eli kullan)
            stable_gesture = detector.get_stable_gesture() 
            
            all_hands = detector.get_all_hands()
            if not all_hands:
                all_hands = []
                
            index_tips = [h['index_tip'] for h in all_hands if h['index_tip']]

        # --- STATE MACHINE (DURUM YÖNETİMİ) ---

        if current_state == 'login':
            face_data = face_detector.get_face_data(frame)
            smile_score = face_data['smile']
            
            # Gülümseme eşiği üzerindeyse barı doldur, değilse boşalt
            if smile_score > 0.40:
                smile_progress += 0.04 # Dolma hızı
            else:
                smile_progress -= 0.02 # Boşalma hızı (daha yavaş)
                
            smile_progress = max(0.0, min(1.0, smile_progress))
            
            should_enter = draw_login_screen(frame, face_data, smile_progress, now)
            
            if should_enter:
                current_state = 'menu'
                time.sleep(0.8) # Başarı hissi için biraz bekle
                smile_progress = 0.0 # Sıfırla

        elif current_state == 'menu':
            # Menü Ekranı İşlemleri
            selected = menu.draw_menu(frame, index_tips)
            
            if selected == 'draw':
                current_state = 'draw'
                canvas.clear()
            elif selected == 'template':
                current_state = 'template'
                if 'template_mgr' not in locals():
                    from templates import DrawingTemplates
                    template_mgr = DrawingTemplates(w, h)
                canvas.clear()
            elif selected == 'game':
                current_state = 'game'
                game = BalloonGame(w, h) # Yeni oyun baslat
            elif selected == 'pose_game':
                current_state = 'pose_game'
                from pose_game import PoseAppleGame
                pose_game_inst = PoseAppleGame(w, h)
            elif selected == 'emotion_game':
                current_state = 'emotion_game'
                emotion_game_inst = EmotionGame(w, h)
            elif selected == 'quit':
                running = False

        elif current_state == 'game':
            # Oyun Ekranı İşlemleri
            if game:
                # Ekrana cizdir ve frame'i guncelle
                frame = game.draw_game(frame, index_tips)
            
            # --- LOGO VE BASLIK (Üst Orta) ---
            lx, ly = w // 2 - 180, 35
            cv2.circle(frame, (lx, ly), 10, (255, 255, 255), -1, cv2.LINE_AA)
            finger_colors = [(0,0,255), (0,255,255), (0,255,0), (255,0,0), (255,0,255)]
            for i, color in enumerate(finger_colors):
                angle = -160 + i * 40
                rad = np.deg2rad(angle)
                fx, fy = int(lx + np.cos(rad) * 18), int(ly + np.sin(rad) * 18)
                cv2.line(frame, (lx, ly), (fx, fy), color, 4, cv2.LINE_AA)
            draw_neon_text(frame, "MINIK ELLER ATOLYESI", w // 2 - 155, 45, cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 100, 255), 1)
            
            # Geri donus butonu (Ev ikonu)
            if 'icon_home' in locals() and icon_home is not None:
                bx, by = w - 80, 20
                draw_glass_panel(frame, bx-5, by-5, 60, 60, 10, color=(100, 100, 255), alpha=0.3)
                frame[by:by+50, bx:bx+50] = cv2.max(frame[by:by+50, bx:bx+50], icon_home)
            
            for tip in index_tips:
                tx, ty = tip
                if w - 80 <= tx <= w - 20 and 20 <= ty <= 80:
                    current_state = 'menu'
                    time.sleep(0.5)
                    break

        elif current_state == 'pose_game':
            if 'pose_game_inst' in locals() and pose_game_inst:
                frame = pose_game_inst.draw_game(frame, nose_pos)
            
            # --- LOGO VE BASLIK (Üst Orta) ---
            lx, ly = w // 2 - 180, 35
            cv2.circle(frame, (lx, ly), 10, (255, 255, 255), -1, cv2.LINE_AA)
            finger_colors = [(0,0,255), (0,255,255), (0,255,0), (255,0,0), (255,0,255)]
            for i, color in enumerate(finger_colors):
                angle = -160 + i * 40
                rad = np.deg2rad(angle)
                fx, fy = int(lx + np.cos(rad) * 18), int(ly + np.sin(rad) * 18)
                cv2.line(frame, (lx, ly), (fx, fy), color, 4, cv2.LINE_AA)
            draw_neon_text(frame, "MINIK ELLER ATOLYESI", w // 2 - 155, 45, cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 100, 255), 1)

            # Geri donus butonu (Ev ikonu)
            if 'icon_home' in locals() and icon_home is not None:
                bx, by = w - 80, 20
                draw_glass_panel(frame, bx-5, by-5, 60, 60, 10, color=(100, 100, 255), alpha=0.3)
                frame[by:by+50, bx:bx+50] = cv2.max(frame[by:by+50, bx:bx+50], icon_home)

            for tip in index_tips:
                tx, ty = tip
                if w - 80 <= tx <= w - 20 and 20 <= ty <= 80:
                    current_state = 'menu'
                    time.sleep(0.5)
                    break

        elif current_state == 'emotion_game':
            if 'emotion_game_inst' in locals():
                # Yüz verilerini al ve oyuna aktar
                face_data = face_detector.get_face_data(frame)
                emotion_game_inst.update(face_data)
                frame = emotion_game_inst.draw(frame, face_data)
                
            # Geri donus butonu (Ev ikonu)
            if 'icon_home' in locals() and icon_home is not None:
                bx, by = w - 80, 20
                draw_glass_panel(frame, bx-5, by-5, 60, 60, 10, color=(100, 100, 255), alpha=0.3)
                frame[by:by+50, bx:bx+50] = cv2.max(frame[by:by+50, bx:bx+50], icon_home)

            # Geri donus butonu kontrolü
            for tip in index_tips:
                tx, ty = tip
                if w - 80 <= tx <= w - 20 and 20 <= ty <= 80:
                    current_state = 'menu'
                    time.sleep(0.5)
                    break

        elif current_state in ['draw', 'template']:
            # Geri donus butonu (Ev ikonu)
            if 'icon_home' in locals() and icon_home is not None:
                bx, by = w - 80, 20
                draw_glass_panel(frame, bx-5, by-5, 60, 60, 10, color=(100, 100, 255), alpha=0.3)
                frame[by:by+50, bx:bx+50] = cv2.max(frame[by:by+50, bx:bx+50], icon_home)

            # --- Navigasyon Kontrolleri (Ikonlarla) ---
            for tip in index_tips:
                tx, ty = tip
                # Menuye don (Ev ikonu)
                if w - 80 <= tx <= w - 20 and 20 <= ty <= 80:
                    current_state = 'menu'
                    time.sleep(0.5); break
                
                # Renk Ileri/Geri (Ok ikonları)
                if 25 <= ty <= 65:
                    if 10 <= tx <= 50: # Geri Oku
                        ui.prev_color()
                        time.sleep(0.3); break
                    if 630 <= tx <= 670: # Ileri Oku
                        ui.next_color()
                        time.sleep(0.3); break

            # --- Araç/Renk Seçimi (El Jesti ile) ---
            if stable_gesture == 'erase' and ui.active_tool != 'erase':
                ui.set_tool('erase')
                canvas.reset_stroke()
                msg_text, msg_expire = "SILGI MODU", now + MSG_DURATION

            elif stable_gesture == 'clear':
                canvas.clear()
                ui.set_tool('draw')
                msg_text, msg_expire = "TEMIZLENDI!", now + MSG_DURATION

            elif stable_gesture == 'save':
                path = canvas.save(save_dir=os.path.join(
                    os.path.dirname(__file__), "saved_drawings"))
                ui.set_tool('draw')
                msg_text = f"KAYDEDILDI: {os.path.basename(path)}"
                msg_expire = now + MSG_DURATION * 2

            elif stable_gesture == 'star' and ui.active_tool != 'star':
                ui.set_tool('star')
                canvas.reset_stroke()
                msg_text, msg_expire = "YILDIZ ARACI", now + MSG_DURATION

            elif stable_gesture == 'triangle' and ui.active_tool != 'triangle':
                ui.set_tool('triangle')
                canvas.reset_stroke()
                msg_text, msg_expire = "UCGEN ARACI", now + MSG_DURATION

            elif stable_gesture == 'color':
                if now - last_color_gesture_time > COLOR_CHANGE_COOLDOWN:
                    ui.next_color()
                    canvas.set_color(ui.get_active_color())
                    last_color_gesture_time = now
                    msg_text = f"RENK: {['Kirmizi','Turuncu','Sari','Yesil','Mavi','Mor','Siyah','Beyaz'][ui.active_color_idx]}"
                    msg_expire = now + MSG_DURATION

            elif len(all_hands) > 0 and all_hands[0]['raw_gesture'] == 'draw':
                ui.set_tool('draw')

            # --- İşaret Parmağı ile Renk/Araç Hover Seçimi ---
            for h_dict in all_hands:
                if h_dict['raw_gesture'] == 'draw' and h_dict['index_tip'] is not None:
                    # Renk dairesi üzerindeyse seç
                    if ui.check_color_hover(h_dict['index_tip']):
                        canvas.set_color(ui.get_active_color())
                    # Araç kutusu üzerindeyse seç
                    selected_tool = ui.check_tool_hover(h_dict['index_tip'])
                    if selected_tool:
                        if selected_tool == 'clear':
                            canvas.clear()
                            msg_text, msg_expire = "TEMIZLENDI!", now + MSG_DURATION
                        elif selected_tool == 'save':
                            path = canvas.save(save_dir=os.path.join(
                                os.path.dirname(__file__), "saved_drawings"))
                            msg_text = f"KAYDEDILDI: {os.path.basename(path)}"
                            msg_expire = now + MSG_DURATION * 2
                        else:
                            ui.set_tool(selected_tool)
                            canvas.reset_stroke() # Tüm çizgileri kes

                    # Sihirli Mod (Rainbow) Hover
                    if ui.check_magic_hover(h_dict['index_tip']):
                        if now - last_magic_toggle_time > 1.0:
                            canvas.toggle_magic_mode()
                            ui.magic_active = canvas.magic_mode
                            last_magic_toggle_time = now
                            msg_text = "SIHIRLI MOD: " + ("ACIK" if canvas.magic_mode else "KAPALI")
                            msg_expire = now + MSG_DURATION

            # --- Çizim / Silgi / Damga Uygulama ---
            menu_btn_pressed = False
            next_btn_pressed = False
            
            for hand_idx, h_dict in enumerate(all_hands):
                r_gest = h_dict['raw_gesture']
                tip = h_dict['index_tip']
                
                if r_gest == 'draw' and tip:
                    # Araç çubuğu veya palet bölgesinde değilse işlem yap
                    tip_x, tip_y = tip
                    in_toolbar = tip_x < 140 and tip_y > 90
                    in_palette = tip_y < 90
                    
                    in_menu_btn = (w - 180 <= tip_x <= w - 20) and (20 <= tip_y <= 70)
                    in_next_btn = current_state == 'template' and (20 <= tip_x <= 270) and (200 <= tip_y <= 270)
                    
                    if in_menu_btn:
                        menu_btn_pressed = True
                    elif in_next_btn:
                        next_btn_pressed = True
                    elif not in_toolbar and not in_palette:
                        canvas.set_color(ui.get_active_color())
                        canvas.set_brush_size(ui.brush_size)
                        
                        # Add VFX particles
                        p_color = canvas._get_magic_color() if canvas.magic_mode else ui.get_active_color()
                        magic_vfx.add_particle(tip_x, tip_y, p_color)

                        if ui.active_tool == 'draw':
                            if current_state == 'template':
                                fill_mask = template_mgr.get_fill_mask(template_mgr.active_template)
                                canvas.fill(tip, fill_mask)
                            else:
                                canvas.draw(tip, hand_idx)
                        elif ui.active_tool == 'star':
                            canvas.stamp(tip, 'star', hand_idx)
                        elif ui.active_tool == 'triangle':
                            canvas.stamp(tip, 'triangle', hand_idx)
                        elif ui.active_tool == 'erase':
                            canvas.erase(tip)
                    else:
                        canvas.reset_stroke(hand_idx)
                elif r_gest == 'erase' and tip:
                    canvas.erase(tip)
                    canvas.reset_stroke(hand_idx)
                else:
                    canvas.reset_stroke(hand_idx)

            # Sola "Menu" Butonu ekle
            cv2.rectangle(frame, (w - 180, 20), (w - 20, 70), (200, 100, 50), -1)
            cv2.putText(frame, "MENU [M]", (w - 165, 55), cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)

            if current_state == 'template':
                bx, by, bw, bh = 20, 200, 250, 70
                cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), (50, 150, 250), -1)
                cv2.putText(frame, "SONRAKI SABLON", (bx + 15, by + 45), cv2.FONT_HERSHEY_DUPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)

            if menu_btn_pressed:
                current_state = 'menu'
                time.sleep(0.5)
            elif next_btn_pressed:
                idx = template_mgr.template_names.index(template_mgr.active_template)
                idx = (idx + 1) % len(template_mgr.template_names)
                template_mgr.active_template = template_mgr.template_names[idx]
                canvas.clear()
                time.sleep(0.5)

            # --- Görüntü Birleştirme ---
            if current_state == 'template':
                if 'template_mgr' not in locals():
                    from templates import DrawingTemplates
                    template_mgr = DrawingTemplates(w, h)
                frame = template_mgr.draw_template(frame, template_mgr.active_template)

            frame = canvas.overlay(frame)
            
            # --- VFX Ekle ---
            magic_vfx.update_and_draw(frame)

            # --- UI Çiz ---
            ui.brush_size = canvas.brush_size
            ui.draw_ui(frame)

            # --- Sağ Alt: Aktif Jest Göstergesi ---
            raw_gest_0 = all_hands[0]['raw_gesture'] if all_hands else 'none'
            gesture_to_show = raw_gest_0 if raw_gest_0 != 'none' else stable_gesture
            if gesture_to_show and gesture_to_show != 'none':
                draw_active_gesture_display(frame, gesture_to_show,
                                            w - 180, h - 130, size=80) # Sola kaydirildi

            # --- Ekran Mesajı ---
            if msg_text and now < msg_expire:
                draw_message(frame, msg_text)

            # --- 2026 Holografik Pointer ---
            if current_state in ['draw', 'template']:
                for tip in index_tips:
                    cx, cy = tip
                    spin_angle = int((now * 120) % 360)
                    # Dış dönen cyberpunk nişangah
                    cv2.ellipse(frame, (cx, cy), (18, 18), spin_angle, 0, 90, (255, 50, 150), 2, cv2.LINE_AA)
                    cv2.ellipse(frame, (cx, cy), (18, 18), spin_angle + 180, 0, 90, (0, 255, 255), 2, cv2.LINE_AA)
                    # Merkez çekirdek
                    cv2.circle(frame, (cx, cy), 3, (255, 255, 255), -1, cv2.LINE_AA)

        # --- FPS Göstergesi ---
        fps = cap.get(cv2.CAP_PROP_FPS)
        cv2.putText(frame, f"FPS: {int(fps)}", (w - 90, 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 100, 100), 1)

        cv2.imshow(WINDOW_TITLE, frame)

        # --- Klavye Kısayolları ---
        key = cv2.waitKey(1) & 0xFF

        if key in (ord('q'), ord('Q'), 27):   # Q veya ESC
            print("Çıkılıyor...")
            break
        elif key in (ord('m'), ord('M')):
            current_state = 'menu'
        elif current_state in ['draw', 'template']:
            if key in (ord('l'), ord('L')) and current_state == 'template':
                idx = template_mgr.template_names.index(template_mgr.active_template)
                idx = (idx + 1) % len(template_mgr.template_names)
                template_mgr.active_template = template_mgr.template_names[idx]
                canvas.clear()
            elif key in (ord('d'), ord('D')):
                ui.set_tool('draw')
                canvas.reset_stroke()
            elif key in (ord('e'), ord('E')):
                ui.set_tool('erase')
                canvas.reset_stroke()
                msg_text, msg_expire = "SILGI MODU", time.time() + MSG_DURATION
            elif key in (ord('c'), ord('C')):
                canvas.clear()
                msg_text, msg_expire = "TEMIZLENDI!", time.time() + MSG_DURATION
            elif key in (ord('s'), ord('S')):
                path = canvas.save(save_dir=os.path.join(
                    os.path.dirname(__file__), "saved_drawings"))
                msg_text = f"KAYDEDILDI: {os.path.basename(path)}"
                msg_expire = time.time() + MSG_DURATION * 2
            elif key in (ord('y'), ord('Y')):
                ui.set_tool('star')
                canvas.reset_stroke()
                msg_text, msg_expire = "YILDIZ ARACI", time.time() + MSG_DURATION
            elif key in (ord('t'), ord('T')):
                ui.set_tool('triangle')
                canvas.reset_stroke()
                msg_text, msg_expire = "UCGEN ARACI", time.time() + MSG_DURATION
            elif key in (ord('n'), ord('N')):
                ui.next_color()
                canvas.set_color(ui.get_active_color())
            elif key in (ord('p'), ord('P')):
                ui.prev_color()
                canvas.set_color(ui.get_active_color())
            elif key == ord('+') or key == ord('='):
                ui.increase_brush()
                canvas.set_brush_size(ui.brush_size)
            elif key == ord('-') or key == ord('_'):
                ui.decrease_brush()
                canvas.set_brush_size(ui.brush_size)

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
