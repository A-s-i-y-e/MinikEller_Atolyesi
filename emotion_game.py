"""
emotion_game.py
Duygu Aynası Oyunu - Başarı anında uçuşan yıldız efektli sürüm.
"""

import cv2
import time
import random
import numpy as np
from ui_engine import draw_neon_text, draw_glass_panel

class StarParticle:
    def __init__(self, x, y, color):
        self.x = x
        self.y = y
        self.color = color
        self.vx = random.uniform(-10, 10)
        self.vy = random.uniform(-15, -5)
        self.life = 1.0 # 1.0 -> 0.0
        self.size = random.randint(15, 25)

    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.vy += 0.5 # Yerçekimi
        self.life -= 0.02
        return self.life > 0

class EmotionGame:
    def __init__(self, w, h):
        self.w = w
        self.h = h
        self.levels = [
            {'name': 'GULUMSE', 'target': 'smile', 'threshold': 0.45, 'color': (100, 255, 255)},
            {'name': 'SASIR', 'target': 'jaw_open', 'threshold': 0.30, 'color': (255, 150, 50)},
            {'name': 'SOL GOZ KIRP', 'target': 'blink_left', 'threshold': 0.6, 'color': (200, 100, 255)},
            {'name': 'YANAK SISIR', 'target': 'jaw_open', 'threshold': 0.1, 'color': (100, 255, 100)},
            {'name': 'SAG GOZ KIRP', 'target': 'blink_right', 'threshold': 0.6, 'color': (50, 200, 255)},
            {'name': 'KOCAMAN GUL', 'target': 'smile', 'threshold': 0.80, 'color': (255, 100, 100)},
            {'name': 'AGZINI AC', 'target': 'jaw_open', 'threshold': 0.6, 'color': (100, 100, 255)},
            {'name': 'GOZLERI KAPAT', 'target': 'blink_left', 'threshold': 0.8, 'color': (255, 255, 255)},
        ]
        self.current_level_idx = 0
        self.score = 0
        self.is_success = False
        self.success_time = 0
        self.pulse = 0.0
        self.particles = [] # Uçuşan yıldızlar

    def trigger_success(self):
        if not self.is_success:
            self.is_success = True
            self.success_time = time.time()
            self.score += 20
            self.pulse = 1.0
            # Başarı anında yıldızları oluştur
            level_color = self.levels[self.current_level_idx]['color']
            for _ in range(30): # 30 adet yıldız
                self.particles.append(StarParticle(self.w//2, self.h//2, level_color))

    def update(self, face_data):
        if self.is_success:
            self.pulse = min(1.6, self.pulse + 0.08)
            if time.time() - self.success_time > 2.5:
                self.next_level()
        else:
            level = self.levels[self.current_level_idx]
            if level['name'] == 'GOZLERI KAPAT':
                if face_data.get('blink_left', 0) > 0.7 and face_data.get('blink_right', 0) > 0.7:
                    self.trigger_success()
            else:
                if face_data.get(level['target'], 0) > level['threshold']:
                    self.trigger_success()

        # Partikülleri güncelle
        self.particles = [p for p in self.particles if p.update()]

    def next_level(self):
        self.current_level_idx = (self.current_level_idx + 1) % len(self.levels)
        self.is_success = False
        self.pulse = 0.0
        self.particles = []

    def draw_target_emoji(self, img, level_name, x, y, size, color):
        cx, cy = x, y
        r = size
        cv2.circle(img, (cx, cy), r, color, 4, cv2.LINE_AA)
        
        if 'GUL' in level_name:
            cv2.circle(img, (cx - 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            cv2.circle(img, (cx + 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            cv2.ellipse(img, (cx, cy + 20), (70, 50), 0, 0, 180, color, 6, cv2.LINE_AA)
        elif 'SASIR' in level_name or 'AGZ' in level_name:
            cv2.circle(img, (cx - 45, cy - 35), 20, color, 3, cv2.LINE_AA)
            cv2.circle(img, (cx + 45, cy - 35), 20, color, 3, cv2.LINE_AA)
            mouth_r = 50 if 'AGZ' in level_name else 25
            cv2.circle(img, (cx, cy + 45), mouth_r, color, 5, cv2.LINE_AA)
        elif 'KIRP' in level_name:
            if 'SAG' in level_name:
                cv2.line(img, (cx + 25, cy - 35), (cx + 65, cy - 35), color, 5, cv2.LINE_AA)
                cv2.circle(img, (cx - 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            else:
                cv2.line(img, (cx - 65, cy - 35), (cx - 25, cy - 35), color, 5, cv2.LINE_AA)
                cv2.circle(img, (cx + 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            cv2.ellipse(img, (cx, cy + 25), (55, 25), 0, 0, 180, color, 5, cv2.LINE_AA)
        elif 'KAPAT' in level_name:
            cv2.line(img, (cx - 65, cy - 35), (cx - 25, cy - 35), color, 5, cv2.LINE_AA)
            cv2.line(img, (cx + 25, cy - 35), (cx + 65, cy - 35), color, 5, cv2.LINE_AA)
            cv2.ellipse(img, (cx, cy + 25), (40, 10), 0, 0, 180, color, 5, cv2.LINE_AA)
        elif 'SISIR' in level_name:
            cv2.circle(img, (cx - 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            cv2.circle(img, (cx + 40, cy - 30), 15, color, -1, cv2.LINE_AA)
            cv2.circle(img, (cx, cy + 50), 40, color, 4, cv2.LINE_AA)

    def draw(self, img, face_data):
        level = self.levels[self.current_level_idx]
        
        overlay = img.copy()
        cv2.rectangle(overlay, (0, 0), (self.w, self.h), (15, 10, 25), -1)
        cv2.addWeighted(overlay, 0.4, img, 0.6, 0, img)
        
        # 1. Puan ve Seviye
        draw_glass_panel(img, 40, 20, 250, 70, 15, color=level['color'], alpha=0.3)
        cv2.putText(img, f"PUAN: {self.score}", (60, 50), cv2.FONT_HERSHEY_DUPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(img, f"SEVIYE: {self.current_level_idx + 1}/{len(self.levels)}", (60, 80), cv2.FONT_HERSHEY_DUPLEX, 0.5, (200, 200, 200), 1)
        
        # 2. Partikülleri Çiz (Uçuşan Yıldızlar)
        for p in self.particles:
            s = int(p.size * p.life)
            if s > 0:
                # Yıldız yerine küçük parlayan kareler/artılar (çizimi kolay ve şık)
                cv2.rectangle(img, (int(p.x - s), int(p.y - s)), (int(p.x + s), int(p.y + s)), p.color, -1)
                # Küçük bir ışık süzmesi
                cv2.circle(img, (int(p.x), int(p.y)), s+5, p.color, 1, cv2.LINE_AA)
        
        # 3. MERKEZİ EMOJİ
        scale = 1.0 + (self.pulse * 0.3)
        target_size = int(120 * scale)
        current_color = level['color'] if self.is_success else tuple(int((c+255)/2) for c in level['color'])
        self.draw_target_emoji(img, level['name'], self.w//2, self.h//2, target_size, current_color)
        
        # 4. Cıkıs
        cv2.rectangle(img, (self.w - 180, 20), (self.w - 20, 70), (50, 50, 200), -1)
        cv2.putText(img, "CIKIS [M]", (self.w - 165, 55), cv2.FONT_HERSHEY_DUPLEX, 0.7, (255, 255, 255), 2)

        return img
