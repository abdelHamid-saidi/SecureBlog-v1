const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');

const PORT = Number(process.env.PORT) || 3000;
const BCRYPT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET est obligatoire en production.');
  }
  console.warn('SESSION_SECRET absent : secret de développement utilisé.');
  return 'dev-only-secret-change-me';
}

function readCredentials(body) {
  const source = body && typeof body === 'object' ? body : {};
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : '';
  const password = typeof source.password === 'string' ? source.password : '';
  return { email, password };
}

function validateCredentials(email, password) {
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return 'Adresse email invalide.';
  }
  if (password.length < 8 || password.length > 128) {
    return 'Le mot de passe doit contenir au moins 8 caractères.';
  }
  return null;
}

function establishSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.user = { id: user.id, email: user.email };
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }
  return next();
}

function createApp(dummyHash) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use(session({
    name: 'secureblog.sid',
    secret: sessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  }));

  app.post('/api/register', async (req, res, next) => {
    try {
      const { email, password } = readCredentials(req.body);
      const validationError = validateCredentials(email, password);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      if (db.findUserByEmail(email)) {
        return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = db.createUser(email, passwordHash);
      await establishSession(req, user);
      return res.status(201).json({ email: user.email });
    } catch (err) {
      return next(err);
    }
  });

  app.post('/api/login', async (req, res, next) => {
    try {
      const { email, password } = readCredentials(req.body);
      const validationError = validateCredentials(email, password);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const user = db.findUserByEmail(email);
      const hash = user ? user.passwordHash : dummyHash;
      const matches = await bcrypt.compare(password, hash);
      if (!user || !matches) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      }

      await establishSession(req, user);
      return res.json({ email: user.email });
    } catch (err) {
      return next(err);
    }
  });

  app.post('/api/logout', (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('secureblog.sid');
      return res.json({ ok: true });
    });
  });

  app.get('/api/me', requireAuth, (req, res) => {
    res.json({ email: req.session.user.email });
  });

  app.get('/api/posts', requireAuth, (req, res) => {
    res.json({ posts: db.listPosts() });
  });

  app.post('/api/posts', requireAuth, (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!title || title.length > 120 || !content || content.length > 5000) {
      return res.status(400).json({ error: 'Le titre et le contenu sont requis.' });
    }
    const post = db.createPost(req.session.user.email, title, content);
    return res.status(201).json({ post });
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use((err, req, res, next) => {
    console.error(err.message);
    if (res.headersSent) return next(err);
    return res.status(500).json({ error: 'Erreur interne.' });
  });

  return app;
}

async function main() {
  const dummyHash = await bcrypt.hash('timing-safe-placeholder', BCRYPT_ROUNDS);
  const app = createApp(dummyHash);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SecureBlog v1 écoute sur http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
