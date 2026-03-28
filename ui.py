import cv2
import numpy as np
from ui_engine import draw_glass_panel, draw_glowing_rect, _draw_rounded_rect, draw_neon_text

class DrawingUI:
    def __init__(self, w, h):
        self.w = w
        self.h = h

        self.colors = [
            (0, 0, 255),    # Kırmızı
            (0, 165, 255),  # Turuncu
            (0, 255, 255),  # Sarı
            (0, 255, 0),    # Yeşil
            (255, 0, 0),    # Mavi
            (255, 0, 255),  # Mor
            (0, 0, 0),      # Siyah
            (255, 255, 255) # Beyaz
        ]
        self.active_color_idx = 0

        self.tools = {
            'draw':  {'color': (50, 200, 50),  'label': 'CIZ'},
            'erase': {'color': (50, 50, 200),  'label': 'SILGI'},
            'star':  {'color': (200, 200, 50), 'label': 'YILDIZ'},
            'triangle':{'color':(200, 100, 200),'label':'UCGEN'},
            'clear': {'color': (0, 0, 0),      'label': 'TEMIZLE'},
            'save':  {'color': (200, 100, 50), 'label': 'KAYDET'}
        }
        self.active_tool = 'draw'
        self.brush_size = 12

    def get_active_color(self):
        return self.colors[self.active_color_idx]

    def next_color(self):
        self.active_color_idx = (self.active_color_idx + 1) % len(self.colors)

    def prev_color(self):
        self.active_color_idx = (self.active_color_idx - 1) % len(self.colors)

    def set_tool(self, tool_name):
        if tool_name in self.tools:
            self.active_tool = tool_name

    def increase_brush(self, step=4):
        self.brush_size = min(60, self.brush_size + step)

    def decrease_brush(self, step=4):
        self.brush_size = max(4, self.brush_size - step)

    def draw_ui(self, frame):
        # 1. Top Palette Glass Bar
        draw_glass_panel(frame, 20, 10, 600, 70, 20, color=(100, 100, 100), alpha=0.3)
        
        px, py = 40, 20
        gap = 60
        for i, c in enumerate(self.colors):
            cx, cy = px + i * gap + 25, py + 25
            if i == self.active_color_idx:
                draw_glowing_rect(frame, cx-30, cy-30, 60, 60, r=30, color=c, thickness=3, glow_radius=15, intensity_mult=0.7)
                cv2.circle(frame, (cx, cy), 18, (255, 255, 255), 4, cv2.LINE_AA)
            else:
                cv2.circle(frame, (cx, cy), 20, c, -1, cv2.LINE_AA)
                cv2.circle(frame, (cx, cy), 20, (200, 200, 200), 2, cv2.LINE_AA)

        # 2. Left Toolbar Glass Bar
        toolbar_h = len(self.tools) * 100 + 140 # Increased height for magic button
        draw_glass_panel(frame, 20, 100, 120, toolbar_h, 20, color=(50, 50, 150), alpha=0.2)
        
        x_base, y_base = 30, 120
        gap_y = 100
        for tool_id, tool_info in self.tools.items():
            bx, by = x_base, y_base
            bw, bh = 100, 80
            
            is_active = (tool_id == self.active_tool)
            if is_active:
                draw_glowing_rect(frame, bx, by, bw, bh, 15, color=(0, 255, 255), thickness=3, glow_radius=12, intensity_mult=0.6)
            
            _draw_rounded_rect(frame, bx, by, bw, bh, 15, tool_info['color'], -1)
            _draw_rounded_rect(frame, bx, by, bw, bh, 15, (255, 255, 255), 2)
            
            text_sz, _ = cv2.getTextSize(tool_info['label'], cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.putText(frame, tool_info['label'], (bx + (bw - text_sz[0])//2, by + bh - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
            
            ic_x, ic_y = bx + bw//2, by + bh//2 - 10
            if tool_id == 'draw':
                cv2.circle(frame, (ic_x, ic_y), self.brush_size//2, self.colors[self.active_color_idx], -1, cv2.LINE_AA)
                cv2.circle(frame, (ic_x, ic_y), self.brush_size//2, (255,255,255), 1, cv2.LINE_AA)
            elif tool_id == 'erase':
                cv2.rectangle(frame, (ic_x-15, ic_y-15), (ic_x+15, ic_y+15), (200, 200, 200), -1)
                cv2.rectangle(frame, (ic_x-15, ic_y-15), (ic_x+15, ic_y+15), (255, 255, 255), 2)
            elif tool_id == 'star':
                draw_neon_text(frame, "*", ic_x-10, ic_y+15, cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 255), 2)
            elif tool_id == 'triangle':
                pts = np.array([[ic_x, ic_y-15], [ic_x-15, ic_y+15], [ic_x+15, ic_y+15]], np.int32)
                cv2.fillPoly(frame, [pts], (255, 0, 255), lineType=cv2.LINE_AA)
                cv2.polylines(frame, [pts], True, (255,255,255), 2, cv2.LINE_AA)
            elif tool_id == 'clear':
                cv2.line(frame, (ic_x-15, ic_y-15), (ic_x+15, ic_y+15), (0, 0, 255), 4, cv2.LINE_AA)
                cv2.line(frame, (ic_x+15, ic_y-15), (ic_x-15, ic_y+15), (0, 0, 255), 4, cv2.LINE_AA)
            elif tool_id == 'save':
                cv2.rectangle(frame, (ic_x-15, ic_y-10), (ic_x+15, ic_y+15), (0, 255, 0), 2, cv2.LINE_AA)
                cv2.circle(frame, (ic_x, ic_y+5), 5, (0, 255, 0), -1, cv2.LINE_AA)
            
            y_base += gap_y

        # 3. Magic Rainbow Button (At the bottom of toolbar)
        mbx, mby = 30, y_base
        mbw, mbh = 100, 80
        magic_on = getattr(self, 'magic_active', False)
        
        if magic_on:
            draw_glowing_rect(frame, mbx, mby, mbw, mbh, 15, color=(255, 100, 255), thickness=3, glow_radius=15)
        
        _draw_rounded_rect(frame, mbx, mby, mbw, mbh, 15, (40, 40, 40), -1)
        _draw_rounded_rect(frame, mbx, mby, mbw, mbh, 15, (255, 255, 255), 2)
        
        draw_neon_text(frame, "SIHIR", mbx + 20, mby + 35, cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 50, 255), 1)
        cv2.putText(frame, "MODU", (mbx + 26, mby + 55), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)

    def check_magic_hover(self, pt):
        if pt is None: return False
        x, y = pt
        # Find magic button Y (it depends on number of tools)
        y_magic = 120 + len(self.tools) * 100
        if 30 <= x <= 130 and y_magic <= y <= y_magic + 80:
            return True
        return False

    def check_color_hover(self, pt):
        if pt is None: return False
        x, y = pt
        if y < 90:
            px, py, gap = 40, 20, 60
            for i in range(len(self.colors)):
                cx, cy = px + i * gap + 25, py + 25
                dist = np.hypot(x - cx, y - cy)
                if dist < 25:
                    self.active_color_idx = i
                    return True
        return False

    def check_tool_hover(self, pt):
        if pt is None: return None
        x, y = pt
        if x < 140 and y > 100:
            idx = (y - 120) // 100
            tools_keys = list(self.tools.keys())
            if 0 <= idx < len(tools_keys):
                return tools_keys[idx]
        return None
