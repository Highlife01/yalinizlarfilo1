"""
Generate favicon and PWA icons from SVG logo design.
Steering wheel + Y logo for Yalinizlar Filo.
"""
import math
from PIL import Image, ImageDraw, ImageFont
import os

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), '..', 'public')

def draw_logo(size, with_bg_box=False):
    """Draw the Yalinizlar steering wheel + Y logo at given size."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    cx, cy = size / 2, size / 2
    
    if with_bg_box:
        # Draw rounded rectangle background with cyan border
        border_w = size * 0.06
        # Outer rounded rect (cyan gradient border)
        r_outer = size * 0.22
        draw.rounded_rectangle(
            [border_w * 0.3, border_w * 0.3, size - border_w * 0.3, size - border_w * 0.3],
            radius=r_outer,
            fill=(0, 180, 216, 255)  # cyan
        )
        # Inner rounded rect (white fill)
        inner_margin = border_w * 1.5
        r_inner = size * 0.17
        draw.rounded_rectangle(
            [inner_margin, inner_margin, size - inner_margin, size - inner_margin],
            radius=r_inner,
            fill=(255, 255, 255, 255)
        )
    
    # Main circle
    navy = (10, 31, 60, 255)  # #0A1F3C
    cyan = (0, 180, 216, 255)  # #00B4D8
    
    if with_bg_box:
        circle_r = size * 0.33
    else:
        circle_r = size * 0.44
    
    # Draw filled navy circle
    draw.ellipse(
        [cx - circle_r, cy - circle_r, cx + circle_r, cy + circle_r],
        fill=navy
    )
    
    # Draw the steering wheel rim (inner ring cutout - transparent)
    rim_r = circle_r * 0.78
    rim_thickness = circle_r * 0.13
    
    # Draw the inner part of the circle (the "hole" of the steering wheel)
    inner_r = circle_r * 0.55
    
    # We need to draw the Y-shaped spokes and the rim
    # Let's use a different approach: draw on a separate layer
    
    # Create a mask for the inner cutout
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    
    # The steering wheel has:
    # 1. Outer circle (navy) - already drawn
    # 2. A gap/rim ring
    # 3. Three spokes forming a Y shape
    # 4. A small center hub
    
    # Let's draw the white/transparent areas
    # Inner ring (gap between rim and center)
    gap_outer_r = circle_r * 0.72
    gap_inner_r = circle_r * 0.30
    
    # Draw three "pie" shaped cutouts between the spokes
    # The Y has spokes at: top (270°), bottom-left (150°), bottom-right (30°)
    # Wait, looking at the image: spokes go to top-center, bottom-left, bottom-right
    # Angles: 270° (top), 150° (bottom-left), 30° (bottom-right)
    
    spoke_angles = [270, 150, 30]  # degrees, 0 = right, counter-clockwise
    spoke_width_angle = 22  # half-width of each spoke in degrees
    
    # For each gap between spokes, draw the cutout
    # Gaps are between: 30-150, 150-270, 270-30(+360)
    
    # Instead of complex pie cutouts, let me draw the logo differently:
    # Draw navy circle, then cut out the inner design
    
    # Reset and try a cleaner approach
    img2 = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw2 = ImageDraw.Draw(img2)
    
    if with_bg_box:
        border_w = size * 0.06
        r_outer = size * 0.22
        draw2.rounded_rectangle(
            [border_w * 0.3, border_w * 0.3, size - border_w * 0.3, size - border_w * 0.3],
            radius=r_outer,
            fill=(0, 180, 216, 255)
        )
        inner_margin = border_w * 1.5
        r_inner = size * 0.17
        draw2.rounded_rectangle(
            [inner_margin, inner_margin, size - inner_margin, size - inner_margin],
            radius=r_inner,
            fill=(255, 255, 255, 255)
        )
    
    # Draw navy circle
    draw2.ellipse(
        [cx - circle_r, cy - circle_r, cx + circle_r, cy + circle_r],
        fill=navy
    )
    
    # Now cut out the three gaps to create the steering wheel + Y shape
    # The Y shape creates three sections between the spokes
    
    hub_r = circle_r * 0.18  # small center hub
    rim_inner = circle_r * 0.70  # inner edge of the rim
    
    # Spoke parameters
    # Three spokes at 90° (top/up), 210° (bottom-left), 330° (bottom-right)
    # In image coords: 90° = up
    spoke_half_w = circle_r * 0.11  # half-width of spoke
    
    # Define the three cutout regions (the gaps between Y spokes)
    # These are the areas inside the circle but outside the spokes and hub
    
    # Method: draw the cutout shapes as transparent
    # Create cutout layer
    cutout = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(cutout)
    
    # For each gap, create a polygon
    # Gap 1: between top spoke and right spoke (right side) ~330° to 90° going through 0°/360°
    # Wait, let me reconsider angles.
    # In standard math: 0=right, 90=up (but in screen coords y is flipped so 90=down)
    # In screen coords: 0=right, 90=down, 180=left, 270=up
    
    # Spokes go from center outward at these screen angles:
    # Top spoke: 270° (up)
    # Bottom-left spoke: 150° 
    # Bottom-right spoke: 30°
    # Wait no, looking at Y shape: the fork opens at top
    # Actually in the image the Y has:
    # - Two upper arms going upper-left and upper-right  
    # - One stem going straight down
    
    # Re-examining the image: It's a Y where:
    # - Left arm goes to upper-left (~135° in screen = ~225° math)  
    # - Right arm goes to upper-right (~45° screen = ~315° math)
    # - Stem goes straight down (~270° screen = ~90° math... wait)
    
    # In screen coordinates (0° = right/east, clockwise):
    # Upper-left = 315° (or -45°)
    # Upper-right = 45°
    # Downward = 180°
    
    # Hmm, let me just look at the image description again.
    # The logo shows a steering wheel with what appears to be a Y shape.
    # The Y has two upper branches diverging from center to upper-left and upper-right,
    # and one lower branch going straight down.
    
    # Let me use screen angles (0=right, clockwise):
    # Upper-right arm: ~315° (or -45°) - going to 1-2 o'clock
    # Upper-left arm: ~225° (or -135°) - going to 10-11 o'clock  
    # Down stem: ~90° (or 180°... 
    
    # Wait, forget angles. Let me just define the Y by its points.
    # Y shape: center hub, then three arms.
    # Arm 1: goes up-left at about 35° from vertical
    # Arm 2: goes up-right at about 35° from vertical
    # Arm 3: goes straight down
    
    # The junction point is roughly at center or slightly above.
    
    # Simpler approach: draw the white/transparent cutout regions
    
    # 3 cutout regions between Y spokes:
    # Region 1 (left): between down-stem and up-left arm
    # Region 2 (right): between down-stem and up-right arm  
    # Region 3 (top): between up-left and up-right arms (has cyan diamond)
    
    # Spoke directions from center (in radians, screen coords, 0=right, clockwise):
    up_left_angle = math.radians(245)   # ~245° = upper-left in screen
    up_right_angle = math.radians(295)  # ~295° = upper-right in screen
    down_angle = math.radians(90)       # ~90° = straight down
    
    spoke_hw_rad = math.radians(14)  # half-width of each spoke
    
    def point_on_circle(angle, radius):
        return (cx + radius * math.cos(angle), cy + radius * math.sin(angle))
    
    def make_gap_polygon(angle_start, angle_end, r_inner, r_outer, steps=20):
        """Create polygon for arc gap between two angles."""
        pts = []
        # Inner arc from start to end
        a_range = angle_end - angle_start
        if a_range < 0:
            a_range += 2 * math.pi
        for i in range(steps + 1):
            a = angle_start + a_range * i / steps
            pts.append(point_on_circle(a, r_inner))
        # Outer arc from end back to start
        for i in range(steps + 1):
            a = angle_end - a_range * i / steps
            pts.append(point_on_circle(a, r_outer))
        return pts
    
    # Define spoke edges
    # Each spoke occupies an angular range: [angle - spoke_hw, angle + spoke_hw]
    # Gaps are between spoke edges
    
    # Gap 1: from down_spoke right edge to up_right_spoke left edge
    gap1_start = down_angle + spoke_hw_rad
    gap1_end = up_right_angle - spoke_hw_rad
    
    # Gap 2: from up_right right edge to up_left left edge (going through top/0°)
    gap2_start = up_right_angle + spoke_hw_rad
    gap2_end = up_left_angle - spoke_hw_rad
    # This gap crosses 360°/0° so handle wrap
    if gap2_end < gap2_start:
        gap2_end += 2 * math.pi
    
    # Gap 3: from up_left right edge to down left edge  
    gap3_start = up_left_angle + spoke_hw_rad
    gap3_end = down_angle - spoke_hw_rad + 2 * math.pi  # wrap
    if gap3_end - gap3_start > 2 * math.pi:
        gap3_end -= 2 * math.pi
    
    white = (255, 255, 255, 255) if with_bg_box else (0, 0, 0, 0)
    
    # Actually for the cutouts, let me use a mask-based approach
    # Create the steering wheel shape:
    # 1. Navy filled circle (done)
    # 2. Cut out three arc-shaped regions between spokes
    # 3. Keep the rim (outer ring), hub (center), and spokes
    
    # Let me try yet another approach - composite with alpha
    
    # Create the inner cutout (the space inside the rim but outside the hub, minus spokes)
    cutout_color = (255, 255, 255, 0)  # transparent
    
    # Draw filled sectors as cutouts on the navy circle
    # For each gap, draw a filled arc/pie slice from hub edge to rim inner edge
    
    # Let me use a simpler pixel-based approach for better quality
    
    # Method: Create the logo as a composition
    # Layer 1: Background (transparent or white box)
    # Layer 2: Navy circle
    # Layer 3: Cut out the inner ring gaps (leave rim, hub, spokes)
    
    # For the cutout, I'll create it as a mask
    mask_full = Image.new('L', (size, size), 255)  # 255 = fully opaque
    md = ImageDraw.Draw(mask_full)
    
    # Make the inner ring area transparent, EXCEPT for the spokes
    # Inner ring: between hub_r and rim_inner from center
    
    # First, cut out the full ring
    # Then add back the spokes
    
    # Step 1: Create ring mask (the area to potentially cut)
    ring_mask = Image.new('L', (size, size), 0)
    rd = ImageDraw.Draw(ring_mask)
    # Draw the ring area (between hub and rim)
    rd.ellipse([cx-rim_inner, cy-rim_inner, cx+rim_inner, cy+rim_inner], fill=255)
    rd.ellipse([cx-hub_r, cy-hub_r, cx+hub_r, cy+hub_r], fill=0)
    
    # Step 2: Create spoke mask (areas to keep within the ring)
    spoke_mask = Image.new('L', (size, size), 0)
    sd = ImageDraw.Draw(spoke_mask)
    
    spoke_length = rim_inner * 1.1  # extend past rim_inner to ensure connection
    spoke_w = circle_r * 0.20  # width of spoke
    
    # Draw three spokes as rotated rectangles
    for angle in [up_left_angle, up_right_angle, down_angle]:
        # Spoke as a polygon (rectangle rotated)
        dx = math.cos(angle)
        dy = math.sin(angle)
        # perpendicular
        px = -dy
        py = dx
        
        hw = spoke_w / 2
        # Points: from center to spoke_length along angle direction, with width
        pts = [
            (cx + px * hw, cy + py * hw),
            (cx + dx * spoke_length + px * hw, cy + dy * spoke_length + py * hw),
            (cx + dx * spoke_length - px * hw, cy + dy * spoke_length - py * hw),
            (cx - px * hw, cy - py * hw),
        ]
        sd.polygon(pts, fill=255)
    
    # The actual cutout is: ring_mask AND NOT spoke_mask
    import numpy as np
    ring_arr = np.array(ring_mask)
    spoke_arr = np.array(spoke_mask)
    cutout_arr = np.where((ring_arr > 0) & (spoke_arr == 0), 255, 0).astype(np.uint8)
    
    # Apply cutout to img2: where cutout is 255, make transparent
    img2_arr = np.array(img2)
    cutout_mask = cutout_arr > 0
    
    if with_bg_box:
        # Set to white where cutout
        img2_arr[cutout_mask] = [255, 255, 255, 255]
    else:
        # Set to transparent where cutout
        img2_arr[cutout_mask] = [0, 0, 0, 0]
    
    img2 = Image.fromarray(img2_arr)
    draw2 = ImageDraw.Draw(img2)
    
    # Draw the cyan accent (small triangle/diamond at top of the circle)
    # It sits at the top of the Y, between the two upper arms
    accent_size = circle_r * 0.14
    accent_cy = cy - hub_r * 0.6  # slightly above center
    # Diamond shape
    draw2.polygon([
        (cx, accent_cy - accent_size * 1.2),  # top
        (cx + accent_size, accent_cy),          # right
        (cx, accent_cy + accent_size * 0.6),   # bottom
        (cx - accent_size, accent_cy),          # left
    ], fill=cyan)
    
    return img2


def draw_logo_clean(size, padding_pct=0.08, transparent_bg=True):
    """
    Draw a clean vector-style steering wheel + Y logo.
    This version uses antialiased rendering at 4x then downscales.
    """
    # Render at 4x for antialiasing
    render_size = size * 4
    img = Image.new('RGBA', (render_size, render_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    cx, cy = render_size / 2, render_size / 2
    padding = render_size * padding_pct
    
    navy = (10, 31, 60, 255)
    cyan = (0, 180, 216, 255)
    
    circle_r = (render_size / 2) - padding
    
    # Draw navy circle
    draw.ellipse(
        [cx - circle_r, cy - circle_r, cx + circle_r, cy + circle_r],
        fill=navy
    )
    
    # Define spoke angles (screen coords: 0=right, clockwise)
    up_left_angle = math.radians(240)
    up_right_angle = math.radians(300)
    down_angle = math.radians(90) # straight down is 90° in screen coords... 
    # Wait: in screen coordinates going clockwise from right:
    # Right = 0°, Down = 90°, Left = 180°, Up = 270°
    # So "up" is 270°. But the Y has the fork opening upward.
    # Y spokes: one going down (90°), two going upper-left and upper-right
    # Upper-left ≈ 220-240°, Upper-right ≈ 300-320°
    
    hub_r = circle_r * 0.18
    rim_inner = circle_r * 0.70
    spoke_w = circle_r * 0.22
    
    import numpy as np
    
    # Create ring cutout mask
    ring_mask = Image.new('L', (render_size, render_size), 0)
    rd = ImageDraw.Draw(ring_mask)
    rd.ellipse([cx-rim_inner, cy-rim_inner, cx+rim_inner, cy+rim_inner], fill=255)
    rd.ellipse([cx-hub_r, cy-hub_r, cx+hub_r, cy+hub_r], fill=0)
    
    # Create spoke mask
    spoke_mask = Image.new('L', (render_size, render_size), 0)
    sd = ImageDraw.Draw(spoke_mask)
    
    spoke_length = rim_inner * 1.2
    
    for angle in [up_left_angle, up_right_angle, down_angle]:
        dx = math.cos(angle)
        dy = math.sin(angle)
        px = -dy
        py = dx
        hw = spoke_w / 2
        pts = [
            (cx + px * hw, cy + py * hw),
            (cx + dx * spoke_length + px * hw, cy + dy * spoke_length + py * hw),
            (cx + dx * spoke_length - px * hw, cy + dy * spoke_length - py * hw),
            (cx - px * hw, cy - py * hw),
        ]
        sd.polygon(pts, fill=255)
    
    # Cutout = ring minus spokes
    ring_arr = np.array(ring_mask)
    spoke_arr = np.array(spoke_mask)
    cutout_arr = np.where((ring_arr > 0) & (spoke_arr == 0), 255, 0).astype(np.uint8)
    
    # Apply cutout (make transparent)
    img_arr = np.array(img)
    cutout_m = cutout_arr > 0
    img_arr[cutout_m] = [0, 0, 0, 0]
    
    img = Image.fromarray(img_arr)
    draw = ImageDraw.Draw(img)
    
    # Cyan diamond accent at top center (between the two upper spokes)
    accent_size = circle_r * 0.13
    accent_y = cy - hub_r * 0.5
    draw.polygon([
        (cx, accent_y - accent_size * 1.4),
        (cx + accent_size * 0.9, accent_y + accent_size * 0.1),
        (cx, accent_y + accent_size * 0.7),
        (cx - accent_size * 0.9, accent_y + accent_size * 0.1),
    ], fill=cyan)
    
    # Downscale with antialiasing
    img = img.resize((size, size), Image.LANCZOS)
    return img


def generate_with_box(size):
    """Generate icon with rounded rect border (for PWA/app icons)."""
    render_size = size * 4
    img = Image.new('RGBA', (render_size, render_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    cx, cy = render_size / 2, render_size / 2
    navy = (10, 31, 60, 255)
    cyan = (0, 180, 216, 255)
    white = (255, 255, 255, 255)
    
    # Rounded rectangle with cyan border
    border_w = render_size * 0.05
    r_outer = render_size * 0.20
    
    # Outer rect (cyan)
    draw.rounded_rectangle(
        [border_w, border_w, render_size - border_w, render_size - border_w],
        radius=r_outer,
        fill=cyan
    )
    
    # Inner rect (white)
    inner_m = border_w + render_size * 0.035
    r_inner = render_size * 0.16
    draw.rounded_rectangle(
        [inner_m, inner_m, render_size - inner_m, render_size - inner_m],
        radius=r_inner,
        fill=white
    )
    
    # Navy circle
    circle_r = render_size * 0.30
    draw.ellipse(
        [cx - circle_r, cy - circle_r, cx + circle_r, cy + circle_r],
        fill=navy
    )
    
    # Spokes and ring cutout
    import numpy as np
    
    up_left_angle = math.radians(240)
    up_right_angle = math.radians(300)
    down_angle = math.radians(90)
    
    hub_r = circle_r * 0.18
    rim_inner = circle_r * 0.70
    spoke_w = circle_r * 0.22
    spoke_length = rim_inner * 1.2
    
    ring_mask = Image.new('L', (render_size, render_size), 0)
    rd = ImageDraw.Draw(ring_mask)
    rd.ellipse([cx-rim_inner, cy-rim_inner, cx+rim_inner, cy+rim_inner], fill=255)
    rd.ellipse([cx-hub_r, cy-hub_r, cx+hub_r, cy+hub_r], fill=0)
    
    spoke_mask = Image.new('L', (render_size, render_size), 0)
    sd = ImageDraw.Draw(spoke_mask)
    
    for angle in [up_left_angle, up_right_angle, down_angle]:
        dx = math.cos(angle)
        dy = math.sin(angle)
        px = -dy
        py = dx
        hw = spoke_w / 2
        pts = [
            (cx + px * hw, cy + py * hw),
            (cx + dx * spoke_length + px * hw, cy + dy * spoke_length + py * hw),
            (cx + dx * spoke_length - px * hw, cy + dy * spoke_length - py * hw),
            (cx - px * hw, cy - py * hw),
        ]
        sd.polygon(pts, fill=255)
    
    ring_arr = np.array(ring_mask)
    spoke_arr = np.array(spoke_mask)
    cutout_arr = np.where((ring_arr > 0) & (spoke_arr == 0), 255, 0).astype(np.uint8)
    
    img_arr = np.array(img)
    cutout_m = cutout_arr > 0
    # Set cutout to white (since we're inside the white rounded rect)
    img_arr[cutout_m] = [255, 255, 255, 255]
    
    img = Image.fromarray(img_arr)
    draw = ImageDraw.Draw(img)
    
    # Cyan diamond accent
    accent_size = circle_r * 0.13
    accent_y = cy - hub_r * 0.5
    draw.polygon([
        (cx, accent_y - accent_size * 1.4),
        (cx + accent_size * 0.9, accent_y + accent_size * 0.1),
        (cx, accent_y + accent_size * 0.7),
        (cx - accent_size * 0.9, accent_y + accent_size * 0.1),
    ], fill=cyan)
    
    img = img.resize((size, size), Image.LANCZOS)
    return img


def main():
    import numpy as np
    
    # Generate favicon.png (32x32, just the circle logo no box)
    favicon = draw_logo_clean(32, padding_pct=0.02)
    favicon.save(os.path.join(PUBLIC_DIR, 'favicon.png'), 'PNG')
    print("✓ favicon.png (32x32)")
    
    # Generate favicon.ico (multi-size ICO: 16, 32, 48)
    ico_16 = draw_logo_clean(16, padding_pct=0.02)
    ico_32 = draw_logo_clean(32, padding_pct=0.02)
    ico_48 = draw_logo_clean(48, padding_pct=0.02)
    ico_16.save(
        os.path.join(PUBLIC_DIR, 'favicon.ico'),
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[ico_32, ico_48]
    )
    print("✓ favicon.ico (16/32/48)")
    
    # Generate apple-touch-icon.png (180x180, with box design)
    apple = generate_with_box(180)
    # Apple touch icon needs solid white background (no transparency)
    apple_bg = Image.new('RGBA', (180, 180), (255, 255, 255, 255))
    apple_bg.paste(apple, (0, 0), apple)
    apple_bg.save(os.path.join(PUBLIC_DIR, 'apple-touch-icon.png'), 'PNG')
    print("✓ apple-touch-icon.png (180x180)")
    
    # Generate icon-192.png (with box design)
    icon192 = generate_with_box(192)
    icon192_bg = Image.new('RGBA', (192, 192), (255, 255, 255, 255))
    icon192_bg.paste(icon192, (0, 0), icon192)
    icon192_bg.save(os.path.join(PUBLIC_DIR, 'icon-192.png'), 'PNG')
    print("✓ icon-192.png (192x192)")
    
    # Generate icon-512.png (with box design)
    icon512 = generate_with_box(512)
    icon512_bg = Image.new('RGBA', (512, 512), (255, 255, 255, 255))
    icon512_bg.paste(icon512, (0, 0), icon512)
    icon512_bg.save(os.path.join(PUBLIC_DIR, 'icon-512.png'), 'PNG')
    print("✓ icon-512.png (512x512)")
    
    print("\nTüm favicon ve ikon dosyaları başarıyla oluşturuldu!")


if __name__ == '__main__':
    main()
