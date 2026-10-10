# Caja · medidas y tarifa (Remotion)

Composición cinematográfica de **7 s a 24 fps (168 frames)**, formato vertical **2160 × 3840**,
construida sobre la foto aprobada de la caja de cartón.

```
npm install
npm run studio     # editar y previsualizar
npm run render     # → out/medidas-caja.mp4
```

## Línea de tiempo (frames a 24 fps)

| Frames | Evento |
|---|---|
| 0 → 30 | Plano completo; la caja se eleva del suelo y queda flotando suavemente; su sombra se abre y se aclara |
| 36 → 74 | La cámara se acerca y sigue de cerca la cota **ANCHO** mientras se dibuja; al terminar encuadra la línea completa con su etiqueta |
| 68 → 106 | Viaja hasta **ALTO** y lo sigue de abajo hacia arriba |
| 100 → 138 | Viaja hasta **PROFUNDIDAD** y la sigue hacia el fondo |
| 138 → 167 | Se aleja hasta el plano completo con las tres medidas |

La cámara se calcula a partir de la posición de la punta de cada línea y se suaviza con un filtro
gaussiano en el tiempo (`camara.suavidad`), así que nunca hay saltos. No muestra nada fuera de
la foto.

El título «EL TAMAÑO Y EL DESTINO…» y el subtítulo «NO EL PESO» están desactivados por defecto
(`textos.mostrarTitulo`).

## La foto

`scripts/clean_plate.py` quita de la foto las flechas y los tres recuadros vacíos que ya traía
dibujados, para que las medidas sean capas propias:

- Solo actúa sobre las zonas de esos gráficos. La caja no se toca, salvo donde una línea
  discontinua de 3 px cruzaba su borde, y ahí solo se rellena con el cartón vecino.
- En el suelo y la pared se rellena con textura real copiada de zonas cercanas, para que no
  queden manchas.
- Después escala la foto a 2160 × 3840 (`public/placa.jpg`) con un enfoque suave.

La luz y la perspectiva son las de la foto original. Encima solo se añaden una viñeta ligera
y grano.

## La caja que se eleva

`scripts/build_layers.py` separa la foto limpia en dos capas:

- **`caja.png`**: la caja recortada con GrabCut, con bordes suavizados. Sus píxeles son los de
  la foto, sin cambios.
- **`fondo.jpg`**: la foto con la franja de suelo que queda al descubierto cuando la caja sube
  (hasta 40 px de la foto), rellenada a partir del suelo vecino.

Entre ambas capas, Remotion dibuja la sombra de la base de la caja, que se vuelve más suave y
más clara a medida que la caja sube. Las líneas de medida se mueven con la caja.

## Capas editables (`src/schema.ts` o el panel de Remotion Studio)

- **Medidas** (`ancho`, `alto`, `profundidad`): texto, puntos de inicio y final, líneas de
  referencia, lado y distancia de la etiqueta, y frame de inicio. Las coordenadas están en
  píxeles de la foto original (941 × 1671), así que las líneas siguen pegadas a la caja
  aunque cambie el tamaño de salida.
- **Textos**: título y subtítulo.
- **Colores**: línea (blanco cálido), detalles dorados y título.
- **Cámara**: zoom de seguimiento y suavidad del movimiento.
- **Caja**: altura de elevación, frame en que termina de subir y amplitud de la flotación.
- **Otros**: duración del trazo de cada línea, tiempos del texto y grano.

No hay medidas numéricas: las etiquetas solo nombran cada dimensión.
