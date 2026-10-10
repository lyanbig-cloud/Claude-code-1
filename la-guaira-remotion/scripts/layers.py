"""Shared definitions: Web Mercator math and raster layer extents."""
import math

# Raster layers baked for the basemap. Each is a Web Mercator mosaic at a
# fixed tile zoom; extents are in degrees (west, south, east, north).
LAYERS = {
    "z6": dict(zoom=6, bbox=(-104.0, -22.0, -36.0, 42.0)),
    "z8": dict(zoom=8, bbox=(-82.0, -1.0, -54.0, 25.0)),
    "z9": dict(zoom=9, bbox=(-74.5, 4.6, -63.0, 13.8)),
}
TILE = 256


def lonlat_to_world(lon, lat, zoom=0):
    """Web Mercator world pixel at the given zoom (z0 world = 256 px)."""
    n = TILE * 2 ** zoom
    x = (lon + 180.0) / 360.0 * n
    s = math.sin(math.radians(lat))
    y = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n
    return x, y


def tile_range(bbox, zoom):
    w, s, e, n = bbox
    x0, y0 = lonlat_to_world(w, n, zoom)
    x1, y1 = lonlat_to_world(e, s, zoom)
    return (int(x0 // TILE), int(y0 // TILE), int(x1 // TILE), int(y1 // TILE))
