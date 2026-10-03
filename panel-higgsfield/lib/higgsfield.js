// Minimal Higgsfield API client (https://api.higgsfield.ai), server side only.
// Auth: "Authorization: Key KEY_ID:KEY_SECRET". The header is sent only to the API host,
// never to the presigned upload URL or to the media download URLs.
const fs = require('fs');

class HiggsfieldError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const HINTS = {
  401: 'la API key no es válida',
  402: 'no hay saldo suficiente en la API',
  403: 'la key no tiene acceso o la solicitud fue bloqueada',
  404: 'endpoint de modelo desconocido',
  422: 'parámetros no válidos',
  429: 'demasiadas solicitudes, espera un momento',
};

function createClient(config) {
  const authorization = `Key ${config.keyId}:${config.keySecret}`;

  async function call(method, path, body, timeoutMs = 60000) {
    if (config.problem) throw new HiggsfieldError(0, config.problem);
    if (!path.startsWith('/') || path.includes('..')) throw new Error(`Ruta no permitida: ${path}`);
    let res;
    try {
      res = await fetch(config.apiBase + path, {
        method,
        redirect: 'manual', // never forward the key to another location
        headers: {
          Authorization: authorization,
          Accept: 'application/json',
          'User-Agent': 'dimelo-big-panel/1.0',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new HiggsfieldError(0, `No se pudo conectar con Higgsfield: ${err.message}`);
    }
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = null;
    }
    if (!res.ok) {
      let detail = data && (data.detail || data.error || data.message);
      if (Array.isArray(detail)) detail = detail.map((d) => [d.loc && d.loc.join('.'), d.msg].filter(Boolean).join(': ')).join('; ');
      const hint = HINTS[res.status] ? ` (${HINTS[res.status]})` : '';
      throw new HiggsfieldError(res.status, `Higgsfield respondió ${res.status}${hint}${detail ? `: ${String(detail).slice(0, 300)}` : ''}`);
    }
    if (!data || typeof data !== 'object') throw new HiggsfieldError(res.status, 'Respuesta inesperada de Higgsfield');
    return data;
  }

  return {
    /** Free price check. Returns { usd } for most models, or { pricing_description } for token-priced ones. */
    estimate(endpoint, body) {
      return call('POST', `/estimate/${endpoint}`, body, 30000);
    },
    /** Paid: submits a generation. Returns { request_id, status, ... }. */
    submit(endpoint, body) {
      return call('POST', `/${endpoint}`, body, 120000);
    },
    status(requestId) {
      if (!/^[\w-]+$/.test(requestId)) throw new Error('request_id no válido');
      return call('GET', `/requests/${requestId}/status`, undefined, 30000);
    },
    /** Uploads a local file to Higgsfield storage and returns its public URL. */
    async uploadFile(filePath, contentType) {
      const slot = await call('POST', '/files/generate-upload-url', { content_type: contentType });
      for (const u of [slot.upload_url, slot.public_url]) {
        if (!u || !isAllowedMediaUrl(u, config)) throw new HiggsfieldError(0, 'Higgsfield no devolvió una URL de subida segura');
      }
      const headers = {};
      for (const [k, v] of Object.entries(slot.upload_headers || { 'Content-Type': contentType })) {
        if (!['authorization', 'cookie', 'host'].includes(k.toLowerCase())) headers[k] = String(v);
      }
      const size = fs.statSync(filePath).size;
      headers['Content-Length'] = String(size);
      const res = await fetch(slot.upload_url, {
        method: 'PUT',
        headers,
        body: fs.createReadStream(filePath),
        duplex: 'half',
        signal: AbortSignal.timeout(15 * 60 * 1000),
      });
      if (!res.ok) throw new HiggsfieldError(res.status, `Falló la subida del archivo a Higgsfield (HTTP ${res.status})`);
      return slot.public_url;
    },
  };
}

function isAllowedMediaUrl(url, config) {
  const u = new URL(url);
  return u.protocol === 'https:' || (config.allowLocalHttp && u.protocol === 'http:' && u.hostname === '127.0.0.1');
}

/** Collects every media URL in a completed status response ({ video: {url} }, { images: [{url}] }, ...). */
function outputUrls(response) {
  const urls = [];
  for (const [key, value] of Object.entries(response || {})) {
    if (key.endsWith('_url')) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item && typeof item === 'object' && typeof item.url === 'string') urls.push(item.url);
    }
  }
  return [...new Set(urls)];
}

module.exports = { createClient, outputUrls, isAllowedMediaUrl, HiggsfieldError };
