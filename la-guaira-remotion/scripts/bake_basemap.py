"""Bake the cinematic basemap rasters from verifiable geographic data.

Inputs (see README):
  * AWS Terrain Tiles, Terrarium encoding  -> elevation + bathymetry
  * Natural Earth II land cover (NE2_HR_LC) -> natural ground colour
  * Natural Earth 10m land / minor islands / lakes -> coastline mask

Output: public/basemap/<layer>.jpg + public/basemap/manifest.json with each
layer's Web Mercator bounds (z0 world pixels) so Remotion can place it.

Usage: python bake_basemap.py <data_dir> <public_dir> [layer ...]
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from shapely.geometry import shape, box
from layers import LAYERS, TILE, tile_range

Image.MAX_IMAGE_PIXELS = None
DATA, PUBLIC = sys.argv[1], sys.argv[2]
OUT = os.path.join(PUBLIC, "basemap")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- look ----
SUN_AZIMUTH = 30.0      # degrees clockwise from north: light from the NNE,
SUN_ALTITUDE = 38.0     # matching the reference's top-right amber sun.
LAND_EXAGGERATION = {6: 4.0, 8: 2.6, 9: 2.0, 10: 1.7}
SEA_EXAGGERATION = {6: 10.0, 8: 7.0, 9: 6.0, 10: 5.0}

# Ocean palette indexed by depth in metres (petrol blue, turquoise shelves).
OCEAN_STOPS = [
    (0, (54, 114, 110)),
    (25, (42, 100, 106)),
    (150, (31, 87, 100)),
    (800, (22, 71, 88)),
    (2500, (16, 57, 75)),
    (5000, (12, 45, 62)),
]


def load_ne2():
    img = Image.open(os.path.join(DATA, "ne2", "NE2_HR_LC.tif"))
    # Crop generously around every layer: 60 px per degree, origin 180W/90N.
    w, s, e, n = -106, -24, -34, 44
    c0, r0 = int((w + 180) * 60), int((90 - n) * 60)
    c1, r1 = int((e + 180) * 60), int((90 - s) * 60)
    arr = np.asarray(img.crop((c0, r0, c1, r1)).convert("RGB"), np.float32) / 255
    return arr, (w, n)


def load_polys(name, bbox):
    clip = box(*bbox)
    out = []
    for f in json.load(open(os.path.join(DATA, name)))["features"]:
        g = shape(f["geometry"])
        if g.intersects(clip):
            g = g.intersection(clip)
            out += list(getattr(g, "geoms", [g]))
    return [p for p in out if p.geom_type == "Polygon"]


def mosaic(z, tr):
    tx0, ty0, tx1, ty1 = tr
    h, w = (ty1 - ty0 + 1) * TILE, (tx1 - tx0 + 1) * TILE
    elev = np.zeros((h, w), np.float32)
    for x in range(tx0, tx1 + 1):
        for y in range(ty0, ty1 + 1):
            t = np.asarray(Image.open(os.path.join(DATA, "terrarium", str(z), f"{x}_{y}.png")).convert("RGB"), np.float32)
            e = t[..., 0] * 256 + t[..., 1] + t[..., 2] / 256 - 32768
            elev[(y - ty0) * TILE:(y - ty0 + 1) * TILE, (x - tx0) * TILE:(x - tx0 + 1) * TILE] = e
    return elev


def pixel_lonlat(z, tr, h, w):
    n = TILE * 2 ** z
    xs = (tr[0] * TILE + np.arange(w) + 0.5) / n * 360 - 180
    ys = tr[1] * TILE + np.arange(h) + 0.5
    lats = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * ys / n))))
    return xs, lats


def rasterize(polys, z, tr, h, w, ss=3):
    n = TILE * 2 ** z
    img = Image.new("L", (w * ss, h * ss), 0)
    d = ImageDraw.Draw(img)

    def proj(coords):
        c = np.asarray(coords)
        x = ((c[:, 0] + 180) / 360 * n - tr[0] * TILE) * ss
        s = np.sin(np.radians(np.clip(c[:, 1], -85, 85)))
        y = ((0.5 - np.log((1 + s) / (1 - s)) / (4 * np.pi)) * n - tr[1] * TILE) * ss
        return list(zip(x, y))

    for kind, ps in polys:
        for p in ps:
            d.polygon(proj(p.exterior.coords), fill=255 if kind == "land" else 0)
            for hole in p.interiors:
                d.polygon(proj(hole.coords), fill=0 if kind == "land" else 255)
    return np.asarray(img.resize((w, h), Image.BOX), np.float32) / 255


def shade(elev, lats, z, exaggeration):
    m = 156543.03392 * np.cos(np.radians(lats))[:, None] / 2 ** z
    dz_row, dz_col = np.gradient(elev * exaggeration)
    dzde, dzdn = dz_col / m, -dz_row / m
    az, alt = math.radians(SUN_AZIMUTH), math.radians(SUN_ALTITUDE)
    lx, ly, lz = math.sin(az) * math.cos(alt), math.cos(az) * math.cos(alt), math.sin(alt)
    norm = np.sqrt(dzde ** 2 + dzdn ** 2 + 1)
    return (-dzde * lx - dzdn * ly + lz) / norm / lz  # 1.0 == flat ground


def fbm(h, w, seed, octaves=5):
    rng = np.random.default_rng(seed)
    acc = np.zeros((h, w), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        cell = max(2, int(min(h, w) / (6 * 2 ** o)))
        small = rng.standard_normal((h // cell + 2, w // cell + 2)).astype(np.float32)
        acc += amp * ndimage.zoom(small, cell, order=3)[:h, :w]
        total += amp
        amp *= 0.55
    acc /= total
    return acc / (acc.std() + 1e-6)


# NE2 is a pale, low-contrast land-cover tint. Derive two indices from it
# (humidity and bare rock) and remap them to a cinematic natural palette.
DRY, MID, WET = (0.60, 0.50, 0.33), (0.40, 0.41, 0.22), (0.19, 0.28, 0.13)
ROCK = (0.56, 0.50, 0.43)


def land_cover_palette(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    wet = np.clip((g - r - 0.024) / 0.13, 0, 1)
    rock = np.clip((b / ((r + g) / 2 + 1e-6) - 0.90) / 0.07, 0, 1)
    stops = np.array([DRY, MID, WET], np.float32)
    out = np.stack([np.interp(wet, [0, 0.5, 1], stops[:, i]) for i in range(3)], -1)
    return out * (1 - rock[..., None]) + np.array(ROCK) * rock[..., None]


def ocean_colour(depth):
    ld = np.log10(np.clip(depth, 0, None) + 1)
    keys = np.log10(np.array([d for d, _ in OCEAN_STOPS], np.float32) + 1)
    cols = np.array([c for _, c in OCEAN_STOPS], np.float32) / 255
    return np.stack([np.interp(ld, keys, cols[:, i]) for i in range(3)], -1)


def bake(name, spec, ne2, ne2_origin, polys):
    z = spec["zoom"]
    tr = tile_range(spec["bbox"], z)
    elev = mosaic(z, tr)
    h, w = elev.shape
    lons, lats = pixel_lonlat(z, tr, h, w)
    print(name, w, "x", h)

    land = rasterize(polys, z, tr, h, w)

    # Natural Earth II colour, resampled from plate carrée to Mercator.
    cols = (lons - ne2_origin[0]) * 60 - 0.5
    rows = (ne2_origin[1] - lats) * 60 - 0.5
    rr, cc = np.meshgrid(rows, cols, indexing="ij")
    ground = np.stack([ndimage.map_coordinates(ne2[..., i], [rr, cc], order=1, mode="nearest") for i in range(3)], -1)
    ground = ndimage.gaussian_filter(ground, (1.2 * 2 ** (z - 8), 1.2 * 2 ** (z - 8), 0)) if z >= 8 else ground

    # Natural Earth II leaves water white; fill it with the nearest land
    # colour so shorelines never inherit a pale fringe.
    ne2_water = ground.min(-1) > 0.96
    if ne2_water.any():
        idx = ndimage.distance_transform_edt(ne2_water, return_distances=False, return_indices=True)
        ground = ground[idx[0], idx[1]]
    ground = land_cover_palette(ground)

    # Relief: land and sea floor shaded separately.
    land_elev = np.where(land > 0.5, np.clip(elev, 0, None), 0)
    land_elev = ndimage.gaussian_filter(land_elev, 0.6)
    hs = shade(land_elev, lats, z, LAND_EXAGGERATION[z])
    relief = ndimage.gaussian_filter(land_elev, 18) - land_elev  # valleys > 0
    local = np.clip(-relief / 900.0, -0.25, 0.25)

    g = ground
    g = g * np.clip(0.42 + 0.58 * hs, 0.25, 1.55)[..., None]
    g = g * (1 + 0.35 * local)[..., None]
    # Altitude grading: highlands drier and lighter, as seen from orbit.
    hi = np.clip((land_elev - 1800) / 2600, 0, 1)[..., None]
    g = g * (1 - 0.25 * hi) + np.array([0.62, 0.52, 0.40]) * 0.25 * hi * np.clip(hs, 0.4, 1.4)[..., None]
    # Warm amber grade on land, moderate saturation.
    lum = g.mean(-1, keepdims=True)
    g = lum + (g - lum) * 0.92
    g = g * np.array([1.06, 0.99, 0.84])

    depth = np.where(land < 0.5, np.clip(-elev, 2, None), 2)
    depth = ndimage.gaussian_filter(depth, 1.0)
    sea = ocean_colour(depth)
    shs = shade(-depth, lats, z, SEA_EXAGGERATION[z])
    sea = sea * np.clip(0.80 + 0.22 * shs, 0.6, 1.25)[..., None]

    # Organic texture: gentle multi-scale noise, stronger on land.
    tex = fbm(h, w, seed=z * 7 + 3)
    g = g * (1 + 0.035 * tex)[..., None]
    sea = sea * (1 + 0.025 * tex)[..., None]

    m = land[..., None]
    rgb = g * m + sea * (1 - m)
    # Moderate S-curve.
    rgb = np.clip(rgb, 0, 1)
    rgb = rgb + 0.12 * (rgb - rgb ** 2) * (2 * rgb - 1)
    img = Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8))
    img.save(os.path.join(OUT, f"{name}.jpg"), quality=88, subsampling=0, optimize=True)

    n = TILE * 2 ** z
    return dict(
        file=f"basemap/{name}.jpg",
        zoom=z,
        width=w,
        height=h,
        # Bounds in z0 world pixels (0..256 across the globe).
        x0=tr[0] * TILE / n * 256,
        y0=tr[1] * TILE / n * 256,
        x1=(tr[2] + 1) * TILE / n * 256,
        y1=(tr[3] + 1) * TILE / n * 256,
    )


def main():
    ne2, origin = load_ne2()
    big = (-106, -24, -34, 44)
    land = load_polys("ne_10m_land.geojson", big) + load_polys("ne_10m_minor_islands.geojson", big)
    lakes = load_polys("ne_10m_lakes.geojson", big)
    polys = [("land", land), ("lake", lakes)]
    wanted = sys.argv[3:] or list(LAYERS)
    path = os.path.join(OUT, "manifest.json")
    manifest = json.load(open(path)) if os.path.exists(path) else {}
    for name in wanted:
        manifest[name] = bake(name, LAYERS[name], ne2, origin, polys)
        json.dump(manifest, open(path, "w"), indent=2)


if __name__ == "__main__":
    main()
