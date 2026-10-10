"""Build the photographic plates and textures from the reference image.

* fondo.jpg   - the reference, defocused, as the background plate (port at sunset)
* frente.png  - the in-focus foreground (parcels, notebook) with a feathered top edge,
                lightly defocused so it reads as the nearest depth plane
* papel.png   - tileable paper fibre texture (multiplied over every page)
* grano*.png  - film grain tiles

Usage: python bake_plates.py <reference.jpg> <public_dir>
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
W, H = 2160, 3840
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

ref = Image.open(SRC).convert("RGB")
big = ref.resize((W, H), Image.LANCZOS)

# Background: strong lens defocus. Two passes give a rounder, filmic falloff.
bg = big.filter(ImageFilter.GaussianBlur(26)).filter(ImageFilter.BoxBlur(10))
bg.save(os.path.join(OUT, "fondo.jpg"), quality=92, subsampling=0)

# Foreground: everything below the calendar's base in the reference.
top = int(1118 / ref.height * H)
feather = 90
fg = big.filter(ImageFilter.GaussianBlur(3.5)).convert("RGBA")
a = np.zeros((H, W), np.float32)
a[top:] = 1
a[top - feather:top] = np.linspace(0, 1, feather)[:, None]
# Between the two parcels the reference shows the bare table under the old
# calendar: keep that gap transparent so our calendar's base sits on it.
gap = np.zeros((H, W), np.float32)
x0, x1 = int(505 / ref.width * W), int(785 / ref.width * W)
y1 = int(1295 / ref.height * H)
gap[top - feather:y1, x0:x1] = 1
gap = ndimage.gaussian_filter(gap, 40)
a = a * (1 - np.clip(gap * 1.6, 0, 1))
fg.putalpha(Image.fromarray((a * 255).astype(np.uint8)))
fg.crop((0, top - feather, W, H)).save(os.path.join(OUT, "frente.png"), optimize=True)
print("frente top", top - feather)

# Paper fibres: fine noise + elongated horizontal fibres, tileable via wrap.
S = 1024
n = rng.standard_normal((S, S)).astype(np.float32)
fine = ndimage.gaussian_filter(n, 0.8, mode="wrap")
fibres = ndimage.gaussian_filter(rng.standard_normal((S, S)).astype(np.float32), (0.7, 6), mode="wrap")
blotch = ndimage.gaussian_filter(rng.standard_normal((S, S)).astype(np.float32), 40, mode="wrap")
p = 0.45 * fine / fine.std() + 0.4 * fibres / fibres.std() + 0.6 * blotch / blotch.std()
p = 236 + p * 7
Image.fromarray(np.clip(p, 0, 255).astype(np.uint8), "L").save(os.path.join(OUT, "papel.png"), optimize=True)

for i in range(6):
    g = ndimage.gaussian_filter(rng.standard_normal((512, 512)).astype(np.float32), 0.75)
    g = np.clip(128 + g / g.std() * 34, 0, 255).astype(np.uint8)
    Image.fromarray(g, "L").save(os.path.join(OUT, f"grano{i}.png"), optimize=True)
print("ok")
