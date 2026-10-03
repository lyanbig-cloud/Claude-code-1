// The models this panel offers, what each one really accepts, how to build its API request and how to price it.
// Limits and endpoints come from each model's official API schema on open.higgsfield.ai (checked 2026-09-26).

const MODES = {
  crear: 'Crear desde cero',
  fondo: 'Cambiar fondo',
  estilo: 'Cambiar estilo',
};

// The user's text is wrapped so the model keeps what was filmed and changes only what was asked.
const EDIT_TEMPLATES = {
  fondo: (p) =>
    `Keep the person, their face, body, clothing, movements, gestures and lip sync exactly as in the source video. ` +
    `Do not change the framing or timing. Replace only the background/environment with: ${p}`,
  estilo: (p) =>
    `Keep the same people, actions, motion, framing and timing as the source video. ` +
    `Restyle the whole video with this visual style: ${p}`,
};

const ASPECTS = ['9:16', '16:9', '1:1'];

const MODELS = {
  seedance_2_5: {
    id: 'seedance_2_5',
    name: 'Seedance 2.5',
    kind: 'video',
    modes: {
      crear: {
        source: false,
        refs: { images: 30, videos: 10 },
        prompt: { required: true },
        duration: { min: 4, max: 30, default: 5 },
        aspect: { options: ASPECTS },
        resolution: { options: [{ value: '480p', label: '480p' }, { value: '720p', label: '720p (HD)' }], default: '720p' },
        audio: { default: true },
      },
      fondo: editSeedance(),
      estilo: editSeedance(),
    },
  },
  kling3_0: {
    id: 'kling3_0',
    name: 'Kling 3.0',
    kind: 'video',
    modes: {
      crear: {
        source: false,
        // Kling 3.0 takes at most a start frame and an end frame, and no reference videos.
        refs: { images: 2, videos: 0, imagesNote: '1.ª foto = cuadro inicial, 2.ª = cuadro final' },
        prompt: { required: true },
        duration: { min: 3, max: 15, default: 5 },
        aspect: { options: ASPECTS, hiddenWithImages: 'Con foto inicial, el formato lo define la foto.' },
        resolution: {
          options: [{ value: 'std', label: 'Estándar (720p)' }, { value: 'pro', label: 'Pro (1080p)' }, { value: '4k', label: '4K' }],
          default: 'std',
        },
        audio: { default: true },
      },
    },
  },
  kling_omni_edit: {
    id: 'kling_omni_edit',
    name: 'Kling 3.0 Omni Edit',
    kind: 'video',
    modes: {
      fondo: editKlingOmni(),
      estilo: editKlingOmni(),
    },
  },
};

function editSeedance() {
  return {
    source: true,
    sourceNote: 'El video resultante dura lo mismo que tu video (máx. 30 s).',
    sourceMaxSeconds: 30,
    refs: { images: 30, videos: 10 },
    prompt: { required: true },
    resolution: { options: [{ value: '480p', label: '480p' }, { value: '720p', label: '720p (HD)' }], default: '720p' },
    audio: { default: true },
  };
}

function editKlingOmni() {
  return {
    source: true,
    sourceNote: 'El video resultante dura lo mismo que tu video (máx. 10 s).',
    sourceMaxSeconds: 10,
    refs: { images: 4, videos: 0 },
    prompt: { required: true },
    resolution: { options: [{ value: 'std', label: 'Estándar' }, { value: 'pro', label: 'Pro' }], default: 'pro' },
  };
}

/** What the browser needs to draw the form. */
function publicCatalog() {
  return {
    modes: MODES,
    models: Object.values(MODELS).map((m) => ({ id: m.id, name: m.name, kind: m.kind, modes: m.modes })),
  };
}

function specFor(modelId, mode) {
  const model = MODELS[modelId];
  if (!model) throw userError('Modelo desconocido.');
  const spec = model.modes[mode];
  if (!spec) throw userError(`${model.name} no puede hacer "${MODES[mode] || mode}".`);
  return { model, spec };
}

function userError(message) {
  const err = new Error(message);
  err.userFacing = true;
  return err;
}

/**
 * Checks the form against what the model accepts and returns a clean input.
 * `uploads` maps upload ids to upload records ({ id, kind, duration, width, height }).
 */
