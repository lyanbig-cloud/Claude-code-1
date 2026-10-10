#!/usr/bin/env bash
# Descarga las capas Natural Earth 10m (dominio público) usadas por construir-geo.mjs
set -euo pipefail
DEST="${1:?Uso: descargar-natural-earth.sh <carpeta>}"
mkdir -p "$DEST"
BASE=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
for f in ne_10m_admin_0_countries ne_10m_admin_1_states_provinces ne_10m_admin_0_disputed_areas \
         ne_10m_lakes ne_10m_rivers_lake_centerlines ne_10m_bathymetry_J_1000 ne_10m_bathymetry_H_3000; do
  [ -f "$DEST/$f.geojson" ] || curl -sSfL -o "$DEST/$f.geojson" "$BASE/$f.geojson"
  echo "✓ $f"
done
