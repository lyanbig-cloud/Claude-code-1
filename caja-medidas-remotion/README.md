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
| 0 → 167 | Acercamiento muy suave; la foto y las líneas se mueven juntas |
| 10 → 52 | **ANCHO**: aparecen las líneas de referencia, se dibuja la cota paralela a la arista frontal y entran las flechas y la etiqueta |
| 36 → 78 | **ALTO**: cota vertical junto a la arista derecha |
| 62 → 104 | **PROFUNDIDAD**: cota paralela a la arista que se aleja hacia el fondo |
| 106 | Entra «EL TAMAÑO Y EL DESTINO DETERMINAN LA TARIFA» palabra a palabra |
| 128 | Entra «NO EL PESO» en dorado, con filetes laterales |

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

## Capas editables (`src/schema.ts` o el panel de Remotion Studio)

- **Medidas** (`ancho`, `alto`, `profundidad`): texto, puntos de inicio y final, líneas de
  referencia, lado y distancia de la etiqueta, y frame de inicio. Las coordenadas están en
  píxeles de la foto original (941 × 1671), así que las líneas siguen pegadas a la caja
  aunque cambie el tamaño de salida.
- **Textos**: título y subtítulo.
- **Colores**: línea (blanco cálido), detalles dorados y título.
- **Otros**: duración del trazo de cada línea, tiempos del texto, intensidad del acercamiento y
  grano.

No hay medidas numéricas: las etiquetas solo nombran cada dimensión.
