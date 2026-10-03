// Automated check of the whole panel against a fake Higgsfield running on this computer.
// Spends nothing and does not touch the real data/ folder or .env.  Run: npm test
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const assert = require('assert/strict');

const SECRET = 'secreto-de-prueba-123';
const KEY_ID = 'idprueba';
const seen = { auth: [], uploadsAuth: [], submits: [] };
let statusCalls = 0;

// ------------------------------------------------------------------ fake Higgsfield
const mock = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : null;
  const json = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  const base = `http://127.0.0.1:${mock.address().port}`;
  if (req.url.startsWith('/put/')) {
    seen.uploadsAuth.push(req.headers.authorization || null);
    res.writeHead(200);
    return res.end();
  }
  if (req.url === '/salida.mp4') {
    res.writeHead(200, { 'Content-Type': 'video/mp4' });
    return res.end(Buffer.from('video-falso'));
  }
  seen.auth.push(req.headers.authorization);
  if (req.url === '/files/generate-upload-url') {
    const id = Math.random().toString(16).slice(2);
    return json(200, { upload_url: `${base}/put/${id}`, public_url: `${base}/pub/${id}`, upload_headers: { 'Content-Type': JSON.parse(body).content_type } });
  }
  if (req.url.startsWith('/estimate/')) {
    const endpoint = req.url.slice('/estimate/'.length);
    if (endpoint.startsWith('kling-video/v3.0')) return json(200, { usd: 0.347 });
    if (endpoint.startsWith('bytedance/seedance-2.5')) {
      return json(200, { usd: null, pricing_description: 'At 480p or 720p, each 1,000 video tokens cost $0.0214 without video input or $0.01284 with video input (0.6x).' });
    }
    return json(400, { detail: 'estimate not available' });
  }
  if (req.url.startsWith('/requests/')) {
    statusCalls++;
    const id = req.url.split('/')[2];
    if (statusCalls < 2) return json(200, { status: 'in_progress', request_id: id });
    return json(200, { status: 'completed', request_id: id, video: { url: `${base}/salida.mp4` } });
  }
  if (req.method === 'POST') {
    seen.submits.push({ endpoint: req.url, body: JSON.parse(body) });
    return json(200, { status: 'queued', request_id: `req-${seen.submits.length}`, status_url: 'x', cancel_url: 'y' });
  }
  json(404, {});
});

// ------------------------------------------------------------------ helpers
let panel;
let PORT;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-prueba-'));
const responses = [];

