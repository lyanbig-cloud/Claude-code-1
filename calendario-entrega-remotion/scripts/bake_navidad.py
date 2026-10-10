"""Background and foreground plates for the Christmas calendar piece.

The reference photo already contains a calendar; it is painted out of the
background (inpainting at low resolution, then a strong lens defocus) so the
code-built calendar can stand in its place. The flag, window light, tree and
gifts remain as soft out-of-focus shapes. The bottom of the photo (map and
passport on the desk) becomes a lightly defocused foreground plate.

Usage: python bake_navidad.py <referencia-navidad.jpg> <public_dir>
"""
import os, sys
import cv2
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
W, H = 2160, 3840
im = cv2.imread(SRC)
h, w = im.shape[:2]

# Original calendar (pages + black stand), generous.
cal = np.array([[165, 295], [885, 285], [885, 1400], [760, 1410], [165, 1345]], np.int32)
mask = np.zeros((h, w), np.uint8)
cv2.fillPoly(mask, [cal], 255)
# Normalised convolution: a smooth fill from the surroundings, without the
# streaks inpainting leaves over such a large area (it ends up defocused anyway).
keep = 1 - mask.astype(np.float32) / 255
filled = np.zeros_like(im, np.float32)
need = np.ones((h, w), bool)
for sigma in (60, 140, 320):  # wider kernels only where narrower ones lack support
    num = cv2.GaussianBlur(im.astype(np.float32) * keep[..., None], (0, 0), sigma)
    den = cv2.GaussianBlur(keep, (0, 0), sigma)
    ok = need & (den > 0.08)
    filled[ok] = num[ok] / den[ok][:, None]
    need &= ~ok
filled[need] = im.astype(np.float32)[keep > 0].mean(0)
soft = cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), 12)[..., None]
bg = im.astype(np.float32) * (1 - soft) + filled.astype(np.float32) * soft
bg = cv2.resize(bg.astype(np.uint8), (W, H), interpolation=cv2.INTER_LANCZOS4)
bg = cv2.GaussianBlur(bg, (0, 0), 30)
bg = cv2.GaussianBlur(bg, (0, 0), 10)
cv2.imwrite(os.path.join(OUT, "navidad-fondo.jpg"), bg, [cv2.IMWRITE_JPEG_QUALITY, 92])

# Foreground: desk items below the calendar's base.
top = int(1330 / h * H)
feather = 140
big = cv2.resize(im, (W, H), interpolation=cv2.INTER_LANCZOS4)
fg = cv2.GaussianBlur(big, (0, 0), 7)
a = np.zeros((H, W), np.float32)
a[top:] = 1
a[top - feather:top] = np.linspace(0, 1, feather)[:, None]
# The old calendar's black base reaches into this band: let the background show there.
stand = cv2.resize(cv2.dilate(mask, np.ones((15, 15))), (W, H), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255
a *= 1 - cv2.GaussianBlur(stand, (0, 0), 25)
rgba = np.dstack([fg, (a * 255).astype(np.uint8)])[top - feather:]
cv2.imwrite(os.path.join(OUT, "navidad-frente.png"), rgba)
print("frente top", top - feather)