function normalizeInput(body, uploads) {
  const { model, spec } = specFor(body.model, body.mode);
  const prompt = String(body.prompt || '').trim();
  if (spec.prompt.required && !prompt) throw userError('Escribe el prompt.');
  if (prompt.length > 4000) throw userError('El prompt es demasiado largo (máx. 4000 caracteres).');

  const pick = (ids, kind) =>
    (Array.isArray(ids) ? ids : []).map((id) => {
      const u = uploads[id];
      if (!u) throw userError('Uno de los archivos ya no existe; vuelve a subirlo.');
      if (u.kind !== kind) throw userError(`"${u.name}" no es ${kind === 'image' ? 'una foto' : 'un video'}.`);
      return u;
    });
  const images = pick(body.images, 'image');
  const videos = pick(body.videos, 'video');
  if (images.length > spec.refs.images) {
    throw userError(`${model.name} acepta máximo ${spec.refs.images} foto(s) de referencia; tienes ${images.length}.`);
  }
  if (videos.length > spec.refs.videos) {
    throw userError(
      spec.refs.videos === 0
        ? `${model.name} no acepta videos de referencia en este modo.`
        : `${model.name} acepta máximo ${spec.refs.videos} video(s) de referencia; tienes ${videos.length}.`,
    );
  }
  for (const v of videos) {
    if (!(v.duration > 0)) throw userError(`No se pudo leer la duración de "${v.name}". Vuelve a subirlo.`);
  }

  let source = null;
  if (spec.source) {
    source = pick(body.source ? [body.source] : [], 'video')[0];
    if (!source) throw userError('Sube tu video grabado.');
    if (!(source.duration > 0)) throw userError('No se pudo leer la duración de tu video. Vuelve a subirlo.');
    if (source.duration > spec.sourceMaxSeconds + 0.5) {
      throw userError(`${model.name} edita videos de hasta ${spec.sourceMaxSeconds} s; el tuyo dura ${source.duration.toFixed(1)} s. Recórtalo primero.`);
    }
  }

  const input = { model: model.id, mode: body.mode, prompt, images, videos, source };
  if (spec.duration) {
    const d = Math.round(Number(body.duration));
    if (!(d >= spec.duration.min && d <= spec.duration.max)) {
      throw userError(`La duración debe estar entre ${spec.duration.min} y ${spec.duration.max} s.`);
    }
    input.duration = d;
  }
  if (spec.aspect) {
    if (!spec.aspect.options.includes(body.aspect)) throw userError('Formato no válido.');
    input.aspect = body.aspect;
  }
  if (spec.resolution) {
    if (!spec.resolution.options.some((o) => o.value === body.resolution)) throw userError('Resolución no válida.');
    input.resolution = body.resolution;
  }
  if (spec.audio) input.audio = body.audio === undefined ? spec.audio.default : Boolean(body.audio);
  return input;
}

/** Builds { endpoint, body } for the API. `urlOf(upload)` returns the Higgsfield URL of a local upload. */
function buildRequest(input, urlOf) {
  const imgs = input.images.map(urlOf);
  const vids = input.videos.map(urlOf);
  const withRefs = (body) => {
    if (imgs.length) body.image_urls = imgs;
    if (vids.length) body.video_urls = vids;
    return body;
  };

  if (input.model === 'seedance_2_5') {
    if (input.mode === 'crear') {
      const body = {
        prompt: input.prompt,
        duration: input.duration,
        resolution: input.resolution,
        aspect_ratio: input.aspect,
        generate_audio: input.audio,
      };
      if (!imgs.length && !vids.length) return { endpoint: 'bytedance/seedance-2.5/text-to-video', body: { ...body, output_format: 'mp4' } };
      return { endpoint: 'bytedance/seedance-2.5/reference-to-video', body: withRefs(body) };
    }
    return {
      endpoint: 'bytedance/seedance-2.5/video-edit',
      body: withRefs({
        prompt: EDIT_TEMPLATES[input.mode](input.prompt),
        video_url: urlOf(input.source),
        resolution: input.resolution,
        generate_audio: input.audio,
      }),
    };
  }

  if (input.model === 'kling3_0') {
    const body = { prompt: input.prompt, duration: input.duration, sound: input.audio ? 'on' : 'off' };
    if (!imgs.length) {
      return { endpoint: `kling-video/v3.0/${input.resolution}/text-to-video`, body: { ...body, aspect_ratio: input.aspect } };
    }
    body.image_url = imgs[0];
    if (imgs[1]) body.last_image_url = imgs[1];
    return { endpoint: `kling-video/v3.0/${input.resolution}/image-to-video`, body };
  }

  if (input.model === 'kling_omni_edit') {
    const body = { prompt: EDIT_TEMPLATES[input.mode](input.prompt), video_urls: [urlOf(input.source)], mode: input.resolution };
    if (imgs.length) body.image_urls = imgs;
    return { endpoint: 'kling-video/omni/video-edit', body };
  }
  throw userError('Modelo desconocido.');
}

