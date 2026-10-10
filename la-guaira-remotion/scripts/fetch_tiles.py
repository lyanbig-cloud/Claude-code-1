"""Download AWS Terrain Tiles (Terrarium encoding) for every basemap layer.

Source: https://registry.opendata.aws/terrain-tiles/ (SRTM, GMTED, ETOPO1,
GEBCO among others; see their attribution list).
"""
import os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from layers import LAYERS, tile_range

OUT = sys.argv[1]
URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"


def get(job):
    z, x, y = job
    path = os.path.join(OUT, str(z), f"{x}_{y}.png")
    if os.path.exists(path):
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for attempt in range(4):
        try:
            urllib.request.urlretrieve(URL.format(z=z, x=x, y=y), path)
            return
        except Exception:
            if attempt == 3:
                raise


jobs = []
for spec in LAYERS.values():
    z = spec["zoom"]
    tx0, ty0, tx1, ty1 = tile_range(spec["bbox"], z)
    jobs += [(z, x, y) for x in range(tx0, tx1 + 1) for y in range(ty0, ty1 + 1)]
print(len(jobs), "tiles")
with ThreadPoolExecutor(16) as ex:
    list(ex.map(get, jobs))
print("done")
