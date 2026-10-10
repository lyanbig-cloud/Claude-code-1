# Documental · Envíos de cajas Tampa → Venezuela

Motion graphics para un documental informativo de ~2 minutos, construidos con
**Remotion + React + TypeScript**, **Three.js / React Three Fiber** (caja 3D) y
**SVG** (mapas, cotas, calendario). Exportación con **FFmpeg** vía Remotion.

| Formato | Valor |
|---|---|
| Resolución | 2160 × 3840 px (9:16) |
| Fotogramas por segundo | 24 |
| Exportación principal | MP4 H.264 (CRF 14, `yuv420p`, BT.709) |
| Exportación con alfa | MOV ProRes 4444 (`yuva444p10le`) |

## Composiciones

Remotion solo admite letras, números y guiones en los ID, por eso cada composición
se registra con guiones y se **exporta** con el nombre solicitado (guiones bajos).

| Archivo exportado | ID en Remotion | Duración por defecto | Contenido |
|---|---|---|---|
| `01_Rutas_Maritimas` | `01-Rutas-Maritimas` | 20 s | Mapa del Caribe, ruta Miami → La Guaira que se dibuja con buque, Venezuela se ilumina |
| `02_Tiempo_Entrega` | `02-Tiempo-Entrega` | 15 s | Esfera de reloj, cifra de tiempo y riel Tampa → Venezuela con caja en movimiento |
| `03_Tampa_Miami_Venezuela` | `03-Tampa-Miami-Venezuela` | 20 s | Plano cerrado de Florida (Tampa → Miami) y alejamiento de cámara hasta Venezuela; indicador de 3 etapas |
| `04_Ciudades_Destino` | `04-Ciudades-Destino` | 20 s | Venezuela con estados, ríos y lagos; las ciudades aparecen en secuencia con contador |
| `05_Diez_Anos_Servicio` | `05-Diez-Anos-Servicio` | 15 s | Cifra “10” en dorado metálico con barrido de luz, línea de tiempo de 10 segmentos |
| `06_Dimensiones_Caja` | `06-Dimensiones-Caja` | 15 s | Caja de cartón 3D (Three.js) con textura procedimental, cinta y cotas animadas |
| `07_Calendario_Navidad` | `07-Calendario-Navidad` | 15 s | Calendario real del mes (diciembre 2026 por defecto), fechas festivas y fecha límite |

Total por defecto: **120 s**. Cada duración se cambia con el parámetro `duracionSegundos`;
todas las animaciones están definidas como fracciones de la duración, así que se adaptan.

## Uso

```bash
npm install
npm run dev            # Remotion Studio: vista previa y edición de parámetros de cada composición
npm run typecheck
npm run storyboard     # hojas de contacto de baja resolución en previa/ (no renderiza videos)
```

### Exportar (solo tras aprobar las animaciones)

```bash
npm run render:01                          # out/01_Rutas_Maritimas.mp4
npm run render -- 06 --alfa                # out/06_Dimensiones_Caja_alfa.mov (fondo transparente)
npm run render -- 04 --props=props/04.json # con parámetros propios
npm run render -- 03 --borrador            # previa/03_..._borrador.mp4 a ¼ de resolución
```

- En equipos sin GPU: `GL=swangle npm run render:06`.
- Si Chrome no se puede descargar: `CHROME_EXECUTABLE=/ruta/a/chrome-headless-shell`.

## Parámetros editables

Cada composición tiene un esquema **zod**, por lo que todos los parámetros se editan
visualmente en Remotion Studio (panel derecho) o por JSON con `--props`.
Comunes a todas: `duracionSegundos`, `fondoTransparente`, textos de título.

### Datos comerciales pendientes

No se ha inventado ningún dato comercial. Mientras un dato no se suministre, la
animación muestra el sello **“DATO POR CONFIRMAR”** y valores `00`:

| Composición | Parámetro | Valor por defecto |
|---|---|---|
| 02 | `tiempoMinimo`, `tiempoMaximo`, `unidad` | `null`, `null`, `"semanas"` |
| 04 | `ciudades` | lista **de muestra** (10 ciudades reales); `listaPorConfirmar: true` |
| 05 | `anioInicio` | `null` (no se muestran años) |
| 06 | `largo`, `ancho`, `alto`, `unidad` | `null` (se dibuja un cubo), `"pulg."` |
| 07 | `fechaLimite` | `null` |
| 01 / 03 | `rutaId` (puerto de destino) | `miami-la-guaira` (alternativa: `miami-puerto-cabello`) |

Ejemplo de `props/02.json`:

```json
{"tiempoMinimo": 3, "tiempoMaximo": 5, "unidad": "semanas"}
```

## Datos geográficos (reales)

- **Costas, países, estados de Venezuela, lagos, ríos, batimetría (1000 m / 3000 m)
  y Guayana Esequiba**: [Natural Earth](https://www.naturalearthdata.com/) 1:10m, dominio público.
- **Coordenadas de ciudades**: [GeoNames](https://www.geonames.org/) (CC BY 4.0) vía el paquete `all-the-cities`.
- **Proyección**: Mercator (d3-geo). La geometría se proyecta una sola vez y la cámara es una
  transformación afín, así que los movimientos son exactos y deterministas.
- **Rutas marítimas** (`src/data/rutas-maritimas.json`): trayectos esquemáticos por pasos marítimos
  reales (Estrecho de Florida, Canal Viejo de Bahamas, Paso de los Vientos, Mar Caribe). El script de
  datos **verifica que la curva suavizada no toque tierra** en ningún punto.
- **Tampa → Miami**: arco esquemático; no representa una carretera ni un medio de transporte concreto.
- **Límites**: se usan los límites de facto de Natural Earth. La Guayana Esequiba puede mostrarse como
  zona en reclamación con `mostrarZonaEnReclamacion: true` (composición 04).

Regenerar los datos:

```bash
bash scripts/descargar-natural-earth.sh /tmp/ne
node scripts/construir-geo.mjs /tmp/ne
```

## Estructura

```
src/
  Root.tsx                  registro de las 7 composiciones (carpeta en Studio)
  compositions/             una composición por archivo, con esquema y valores por defecto
  components/               Escena (fondo, luz, grano, viñeta), Titulo, MapaBase,
                            ElementosMapa (marcadores, rótulos, rutas), VeloMapa, PorConfirmar…
  lib/                      tema (paleta/tipografía), animación (curvas), mapa (proyección/cámara)
  data/                     lugares.json, rutas-maritimas.json, geo/*.json (generados)
public/fonts/               Cormorant Garamond y Barlow (OFL), cargadas localmente
scripts/                    storyboard, render, generación y validación de datos geográficos
```

## Dirección de arte

- Paleta: negro carbón, marrón oscuro, ámbar, dorado suave, beige y azul petróleo (océano).
- Tipografía: Cormorant Garamond (títulos, cifras) + Barlow Condensed (rótulos).
- Movimiento: curvas bézier de aceleración/desaceleración (`src/lib/animacion.ts`), todo con
  `interpolate()` de Remotion ligado al fotograma. Sin animaciones CSS ni dependencias de tiempo real.
- Grano de película determinista (semilla por fotograma), viñeta y luz cálida con deriva lenta.
