import cv2
import numpy as np
import time
import os
from ui_engine import draw_glass_panel, draw_neon_text, draw_glowing_rect, ParticleSystem

class MainMenu:
    def __init__(self, width, height):
        self.w = width
        self.h = height
        self.particles = ParticleSystem(width, height, 80)
        
        self.btn_w, self.btn_h = 280, 220
        self.gap_x, self.gap_y = 60, 30
        self.total_w = (self.btn_w * 2) + self.gap_x
        self.total_h = (self.btn_h * 3) + (self.gap_y * 2)
        self.start_x = (self.w - self.total_w) // 2
        self.start_y = (self.h - self.total_h) // 2 + 60
        
        # İkonları yükle
        self.icons = {}
        icon_files = {
            'draw': 'icon_brush.png',
            'template': 'icon_bear.png',
            'game': 'icon_balloon.png',
            'pose_game': 'icon_apple.png',
            'emotion_game': 'icon_smiley.png'
        }
        
        for key, fname in icon_files.items():
            if os.path.exists(fname):
                img = cv2.imread(fname)
                if img is not None:
                    self.icons[key] = cv2.resize(img, (160, 160)) # Boyutu biraz küçülttük (Güvenli alan)
            else:
                self.icons[key] = None

        self.buttons = {
            'draw': {'row': 0, 'col': 0, 'color': (70, 200, 255), 'hover_anim': 0.0, 'progress': 0.0},
            'template': {'row': 0, 'col': 1, 'color': (255, 180, 50), 'hover_anim': 0.0, 'progress': 0.0},
            'game': {'row': 1, 'col': 0, 'color': (255, 120, 100), 'hover_anim': 0.0, 'progress': 0.0},
            'pose_game': {'row': 1, 'col': 1, 'color': (100, 255, 100), 'hover_anim': 0.0, 'progress': 0.0},
            'emotion_game': {
                'row': 2, 'col': 0,
                'color': (255, 255, 100),
                'text': 'DUYGU AYNASI',
                'icon_type': 'smiley',
                'hover_anim': 0.0,
                'progress': 0.0
            },
            'quit': {
                'row': 2, 'col': 1,
                'color': (50, 50, 255), # Kırmızımsı (BGR)
                'text': 'KAPAT',
                'icon_type': 'power',
                'hover_anim': 0.0,
                'progress': 0.0
            }
        }
        self.last_time = time.time()

    def draw_menu(self, frame, cursor_poses):
        now = time.time()
        dt = now - self.last_time
        if dt > 0.5: dt = 0.05
        self.last_time = now

        blurred_bg = cv2.GaussianBlur(frame, (99, 99), 0)
        black_overlay = np.zeros_like(frame)
        frame[:] = cv2.addWeighted(blurred_bg, 0.4, black_overlay, 0.6, 0)
        self.particles.update_and_draw(frame)

        # --- LOGO VE BASLIK ---
        lx, ly = self.w // 2 - 250, 60
        cv2.circle(frame, (lx, ly), 20, (255, 255, 255), -1, cv2.LINE_AA)
        finger_colors = [(0,0,255), (0,255,255), (0,255,0), (255,0,0), (255,0,255)]
        for i, color in enumerate(finger_colors):
            angle = -160 + i * 40
            rad = np.deg2rad(angle)
            fx, fy = int(lx + np.cos(rad) * 35), int(ly + np.sin(rad) * 35)
            cv2.line(frame, (lx, ly), (fx, fy), color, 8, cv2.LINE_AA)
            
        draw_neon_text(frame, "MINIK ELLER ATOLYESI", self.w // 2 - 200, 80, cv2.FONT_HERSHEY_DUPLEX, 1.4, (255, 100, 200), thickness_base=3)

        selected_btn = None
        
        for key, info in self.buttons.items():
            bx = self.start_x + info['col'] * (self.btn_w + self.gap_x)
            by = self.start_y + info['row'] * (self.btn_h + self.gap_y)
            bw, bh = self.btn_w, self.btn_h
            
            is_hovered = False
            for p in cursor_poses:
                if bx <= p[0] <= bx + bw and by <= p[1] <= by + bh:
                    is_hovered = True; break

            if is_hovered:
                info['hover_anim'] = min(1.0, info['hover_anim'] + dt * 8.0)
                info['progress'] += dt
                if info['progress'] > 1.2: selected_btn = key
            else:
                info['hover_anim'] = max(0.0, info['hover_anim'] - dt * 5.0)
                info['progress'] = max(0.0, info['progress'] - dt * 2.0)

            anim = info['hover_anim']
            cbx, cby, cbw, cbh = bx - int(anim*15), by - int(anim*15), bw + int(anim*30), bh + int(anim*30)

            draw_glass_panel(frame, cbx, cby, cbw, cbh, r=30, color=info['color'], alpha=0.1 + anim*0.1)
            
            # --- İKONU ÇİZ ---
            icon = self.icons.get(key)
            if icon is not None:
                # İkonu merkeze yerleştir
                ix, iy = cbx + (cbw - 200)//2, cby + (cbh - 200)//2
                roi = frame[iy:iy+200, ix:ix+200]
                icon_colored = cv2.addWeighted(icon, 1.0, np.zeros_like(icon), 0, 0)
                frame[iy:iy+200, ix:ix+200] = cv2.max(roi, icon_colored)
            elif key == 'quit':
                # Eğer ikon yoksa (Kapat için) elden çiz
                isize = 100
                cx, cy = cbx + cbw // 2, cby + cbh // 2
                cv2.circle(frame, (cx, cy), 40, info['color'], 5, cv2.LINE_AA)
                cv2.line(frame, (cx, cy-40), (cx, cy), info['color'], 8, cv2.LINE_AA)

            # İlerleme Çubuğu
            if info['progress'] > 0:
                bar_ratio = min(1.0, info['progress'] / 1.2)
                cv2.rectangle(frame, (cbx + 20, cby + cbh - 12), (cbx + 20 + int((cbw-40)*bar_ratio), cby + cbh - 5), info['color'], -1)
                
        for p in cursor_poses:
            draw_neon_text(frame, "+", p[0]-15, p[1]+15, cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 255), thickness_base=2)

        return selected_btn
