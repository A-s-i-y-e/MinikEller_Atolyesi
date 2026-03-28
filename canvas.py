"""
canvas.py
Çizim canvas modülü - NumPy array üzerinde çizim, silme,
temizleme ve kaydetme işlemlerini yönetir.
"""

import cv2
import numpy as np
import os
import colorsys
from datetime import datetime
from ui_engine import draw_art_frame


class DrawingCanvas:
    """
    Şeffaf (BGRA) bir NumPy array üzerinde çizim işlemlerini yönetir.
    Kamera görüntüsü ile alpha-blend yaparak üst üste koyar.
    """

    def __init__(self, width, height):
        self.width = width
        self.height = height
        self._canvas = np.zeros((height, width, 3), dtype=np.uint8)
        self._mask = np.zeros((height, width), dtype=np.uint8)   # Çizilen piksel maskesi

        self.brush_size = 12       
        self.eraser_size = 40      
        self.current_color = (0, 0, 255)  
        self.last_points = {}      

        # Magic Mode (Rainbow)
        self.magic_mode = False
        self.hue = 0.0             # 0 to 1.0 for HSL cycle

    def toggle_magic_mode(self):
        self.magic_mode = not self.magic_mode

    def _get_magic_color(self):
        self.hue = (self.hue + 0.01) % 1.0
        rgb = colorsys.hls_to_rgb(self.hue, 0.5, 1.0)
        return (int(rgb[2]*255), int(rgb[1]*255), int(rgb[0]*255)) # RGB to BGR

    # ------------------------------------------------------------------
    # Çizim işlemleri
    # ------------------------------------------------------------------

    def draw(self, point, hand_idx=0):
        """
        Verilen (x, y) noktasına kalem çizgisi çizer.
        Sürekli çizgi için son noktadan bu noktaya hat çeker.
        """
        if point is None:
            self.last_points[hand_idx] = None
            return

        color = self.current_color
        if self.magic_mode:
            color = self._get_magic_color()

        x, y = int(point[0]), int(point[1])
        last_pt = self.last_points.get(hand_idx)
        if last_pt is not None:
            lx, ly = last_pt
            cv2.line(self._canvas, (lx, ly), (x, y),
                     color, self.brush_size,
                     lineType=cv2.LINE_AA)
            cv2.line(self._mask, (lx, ly), (x, y),
                     255, self.brush_size, lineType=cv2.LINE_AA)
        else:
            cv2.circle(self._canvas, (x, y), self.brush_size // 2,
                       color, -1, lineType=cv2.LINE_AA)
            cv2.circle(self._mask, (x, y), self.brush_size // 2, 255, -1)

        self.last_points[hand_idx] = (x, y)

    def stamp(self, point, shape, hand_idx=0):
        """Belirtilen noktaya OpenCV fillPoly ile bir sekil damgalar (Yildiz/Ucgen)"""
        if point is None:
            self.last_points[hand_idx] = None
            return

        x, y = int(point[0]), int(point[1])
        r = self.brush_size * 2

        color = self.current_color
        if self.magic_mode:
            color = self._get_magic_color()

        # Sadece ilk dokunusta veya son damgadan uzaklasinca damgala
        last_pt = self.last_points.get(hand_idx)
        if last_pt is not None:
            dist = np.hypot(x - last_pt[0], y - last_pt[1])
            if dist < r * 1.5:
                # Eger el cok az oynamissa dur, aksi halde yuzlerce sekil ust uste biner
                return

        if shape == 'star':
            pts = []
            for i in range(10):
                angle = i * np.pi / 5 - np.pi / 2
                radius = r if i % 2 == 0 else r * 0.4
                pts.append([int(x + radius * np.cos(angle)), int(y + radius * np.sin(angle))])
            pts = np.array([pts], dtype=np.int32)
            cv2.fillPoly(self._canvas, pts, color, lineType=cv2.LINE_AA)
            cv2.fillPoly(self._mask, pts, 255, lineType=cv2.LINE_AA)

        elif shape == 'triangle':
            pts = []
            for i in range(3):
                angle = i * 2 * np.pi / 3 - np.pi / 2
                pts.append([int(x + r * np.cos(angle)), int(y + r * np.sin(angle))])
            pts = np.array([pts], dtype=np.int32)
            cv2.fillPoly(self._canvas, pts, color, lineType=cv2.LINE_AA)
            cv2.fillPoly(self._mask, pts, 255, lineType=cv2.LINE_AA)

        self.last_points[hand_idx] = (x, y)

    def fill(self, point, boundary_mask=None):
        """
        Belirtilen noktadaki kapalı alanı aktif renkle doldurur (Flood Fill).
        """
        if point is None:
            return

        x, y = int(point[0]), int(point[1])
        if x < 0 or x >= self.width or y < 0 or y >= self.height:
            return

        color = self.current_color
        if self.magic_mode:
            color = self._get_magic_color()

        # Zaten aynı renkse doldurma (FPS düşüşünü engellemek için)
        current_color = self._canvas[y, x].tolist()
        if current_color == list(color):
            return

        # Sınır maskesi varsa (Şablon) kullan, yoksa boş maske oluştur
        if boundary_mask is not None:
            fill_mask = boundary_mask.copy()
        else:
            fill_mask = np.zeros((self.height + 2, self.width + 2), dtype=np.uint8)

        mask_for_alpha = fill_mask.copy()
        # Flood Fill işlemini canvas üzerinde uygula
        cv2.floodFill(self._canvas, fill_mask, (x, y), color)
        
        # Maske üzerinde de güncellemeyi yap ki overlay() ile gösterilsin
        cv2.floodFill(self._mask, mask_for_alpha, (x, y), 255)

    def erase(self, point):
        """Verilen noktada silgi uygular."""
        if point is None:
            return
        x, y = int(point[0]), int(point[1])
        cv2.circle(self._canvas, (x, y), self.eraser_size, (0, 0, 0), -1)
        cv2.circle(self._mask, (x, y), self.eraser_size, 0, -1)

    def clear(self):
        """Tüm canvas'ı temizler."""
        self._canvas[:] = 0
        self._mask[:] = 0
        self.last_points.clear()

    def reset_stroke(self, hand_idx=None):
        """Çizgi bittiğinde son noktayı sıfırla (parmak kalktığında)."""
        if hand_idx is not None:
            self.last_points[hand_idx] = None
        else:
            self.last_points.clear()

    # ------------------------------------------------------------------
    # Kamera ile birleştirme
    # ------------------------------------------------------------------

    def overlay(self, frame):
        """
        Canvas'ı kamera görüntüsüyle birleştirir.
        Sadece çizilen pikseller gösterilir (mask kullanarak).
        """
        result = frame.copy()
        # Maske olan bölgeleri canvas'tan kopyala (alpha-blend)
        alpha = 0.85
        where = self._mask > 0
        result[where] = cv2.addWeighted(
            self._canvas, alpha,
            frame, 1 - alpha, 0
        )[where]
        return result

    def get_canvas(self):
        """Ham canvas array'ini döndürür."""
        return self._canvas.copy()

    # ------------------------------------------------------------------
    # Kaydetme
    # ------------------------------------------------------------------

    def save(self, save_dir="saved_drawings", artist_name="Minik Sanatçı"):
        """
        Çizimi PNG formatında kaydeder (Sanat Galerisi Çerçevesi ile).
        """
        os.makedirs(save_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"eser_{timestamp}.png"
        filepath = os.path.join(save_dir, filename)

        # Beyaz arka plan üzerine çiz
        white_bg = np.ones((self.height, self.width, 3), dtype=np.uint8) * 255
        where = self._mask > 0
        white_bg[where] = self._canvas[where]

        # GALERİ ÇERÇEVESİ ekle
        final_img = draw_art_frame(white_bg, artist_name)

        ext = os.path.splitext(filepath)[1]
        is_success, buf = cv2.imencode(ext, final_img)
        if is_success:
            buf.tofile(filepath)
            
        return filepath

    # ------------------------------------------------------------------
    # Çizim işlemleri
    # ------------------------------------------------------------------

    def draw(self, point, hand_idx=0):
        """
        Verilen (x, y) noktasına kalem çizgisi çizer.
        Sürekli çizgi için son noktadan bu noktaya hat çeker.
        """
        if point is None:
            self.last_points[hand_idx] = None
            return

        x, y = int(point[0]), int(point[1])
        last_pt = self.last_points.get(hand_idx)
        if last_pt is not None:
            lx, ly = last_pt
            cv2.line(self._canvas, (lx, ly), (x, y),
                     self.current_color, self.brush_size,
                     lineType=cv2.LINE_AA)
            cv2.line(self._mask, (lx, ly), (x, y),
                     255, self.brush_size, lineType=cv2.LINE_AA)
        else:
            cv2.circle(self._canvas, (x, y), self.brush_size // 2,
                       self.current_color, -1, lineType=cv2.LINE_AA)
            cv2.circle(self._mask, (x, y), self.brush_size // 2, 255, -1)

        self.last_points[hand_idx] = (x, y)

    def stamp(self, point, shape, hand_idx=0):
        """Belirtilen noktaya OpenCV fillPoly ile bir sekil damgalar (Yildiz/Ucgen)"""
        if point is None:
            self.last_points[hand_idx] = None
            return

        x, y = int(point[0]), int(point[1])
        r = self.brush_size * 2

        # Sadece ilk dokunusta veya son damgadan uzaklasinca damgala
        last_pt = self.last_points.get(hand_idx)
        if last_pt is not None:
            dist = np.hypot(x - last_pt[0], y - last_pt[1])
            if dist < r * 1.5:
                # Eger el cok az oynamissa dur, aksi halde yuzlerce sekil ust uste biner
                return

        if shape == 'star':
            pts = []
            for i in range(10):
                angle = i * np.pi / 5 - np.pi / 2
                radius = r if i % 2 == 0 else r * 0.4
                pts.append([int(x + radius * np.cos(angle)), int(y + radius * np.sin(angle))])
            pts = np.array([pts], dtype=np.int32)
            cv2.fillPoly(self._canvas, pts, self.current_color, lineType=cv2.LINE_AA)
            cv2.fillPoly(self._mask, pts, 255, lineType=cv2.LINE_AA)

        elif shape == 'triangle':
            pts = []
            for i in range(3):
                angle = i * 2 * np.pi / 3 - np.pi / 2
                pts.append([int(x + r * np.cos(angle)), int(y + r * np.sin(angle))])
            pts = np.array([pts], dtype=np.int32)
            cv2.fillPoly(self._canvas, pts, self.current_color, lineType=cv2.LINE_AA)
            cv2.fillPoly(self._mask, pts, 255, lineType=cv2.LINE_AA)

        self.last_points[hand_idx] = (x, y)

    def fill(self, point, boundary_mask=None):
        """
        Belirtilen noktadaki kapalı alanı aktif renkle doldurur (Flood Fill).
        """
        if point is None:
            return

        x, y = int(point[0]), int(point[1])
        if x < 0 or x >= self.width or y < 0 or y >= self.height:
            return

        # Zaten aynı renkse doldurma (FPS düşüşünü engellemek için)
        current_color = self._canvas[y, x].tolist()
        if current_color == list(self.current_color):
            return

        # Sınır maskesi varsa (Şablon) kullan, yoksa boş maske oluştur
        if boundary_mask is not None:
            fill_mask = boundary_mask.copy()
        else:
            fill_mask = np.zeros((self.height + 2, self.width + 2), dtype=np.uint8)

        mask_for_alpha = fill_mask.copy()
        # Flood Fill işlemini canvas üzerinde uygula
        cv2.floodFill(self._canvas, fill_mask, (x, y), self.current_color)
        
        # Maske üzerinde de güncellemeyi yap ki overlay() ile gösterilsin
        cv2.floodFill(self._mask, mask_for_alpha, (x, y), 255)

    def erase(self, point):
        """Verilen noktada silgi uygular."""
        if point is None:
            return
        x, y = int(point[0]), int(point[1])
        cv2.circle(self._canvas, (x, y), self.eraser_size, (0, 0, 0), -1)
        cv2.circle(self._mask, (x, y), self.eraser_size, 0, -1)

    def clear(self):
        """Tüm canvas'ı temizler."""
        self._canvas[:] = 0
        self._mask[:] = 0
        self.last_points.clear()

    def reset_stroke(self, hand_idx=None):
        """Çizgi bittiğinde son noktayı sıfırla (parmak kalktığında)."""
        if hand_idx is not None:
            self.last_points[hand_idx] = None
        else:
            self.last_points.clear()

    # ------------------------------------------------------------------
    # Kamera ile birleştirme
    # ------------------------------------------------------------------

    def overlay(self, frame):
        """
        Canvas'ı kamera görüntüsüyle birleştirir.
        Sadece çizilen pikseller gösterilir (mask kullanarak).
        """
        result = frame.copy()
        # Maske olan bölgeleri canvas'tan kopyala (alpha-blend)
        alpha = 0.85
        where = self._mask > 0
        result[where] = cv2.addWeighted(
            self._canvas, alpha,
            frame, 1 - alpha, 0
        )[where]
        return result

    def get_canvas(self):
        """Ham canvas array'ini döndürür."""
        return self._canvas.copy()

    # ------------------------------------------------------------------
    # Kaydetme
    # ------------------------------------------------------------------

    def save(self, save_dir="saved_drawings"):
        """
        Çizimi PNG formatında kaydeder.
        Dosya adı: cizim_YYYYMMDD_HHMMSS.png
        Döndürür: kaydedilen dosya yolu
        """
        os.makedirs(save_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"cizim_{timestamp}.png"
        filepath = os.path.join(save_dir, filename)

        # Beyaz arka plan üzerine çiz (şeffaf görünüm yerine)
        white_bg = np.ones((self.height, self.width, 3), dtype=np.uint8) * 255
        where = self._mask > 0
        white_bg[where] = self._canvas[where]

        # cv2.imwrite(filepath, white_bg)
        # Unicode dizinler (Okul Öncesi vs.) için çözüm:
        ext = os.path.splitext(filepath)[1]
        is_success, buf = cv2.imencode(ext, white_bg)
        if is_success:
            buf.tofile(filepath)
            
        return filepath

    # ------------------------------------------------------------------
    # Renk & Fırça
    # ------------------------------------------------------------------

    def set_color(self, bgr_color):
        """Aktif çizim rengini ayarlar."""
        self.current_color = bgr_color

    def set_brush_size(self, size):
        """Fırça kalınlığını ayarlar (min 4, max 60)."""
        self.brush_size = max(4, min(60, size))

    def increase_brush(self, step=4):
        self.set_brush_size(self.brush_size + step)

    def decrease_brush(self, step=4):
        self.set_brush_size(self.brush_size - step)
