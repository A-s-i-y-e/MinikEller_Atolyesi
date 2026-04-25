"""
emotion_game.py
Duygu Aynası Oyunu - Rengarenk Emojilerle eğitici duygu oyunu.
"""

import cv2
import time
import numpy as np
from ui_engine import draw_neon_text, draw_glass_panel

class EmotionGame:
    def __init__(self, w, h):
        self.w = w
        self.h = h
        
        # Oyun seviyeleri - Her birinin kendine has rengi var
        self.levels = [
            {'name': 'MUTLU', 'target': 'smile', 'threshold': 0.55, 'color': (100, 255, 255)}, # Sarı
            {'name': 'SASKIN', 'target': 'jaw_open', 'threshold': 0.5, 'color': (255, 150, 50)}, # Mavi
            {'name': 'GOZ KIRP', 'target': 'blink_left', 'threshold': 0.7, 'color': (200, 100, 255)}, # Pembe
            {'name': 'COK MUTLU', 'target': 'smile', 'threshold': 0.85, 'color': (100, 255, 100)}, # Yeşil
            {'name': 'AGZI AC', 'target': 'jaw_open', 'threshold': 0.8, 'color': (50, 150, 255)}, # Turuncu
            {'name': 'GOZ KIRP SAG', 'target': 'blink_right', 'threshold': 0.7, 'color': (255, 255, 100)}, # Turkuaz
        ]
        
        self.current_level_idx = 0
        self.score = 0
        self.is_success = False
        self.success_time = 0
        self.pulse = 0.0

    def update(self, face_data):
        if self.is_success:
            self.pulse = min(1.5, self.pulse + 0.1)
            if time.time() - self.success_time > 1.2: # Biraz daha hızlı geçsin
                self.next_level()
            return

        level = self.levels[self.current_level_idx]
        if face_data.get(level['target'], 0) > level['threshold']:
            self.is_success = True
            self.success_time = time.time()
            self.score += 10
            self.pulse = 1.0

    def next_level(self):
        self.current_level_idx = (self.current_level_idx + 1) % len(self.levels)
        self.is_success = False
        self.pulse = 0.0

    def draw_target_emoji(self, img, level_name, x, y, size, color):
        cx, cy = x, y
        r = size
        
        # Kafa
        cv2.circle(img, (cx, cy), r, color, 4, cv2.LINE_AA)
        
        # Gözler ve Ağız (Daha detaylı ve şirin çizimler)
        if 'MUTLU' in level_name:
            cv2.circle(img, (cx - 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            cv2.circle(img, (cx + 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            cv2.ellipse(img, (cx, cy + 20), (70, 50), 0, 0, 180, color, 6, cv2.LINE_AA)
        
        elif level_name == 'SASKIN' or level_name == 'AGZI AC':
            cv2.circle(img, (cx - 45, cy - 35), 20, color, 3, cv2.LINE_AA)
            cv2.circle(img, (cx + 45, cy - 35), 20, color, 3, cv2.LINE_AA)
            # Ağız açıklığına göre boyut değişsin
            mouth_r = 45 if level_name == 'AGZI AC' else 30
            cv2.circle(img, (cx, cy + 45), mouth_r, color, 5, cv2.LINE_AA)
            
        elif 'GOZ KIRP' in level_name:
            if 'SAG' in level_name: # Sağ göz kapalı (Kullanıcıya göre sol)
                cv2.line(img, (cx + 25, cy - 35), (cx + 65, cy - 35), color, 5, cv2.LINE_AA)
                cv2.circle(img, (cx - 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            else: # Sol göz kapalı
                cv2.line(img, (cx - 65, cy - 35), (cx - 25, cy - 35), color, 5, cv2.LINE_AA)
                cv2.circle(img, (cx + 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            cv2.ellipse(img, (cx, cy + 25), (55, 25), 0, 0, 180, color, 5, cv2.LINE_AA)

    def draw(self, img, face_data):
        level = self.levels[self.current_level_idx]
        
        # 1. Arka Plan
        overlay = img.copy()
        cv2.rectangle(overlay, (0, 0), (self.w, self.h), (25, 15, 35), -1)
        cv2.addWeighted(overlay, 0.5, img, 0.5, 0, img)
        
        # 2. Puan Paneli
        draw_glass_panel(img, 50, 20, 200, 60, 15, color=level['color'], alpha=0.3)
        cv2.putText(img, f"PUAN: {self.score}", (70, 60), cv2.FONT_HERSHEY_DUPLEX, 0.7, (255, 255, 255), 2)
        
        # 3. MERKEZİ EMOJİ
        scale = 1.0 + (self.pulse * 0.3)
        target_size = int(120 * scale)
        # Başarı anında daha parlak, normalde hafif şeffaf
        current_color = level['color']
        if not self.is_success:
            # Beyaz ile kendi rengi arasında bir karışım (rehber olması için)
            current_color = tuple(int((c + 255) / 2) for c in level['color'])
        
        self.draw_target_emoji(img, level['name'], self.w//2, self.h//2, target_size, current_color)
        
        # 4. Alt Mesaj
        if self.is_success:
            draw_neon_text(img, "MUKEMMEL!", self.w//2 - 110, self.h//2 + 220, cv2.FONT_HERSHEY_DUPLEX, 1.2, level['color'], 3)
        else:
            cv2.putText(img, "HADİ AYNI MIMIGI YAP!", (self.w//2 - 160, self.h//2 + 220), cv2.FONT_HERSHEY_DUPLEX, 0.8, (230, 230, 230), 2)

        # 5. Cıkıs Butonu
        cv2.rectangle(img, (self.w - 180, 20), (self.w - 20, 70), (50, 50, 200), -1)
        cv2.putText(img, "MENU [M]", (self.w - 165, 55), cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 255, 255), 2)

        return img
