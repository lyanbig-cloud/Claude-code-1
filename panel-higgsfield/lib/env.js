// Reads the Higgsfield API key from panel-higgsfield/.env only. The key never leaves this process
// except in the Authorization header sent to api.higgsfield.ai.
const fs = require('fs');
const path = require('path');

// PANEL_ENV_FILE is only used by the automated test.
const ENV_PATH = process.env.PANEL_ENV_FILE || path.join(__dirname, '..', '.env');

function parseEnvFile(file) {
  const values = {};
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return values;
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function loadConfig() {
  const env = parseEnvFile(ENV_PATH);
  let keyId = (env.HF_API_KEY_ID || '').trim();
  let keySecret = (env.HF_API_KEY_SECRET || '').trim();
  // Also accept the single "KEY_ID:KEY_SECRET" form the Higgsfield console can show.
  const combined = (env.HF_KEY || '').trim();
  if ((!keyId || !keySecret) && combined.includes(':')) {
    [keyId, keySecret] = combined.split(':', 2).map((s) => s.trim());
  }
  let problem = null;
  if (!keyId || !keySecret) {
    problem = 'Falta la API key. Copia .env.example como .env y pega HF_API_KEY_ID y HF_API_KEY_SECRET.';
  } else if (/[\s:]/.test(keyId) || /\s/.test(keySecret)) {
    problem = 'La API key en .env tiene espacios o ":" de más. Vuelve a copiarla desde la consola de Higgsfield.';
  }

  // Base URL override exists only for local testing against a mock server.
  let apiBase = 'https://api.higgsfield.ai';
  const override = (env.HF_API_BASE || '').trim();
  if (override) {
    const u = new URL(override);
    const isHiggsfield = u.protocol === 'https:' && (u.hostname === 'higgsfield.ai' || u.hostname.endsWith('.higgsfield.ai'));
    const isLocal = u.protocol === 'http:' && u.hostname === '127.0.0.1';
    if (!isHiggsfield && !isLocal) throw new Error('HF_API_BASE solo puede apuntar a *.higgsfield.ai');
    apiBase = override.replace(/\/$/, '');
  }

  const port = Number(env.PANEL_PORT) || 4321;
  // Plain-http media URLs are accepted only when testing against the local mock server.
  const allowLocalHttp = apiBase.startsWith('http://127.0.0.1');
  return { keyId, keySecret, problem, apiBase, port, allowLocalHttp };
}

module.exports = { loadConfig, ENV_PATH };
