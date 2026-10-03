// Panel de generación Higgsfield — Dímelo Big Productions.
// Local server: serves the panel on http://127.0.0.1 and is the only piece that talks to Higgsfield.
// The API key is read from .env and never sent to the browser.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { loadConfig } = require('./lib/env');
const { createClient, outputUrls, isAllowedMediaUrl } = require('./lib/higgsfield');
const models = require('./lib/models');
const store = require('./lib/store');
const { videoMetadata } = require('./lib/mp4');

const config = loadConfig();
const hf = createClient(config);
store.load();

const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
const UPLOAD_TYPES = {
  'image/jpeg': { kind: 'image', ext: '.jpg' },
  'image/png': { kind: 'image', ext: '.png' },
  'image/webp': { kind: 'image', ext: '.webp' },
  'video/mp4': { kind: 'video', ext: '.mp4' },
  'video/quicktime': { kind: 'video', ext: '.mov' },
};
const MIME_BY_EXT = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
};
// A Higgsfield-hosted upload URL is reused for a few hours, then the file is uploaded again.
const HF_URL_TTL_MS = 6 * 60 * 60 * 1000;

// ------------------------------------------------------------------ helpers

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function sendError(res, err) {
  if (err.userFacing) return sendJson(res, err.httpStatus || 400, { error: err.message });
  if (err.status !== undefined) return sendJson(res, 502, { error: err.message }); // Higgsfield error
  console.error(err);
  sendJson(res, 500, { error: 'Error interno del panel. Revisa la ventana de la terminal.' });
}

const fail = (message, httpStatus = 400, extra = {}) => Object.assign(new Error(message), { userFacing: true, httpStatus, ...extra });

async function readJson(req, limit = 1024 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw fail('Solicitud demasiado grande.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw fail('JSON no válido.');
  }
}

/** Serves a file with HTTP Range support so videos can be scrubbed. */
function sendFile(req, res, filePath, download) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    res.writeHead(404);
    return res.end('No encontrado');
  }
  const type = MIME_BY_EXT[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
  if (download) headers['Content-Disposition'] = `attachment; filename="${path.basename(filePath)}"`;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range && stat.size > 0) {
    let start = range[1] === '' ? stat.size - Number(range[2]) : Number(range[1]);
    let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : stat.size - 1;
    start = Math.max(0, start);
    end = Math.min(end, stat.size - 1);
    if (start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      return res.end();
    }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  fs.createReadStream(filePath).pipe(res);
}

/** Resolves a path inside `root`, refusing anything that escapes it. */
function safeJoin(root, relative) {
  const full = path.resolve(root, '.' + path.sep + relative);
  return full.startsWith(root + path.sep) ? full : null;
}

function publicJob(job) {
  const { remoteUrls, ...rest } = job;
  return rest;
}

function stateSnapshot() {
  const db = store.db;
  const today = store.localDate();
  return {
    keyConfigured: !config.problem,
    keyProblem: config.problem,
    settings: db.settings,
    balanceUsd: store.balanceNow(),
    spentTodayUsd: Math.round(store.spentOn(today) * 10000) / 10000,
    clients: db.clients,
    catalog: models.publicCatalog(),
  };
}

// ------------------------------------------------------------------ uploads

async function handleUpload(req, res) {
  const type = UPLOAD_TYPES[(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()];
  if (!type) throw fail('Formato no admitido. Usa JPG, PNG o WEBP para fotos y MP4 o MOV para videos.');
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > MAX_UPLOAD_BYTES) throw fail('El archivo pesa más de 500 MB.');

  let name = 'archivo';
  try {
    name = decodeURIComponent(String(req.headers['x-file-name'] || 'archivo')).slice(0, 120);
  } catch {
    // keep default name
  }
  const id = store.newId();
  const file = path.join(store.UPLOADS_DIR, id + type.ext);
  const out = fs.createWriteStream(file);
  let size = 0;
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_UPLOAD_BYTES) throw fail('El archivo pesa más de 500 MB.');
      if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
    }
    await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
  } catch (err) {
    out.destroy();
    fs.rmSync(file, { force: true });
    throw err;
  }
  if (!size) {
    fs.rmSync(file, { force: true });
    throw fail('El archivo está vacío.');
  }
  const num = (h) => {
    const n = Number(req.headers[h]);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  // For videos, the length read from the file itself wins over what the browser reported.
  const meta = type.kind === 'video' ? videoMetadata(file) : null;
  const upload = {
    id,
    name,
    kind: type.kind,
    mime: req.headers['content-type'].split(';')[0].trim().toLowerCase(),
    file: path.basename(file),
    size,
    duration: type.kind === 'video' ? meta?.duration || num('x-media-duration') : null,
    width: meta?.width || num('x-media-width'),
    height: meta?.height || num('x-media-height'),
    createdAt: new Date().toISOString(),
  };
  store.db.uploads[id] = upload;
  store.save();
  sendJson(res, 200, { upload: publicUpload(upload) });
}

