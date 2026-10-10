"""Clip, simplify and project Natural Earth vectors for the SVG layers.

Writes src/geo/vectors.json with SVG path data in Web Mercator world units
(z0 world = 256 units, multiplied by WORLD_SCALE for integer-friendly
precision). The Remotion side applies the camera transform.

Usage: python build_vectors.py <data_dir> <out_json>
"""
import json, math, os, sys
from shapely.geometry import shape, box
from shapely.ops import unary_union, linemerge

DATA, OUT = sys.argv[1], sys.argv[2]
BBOX = (-90.0, -3.0, -52.0, 33.0)
WORLD_SCALE = 1000
TOL = 0.003  # degrees, ~330 m: sub-pixel at the closest framing


def world(lon, lat):
    s = math.sin(math.radians(lat))
    x = (lon + 180) / 360 * 256
    y = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * 256
    return x * WORLD_SCALE, y * WORLD_SCALE


def lines_of(g):
    if g.is_empty:
        return []
    if g.geom_type == "LineString":
        return [g]
    if g.geom_type in ("MultiLineString", "GeometryCollection"):
        return [l for part in g.geoms for l in lines_of(part)]
    if g.geom_type == "Polygon":
        return [g.exterior] + list(g.interiors)
    if g.geom_type == "MultiPolygon":
        return [l for p in g.geoms for l in lines_of(p)]
    return []


def to_path(geoms):
    out = []
    for g in geoms:
        for line in lines_of(g.simplify(TOL, preserve_topology=False)):
            pts = [world(x, y) for x, y in line.coords]
            if len(pts) < 2:
                continue
            out.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts))
    return "".join(out)


def features(name):
    return json.load(open(os.path.join(DATA, name)))["features"]


clip = box(*BBOX)


def clipped(feats, keep=lambda p: True):
    out = []
    for f in feats:
        if not keep(f["properties"]):
            continue
        g = shape(f["geometry"])
        if g.intersects(clip):
            out.append(g.intersection(clip))
    return out


def adm0(p):
    return {p.get(k) for k in ("ADM0_A3", "adm0_a3", "ADM0_A3_L", "ADM0_A3_R", "adm0_a3_l", "adm0_a3_r")}


land_borders = clipped(features("ne_10m_admin_0_boundary_lines_land.geojson"))
ven_borders = clipped(features("ne_10m_admin_0_boundary_lines_land.geojson"), lambda p: "VEN" in adm0(p))
other_borders = clipped(features("ne_10m_admin_0_boundary_lines_land.geojson"), lambda p: "VEN" not in adm0(p))
us_states = clipped(features("ne_10m_admin_1_states_provinces_lines.geojson"), lambda p: p.get("ADM0_A3") == "USA")
ven_states = clipped(features("ne_10m_admin_1_states_provinces_lines.geojson"), lambda p: p.get("ADM0_A3") == "VEN")
coast = clipped(features("ne_10m_coastline.geojson"))

countries = {f["properties"]["ADM0_A3"]: shape(f["geometry"]) for f in features("ne_10m_admin_0_countries.geojson")
             if f["properties"]["ADM0_A3"] in ("VEN",)}
ven_outline = countries["VEN"].intersection(clip)

json.dump(
    {
        "worldScale": WORLD_SCALE,
        "source": "Natural Earth 10m (public domain): admin_0_boundary_lines_land, admin_1_states_provinces_lines, coastline, admin_0_countries",
        "venezuelaBorder": to_path(ven_borders),
        "otherBorders": to_path(other_borders),
        "venezuelaStates": to_path(ven_states),
        "usStates": to_path(us_states),
        "coastline": to_path(coast),
        "venezuelaOutline": to_path([ven_outline]),
    },
    open(OUT, "w"),
)
print("wrote", OUT, os.path.getsize(OUT), "bytes")
