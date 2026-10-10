# La Guaira · rutas marítimas (Remotion)

Animación documental de **7 s a 24 fps (168 frames)**, formato vertical **2160 × 3840**.
Un acercamiento cinematográfico hacia La Guaira presenta su marcador y una ruta marítima
ilustrativa. Después representa la interrupción de esa ruta y dibuja dos alternativas,
hacia Puerto Cabello y hacia Zulia (Puerto de Maracaibo).

El mapa no copia la imagen de referencia: se reconstruye a partir de datos geográficos
públicos y verificables. De la referencia solo se toma el estilo (luz ámbar, océano azul
petróleo, relieve natural y contraste moderado).

```
npm install
npm run studio        # editar y previsualizar en Remotion Studio
npm run render        # → out/la-guaira-rutas.mp4 (H.264, CRF 16)
```

> En entornos sin acceso a la descarga de Chrome de Remotion, añade
> `--browser-executable=/ruta/a/chrome-headless-shell` al comando.

## Línea de tiempo (frames a 24 fps)

| Frames | Evento |
|---|---|
| 0 → 96 | Acercamiento de cámara desde el mar Caribe hacia La Guaira |
| 10 | Aparece el marcador de La Guaira (mástil, anillo en el terreno y etiqueta) |
| 16 → 68 | Se traza la ruta marítima ilustrativa (desde el Paso de la Mona) |
| 74 → 92 | Interrupción: el tramo final se corta, cambia a rojo apagado y se detiene; aparece el aviso «RUTA INTERRUMPIDA» |
| 84 → 162 | Reencuadre hacia el oeste para incluir Zulia (se solapa con el acercamiento para que la cámara no se detenga) |
| 96 → 128 | Alternativa 1 hacia Puerto Cabello; su marcador aparece al llegar |
| 100 → 150 | Alternativa 2 hacia Zulia, que rodea Paraguaná y entra por el estrecho de Maracaibo |
| 150 → 168 | Plano final |

Todos los tiempos están en `src/schema.ts` → `tiempos` y `camara` y se pueden editar desde el panel de Remotion Studio.

## Capas independientes y editables

| Capa | Archivo | Qué contiene |
|---|---|---|
| Mapa base (raster) | `src/layers/Basemap.tsx` + `public/basemap/*.jpg` | 3 niveles de detalle (z6/z8/z9) en Web Mercator, que se funden según el zoom |
| Fronteras y costa | `src/layers/Borders.tsx` | Vectores de Natural Earth: frontera de Venezuela, otras fronteras, estados y línea de costa |
| Rótulos del mapa | `src/layers/MapLabels.tsx` | Nombres «pintados» sobre el terreno (VENEZUELA, MAR CARIBE, islas…) |
| Rutas | `src/layers/RouteLayer.tsx` | Trazos discontinuos con avance, flujo, cabeza de trazado y nodo de bifurcación |
| Marcadores | `src/layers/Markers.tsx` | `GroundRing` (sobre el terreno), `Pin` (mástil con etiqueta en vertical) y `CutMark` (interrupción) |
| Atmósfera | `src/layers/Atmosphere.tsx` | Nubes con sombra proyectada, bruma de perspectiva aérea, sol ámbar, viñeta y grano |

Todo se calcula por frame (`useCurrentFrame`), así que cada capa está sincronizada con la línea de tiempo.
Los pines y etiquetas se mantienen verticales fuera del plano inclinado. Su posición se obtiene con
la misma matemática de perspectiva que el CSS del plano (`src/geo/projection.ts`) y por eso coinciden
exactamente con el terreno.

**Textos, colores y cámara** → `src/schema.ts` (esquema zod editable en Studio).
**Coordenadas y rutas** → `src/geo/geography.json` (única fuente de verdad geográfica).

## Datos y verificación

| Dato | Fuente |
|---|---|
| Puertos | Natural Earth 10m `ports`, derivado del World Port Index de la NGA. La Guaira `ne_id 1730089331`, Puerto Cabello `ne_id 1730088995`, Maracaibo `ne_id 1730089333` |
| Costa, tierra, lagos, islas, fronteras y estados | Natural Earth 10m (dominio público) |
| Elevación y batimetría | AWS Terrain Tiles, codificación Terrarium (SRTM, GMTED2010, ETOPO1, entre otras fuentes) |
| Color natural del suelo | Natural Earth II, cobertura terrestre (`NE2_HR_LC`), recoloreado a una paleta cinematográfica |

Las rutas son **ilustrativas**. No representan derrotas reales de navegación. Sus puntos de paso se
interpolan con la misma spline Catmull-Rom en TypeScript y en Python, y `scripts/verify_routes.py`
comprueba que cada muestra quede sobre agua según la costa de Natural Earth 10m:

```
main              421 samples, on land: 0
toPuertoCabello   181 samples, on land: 0
toZulia           541 samples, on land: 0
```

### Regenerar los datos

```
pip install numpy scipy pillow shapely
# descarga Natural Earth (vectores GeoJSON + NE2_HR_LC.tif) en <data>, luego:
python scripts/fetch_tiles.py <data>/terrarium
python scripts/bake_basemap.py <data> public          # o solo una capa: ... public z9
python scripts/bake_atmosphere.py public
python scripts/build_vectors.py <data> src/geo/vectors.json
python scripts/verify_routes.py <data> src/geo/geography.json
```

Atribución del relieve (Terrain Tiles): SRTM (NASA/USGS), GMTED2010 (USGS), ETOPO1 (NOAA);
consulta la lista completa en https://github.com/tilezen/joerd/blob/master/docs/attribution.md.
Natural Earth es de dominio público (naturalearthdata.com).