function publicUpload(u) {
  return { id: u.id, name: u.name, kind: u.kind, size: u.size, duration: u.duration, width: u.width, height: u.height, url: `/api/subidas/${u.id}` };
}

async function higgsfieldUrlFor(upload) {
  if (upload.hfUrl && Date.now() - new Date(upload.hfUrlAt).getTime() < HF_URL_TTL_MS) return upload.hfUrl;
  upload.hfUrl = await hf.uploadFile(path.join(store.UPLOADS_DIR, upload.file), upload.mime);
  upload.hfUrlAt = new Date().toISOString();
  store.save();
  return upload.hfUrl;
}

// ------------------------------------------------------------------ cost and generation

function clientFor(id) {
  const client = store.db.clients.find((c) => c.id === id);
  if (!client) throw fail('Elige un cliente.');
  return client;
}

function quantityOf(body) {
  const q = Math.round(Number(body.quantity || 1));
  if (!(q >= 1 && q <= 4)) throw fail('La cantidad debe estar entre 1 y 4.');
  return q;
}

/** Everything the confirmation dialog shows, recomputed on the server. */
async function quote(body) {
  clientFor(body.clientId);
  const input = models.normalizeInput(body, store.db.uploads);
  const quantity = quantityOf(body);
  const unit = await models.priceOne(hf, input);
  const totalUsd = Math.round(unit.usd * quantity * 10000) / 10000;
  const spentToday = store.spentOn(store.localDate());
  const limit = store.db.settings.dailyLimitUsd;
  const balance = store.balanceNow();
  let blocked = null;
  if (spentToday + totalUsd > limit + 1e-9) {
    blocked = `Límite diario alcanzado: hoy llevas $${spentToday.toFixed(2)} de $${limit.toFixed(2)} y esta generación cuesta $${totalUsd.toFixed(2)}.`;
  } else if (balance !== null && totalUsd > balance + 1e-9) {
    blocked = `Saldo insuficiente: te quedan $${balance.toFixed(2)} y esta generación cuesta $${totalUsd.toFixed(2)}.`;
  }
  return { input, quantity, unit, totalUsd, spentToday, limit, balance, blocked };
}

let generating = false;

async function handleGenerate(body) {
  if (generating) throw fail('Ya hay una generación enviándose. Espera unos segundos.', 409);
  generating = true;
  try {
    const q = await quote(body);
    if (q.blocked) throw fail(q.blocked, 403);
    const confirmed = Number(body.confirmedTotalUsd);
    if (!Number.isFinite(confirmed) || Math.abs(confirmed - q.totalUsd) > 0.005) {
      throw fail('El costo cambió desde que lo confirmaste. Revísalo y confirma de nuevo.', 409);
    }
    if (q.unit.certainty === 'aproximado' && body.acceptApproximate !== true) {
      throw fail('Este precio es aproximado; marca la casilla para aceptarlo.', 400);
    }

    const client = clientFor(body.clientId);
    const input = q.input;
    const all = [...input.images, ...input.videos, ...(input.source ? [input.source] : [])];
    const urls = new Map();
    for (const upload of all) urls.set(upload.id, await higgsfieldUrlFor(upload));
    const request = models.buildRequest(input, (u) => urls.get(u.id));

    const batchId = q.quantity > 1 ? store.newId() : null;
    const jobs = [];
    for (let i = 0; i < q.quantity; i++) {
      const now = new Date();
      const job = {
        id: store.newId(),
        batchId,
        createdAt: now.toISOString(),
        date: store.localDate(now),
        clientId: client.id,
        clientName: client.name,
        model: input.model,
        modelName: models.MODELS[input.model].name,
        mode: input.mode,
        modeName: models.MODES[input.mode],
        prompt: input.prompt,
        params: { duration: input.duration, aspect: input.aspect, resolution: input.resolution, audio: input.audio },
        images: input.images.map((u) => u.id),
        videos: input.videos.map((u) => u.id),
        source: input.source ? input.source.id : null,
        endpoint: request.endpoint,
        costUsd: q.unit.usd,
        costCertainty: q.unit.certainty,
        status: 'en_cola',
        files: [],
      };
      store.db.jobs.push(job);
      store.save(); // record the spend before the paid call
      try {
        const sent = await hf.submit(request.endpoint, request.body);
        job.requestId = sent.request_id;
        job.status = mapStatus(sent.status) || 'en_cola';
      } catch (err) {
        if (err.status === 0) {
          // Connection dropped: Higgsfield may have accepted (and charged) it. Keep the cost counted.
          job.status = 'revisar';
          job.error = 'Se perdió la conexión al enviar. Revisa en la consola de Higgsfield si se cobró.';
        } else {
          job.status = 'fallida';
          job.error = err.message;
        }
      }
      store.save();
      jobs.push(publicJob(job));
      if (jobs.at(-1).status === 'fallida') break; // do not repeat a request Higgsfield rejected
    }
    return { jobs, state: stateSnapshot() };
  } finally {
    generating = false;
  }
}

