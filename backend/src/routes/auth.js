// Auth routes: register, login, me
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDB } = require('../db/database');
const { auth, sign } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
  if (password.length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  const db = getDB();
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)').run(email.toLowerCase(), hash, name || null);
  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id=?').get(info.lastInsertRowid);
  res.json({ token: sign(user.id), user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
  const db = getDB();
  const row = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase());
  if (!row) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  if (!bcrypt.compareSync(password, row.password)) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id=?').get(row.id);
  res.json({ token: sign(row.id), user });
});

router.get('/me', auth, (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id=?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json({ user });
});

module.exports = router;