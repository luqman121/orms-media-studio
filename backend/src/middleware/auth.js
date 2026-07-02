// JWT auth middleware
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const EXPIRY = '30d';

function sign(userId) {
  return jwt.sign({ uid: userId }, SECRET, { expiresIn: EXPIRY });
}

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: 'التوثيق مطلوب' });
  try {
    const p = jwt.verify(m[1], SECRET);
    req.userId = p.uid;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'رمز غير صالح' });
  }
}

module.exports = { sign, auth, SECRET };