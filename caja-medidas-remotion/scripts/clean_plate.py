"""Remove the baked-in measurement graphics from the approved photo.

The reference already carries arrows, dashed extension ticks and three empty
label boxes. They are rebuilt as editable animated layers in Remotion, so the
photo plate must be clean. Only pixels inside the overlay zones are touched
(thin bands around each known graphic + the label boxes); the box itself is
never altered except where a 3 px dashed tick crossed its edge.

Inpainting (Telea) fills the gaps, then the fine texture of the floor/wall is
restored by borrowing the high-frequency detail of a neighbouring patch, so
the repaired areas keep the photo's grain instead of looking smeared.

Usage: python clean_plate.py <referencia.jpg> <public_dir>
"""
import os, sys
import cv2
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
im = cv2.imread(SRC)
H, W = im.shape[:2]

# ---- Overlay zones (source pixels) --------------------------------------
zone = np.zeros((H, W), np.uint8)
lines = [
    ((842, 618), (842, 1072), 34),   # height arrow (wide: removes its halo too)
    ((809, 627), (870, 627), 20),    # top extension dashes (stop short of the box corner)
    ((809, 1063), (870, 1063), 20),  # bottom extension dashes
    ((336, 1193), (806, 1086), 24),  # width arrow
    ((92, 1020), (322, 1188), 24),   # depth arrow
    ((95, 948), (95, 1050), 12),     # left tick
    ((317, 1116), (317, 1218), 10),  # front ticks
    ((333, 1126), (333, 1220), 10),
    ((803, 1018), (803, 1114), 12),  # right tick
]
for a, b, w in lines:
    cv2.line(zone, a, b, 255, w)
labels = [(745, 802, 915, 864), (35, 1100, 208, 1162), (524, 1162, 723, 1226)]
label_mask = np.zeros((H, W), np.uint8)
for x0, y0, x1, y1 in labels:
    cv2.rectangle(label_mask, (x0 - 9, y0 - 9), (x1 + 9, y1 + 9), 255, -1)

# Inside the line zones keep only what is actually painted (bright, warm
# white) plus its soft halo; label boxes are replaced entirely.
b, g, r = [im[..., i].astype(np.int32) for i in range(3)]
painted = ((np.minimum(np.minimum(r, g), b) > 120) & ((r - b) < 95)).astype(np.uint8) * 255
painted = cv2.bitwise_and(painted, zone)
painted = cv2.dilate(painted, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
# Over the smooth dark wall the arrow's warm halo extends past the white
# core, so the whole band is replaced there.
wall = np.zeros((H, W), np.uint8)
for a, b_, w in lines[:3]:
    cv2.line(wall, a, b_, 255, w)
mask = cv2.bitwise_or(cv2.bitwise_or(painted, label_mask), wall)

# ---- 1. Inpaint everything that is a graphic -----------------------------
src = im.astype(np.float32)
base = cv2.inpaint(im, mask, 9, cv2.INPAINT_TELEA).astype(np.float32)
low = lambda x, s: cv2.GaussianBlur(x, (0, 0), s)
detail = base - low(base, 2.5)
out = base.copy()
masked = mask > 0

# ---- 2. Thin lines: restore grain from clean texture 30 px away ---------
# Sources must be clean floor/wall: never another graphic, never the box.
box_poly = np.array([[93, 603], [520, 545], [808, 626], [808, 1060], [330, 1163], [93, 1008]], np.int32)
box = np.zeros(masked.shape, np.uint8)
cv2.fillPoly(box, [box_poly], 255)
box = cv2.dilate(box, np.ones((9, 9))) > 0
line_mask = cv2.bitwise_or(painted, wall) > 0
done = np.zeros(masked.shape, bool)
for dx, dy in [(30, 0), (0, 30), (0, -30), (-30, 0), (0, 55), (0, -55)]:
    src_ok = ~np.roll(np.roll(masked | box, dy, 0), dx, 1)
    ok = line_mask & src_ok & ~done
    out[ok] += np.roll(np.roll(detail, dy, 0), dx, 1)[ok]
    done |= ok

# ---- 3. Label boxes: real texture from a clean patch above/below --------
# Vertical shifts keep the box's right edge continuous where the ALTO label
# covered it; the patch is re-lit to the inpainted light falloff.
shifts = [-80, 80, 78]
for (x0, y0, x1, y1), dy in zip(labels, shifts):
    x0, y0, x1, y1 = x0 - 14, y0 - 14, x1 + 14, y1 + 14
    patch = base[y0 + dy:y1 + dy, x0:x1]
    patch = patch - low(patch, 10) + low(base[y0:y1, x0:x1], 10)
    region = (mask[y0:y1, x0:x1] > 0).astype(np.float32)
    feather = np.clip(cv2.GaussianBlur(cv2.dilate(region, np.ones((9, 9))), (0, 0), 3), 0, 1)[..., None]
    out[y0:y1, x0:x1] = out[y0:y1, x0:x1] * (1 - feather) + patch * feather

soft = np.clip(cv2.GaussianBlur(cv2.dilate(mask, np.ones((3, 3))).astype(np.float32) / 255, (0, 0), 1.0), 0, 1)[..., None]
out = src * (1 - soft) + out * soft
cv2.imwrite(os.path.join(OUT, "_mask.png"), mask)
clean = np.clip(out, 0, 255).astype(np.uint8)
cv2.imwrite(os.path.join(OUT, "_clean_src.png"), clean)

# ---- Upscale to the 2160x3840 delivery frame ----------------------------
big = cv2.resize(clean, (2160, int(round(H * 2160 / W))), interpolation=cv2.INTER_LANCZOS4)
blur = cv2.GaussianBlur(big, (0, 0), 1.6)
big = cv2.addWeighted(big, 1.35, blur, -0.35, 0)  # gentle unsharp after upscale
big = cv2.resize(big, (2160, 3840), interpolation=cv2.INTER_AREA) if big.shape[0] != 3840 else big
cv2.imwrite(os.path.join(OUT, "placa.jpg"), big, [cv2.IMWRITE_JPEG_QUALITY, 94])
print("plate", big.shape, "masked px", int((mask > 0).sum()))
