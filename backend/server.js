const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8787;
const DB_PATH = path.join(__dirname, 'users.json');

app.use(express.json({ limit: '1mb' }));
app.use(cors());

function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(raw);
    if (!db.users) db.users = {};
    return db;
  } catch (e) {
    return { users: {} };
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function userView(key, u) {
  return {
    key,
    username: u.username,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    puzzles: u.puzzles || {},
    daily: u.daily || {},
    totalScore: u.totalScore || 0,
    completedCount: u.completedCount || 0
  };
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/register', (req, res) => {
  const { key, username, passHash } = req.body || {};
  if (!key || !username || !passHash) return res.status(400).json({ ok: false, message: 'Eksik alan' });
  const db = readDB();
  if (db.users[key]) return res.status(409).json({ ok: false, message: 'Bu kullanıcı adı zaten kayıtlı.' });

  db.users[key] = {
    username,
    passHash,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    puzzles: {},
    daily: {},
    totalScore: 0,
    completedCount: 0
  };
  writeDB(db);
  return res.json({ ok: true, user: userView(key, db.users[key]) });
});

app.post('/api/login', (req, res) => {
  const { key, passHash } = req.body || {};
  if (!key || !passHash) return res.status(400).json({ ok: false, message: 'Eksik alan' });
  const db = readDB();
  const user = db.users[key];
  if (!user) return res.status(404).json({ ok: false, message: 'Kullanıcı bulunamadı. Önce kayıt ol.' });
  if (user.passHash !== passHash) return res.status(401).json({ ok: false, message: 'Şifre hatalı.' });
  user.updatedAt = Date.now();
  db.users[key] = user;
  writeDB(db);
  return res.json({ ok: true, user: userView(key, user) });
});

app.get('/api/user/:key', (req, res) => {
  const db = readDB();
  const user = db.users[req.params.key];
  if (!user) return res.status(404).json({ ok: false, message: 'Kullanıcı yok' });
  return res.json({ ok: true, user: userView(req.params.key, user) });
});

app.post('/api/score', (req, res) => {
  const { key, puzzleId, score, time, hints, difficulty, dailyKey } = req.body || {};
  if (!key || puzzleId == null) return res.status(400).json({ ok: false, message: 'Eksik alan' });

  const db = readDB();
  const user = db.users[key];
  if (!user) return res.status(404).json({ ok: false, message: 'Kullanıcı yok' });

  const pid = String(puzzleId);
  const entry = {
    score: Number(score) || 0,
    time: Number(time) || 0,
    hints: Number(hints) || 0,
    difficulty: difficulty || 'Kolay',
    completedAt: Date.now()
  };

  if (!user.puzzles) user.puzzles = {};
  if (!user.daily) user.daily = {};

  if (!user.puzzles[pid] || (user.puzzles[pid].score || 0) < entry.score) user.puzzles[pid] = entry;

  if (dailyKey) {
    const dk = String(dailyKey);
    if (!user.daily[dk] || (user.daily[dk].score || 0) < entry.score) {
      user.daily[dk] = { score: entry.score, time: entry.time, hints: entry.hints, id: puzzleId, completedAt: entry.completedAt };
    }
  }

  const vals = Object.values(user.puzzles);
  user.totalScore = vals.reduce((s, x) => s + (x.score || 0), 0);
  user.completedCount = vals.length;
  user.updatedAt = Date.now();

  db.users[key] = user;
  writeDB(db);
  return res.json({ ok: true, user: userView(key, user) });
});

app.get('/api/leaderboard', (req, res) => {
  const n = Math.max(1, Math.min(200, Number(req.query.n) || 50));
  const db = readDB();
  const list = Object.entries(db.users).map(([key, u]) => ({
    uid: key,
    name: u.username || key,
    totalScore: u.totalScore || 0,
    completedCount: u.completedCount || 0
  })).sort((a, b) => b.totalScore - a.totalScore).slice(0, n);

  res.json({ ok: true, leaderboard: list });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
