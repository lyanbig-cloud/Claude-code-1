// Local data: clients, settings, uploads and the generation log, kept in data/db.json.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// PANEL_DATA_DIR is only used by the automated test, so it never touches real data.
const DATA_DIR = process.env.PANEL_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'subidas');
const CLIENTS_DIR = path.join(DATA_DIR, 'clientes');

const DEFAULT_DB = {
  settings: { dailyLimitUsd: 10, balanceUsd: null, balanceSetAt: null },
  clients: [{ id: 'dimelo-big', name: 'Dímelo Big Productions' }],
  uploads: {},
  jobs: [],
};

let db;

function load() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(CLIENTS_DIR, { recursive: true });
  try {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw new Error(`No se pudo leer ${DB_PATH}: ${err.message}`);
    db = structuredClone(DEFAULT_DB);
    save();
  }
  db.settings = { ...DEFAULT_DB.settings, ...db.settings };
  db.clients ||= [];
  db.uploads ||= {};
  db.jobs ||= [];
  return db;
}

function save() {
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

const newId = () => crypto.randomBytes(8).toString('hex');

function slugify(name) {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return slug || 'cliente';
}

function addClient(name) {
  const clean = String(name || '').trim().slice(0, 80);
  if (!clean) throw Object.assign(new Error('Escribe el nombre del cliente.'), { userFacing: true });
  const existing = db.clients.find((c) => c.name.toLowerCase() === clean.toLowerCase());
  if (existing) return existing;
  let id = slugify(clean);
  for (let n = 2; db.clients.some((c) => c.id === id); n++) id = `${slugify(clean)}-${n}`;
  const client = { id, name: clean };
  db.clients.push(client);
  fs.mkdirSync(path.join(CLIENTS_DIR, id), { recursive: true });
  save();
  return client;
}

/** Local calendar date (YYYY-MM-DD) for the daily limit. */
function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Failed, NSFW and cancelled jobs are refunded by Higgsfield, so they do not count as spent.
const counts = (job) => job.status !== 'fallida';

function spentOn(date) {
  return db.jobs.filter((j) => j.date === date && counts(j)).reduce((s, j) => s + (j.costUsd || 0), 0);
}

function balanceNow() {
  const { balanceUsd, balanceSetAt } = db.settings;
  if (balanceUsd === null || balanceUsd === undefined) return null;
  const spentSince = db.jobs
    .filter((j) => counts(j) && j.createdAt > balanceSetAt)
    .reduce((s, j) => s + (j.costUsd || 0), 0);
  return Math.round((balanceUsd - spentSince) * 100) / 100;
}

module.exports = {
  load,
  save,
  get db() {
    return db;
  },
  newId,
  addClient,
  localDate,
  spentOn,
  balanceNow,
  DATA_DIR,
  UPLOADS_DIR,
  CLIENTS_DIR,
};
