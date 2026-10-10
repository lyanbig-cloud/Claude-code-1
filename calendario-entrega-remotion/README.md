# Calendario · tiempo estimado de entrega (Remotion)

Motion graphic cinematográfico de **5 s a 24 fps (120 frames)**, formato vertical **2160 × 3840**.
Un calendario de escritorio, reconstruido con hojas independientes, pasa varias páginas
(septiembre → diciembre) y se detiene sobre la ventana de entrega. En el segundo 3 aparece
«6–10 SEMANAS» y, debajo, «TIEMPO ESTIMADO DE ENTREGA».

```
npm install
npm run studio     # editar y previsualizar
npm run render     # → out/calendario-entrega.mp4
```

> Sin acceso a la descarga de Chrome de Remotion, añade `--browser-executable=/ruta/a/chrome-headless-shell`.

## Línea de tiempo (frames a 24 fps)

| Frames | Evento |
|---|---|
| 0 → 119 | Acercamiento suave y continuo; la cámara se mantiene ligeramente inclinada |
| 10 → 29 / 23 → 42 / 36 → 55 | Pasan tres hojas: suben, cruzan sobre el espiral y caen por detrás |
| 56 → 86 | Se marca la ventana de entrega en la última hoja (celdas, íconos de paquete y flecha) |
| 72 (seg. 3) | Entra «6–10 SEMANAS» letra a letra |
| 86 | Entra «TIEMPO ESTIMADO DE ENTREGA» con filetes laterales |

## Cómo está construido

- **Hojas independientes** (`src/calendar/FlipPage.tsx`): cada hoja gira sobre el espiral y se
  divide en 12 franjas encadenadas en 3D. Cada franja añade una pequeña rotación, así el papel
  se curva de verdad y no gira como una tarjeta rígida. Mientras la hoja se levanta proyecta
  sombra sobre la siguiente.
- **Página** (`src/calendar/PageFace.tsx`): la cuadrícula del mes se calcula a partir de la fecha
  real. Lleva la textura de fibras de papel, perforaciones y una luz cálida a contraluz.
- **Planos de profundidad**: el fondo (puerto al atardecer) y el primer plano (cajas y libreta)
  salen de la imagen de referencia con desenfoque de lente. Se mueven con paralaje distinto
  para dar profundidad de campo. Se generan con `scripts/bake_plates.py`.
- **Acabado**: sol bajo cálido, viñeta y grano cinematográfico a 12 fps, como el de una película.

## Todo es editable (`src/schema.ts` o el panel de Remotion Studio)

- `textos.titulo` / `textos.subtitulo`
- `calendario.paginas`: los meses que pasan (mes y año). La cuadrícula se recalcula sola.
- `calendario.rangoInicio` / `rangoFin`: días marcados en la última hoja
- `calendario.meses`, `diasSemana` e `inicioSemana` (domingo o lunes)
- Colores, tiempos de cada evento, intensidad del acercamiento, inclinación y grano

Para cambiar el escenario, reemplaza `scripts/referencia.jpg` y ejecuta
`python scripts/bake_plates.py scripts/referencia.jpg public`.