// ------------------------------------------------------------------ pricing
// Fallback rates, used only when Higgsfield's free /estimate does not return a dollar amount.
// They are the published list prices (before any discount), so they err on the high side.
const SEEDANCE = { ratePer1kTokens: 0.0214, ratePer1kTokensWithVideo: 0.01284, fps: 24, divisor: 1024, maxInputSeconds: 30 };
const KLING_USD_PER_SECOND = { std: 0.084, pro: 0.112, '4k': 0.42 };

const round4 = (n) => Math.round(n * 10000) / 10000;

function outputDims(resolution, w, h) {
  const short = resolution === '480p' ? 480 : 720;
  if (!w || !h) return { width: Math.round((short * 16) / 9), height: short };
  return w >= h ? { width: Math.round((short * w) / h), height: short } : { width: short, height: Math.round((short * h) / w) };
}

function seedancePrice(input, description) {
  const usesVideo = Boolean(input.source) || input.videos.length > 0;
  let rate = usesVideo ? SEEDANCE.ratePer1kTokensWithVideo : SEEDANCE.ratePer1kTokens;
  const m = usesVideo
    ? /\$(\d+(?:\.\d+)?) with video input/.exec(description) || /each 1,000 video tokens cost \$(\d+(?:\.\d+)?)\.?\s*Both input/.exec(description)
    : /each 1,000 video tokens cost \$(\d+(?:\.\d+)?)/.exec(description);
  if (m) rate = Number(m[1]);

  let dims;
  let generated;
  if (input.source) {
    dims = outputDims(input.resolution, input.source.width, input.source.height);
    generated = Math.min(input.source.duration, SEEDANCE.maxInputSeconds);
  } else {
    const [aw, ah] = input.aspect.split(':').map(Number);
    dims = outputDims(input.resolution, aw, ah);
    generated = input.duration;
  }
  const inputSeconds = Math.min(
    SEEDANCE.maxInputSeconds,
    (input.source ? input.source.duration : 0) + input.videos.reduce((s, v) => s + v.duration, 0),
  );
  const seconds = Math.ceil(inputSeconds) + Math.ceil(generated);
  const tokens = Math.ceil((seconds * dims.width * dims.height * SEEDANCE.fps) / SEEDANCE.divisor);
  return {
    usd: round4((tokens / 1000) * rate),
    certainty: 'calculado',
    detail: `Seedance: ${tokens.toLocaleString('es')} tokens × $${rate} por 1.000 (${seconds} s a ${dims.width}×${dims.height}).`,
  };
}

function klingFallback(input) {
  const seconds = input.source ? Math.ceil(input.source.duration) : input.duration;
  const rate = KLING_USD_PER_SECOND[input.resolution] || KLING_USD_PER_SECOND.pro;
  return {
    usd: round4(seconds * rate),
    certainty: 'aproximado',
    detail: `Higgsfield no publica el precio exacto de este modelo; se calculó con la tarifa de lista de Kling: ${seconds} s × $${rate}/s.`,
  };
}

/** Price of ONE generation. Uses Higgsfield's free estimate first, then the published rates. */
async function priceOne(client, input) {
  const placeholder = (u) => `https://example.com/referencia-${u.id}.${u.kind === 'image' ? 'jpg' : 'mp4'}`;
  const req = buildRequest(input, placeholder);
  let description = '';
  try {
    const est = await client.estimate(req.endpoint, req.body);
    const usd = Number(est.usd);
    if (est.usd !== undefined && est.usd !== null && Number.isFinite(usd)) {
      return { usd: round4(usd), certainty: 'exacto', detail: '' };
    }
    description = String(est.pricing_description || '');
  } catch (err) {
    if (err.status === 401 || err.status === 0) throw err; // bad key or no connection: do not guess
  }
  if (input.model === 'seedance_2_5') return seedancePrice(input, description);
  return klingFallback(input);
}

module.exports = { MODES, MODELS, publicCatalog, normalizeInput, buildRequest, priceOne, userError, specFor };
