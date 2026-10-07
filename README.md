# LOVA Agency · prueba de motion (Remotion)

Composición `LovaTest`: 1920x1080, 60 fps, 600 frames (10 s).

```bash
npm install
npm run dev        # Remotion Studio para revisar
npm run render     # out/lova-test.mp4 (H.264)
```

## Estructura

- `src/constants.ts`: paleta oficial y todos los tiempos (frames absolutos).
- `src/fonts.ts`: Bricolage Grotesque SemiBold y Manrope Regular/SemiBold (`@remotion/google-fonts`).
- `src/brand/paths.ts`: vectores del manual (págs. 11 y 17) separados por letra y elemento. Se generan con `npm run extract-brand` desde `assets/manual.pdf`.
- `src/brand/guides.ts`: trazos guía por el centro de cada letra, usados solo como máscara. Se generan con `scripts/brand/centerline.py`.
- `src/brand/StrokeReveal.tsx`: técnica del trazo. La forma real se enmascara con su guía (stroke ancho + `stroke-dashoffset`).
- `src/scenes/`: una escena por archivo, más `layout.ts` (posiciones) y `fragments.ts` (fragmentos y puntos que pasan de la escena 3 a la 4).

## Escenas

1. **0–150**: punto Dove White con rebote. De él nace la "l" naranja, que se escribe a casi toda la altura del cuadro.
2. **150–300**: la "l" se estira en línea y sale de cuadro. Vuelve como 5 líneas paralelas y un barrido de líneas lleva a Beyond Blue.
3. **300–450**: se escriben "ll", "hi" y "a". La flor gira y se arma por pétalos. Entran "Estrategas", "Creativos" y "Coherentes" por máscara. Al final todo se rompe en fragmentos y puntos.
4. **450–600**: los puntos vuelan a la punta de cada letra mientras "lova" se escribe. Luego suben "agency" y el tagline. Del frame 540 al 600 todo queda quieto.

Sin audio: no hay `assets/music.mp3`. Si se agrega, se monta en `src/LovaTest.tsx` y se ajustan los golpes de `T`.
