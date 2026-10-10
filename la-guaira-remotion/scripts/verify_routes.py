"""Check that every illustrative route stays on water.

Samples the same uniform Catmull-Rom spline used in src/geo/spline.ts and
tests each sample against Natural Earth 10m land (+ minor islands).

Usage: python verify_routes.py <data_dir> <geography.json>
"""
import json, os, sys
import numpy as np
from shapely.geometry import shape, Point, box
from shapely.ops import unary_union
from shapely.prepared import prep

DATA, GEO = sys.argv[1], sys.argv[2]
geo = json.load(open(GEO))
allpts = [p for r in geo["routes"].values() for p in r["points"]] + [p["coord"] for p in geo["places"].values()]
xs, ys = [p[0] for p in allpts], [p[1] for p in allpts]
clip = box(min(xs) - 1, min(ys) - 1, max(xs) + 1, max(ys) + 1)
polys = []
for name in ("ne_10m_land.geojson", "ne_10m_minor_islands.geojson"):
    for f in json.load(open(os.path.join(DATA, name)))["features"]:
        g = shape(f["geometry"])
        if g.intersects(clip):
            polys.append(g.intersection(clip))
land = unary_union(polys)
inside = prep(land)


def catmull_rom(pts, n=60):
    p = np.array(pts, float)
    p = np.vstack([p[0], p, p[-1]])
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(p[-1])
    return np.array(out)


ok = True
for name, r in geo["routes"].items():
    s = catmull_rom(r["points"])
    bad = [tuple(np.round(q, 3)) for q in s if inside.contains(Point(*q))]
    print(f"{name:16s} {len(s):4d} samples, on land: {len(bad)}", bad[:5])
    ok &= not bad
for name, p in geo["places"].items():
    pt = Point(*p["coord"])
    print(f"{name:16s} {'land ' if inside.contains(pt) else 'water'} {land.boundary.distance(pt) * 111:.2f} km from NE coastline")
sys.exit(0 if ok else 1)
