"""
emotion_game.py
Duygu Aynası Oyunu - Sadeleştirilmiş ve hassasiyeti artırılmış sürüm.
"""

import cv2
import time
import numpy as np
from ui_engine import draw_neon_text, draw_glass_panel

class EmotionGame:
    def __init__(self, w, h):
        self.w = w
        self.h = h
        
        # Seviyeler ve hassaslaştırılmış eşikler (thresholds)
        self.levels = [
            {'name': 'MUTLU', 'target': 'smile', 'threshold': 0.45, 'color': (100, 255, 255)}, # Hassasiyet artırıldı
            {'name': 'SASKIN', 'target': 'jaw_open', 'threshold': 0.30, 'color': (255, 150, 50)}, # Hassasiyet artırıldı
            {'name': 'GOZ KIRP', 'target': 'blink_left', 'threshold': 0.6, 'color': (200, 100, 255)},
            {'name': 'COK MUTLU', 'target': 'smile', 'threshold': 0.75, 'color': (100, 255, 100)},
            {'name': 'AGZI AC', 'target': 'jaw_open', 'threshold': 0.5, 'color': (50, 150, 255)},
            {'name': 'GOZ KIRP SAG', 'target': 'blink_right', 'threshold': 0.6, 'color': (255, 255, 100)},
        ]
        
        self.current_level_idx = 0
        self.score = 0
        self.is_success = False
        self.success_time = 0
        self.pulse = 0.0

    def update(self, face_data):
        if self.is_success:
            self.pulse = min(1.5, self.pulse + 0.1)
            if time.time() - self.success_time > 1.2:
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
        cv2.circle(img, (cx, cy), r, color, 4, cv2.LINE_AA)
        
        if 'MUTLU' in level_name:
            cv2.circle(img, (cx - 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            cv2.circle(img, (cx + 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            cv2.ellipse(img, (cx, cy + 20), (70, 50), 0, 0, 180, color, 6, cv2.LINE_AA)
        elif level_name == 'SASKIN' or level_name == 'AGZI AC':
            cv2.circle(img, (cx - 45, cy - 35), 20, color, 3, cv2.LINE_AA)
            cv2.circle(img, (cx + 45, cy - 35), 20, color, 3, cv2.LINE_AA)
            mouth_r = 45 if level_name == 'AGZI AC' else 25 # Şaşkınlık ağzı biraz küçüldü
            cv2.circle(img, (cx, cy + 45), mouth_r, color, 5, cv2.LINE_AA)
        elif 'GOZ KIRP' in level_name:
            if 'SAG' in level_name:
                cv2.line(img, (cx + 25, cy - 35), (cx + 65, cy - 35), color, 5, cv2.LINE_AA)
                cv2.circle(img, (cx - 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            else:
                cv2.line(img, (cx - 65, cy - 35), (cx - 25, cy - 35), color, 5, cv2.LINE_AA)
                cv2.circle(img, (cx + 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            cv2.ellipse(img, (cx, cy + 25), (55, 25), 0, 0, 180, color, 5, cv2.LINE_AA)

    def draw(self, img, face_data):
        level = self.levels[self.current_level_idx]
        
        overlay = img.copy()
        cv2.rectangle(overlay, (0, 0), (self.w, self.h), (20, 10, 30), -1)
        cv2.addWeighted(overlay, 0.4, img, 0.6, 0, img)
        
        draw_glass_panel(img, 50, 20, 200, 60, 15, color=level['color'], alpha=0.3)
        cv2.putText(img, f"YILDIZ: {self.score}", (70, 60), cv2.FONT_HERSHEY_DUPLEX, 0.7, (255, 255, 255), 2)
        
        scale = 1.0 + (self.pulse * 0.3)
        target_size = int(120 * scale)
        current_color = level['color'] if self.is_success else tuple(int((c+255)/2) for c in level['color'])
        
        self.draw_target_emoji(img, level['name'], self.w//2, self.h//2, target_size, current_color)
        
        # Başarı mesajı dışındaki tüm yazılar kaldırıldı
        if self.is_success:
            draw_neon_text(img, "TEBRIKLER!", self.w//2 - 110, self.h//2 + 220, cv2.FONT_HERSHEY_DUPLEX, 1.2, level['color'], 3)

        cv2.rectangle(img, (self.w - 180, 20), (self.w - 20, 70), (50, 50, 200), -1)
        cv2.putText(img, "CIKIS [M]", (self.w - 165, 55), cv2.FONT_HERSHEY_DUPLEX, 0.7, (255, 255, 255), 2)

        return img