function mapStatus(s) {
  return { queued: 'en_cola', in_progress: 'procesando', completed: 'descargando', failed: 'fallida', nsfw: 'fallida', canceled: 'fallida' }[s];
}

// ------------------------------------------------------------------ status polling and downloads

async function downloadOutputs(job) {
  const dir = path.join(store.CLIENTS_DIR, job.clientId);
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const [index, url] of job.remoteUrls.entries()) {
    const u = new URL(url);
    if (!isAllowedMediaUrl(url, config)) throw new Error('URL de resultado no segura');
    const res = await fetch(url, { signal: AbortSignal.timeout(10 * 60 * 1000) }); // no API key to media hosts
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    let ext = path.extname(u.pathname).toLowerCase();
    if (!/^\.[a-z0-9]{2,5}$/.test(ext)) ext = (res.headers.get('content-type') || '').includes('image') ? '.png' : '.mp4';
    const suffix = job.remoteUrls.length > 1 ? `-${index + 1}` : '';
    const name = `${job.date}_${job.model}_${job.id}${suffix}${ext}`;
    const tmp = path.join(dir, name + '.part');
    await fs.promises.writeFile(tmp, res.body);
    fs.renameSync(tmp, path.join(dir, name));
    files.push(`${job.clientId}/${name}`);
  }
  return files;
}

let polling = false;
async function pollJobs() {
  if (polling || config.problem) return;
  polling = true;
  try {
    for (const job of store.db.jobs) {
      if (!['en_cola', 'procesando', 'descargando'].includes(job.status) || !job.requestId) continue;
      try {
        if (job.status !== 'descargando' || !job.remoteUrls) {
          const st = await hf.status(job.requestId);
          if (st.request_id && st.request_id !== job.requestId) continue;
          const next = mapStatus(st.status);
          if (!next) continue;
          job.status = next;
          if (next === 'fallida') {
            job.error = st.status === 'nsfw' ? 'Rechazada por moderación (no se cobra).' : st.error || 'Higgsfield marcó la generación como fallida (no se cobra).';
          }
          if (next === 'descargando') job.remoteUrls = outputUrls(st);
          store.save();
        }
        if (job.status === 'descargando') {
          if (!job.remoteUrls || !job.remoteUrls.length) {
            job.status = 'revisar';
            job.error = 'Higgsfield terminó pero no devolvió archivos.';
          } else {
            job.files = await downloadOutputs(job);
            job.status = 'lista';
            job.finishedAt = new Date().toISOString();
            delete job.error;
          }
          store.save();
        }
      } catch (err) {
        job.pollErrors = (job.pollErrors || 0) + 1;
        job.lastPollError = err.message;
        if (job.pollErrors >= 30) {
          job.status = 'revisar';
          job.error = `No se pudo consultar o descargar: ${err.message}`;
        }
        store.save();
      }
    }
  } finally {
    polling = false;
  }
}
setInterval(pollJobs, 5000);

// ------------------------------------------------------------------ routes

const ALLOWED_HOSTS = new Set([`127.0.0.1:${config.port}`, `localhost:${config.port}`]);

async function route(req, res) {
  // Only this computer's browser may use the panel (blocks DNS-rebinding and cross-site requests).
  if (!ALLOWED_HOSTS.has(req.headers.host || '')) {
    res.writeHead(403);
    return res.end('Acceso no permitido');
  }
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  if (p.startsWith('/api/') && req.method !== 'GET') {
    const origin = req.headers.origin;
    if ((origin && !ALLOWED_HOSTS.has(origin.replace(/^https?:\/\//, ''))) || req.headers['x-panel'] !== '1') {
      return sendJson(res, 403, { error: 'Solicitud no permitida' });
    }
  }

  if (req.method === 'GET' && p === '/api/estado') return sendJson(res, 200, stateSnapshot());

  if (req.method === 'POST' && p === '/api/clientes') {
    const body = await readJson(req);
    const client = store.addClient(body.name);
    return sendJson(res, 200, { client, state: stateSnapshot() });
  }

  if (req.method === 'PUT' && p === '/api/ajustes') {
    const body = await readJson(req);
    const s = store.db.settings;
    if (body.dailyLimitUsd !== undefined) {
      const v = Number(body.dailyLimitUsd);
      if (!(v >= 0 && v <= 10000)) throw fail('Límite diario no válido.');
      s.dailyLimitUsd = Math.round(v * 100) / 100;
    }
    if (body.balanceUsd !== undefined) {
      if (body.balanceUsd === null || body.balanceUsd === '') {
        s.balanceUsd = null;
        s.balanceSetAt = null;
      } else {
        const v = Number(body.balanceUsd);
        if (!(v >= 0 && v <= 1000000)) throw fail('Saldo no válido.');
        s.balanceUsd = Math.round(v * 100) / 100;
        s.balanceSetAt = new Date().toISOString();
      }
    }
    store.save();
    return sendJson(res, 200, stateSnapshot());
  }

  if (req.method === 'POST' && p === '/api/subir') return handleUpload(req, res);

  const subida = /^\/api\/subidas\/([a-f0-9]{16})$/.exec(p);
  if (req.method === 'GET' && subida) {
    const u = store.db.uploads[subida[1]];
    if (!u) return sendJson(res, 404, { error: 'Archivo no encontrado' });
    if (url.searchParams.get('info') === '1') return sendJson(res, 200, { upload: publicUpload(u) });
    return sendFile(req, res, path.join(store.UPLOADS_DIR, u.file));
  }

  if (req.method === 'POST' && p === '/api/cotizar') {
    if (config.problem) throw fail(config.problem, 400);
    const q = await quote(await readJson(req));
    return sendJson(res, 200, {
      quantity: q.quantity,
      unitUsd: q.unit.usd,
      totalUsd: q.totalUsd,
      certainty: q.unit.certainty,
      detail: q.unit.detail,
      spentTodayUsd: q.spentToday,
      dailyLimitUsd: q.limit,
      balanceUsd: q.balance,
      blocked: q.blocked,
    });
  }

  if (req.method === 'POST' && p === '/api/generar') {
    if (config.problem) throw fail(config.problem, 400);
    return sendJson(res, 200, await handleGenerate(await readJson(req)));
  }

  if (req.method === 'GET' && p === '/api/generaciones') {
    const client = url.searchParams.get('cliente');
    const model = url.searchParams.get('modelo');
    const jobs = store.db.jobs
      .filter((j) => (!client || j.clientId === client) && (!model || j.model === model))
      .slice()
      .reverse()
      .map(publicJob);
    return sendJson(res, 200, { jobs, state: stateSnapshot() });
  }

  if (req.method === 'GET' && p.startsWith('/media/')) {
    const full = safeJoin(store.CLIENTS_DIR, decodeURIComponent(p.slice('/media/'.length)));
    if (!full) return sendJson(res, 404, { error: 'No encontrado' });
    return sendFile(req, res, full, url.searchParams.get('descargar') === '1');
  }

  if (req.method === 'GET' && !p.startsWith('/api/')) {
    const full = safeJoin(PUBLIC_DIR, p === '/' ? 'index.html' : decodeURIComponent(p.slice(1)));
    if (!full) {
      res.writeHead(404);
      return res.end('No encontrado');
    }
    return sendFile(req, res, full);
  }

  sendJson(res, 404, { error: 'Ruta no encontrada' });
}

const server = http.createServer((req, res) => {
  route(req, res).catch((err) => {
    if (res.headersSent) return res.destroy();
    sendError(res, err);
  });
});

const PANEL_URL = `http://127.0.0.1:${config.port}`;

/** With --abrir (used by the desktop shortcuts) the panel opens itself in the default browser. */
function openBrowser() {
  if (!process.argv.includes('--abrir')) return;
  const [cmd, args] =
    process.platform === 'darwin' ? ['open', [PANEL_URL]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', PANEL_URL]] : ['xdg-open', [PANEL_URL]];
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
}

server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') throw err;
  console.log(`\n  El panel ya está abierto en ${PANEL_URL} (en otra ventana).\n`);
  openBrowser();
  setTimeout(() => process.exit(0), 500);
});

server.listen(config.port, '127.0.0.1', () => {
  console.log('');
  console.log('  Panel Higgsfield — Dímelo Big Productions');
  console.log(`  Abierto en: ${PANEL_URL}`);
  console.log(config.problem ? `  ⚠  ${config.problem}` : '  API key cargada desde .env (no se muestra).');
  console.log('  Para cerrar el panel: cierra esta ventana o pulsa Ctrl+C.');
  console.log('');
  openBrowser();
});
