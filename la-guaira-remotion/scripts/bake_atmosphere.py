"""Procedural atmosphere textures: soft cloud banks and film grain tiles.

Usage: python bake_atmosphere.py <public_dir>
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = os.path.join(sys.argv[1], "atmosphere")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11)


def fbm(size, base_cell, octaves, persistence=0.5):
    acc = np.zeros((size, size), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        cell = max(1, int(base_cell / 2 ** o))
        n = size // cell + 3
        small = rng.standard_normal((n, n)).astype(np.float32)
        acc += amp * ndimage.zoom(small, cell, order=3)[:size, :size]
        total += amp
        amp *= persistence
    acc /= total
    return (acc - acc.mean()) / (acc.std() + 1e-6)


def cloud_bank(size, seed_shift, density):
    n = fbm(size, size / 4, 7, 0.55)
    # Radial falloff so each bank is an isolated soft mass.
    yy, xx = np.mgrid[0:size, 0:size] / size - 0.5
    fall = np.clip(1 - np.sqrt(xx ** 2 + yy ** 2) * 2.1, 0, 1) ** 1.3
    a = np.clip((n + density) * 0.55, 0, 1) * fall
    a = ndimage.gaussian_filter(a, size / 400)
    a = np.clip(a * 1.25, 0, 1) ** 1.25
    # Self-shadowing: lit from the top right, warm highlights, cool cores.
    lit = np.clip(0.5 + (a - np.roll(np.roll(a, 12, 0), -12, 1)) * 3.0, 0, 1)
    warm = np.array([1.0, 0.86, 0.68])
    shade = np.array([0.55, 0.55, 0.58])
    rgb = shade + (warm - shade) * lit[..., None]
    img = np.dstack([rgb, a[..., None] * 0.92])
    return Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), "RGBA")


for i, d in enumerate([0.05, -0.15, 0.2]):
    cloud_bank(1536, i, d).save(os.path.join(OUT, f"cloud{i}.png"), optimize=True)

# Film grain: a few independent tiles cycled per frame.
for i in range(6):
    g = rng.standard_normal((512, 512)).astype(np.float32)
    g = ndimage.gaussian_filter(g, 0.7)
    g = np.clip(128 + g / g.std() * 34, 0, 255).astype(np.uint8)
    Image.fromarray(g, "L").save(os.path.join(OUT, f"grain{i}.png"), optimize=True)
print("ok")
