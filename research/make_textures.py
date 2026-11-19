"""Globe textures for the website from NASA imagery (public domain).

Inputs  (research/data/raw/nasa/, not shipped):
  world.topo.bathy.200403.3x5400x2700.jpg  NASA Blue Marble Next Generation, March 2004, with topography
                                           and bathymetry shading (Stockli et al., NASA Earth Observatory)
  BlackMarble_2016_3km.jpg                 NASA Black Marble 2016 night lights
Outputs (web/public/textures/):
  earth_day.jpg    4096x2048  satellite colour with shaded relief (terrain look)
  earth_night.jpg  4096x2048  city lights, for the night side
  earth_water.png  2048x1024  water mask (white = water) for sun glint on oceans
No political borders exist in either source image.
Run: research/.venv/Scripts/python -I research/make_textures.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = 120_000_000  # Black Marble is 13500x6750 (a known, trusted NASA file)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "research", "data", "raw", "nasa")
OUT = os.path.join(ROOT, "web", "public", "textures")
os.makedirs(OUT, exist_ok=True)

day = Image.open(os.path.join(RAW, "world.topo.bathy.200403.3x5400x2700.jpg")).convert("RGB")
day4 = day.resize((4096, 2048), Image.LANCZOS)
day4.save(os.path.join(OUT, "earth_day.jpg"), quality=86, optimize=True, progressive=True)

night = Image.open(os.path.join(RAW, "BlackMarble_2016_3km.jpg")).convert("RGB")
night4 = night.resize((4096, 2048), Image.LANCZOS)
night4.save(os.path.join(OUT, "earth_night.jpg"), quality=82, optimize=True, progressive=True)

# water mask by hue: the bathymetry shading varies ocean brightness a lot, but its hue stays blue.
hsv = np.asarray(day.resize((2048, 1024), Image.LANCZOS).convert("HSV")).astype(np.float32)
h, s_, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
water = (h > 175) & (h < 265) & (s_ > 0.18) & (v < 0.85)
mask = Image.fromarray((water * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
mask.save(os.path.join(OUT, "earth_water.png"), optimize=True)

for f in ("earth_day.jpg", "earth_night.jpg", "earth_water.png"):
    p = os.path.join(OUT, f)
    print(f, Image.open(p).size, f"{os.path.getsize(p) / 1e6:.2f} MB")
print("water fraction:", round(float(water.mean()), 3), "(Earth is ~0.71 water)")