function call(method, p, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const isBuffer = Buffer.isBuffer(body);
    const data = body === undefined ? null : isBuffer ? body : Buffer.from(JSON.stringify(body));
    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        method,
        path: p,
        headers: {
          'X-Panel': '1',
          ...(data && !isBuffer ? { 'Content-Type': 'application/json' } : {}),
          ...(data ? { 'Content-Length': data.length } : {}),
          ...extraHeaders,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          responses.push(text);
          let parsed = text;
          try {
            parsed = JSON.parse(text);
          } catch {
            // not JSON
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const upload = async (name, type, extra = {}) => {
  const r = await call('POST', '/api/subir', Buffer.from(`contenido-${name}`), { 'Content-Type': type, 'X-File-Name': encodeURIComponent(name), ...extra });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.upload.id;
};

async function waitFor(fn, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('Tiempo de espera agotado');
}

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

// ------------------------------------------------------------------ run
async function main() {
  await new Promise((r) => mock.listen(0, '127.0.0.1', r));
  PORT = 45000 + Math.floor(Math.random() * 1000);
  const envFile = path.join(tmp, '.env');
  fs.writeFileSync(envFile, `HF_API_KEY_ID=${KEY_ID}\nHF_API_KEY_SECRET=${SECRET}\nHF_API_BASE=http://127.0.0.1:${mock.address().port}\nPANEL_PORT=${PORT}\n`);
  panel = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PANEL_ENV_FILE: envFile, PANEL_DATA_DIR: path.join(tmp, 'data') },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let log = '';
  panel.stdout.on('data', (d) => (log += d));
  await waitFor(() => log.includes('Abierto en'));
  console.log('Prueba del panel (Higgsfield simulado, sin gasto real):');

  await check('carga el estado y la key sin exponerla', async () => {
    const r = await call('GET', '/api/estado');
    assert.equal(r.status, 200);
    assert.equal(r.body.keyConfigured, true);
    assert.equal(r.body.settings.dailyLimitUsd, 10);
    assert.deepEqual(r.body.catalog.models.map((m) => m.id), ['seedance_2_5', 'kling3_0', 'kling_omni_edit']);
    assert.ok(!log.includes(SECRET));
  });

  await check('bloquea peticiones de otras páginas (sin cabecera X-Panel, otro Host u Origin)', async () => {
    assert.equal((await call('POST', '/api/clientes', { name: 'X' }, { 'X-Panel': '' })).status, 403);
    assert.equal((await call('GET', '/api/estado', undefined, { Host: 'evil.com' })).status, 403);
    assert.equal((await call('POST', '/api/clientes', { name: 'X' }, { Origin: 'https://evil.com' })).status, 403);
  });

  await check('agrega un cliente nuevo con su carpeta', async () => {
    const r = await call('POST', '/api/clientes', { name: 'Café Ñandú' });
    assert.equal(r.body.client.id, 'cafe-nandu');
    assert.ok(fs.existsSync(path.join(tmp, 'data', 'clientes', 'cafe-nandu')));
  });

  const img1 = await upload('foto1.jpg', 'image/jpeg', { 'X-Media-Width': '1080', 'X-Media-Height': '1920' });
  const img2 = await upload('foto2.png', 'image/png');
  const img3 = await upload('foto3.webp', 'image/webp');
  const vid = await upload('mi-video.mov', 'video/quicktime', { 'X-Media-Duration': '8', 'X-Media-Width': '1080', 'X-Media-Height': '1920' });
  const longVid = await upload('largo.mp4', 'video/mp4', { 'X-Media-Duration': '12.3' });

  await check('rechaza tipos de archivo no admitidos', async () => {
    const r = await call('POST', '/api/subir', Buffer.from('x'), { 'Content-Type': 'application/pdf' });
    assert.equal(r.status, 400);
  });

  const base = { clientId: 'cafe-nandu', prompt: 'Hamburguesa girando', quantity: 1, images: [], videos: [] };

  await check('Seedance 2.5 · crear: costo calculado con la tarifa oficial (9:16, 720p, 5 s)', async () => {
    const r = await call('POST', '/api/cotizar', { ...base, model: 'seedance_2_5', mode: 'crear', duration: 5, aspect: '9:16', resolution: '720p', audio: true });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.certainty, 'calculado');
    assert.equal(r.body.totalUsd, 2.3112); // 108000 tokens × $0.0214 / 1000
  });

  await check('Kling 3.0 · crear: precio exacto de Higgsfield', async () => {
    const r = await call('POST', '/api/cotizar', { ...base, model: 'kling3_0', mode: 'crear', duration: 5, aspect: '9:16', resolution: 'std', audio: true });
    assert.equal(r.body.certainty, 'exacto');
    assert.equal(r.body.totalUsd, 0.347);
  });

  await check('respeta el límite de fotos de cada modelo (Kling 3.0 = máx. 2)', async () => {
    const r = await call('POST', '/api/cotizar', { ...base, model: 'kling3_0', mode: 'crear', duration: 5, aspect: '9:16', resolution: 'std', images: [img1, img2, img3] });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /máximo 2 foto/);
  });

  await check('Kling 3.0 no acepta videos ni sirve para cambiar fondo', async () => {
    const r1 = await call('POST', '/api/cotizar', { ...base, model: 'kling3_0', mode: 'crear', duration: 5, aspect: '9:16', resolution: 'std', videos: [vid] });
    assert.equal(r1.status, 400);
    const r2 = await call('POST', '/api/cotizar', { ...base, model: 'kling3_0', mode: 'fondo', source: vid });
    assert.equal(r2.status, 400);
  });

  await check('Kling Omni Edit · cambiar fondo: precio aproximado (8 s × $0.112)', async () => {
    const r = await call('POST', '/api/cotizar', { ...base, model: 'kling_omni_edit', mode: 'fondo', source: vid, resolution: 'pro', images: [img1] });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.certainty, 'aproximado');
    assert.equal(r.body.totalUsd, 0.896);
  });

  await check('Kling Omni Edit rechaza videos de más de 10 s', async () => {
    const r = await call('POST', '/api/cotizar', { ...base, model: 'kling_omni_edit', mode: 'estilo', source: longVid, resolution: 'pro' });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /hasta 10 s/);
  });

  await check('Seedance 2.5 · cambiar estilo: cobra video de entrada + salida a tarifa con video', async () => {
    const r = await call('POST', '/api/cotizar', { ...base, model: 'seedance_2_5', mode: 'estilo', source: vid, resolution: '720p', audio: false });
    assert.equal(r.body.certainty, 'calculado');
    // (8 + 8) s × 720×1280 × 24 / 1024 = 345600 tokens × $0.01284 / 1000
    assert.equal(r.body.totalUsd, 4.4375);
  });

  await check('no genera sin confirmar el costo exacto mostrado', async () => {
    const r = await call('POST', '/api/generar', { ...base, model: 'kling3_0', mode: 'crear', duration: 5, aspect: '9:16', resolution: 'std', confirmedTotalUsd: 0.1 });
    assert.equal(r.status, 409);
    assert.equal(seen.submits.length, 0);
  });

  await check('pide aceptar el precio aproximado', async () => {
    const r = await call('POST', '/api/generar', { ...base, model: 'kling_omni_edit', mode: 'fondo', source: vid, resolution: 'pro', confirmedTotalUsd: 0.896 });
    assert.equal(r.status, 400);
    assert.equal(seen.submits.length, 0);
  });

  let job;
  await check('genera con Kling 3.0 (foto inicial y final) tras confirmar, y sube las fotos sin enviar la key', async () => {
    const r = await call('POST', '/api/generar', { ...base, model: 'kling3_0', mode: 'crear', duration: 5, aspect: '9:16', resolution: 'std', audio: false, images: [img1, img2], confirmedTotalUsd: 0.347 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    job = r.body.jobs[0];
    assert.equal(job.status, 'en_cola');
    const sent = seen.submits[0];
    assert.equal(sent.endpoint, '/kling-video/v3.0/std/image-to-video');
    assert.equal(sent.body.sound, 'off');
    assert.ok(sent.body.image_url && sent.body.last_image_url);
    assert.equal(sent.body.aspect_ratio, undefined);
    assert.ok(seen.uploadsAuth.length === 2 && seen.uploadsAuth.every((a) => a === null));
    assert.ok(seen.auth.every((a) => a === `Key ${KEY_ID}:${SECRET}`));
  });

  await check('consulta el estado, descarga el video a la carpeta del cliente y lo marca como lista', async () => {
    const done = await waitFor(async () => {
      const r = await call('GET', '/api/generaciones?cliente=cafe-nandu');
      const j = r.body.jobs.find((x) => x.id === job.id);
      return j.status === 'lista' ? j : null;
    });
    const file = path.join(tmp, 'data', 'clientes', done.files[0]);
    assert.equal(fs.readFileSync(file, 'utf8'), 'video-falso');
    assert.ok(done.files[0].startsWith('cafe-nandu/'));
    const media = await call('GET', `/media/${done.files[0]}`, undefined, { Range: 'bytes=0-4' });
    assert.equal(media.status, 206);
  });

  await check('cambiar fondo con Seedance arma el prompt de edición y usa video-edit', async () => {
    const q = await call('POST', '/api/cotizar', { ...base, model: 'seedance_2_5', mode: 'fondo', source: vid, resolution: '480p', audio: true, prompt: 'una playa' });
    const r = await call('POST', '/api/generar', { ...base, model: 'seedance_2_5', mode: 'fondo', source: vid, resolution: '480p', audio: true, prompt: 'una playa', confirmedTotalUsd: q.body.totalUsd });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const sent = seen.submits.at(-1);
    assert.equal(sent.endpoint, '/bytedance/seedance-2.5/video-edit');
    assert.match(sent.body.prompt, /Replace only the background.*una playa/);
    assert.ok(sent.body.video_url.includes('/pub/'));
  });

  await check('lote de 3: un solo costo total confirmado, 3 envíos', async () => {
    const before = seen.submits.length;
    const body = { ...base, model: 'kling3_0', mode: 'crear', duration: 5, aspect: '16:9', resolution: 'std', quantity: 3 };
    const q = await call('POST', '/api/cotizar', body);
    assert.equal(q.body.totalUsd, 1.041);
    const r = await call('POST', '/api/generar', { ...body, confirmedTotalUsd: 1.041 });
    assert.equal(r.body.jobs.length, 3);
    assert.equal(seen.submits.length - before, 3);
    assert.equal(seen.submits.at(-1).endpoint, '/kling-video/v3.0/std/text-to-video');
  });

  await check('límite diario: bloquea y avisa al alcanzarlo', async () => {
    await call('PUT', '/api/ajustes', { dailyLimitUsd: 5 });
    const body = { ...base, model: 'seedance_2_5', mode: 'crear', duration: 10, aspect: '9:16', resolution: '720p', audio: true };
    const q = await call('POST', '/api/cotizar', body);
    assert.match(q.body.blocked, /Límite diario alcanzado/);
    const before = seen.submits.length;
    const r = await call('POST', '/api/generar', { ...body, confirmedTotalUsd: q.body.totalUsd });
    assert.equal(r.status, 403);
    assert.equal(seen.submits.length, before);
  });

  await check('saldo: resta lo gastado y bloquea si no alcanza', async () => {
    await call('PUT', '/api/ajustes', { dailyLimitUsd: 100, balanceUsd: 1 });
    const s = await call('GET', '/api/estado');
    assert.equal(s.body.balanceUsd, 1);
    const q = await call('POST', '/api/cotizar', { ...base, model: 'seedance_2_5', mode: 'crear', duration: 5, aspect: '9:16', resolution: '720p' });
    assert.match(q.body.blocked, /Saldo insuficiente/);
  });

  await check('registro: cada generación con fecha, modelo, cliente y costo', async () => {
    const r = await call('GET', '/api/generaciones');
    assert.ok(r.body.jobs.length >= 5);
    for (const j of r.body.jobs) assert.ok(j.createdAt && j.modelName && j.clientName && typeof j.costUsd === 'number');
  });

  await check('la key nunca aparece en respuestas al navegador ni en la base local', async () => {
    assert.ok(responses.every((t) => !t.includes(SECRET)));
    assert.ok(!fs.readFileSync(path.join(tmp, 'data', 'db.json'), 'utf8').includes(SECRET));
    const page = await call('GET', '/app.js');
    assert.equal(page.status, 200);
    assert.ok(!page.body.includes(SECRET));
  });

  console.log(`\nTodo bien: ${passed} comprobaciones pasaron.`);
}

main()
  .catch((err) => {
    console.error('\nFALLÓ:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    panel?.kill();
    mock.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });
