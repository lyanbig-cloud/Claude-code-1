'use strict';
// Panel front end. Talks only to the local server (never to Higgsfield, never sees the API key).

const $ = (id) => document.getElementById(id);
const ACTIVE = ['en_cola', 'procesando', 'descargando'];
const STATUS_LABEL = { en_cola: 'En cola', procesando: 'Procesando', descargando: 'Procesando', lista: 'Lista', fallida: 'Fallida', revisar: 'Revisar' };
const CERTAINTY_LABEL = {
  exacto: 'Precio exacto dado por Higgsfield.',
  calculado: 'Calculado con la tarifa oficial de Higgsfield.',
  aproximado: 'Precio aproximado.',
};
const PROMPT_LABEL = { crear: 'Prompt', fondo: 'Describe el nuevo fondo', estilo: 'Describe el nuevo estilo' };
const PROMPT_PLACEHOLDER = {
  crear: 'Ej. Toma cinematográfica de una hamburguesa jugosa girando, luz cálida de estudio, cámara lenta…',
  fondo: 'Ej. Una terraza en la azotea de Miami al atardecer, luces cálidas, ciudad desenfocada…',
  estilo: 'Ej. Animación estilo Pixar, colores vivos, iluminación suave…',
};

const state = {
  catalog: null,
  clients: [],
  settings: {},
  balanceUsd: null,
  spentTodayUsd: 0,
  mode: 'crear',
  modelId: null,
  aspect: '9:16',
  source: [],
  images: [],
  videos: [],
  jobs: [],
  view: 'gallery',
  pendingQuote: null,
};

// ------------------------------------------------------------------ helpers

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) node.append(c instanceof Node ? c : String(c));
  return node;
}

const money = (n) => (n === null || n === undefined ? '—' : `$${Number(n).toFixed(Math.abs(n) > 0 && Math.abs(n) < 0.1 ? 3 : 2)}`);

function toast(message, type = '') {
  const t = el('div', { class: `toast ${type}` }, message);
  $('toasts').append(t);
  setTimeout(() => t.remove(), type === 'error' ? 9000 : 5000);
}

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'X-Panel': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Error ${res.status}`), { status: res.status });
  return data;
}

const currentModel = () => state.catalog.models.find((m) => m.id === state.modelId);
const currentSpec = () => currentModel()?.modes[state.mode];
const modelsForMode = (mode) => state.catalog.models.filter((m) => m.modes[mode]);

// ------------------------------------------------------------------ top bar

function applyState(s) {
  state.catalog ||= s.catalog;
  state.clients = s.clients;
  state.settings = s.settings;
  state.balanceUsd = s.balanceUsd;
  state.spentTodayUsd = s.spentTodayUsd;

  $('keyBanner').classList.toggle('hidden', s.keyConfigured);
  $('keyBanner').textContent = s.keyProblem ? `⚠ ${s.keyProblem} Luego cierra y vuelve a abrir el panel.` : '';

  $('balanceValue').textContent = s.balanceUsd === null ? 'Configurar' : money(s.balanceUsd);
  $('balanceMeter').title = s.settings.balanceSetAt
    ? `Saldo registrado el ${new Date(s.settings.balanceSetAt).toLocaleString('es')} menos lo gastado desde entonces. Clic para actualizar.`
    : 'Clic para registrar tu saldo de la API';
  const limit = s.settings.dailyLimitUsd;
  $('spentToday').textContent = money(s.spentTodayUsd);
  $('dailyLimit').textContent = money(limit);
  const pct = limit > 0 ? Math.min(100, (s.spentTodayUsd / limit) * 100) : 100;
  $('todayBar').style.width = `${pct}%`;
  $('todayBar').className = pct >= 100 ? 'danger' : pct >= 75 ? 'warn' : '';
  const reached = s.spentTodayUsd >= limit - 1e-9;
  $('limitBanner').classList.toggle('hidden', !reached);
  $('limitBanner').textContent = reached
    ? `Llegaste a tu límite diario de ${money(limit)}. Las generaciones quedan bloqueadas hasta mañana o hasta que subas el límite en ⚙ Ajustes.`
    : '';

  renderClients();
}

function renderClients() {
  const sel = $('clientSelect');
  const keep = sel.value;
  sel.replaceChildren(...state.clients.map((c) => el('option', { value: c.id }, c.name)));
  if (state.clients.some((c) => c.id === keep)) sel.value = keep;

  const filter = $('filterClient');
  const keepF = filter.value;
  filter.replaceChildren(el('option', { value: '' }, 'Todos los clientes'), ...state.clients.map((c) => el('option', { value: c.id }, c.name)));
  filter.value = keepF;
}

// ------------------------------------------------------------------ form

function renderModes() {
  $('modeTabs').replaceChildren(
    ...Object.entries(state.catalog.modes).map(([id, label]) =>
      el('button', { type: 'button', class: id === state.mode ? 'active' : '', onclick: () => setMode(id) }, label),
    ),
  );
}

function setMode(mode) {
  state.mode = mode;
  renderModes();
  const options = modelsForMode(mode);
  if (!options.some((m) => m.id === state.modelId)) state.modelId = options[0]?.id;
  renderModelSelect();
  applyModelDefaults();
  renderForm();
}

function renderModelSelect() {
  const options = modelsForMode(state.mode);
  $('modelSelect').replaceChildren(...options.map((m) => el('option', { value: m.id }, m.name)));
  $('modelSelect').value = state.modelId;
  $('filterModel').replaceChildren(
    el('option', { value: '' }, 'Todos los modelos'),
    ...state.catalog.models.map((m) => el('option', { value: m.id }, m.name)),
  );
  $('filterModel').value = state.filterModel || '';
}

function applyModelDefaults() {
  const spec = currentSpec();
  if (!spec) return;
  if (spec.duration) {
    const d = Number($('duration').value);
    if (!(d >= spec.duration.min && d <= spec.duration.max)) $('duration').value = spec.duration.default;
  }
  if (spec.resolution) {
    const sel = $('resolution');
    const keep = sel.value;
    sel.replaceChildren(...spec.resolution.options.map((o) => el('option', { value: o.value }, o.label)));
    sel.value = spec.resolution.options.some((o) => o.value === keep) ? keep : spec.resolution.default;
  }
  if (spec.audio) $('audio').checked = state.audioTouched ? $('audio').checked : spec.audio.default;
  if (spec.aspect && !spec.aspect.options.includes(state.aspect)) state.aspect = spec.aspect.options[0];
}

function renderForm() {
  const spec = currentSpec();
  const model = currentModel();
  if (!spec) return;

  $('sourceField').classList.toggle('hidden', !spec.source);
  $('sourceNote').textContent = spec.sourceNote ? `· ${spec.sourceNote}` : '';

  const maxImg = spec.refs.images;
  const maxVid = spec.refs.videos;
  $('imagesField').classList.toggle('hidden', maxImg === 0);
  $('videosField').classList.toggle('hidden', maxVid === 0);
  $('imagesNote').textContent = spec.refs.imagesNote || '';
  $('imagesNote').classList.toggle('hidden', !spec.refs.imagesNote);
  setCount('imagesCount', state.images.length, maxImg);
  setCount('videosCount', state.videos.length, maxVid);
  $('imagesZone').classList.toggle('disabled', state.images.length >= maxImg);
  $('videosZone').classList.toggle('disabled', state.videos.length >= maxVid);

  $('promptLabel').textContent = PROMPT_LABEL[state.mode];
  $('prompt').placeholder = PROMPT_PLACEHOLDER[state.mode];

  $('durationField').classList.toggle('hidden', !spec.duration);
  if (spec.duration) {
    $('duration').min = spec.duration.min;
    $('duration').max = spec.duration.max;
    $('durationRange').textContent = `(${spec.duration.min}–${spec.duration.max} s)`;
    $('durationOut').textContent = `${$('duration').value} s`;
  }
  $('resolutionField').classList.toggle('hidden', !spec.resolution);

  const aspectHidden = !spec.aspect;
  const aspectFromImage = spec.aspect?.hiddenWithImages && state.images.length > 0;
  $('aspectField').classList.toggle('hidden', aspectHidden);
  $('aspectTabs').classList.toggle('hidden', Boolean(aspectFromImage));
  $('aspectNote').classList.toggle('hidden', !aspectFromImage);
  $('aspectNote').textContent = aspectFromImage ? spec.aspect.hiddenWithImages : '';
  if (spec.aspect) {
    $('aspectTabs').replaceChildren(
      ...spec.aspect.options.map((a) =>
        el('button', { type: 'button', class: a === state.aspect ? 'active' : '', onclick: () => { state.aspect = a; renderForm(); } }, a),
      ),
    );
  }
  $('audioField').classList.toggle('hidden', !spec.audio);

  renderThumbs('source', 1);
  renderThumbs('images', maxImg);
  renderThumbs('videos', maxVid);
  validateForm(model, spec);
}

function setCount(id, n, max) {
  $(id).textContent = `${n} / ${max}`;
  $(id).classList.toggle('over', n > max);
}

function validateForm(model, spec) {
  const problems = [];
  if (state.images.length > spec.refs.images) {
    problems.push(`${model.name} acepta máximo ${spec.refs.images} foto(s). Quita ${state.images.length - spec.refs.images}.`);
  }
  if (state.videos.length > spec.refs.videos) {
    problems.push(
      spec.refs.videos === 0
        ? `${model.name} no acepta videos de referencia. Quita los ${state.videos.length} video(s).`
        : `${model.name} acepta máximo ${spec.refs.videos} video(s). Quita ${state.videos.length - spec.refs.videos}.`,
    );
  }
  if (spec.source && state.source[0]?.duration > spec.sourceMaxSeconds + 0.5) {
    problems.push(`Tu video dura ${state.source[0].duration.toFixed(1)} s; ${model.name} edita hasta ${spec.sourceMaxSeconds} s.`);
  }
  const uploading = [...state.source, ...state.images, ...state.videos].some((i) => !i.upload);
  $('formError').textContent = problems.join(' ');
  $('formError').classList.toggle('hidden', problems.length === 0);
  $('quoteBtn').disabled = problems.length > 0 || uploading;
  $('quoteBtn').textContent = uploading ? 'Esperando a que terminen las subidas…' : 'Ver costo y generar';
}

// ------------------------------------------------------------------ files

function renderThumbs(listName, max) {
  const container = $(`${listName}Thumbs`);
  container.replaceChildren(
    ...state[listName].map((item, index) => {
      const media =
        item.kind === 'image'
          ? el('img', { src: item.previewUrl, alt: item.name })
          : el('video', { src: item.previewUrl, muted: true, preload: 'metadata', playsinline: true });
      if (item.kind === 'video') {
        media.muted = true;
        media.addEventListener('mouseenter', () => media.play().catch(() => {}));
        media.addEventListener('mouseleave', () => media.pause());
      }
      return el(
        'div',
        { class: `thumb ${item.upload ? '' : 'loading'} ${index >= max ? 'over' : ''}`, title: item.name },
        media,
        item.duration ? el('span', { class: 'tag' }, `${item.duration.toFixed(1)} s`) : null,
        item.upload ? null : el('span', { class: 'progress', style: `width:${Math.round((item.progress || 0) * 100)}%` }),
        el('button', { type: 'button', class: 'remove', title: 'Quitar', onclick: () => removeItem(listName, item) }, '✕'),
      );
    }),
  );
}

function removeItem(listName, item) {
  item.xhr?.abort();
  state[listName] = state[listName].filter((i) => i !== item);
  renderForm();
}

function readMetadata(file, kind) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (meta) => resolve({ previewUrl: url, ...meta });
    setTimeout(() => done({}), 15000);
    if (kind === 'image') {
      const img = new Image();
      img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => done({});
      img.src = url;
    } else {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => done({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
      v.onerror = () => done({});
      v.src = url;
    }
  });
}

function mimeOf(file) {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop().toLowerCase();
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', mov: 'video/quicktime' }[ext] || '';
}

async function addFiles(listName, files) {
  const spec = currentSpec();
  const model = currentModel();
  const kind = listName === 'images' ? 'image' : 'video';
  const max = listName === 'source' ? 1 : spec.refs[listName];
  let list = [...files].filter((f) => mimeOf(f).startsWith(kind + '/'));
  const wrongType = files.length - list.length;
  if (wrongType) toast(`Se ignoraron ${wrongType} archivo(s) que no son ${kind === 'image' ? 'fotos' : 'videos'}.`, 'error');
  if (listName === 'source') {
    state.source.forEach((i) => i.xhr?.abort());
    state.source = [];
    list = list.slice(0, 1);
  } else {
    const room = max - state[listName].length;
    if (list.length > room) {
      toast(
        `${model.name} acepta máximo ${max} ${kind === 'image' ? 'foto(s)' : 'video(s)'} de referencia. ` +
          `No se agregaron ${list.length - Math.max(room, 0)} archivo(s).`,
        'error',
      );
      list = list.slice(0, Math.max(room, 0));
    }
  }
  for (const file of list) {
    const item = { name: file.name, kind, upload: null, progress: 0 };
    state[listName].push(item);
    Object.assign(item, await readMetadata(file, kind));
    renderForm();
    uploadItem(listName, item, file);
  }
}

function uploadItem(listName, item, file) {
  const xhr = new XMLHttpRequest();
  item.xhr = xhr;
  xhr.open('POST', '/api/subir');
  xhr.setRequestHeader('X-Panel', '1');
  xhr.setRequestHeader('Content-Type', mimeOf(file));
  xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
  if (item.duration) xhr.setRequestHeader('X-Media-Duration', String(item.duration));
  if (item.width) xhr.setRequestHeader('X-Media-Width', String(item.width));
  if (item.height) xhr.setRequestHeader('X-Media-Height', String(item.height));
  xhr.upload.onprogress = (e) => {
    if (!e.lengthComputable) return;
    item.progress = e.loaded / e.total;
    const bar = [...$(`${listName}Thumbs`).children][state[listName].indexOf(item)]?.querySelector('.progress');
    if (bar) bar.style.width = `${Math.round(item.progress * 100)}%`;
  };
  xhr.onload = () => {
    let data = {};
    try {
      data = JSON.parse(xhr.responseText);
    } catch {
      // handled below
    }
    if (xhr.status === 200 && data.upload) {
      item.upload = data.upload;
      item.duration = data.upload.duration || item.duration;
      item.width = data.upload.width || item.width;
      item.height = data.upload.height || item.height;
      delete item.xhr;
    } else {
      toast(`No se pudo subir "${item.name}": ${data.error || 'error desconocido'}`, 'error');
      state[listName] = state[listName].filter((i) => i !== item);
    }
    renderForm();
  };
  xhr.onerror = () => {
    toast(`No se pudo subir "${item.name}".`, 'error');
    state[listName] = state[listName].filter((i) => i !== item);
    renderForm();
  };
  xhr.send(file);
}

function wireDropzone(zoneId, listName) {
  const zone = $(zoneId);
  const input = zone.querySelector('input');
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', () => {
    addFiles(listName, input.files);
    input.value = '';
  });
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag');
    addFiles(listName, e.dataTransfer.files);
  });
}

// ------------------------------------------------------------------ cost confirmation

function requestBody() {
  const spec = currentSpec();
  const body = {
    clientId: $('clientSelect').value,
    mode: state.mode,
    model: state.modelId,
    prompt: $('prompt').value,
    quantity: Number($('quantity').value),
    images: state.images.map((i) => i.upload.id),
    videos: state.videos.map((i) => i.upload.id),
  };
  if (spec.source) body.source = state.source[0]?.upload?.id;
  if (spec.duration) body.duration = Number($('duration').value);
  if (spec.aspect) body.aspect = state.aspect;
  if (spec.resolution) body.resolution = $('resolution').value;
  if (spec.audio) body.audio = $('audio').checked;
  return body;
}

async function openQuote() {
  const body = requestBody();
  $('quoteBtn').disabled = true;
  $('quoteBtn').textContent = 'Calculando costo…';
  try {
    const q = await api('POST', '/api/cotizar', body);
    state.pendingQuote = { body, q };
    const model = currentModel();
    const client = state.clients.find((c) => c.id === body.clientId);
    const rows = [
      ['Cliente', client?.name],
      ['Modelo', model.name],
      ['Modo', state.catalog.modes[state.mode]],
      ['Cantidad', q.quantity > 1 ? `${q.quantity} generaciones` : '1 generación'],
      ['Precio por generación', money(q.unitUsd)],
      ['Gastado hoy', money(q.spentTodayUsd)],
      ['Hoy quedaría en', `${money(q.spentTodayUsd + q.totalUsd)} de ${money(q.dailyLimitUsd)}`],
    ];
    if (q.balanceUsd !== null) rows.push(['Saldo después', money(q.balanceUsd - q.totalUsd)]);
    $('confirmSummary').replaceChildren(...rows.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]));
    $('confirmTotal').textContent = money(q.totalUsd);
    $('confirmDetail').textContent = `${CERTAINTY_LABEL[q.certainty]} ${q.detail}`;
    $('confirmBlocked').textContent = q.blocked || '';
    $('confirmBlocked').classList.toggle('hidden', !q.blocked);
    $('approxCheck').classList.toggle('hidden', q.certainty !== 'aproximado' || Boolean(q.blocked));
    $('approxAccept').checked = false;
    $('confirmBtn').classList.toggle('hidden', Boolean(q.blocked));
    $('confirmBtn').textContent = q.quantity > 1 ? `Confirmar ${q.quantity} y gastar ${money(q.totalUsd)}` : `Confirmar y gastar ${money(q.totalUsd)}`;
    updateConfirmButton();
    $('confirmDialog').showModal();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    renderForm();
  }
}

function updateConfirmButton() {
  const q = state.pendingQuote?.q;
  $('confirmBtn').disabled = !q || Boolean(q.blocked) || (q.certainty === 'aproximado' && !$('approxAccept').checked);
}

async function confirmGenerate() {
  const { body, q } = state.pendingQuote;
  $('confirmBtn').disabled = true;
  $('confirmBtn').textContent = 'Enviando…';
  try {
    const result = await api('POST', '/api/generar', {
      ...body,
      confirmedTotalUsd: q.totalUsd,
      acceptApproximate: $('approxAccept').checked,
    });
    $('confirmDialog').close();
    applyState(result.state);
    const failed = result.jobs.filter((j) => j.status === 'fallida');
    if (failed.length) toast(`Higgsfield rechazó la generación: ${failed[0].error}`, 'error');
    else toast(result.jobs.length > 1 ? `${result.jobs.length} generaciones enviadas.` : 'Generación enviada. La verás en la galería.', 'ok');
    await refreshJobs();
  } catch (err) {
    toast(err.message, 'error');
    if (err.status === 409 || err.status === 403) $('confirmDialog').close();
    else updateConfirmButton();
  }
}

// ------------------------------------------------------------------ gallery and log

async function refreshJobs() {
  const params = new URLSearchParams();
  if ($('filterClient').value) params.set('cliente', $('filterClient').value);
  if ($('filterModel').value) params.set('modelo', $('filterModel').value);
  try {
    const data = await api('GET', `/api/generaciones?${params}`);
    state.jobs = data.jobs;
    applyState(data.state);
    renderGallery();
    renderLog();
  } catch (err) {
    console.warn(err);
  }
}

function mediaFor(job) {
  const file = job.files?.[0];
  if (job.status === 'lista' && file) {
    const src = `/media/${file.split('/').map(encodeURIComponent).join('/')}`;
    return /\.(png|jpe?g|webp)$/i.test(file)
      ? el('img', { src, alt: job.prompt, loading: 'lazy' })
      : el('video', { src, controls: true, preload: 'metadata', playsinline: true });
  }
  const text = {
    en_cola: 'En cola en Higgsfield…',
    procesando: 'Generando…',
    descargando: 'Descargando a tu carpeta…',
    fallida: 'No se generó. No se cobra.',
    revisar: 'Revisa en la consola de Higgsfield.',
  }[job.status];
  return el('div', { class: 'placeholder' }, ACTIVE.includes(job.status) ? el('div', { class: 'spinner' }) : null, text);
}

function resolutionLabel(job) {
  const options = state.catalog.models.find((m) => m.id === job.model)?.modes[job.mode]?.resolution?.options || [];
  return options.find((o) => o.value === job.params?.resolution)?.label || job.params?.resolution;
}

function renderGallery() {
  const view = $('galleryView');
  if (!state.jobs.length) {
    view.replaceChildren(el('div', { class: 'empty' }, 'Aquí aparecerán tus generaciones, guardadas por cliente.'));
    return;
  }
  view.replaceChildren(
    ...state.jobs.map((job) => {
      const shape = job.params?.aspect === '16:9' ? 'wide' : job.params?.aspect === '1:1' ? 'square' : '';
      const file = job.files?.[0];
      return el(
        'article',
        { class: 'card' },
        el('div', { class: `card-media ${shape}` }, mediaFor(job), el('span', { class: `badge ${job.status}` }, STATUS_LABEL[job.status] || job.status)),
        el(
          'div',
          { class: 'card-body' },
          el('div', { class: 'card-meta' }, el('span', { class: 'card-title' }, job.modelName), el('span', {}, (job.costCertainty === 'aproximado' ? '≈ ' : '') + money(job.costUsd))),
          el('div', { class: 'card-meta' }, el('span', {}, job.clientName), el('span', {}, new Date(job.createdAt).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }))),
          el('div', { class: 'card-meta' }, el('span', {}, job.modeName), el('span', {}, [job.params?.duration && `${job.params.duration} s`, job.images?.length && job.model === 'kling3_0' ? null : job.params?.aspect, resolutionLabel(job)].filter(Boolean).join(' · '))),
          el('p', { class: 'card-prompt', title: job.prompt }, job.prompt),
          job.error ? el('p', { class: 'card-error' }, job.error) : null,
          el(
            'div',
            { class: 'card-actions' },
            file ? el('a', { class: 'btn small', href: `/media/${file.split('/').map(encodeURIComponent).join('/')}?descargar=1` }, 'Descargar') : null,
            el('button', { type: 'button', class: 'btn small', onclick: () => reuseJob(job) }, 'Reutilizar'),
          ),
        ),
      );
    }),
  );
}

function renderLog() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const counted = state.jobs.filter((j) => j.status !== 'fallida');
  const sum = (list) => list.reduce((s, j) => s + (j.costUsd || 0), 0);
  $('logTotals').replaceChildren(
    el('div', {}, 'Gastado hoy', el('strong', {}, money(state.spentTodayUsd))),
    el('div', {}, 'Este mes (filtro)', el('strong', {}, money(sum(counted.filter((j) => j.date.startsWith(month)))))),
    el('div', {}, 'Total (filtro)', el('strong', {}, money(sum(counted)))),
    el('div', {}, 'Generaciones', el('strong', {}, String(state.jobs.length))),
  );
  $('logBody').replaceChildren(
    ...state.jobs.map((j) =>
      el(
        'tr',
        {},
        el('td', {}, new Date(j.createdAt).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })),
        el('td', {}, j.clientName),
        el('td', {}, j.modelName),
        el('td', {}, j.modeName),
        el('td', { class: 'num' }, j.status === 'fallida' ? `${money(0)} (reembolsado)` : (j.costCertainty === 'aproximado' ? '≈ ' : '') + money(j.costUsd)),
        el('td', {}, el('span', { class: `badge ${j.status}` }, STATUS_LABEL[j.status] || j.status)),
      ),
    ),
  );
}

async function reuseJob(job) {
  if (!state.catalog.models.find((m) => m.id === job.model)?.modes[job.mode]) {
    toast('Ese modelo ya no está disponible en el panel.', 'error');
    return;
  }
  state.mode = job.mode;
  state.modelId = job.model;
  renderModes();
  renderModelSelect();
  if (state.clients.some((c) => c.id === job.clientId)) $('clientSelect').value = job.clientId;
  $('prompt').value = job.prompt;
  if (job.params?.duration) $('duration').value = job.params.duration;
  if (job.params?.aspect) state.aspect = job.params.aspect;
  if (job.params?.audio !== undefined && job.params.audio !== null) {
    $('audio').checked = job.params.audio;
    state.audioTouched = true;
  }
  applyModelDefaults();
  if (job.params?.resolution) $('resolution').value = job.params.resolution;

  const load = async (ids) => {
    const items = [];
    for (const id of ids || []) {
      try {
        const { upload } = await api('GET', `/api/subidas/${id}?info=1`);
        items.push({ name: upload.name, kind: upload.kind, upload, previewUrl: upload.url, duration: upload.duration, width: upload.width, height: upload.height });
      } catch {
        toast('Uno de los archivos de referencia ya no existe.', 'error');
      }
    }
    return items;
  };
  state.images = await load(job.images);
  state.videos = await load(job.videos);
  state.source = await load(job.source ? [job.source] : []);
  renderForm();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  $('prompt').focus();
  toast('Prompt y referencias cargados. Ajusta lo que quieras y genera.', 'ok');
}

// ------------------------------------------------------------------ settings and clients

function openSettings() {
  $('limitInput').value = state.settings.dailyLimitUsd;
  $('balanceInput').value = state.balanceUsd ?? '';
  $('settingsDialog').showModal();
}

async function saveSettings() {
  try {
    const s = await api('PUT', '/api/ajustes', {
      dailyLimitUsd: $('limitInput').value,
      balanceUsd: $('balanceInput').value === '' ? null : $('balanceInput').value,
    });
    applyState(s);
    $('settingsDialog').close();
    toast('Ajustes guardados.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function saveClient() {
  try {
    const { client, state: s } = await api('POST', '/api/clientes', { name: $('clientName').value });
    applyState(s);
    $('clientSelect').value = client.id;
    $('clientDialog').close();
    toast(`Cliente "${client.name}" listo. Su carpeta: data/clientes/${client.id}`, 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ------------------------------------------------------------------ start

async function init() {
  const s = await api('GET', '/api/estado');
  applyState(s);
  state.modelId = modelsForMode(state.mode)[0]?.id;
  renderModes();
  renderModelSelect();
  applyModelDefaults();
  renderForm();

  wireDropzone('sourceZone', 'source');
  wireDropzone('imagesZone', 'images');
  wireDropzone('videosZone', 'videos');
  $('modelSelect').addEventListener('change', (e) => {
    state.modelId = e.target.value;
    applyModelDefaults();
    renderForm();
  });
  $('duration').addEventListener('input', () => ($('durationOut').textContent = `${$('duration').value} s`));
  $('audio').addEventListener('change', () => (state.audioTouched = true));
  $('quoteBtn').addEventListener('click', openQuote);
  $('confirmBtn').addEventListener('click', confirmGenerate);
  $('approxAccept').addEventListener('change', updateConfirmButton);
  $('settingsBtn').addEventListener('click', openSettings);
  $('balanceMeter').addEventListener('click', openSettings);
  $('saveSettingsBtn').addEventListener('click', saveSettings);
  $('addClientBtn').addEventListener('click', () => {
    $('clientName').value = '';
    $('clientDialog').showModal();
  });
  $('saveClientBtn').addEventListener('click', saveClient);
  $('clientName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveClient();
    }
  });
  $('filterClient').addEventListener('change', refreshJobs);
  $('filterModel').addEventListener('change', (e) => {
    state.filterModel = e.target.value;
    refreshJobs();
  });
  document.querySelectorAll('[data-view]').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('active', x === b));
      $('galleryView').classList.toggle('hidden', b.dataset.view !== 'gallery');
      $('logView').classList.toggle('hidden', b.dataset.view !== 'log');
    }),
  );

  await refreshJobs();
  setInterval(() => {
    if (state.jobs.some((j) => ACTIVE.includes(j.status))) refreshJobs();
  }, 4000);
}

init().catch((err) => toast(`No se pudo cargar el panel: ${err.message}`, 'error'));
