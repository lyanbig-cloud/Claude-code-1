# Panel Higgsfield · Dímelo Big Productions

Panel local para generar video con la API de Higgsfield, organizado por cliente y con control de gasto.
Funciona en tu computadora: un pequeño servidor local habla con Higgsfield y tu API key **nunca llega al navegador**.

## Primera vez (5 minutos)

1. Instala **Node.js LTS** desde <https://nodejs.org> (si no lo tienes).
2. En esta carpeta, copia `.env.example` como `.env` y pega tu key de <https://console.higgsfield.ai>:
   ```
   HF_API_KEY_ID=tu-key-id
   HF_API_KEY_SECRET=tu-key-secret
   ```
   `.env` está en `.gitignore`: nunca se sube a GitHub. No pegues la key en ningún chat.
3. Abre el panel (ver abajo) y en ⚙ **Ajustes** escribe tu saldo actual de la API.

## Abrir el panel cada día

- **Mac:** doble clic en `Abrir Panel Higgsfield.command`. Para tenerlo a mano, arrástralo al Dock o crea un alias en el Escritorio (clic derecho → Crear alias).
- **Windows:** doble clic en `Abrir Panel Higgsfield.bat`. Para tenerlo a mano: clic derecho → Enviar a → Escritorio (crear acceso directo).
- **Comando exacto** (desde la terminal, en la carpeta del repositorio):
  ```
  cd panel-higgsfield && npm start
  ```
  y abre <http://127.0.0.1:4321>.

Deja abierta la ventana de la terminal mientras uses el panel; ciérrala para apagarlo.

## Qué hace cada modo

| Modo | Modelos | Qué subes |
|---|---|---|
| Crear desde cero | Seedance 2.5, Kling 3.0 | Prompt + fotos/videos de referencia opcionales |
| Cambiar fondo | Seedance 2.5, Kling 3.0 Omni Edit | Tu video grabado + prompt del nuevo fondo |
| Cambiar estilo | Seedance 2.5, Kling 3.0 Omni Edit | Tu video grabado + prompt del nuevo estilo |

Límites por modelo (de la documentación oficial de cada endpoint):

| Modelo | Fotos | Videos de referencia | Duración | Formato | Resolución |
|---|---|---|---|---|---|
| Seedance 2.5 · crear | hasta 30 | hasta 10 | 4–30 s | 9:16, 16:9, 1:1 | 480p, 720p |
| Seedance 2.5 · editar | hasta 30 | hasta 10 | la de tu video (máx. 30 s) | el de tu video | 480p, 720p |
| Kling 3.0 · crear | hasta 2 (cuadro inicial y final) | no acepta | 3–15 s | 9:16, 16:9, 1:1 | Estándar, Pro, 4K |
| Kling 3.0 Omni Edit | hasta 4 | no acepta | la de tu video (máx. 10 s) | el de tu video | Estándar, Pro |

## Control de gasto

- Antes de cada generación verás el **costo en dólares** y tendrás que confirmarlo. Con varias variantes ves y confirmas el **total**.
- **Exacto**: Higgsfield da el precio (Kling 3.0).
  **Calculado**: con la tarifa oficial publicada (Seedance 2.5 se cobra por tokens de video; en edición cuenta tu video + el resultado).
  **Aproximado**: Higgsfield no publica el precio (Kling Omni Edit). Se usa la tarifa de lista de Kling y te pide marcar una casilla extra.
- Los precios calculados son **antes de descuentos**, así que normalmente pagarás igual o menos.
- **Límite diario**: empieza en $10. Si una generación lo supera, se bloquea y te avisa. Cámbialo en ⚙ Ajustes.
- **Saldo**: la API de Higgsfield no ofrece una forma documentada de consultar el saldo, así que escribes tu saldo en ⚙ Ajustes y el panel le resta cada generación. Actualízalo cuando recargues.
- Las generaciones fallidas o rechazadas por moderación no se cobran y no cuentan en el gasto.

## Dónde quedan los archivos

- Videos generados: `data/clientes/<cliente>/AAAA-MM-DD_<modelo>_<id>.mp4`
- Fotos y videos que subes: `data/subidas/`
- Registro de todo (fecha, modelo, cliente, costo, estado): `data/db.json` y la pestaña **Registro**.

La carpeta `data/` no se sube a GitHub.

## Colores de marca

Están al inicio de `public/styles.css` (`--accent`, `--bg`, etc.).

## Comprobar que todo funciona (sin gastar)

```
npm test
```
Simula Higgsfield en tu computadora y revisa costos, límites, descargas y que la key no se filtre.
