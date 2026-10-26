'use strict';

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'demo123';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_MS = 2 * 60 * 60 * 1000;
const MAX_GALLERY = 12;
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- banco em arquivo JSON ----------
function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(db) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// ---------- sessão por cookie assinado ----------
const sign = (value) => crypto.createHmac('sha256', SECRET).update(value).digest('hex');

function makeToken() {
  const exp = String(Date.now() + SESSION_MS);
  return `${exp}.${sign(exp)}`;
}

function validToken(token) {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  const good = sign(exp);
  if (sig.length !== good.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  return Number(exp) > Date.now();
}

function readCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key) out[key] = decodeURIComponent(rest.join('='));
  }
  return out;
}

function requireAuth(req, res, next) {
  if (validToken(readCookies(req).sid)) return next();
  res.status(401).json({ error: 'Faça login para continuar.' });
}

function samePassword(input) {
  const a = crypto.createHash('sha256').update(String(input)).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

// 5 tentativas erradas bloqueiam o IP por 10 minutos
const attempts = new Map();

function isLocked(ip) {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (entry.until <= Date.now()) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= 5;
}

function registerFailure(ip) {
  const entry = attempts.get(ip) || { count: 0, until: 0 };
  entry.count += 1;
  entry.until = Date.now() + 10 * 60 * 1000;
  attempts.set(ip, entry);
}

// ---------- upload de imagens ----------
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + EXT[file.mimetype]),
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new Error('Use imagens JPG, PNG ou WebP.')),
});

function uploadOne(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'A imagem deve ter até 3 MB.' : err.message;
    res.status(400).json({ error: message });
  });
}

function removeUpload(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(url)), () => {});
}

function discardUpload(req) {
  if (req.file) removeUpload('/uploads/' + req.file.filename);
}

// ---------- validação ----------
function parseItem(body, categories) {
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const category = String(body.category || '');
  const price = Number(String(body.price || '').replace(',', '.'));
  const errors = [];

  if (name.length < 2 || name.length > 80) errors.push('O nome deve ter de 2 a 80 caracteres.');
  if (description.length > 200) errors.push('A descrição deve ter até 200 caracteres.');
  if (!categories.includes(category)) errors.push('Escolha uma categoria válida.');
  if (!Number.isFinite(price) || price < 0 || price > 9999) errors.push('Informe um preço válido.');

  return {
    errors,
    value: {
      name,
      description,
      category,
      price: Math.round(price * 100) / 100,
      featured: body.featured === 'true',
      available: body.available !== 'false',
    },
  };
}

// ---------- app ----------
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'same-origin');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/menu', (req, res) => {
  const db = readDb();
  const order = (item) => db.categories.indexOf(item.category);
  res.json({
    restaurant: db.restaurant,
    categories: db.categories,
    items: db.items.filter((i) => i.available).sort((a, b) => order(a) - order(b)),
    gallery: db.gallery,
  });
});

app.post('/api/login', (req, res) => {
  const ip = req.ip;
  if (isLocked(ip)) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente de novo em 10 minutos.' });
  }
  if (!samePassword(req.body && req.body.password)) {
    registerFailure(ip);
    return res.status(401).json({ error: 'Senha incorreta.' });
  }
  attempts.delete(ip);
  res.cookie('sid', makeToken(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MS,
  });
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('sid');
  res.json({ ok: true });
});

app.get('/api/admin/menu', requireAuth, (req, res) => {
  const db = readDb();
  res.json({ categories: db.categories, items: db.items, gallery: db.gallery, max: MAX_GALLERY });
});

app.post('/api/admin/items', requireAuth, uploadOne, (req, res) => {
  const db = readDb();
  const { errors, value } = parseItem(req.body, db.categories);
  if (errors.length) {
    discardUpload(req);
    return res.status(400).json({ error: errors.join(' ') });
  }
  const item = {
    id: crypto.randomUUID(),
    ...value,
    image: req.file ? '/uploads/' + req.file.filename : null,
  };
  db.items.push(item);
  writeDb(db);
  res.status(201).json(item);
});

app.put('/api/admin/items/:id', requireAuth, uploadOne, (req, res) => {
  const db = readDb();
  const item = db.items.find((i) => i.id === req.params.id);
  if (!item) {
    discardUpload(req);
    return res.status(404).json({ error: 'Item não encontrado.' });
  }
  const { errors, value } = parseItem(req.body, db.categories);
  if (errors.length) {
    discardUpload(req);
    return res.status(400).json({ error: errors.join(' ') });
  }
  Object.assign(item, value);
  if (req.file) {
    removeUpload(item.image);
    item.image = '/uploads/' + req.file.filename;
  } else if (req.body.removeImage === 'true') {
    removeUpload(item.image);
    item.image = null;
  }
  writeDb(db);
  res.json(item);
});

app.delete('/api/admin/items/:id', requireAuth, (req, res) => {
  const db = readDb();
  const index = db.items.findIndex((i) => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Item não encontrado.' });
  const [removed] = db.items.splice(index, 1);
  removeUpload(removed.image);
  writeDb(db);
  res.json({ ok: true });
});

app.post('/api/admin/gallery', requireAuth, uploadOne, (req, res) => {
  const db = readDb();
  if (!req.file) return res.status(400).json({ error: 'Escolha uma foto.' });
  const caption = String(req.body.caption || '').trim().slice(0, 80);
  if (db.gallery.length >= MAX_GALLERY) {
    discardUpload(req);
    return res.status(400).json({ error: `A galeria aceita até ${MAX_GALLERY} fotos.` });
  }
  const photo = { id: crypto.randomUUID(), image: '/uploads/' + req.file.filename, caption };
  db.gallery.push(photo);
  writeDb(db);
  res.status(201).json(photo);
});

app.delete('/api/admin/gallery/:id', requireAuth, (req, res) => {
  const db = readDb();
  const index = db.gallery.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Foto não encontrada.' });
  const [removed] = db.gallery.splice(index, 1);
  removeUpload(removed.image);
  writeDb(db);
  res.json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Algo deu errado. Tente novamente.' });
});

app.listen(PORT, () => {
  console.log(`Fogão da Lia rodando em http://localhost:${PORT}`);
  console.log(`Painel: http://localhost:${PORT}/admin.html`);
});
