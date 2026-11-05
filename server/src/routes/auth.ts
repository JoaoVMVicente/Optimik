// Rotas de autenticação (US01): criar conta + organização, login e "quem sou eu".
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { DEFAULT_TASK_CATEGORIES, transaction, type Database } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { createSession } from '../session.js';
import { email, firstError, name, password } from '../validation.js';

const signupSchema = z.object({
  organizationName: name(100, 'Nome da empresa'),
  name: name(100),
  email,
  password,
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string(),
});

type LoginRow = { id: number; password_hash: string; active: number };

export function authRoutes(db: Database, jwtSecret: string) {
  const router = Router();

  // Quem cria a conta cria também a organização e vira o gestor dela.
  router.post('/signup', async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
    const data = parsed.data;

    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(data.email)) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    // Nunca guardamos a senha em texto puro: só o hash gerado pelo bcrypt.
    const passwordHash = await bcrypt.hash(data.password, 10);

    const userId = transaction(db, () => {
      const org = db.prepare('INSERT INTO organizations (name) VALUES (?)').run(data.organizationName);
      const orgId = Number(org.lastInsertRowid);

      const insertCategory = db.prepare('INSERT INTO task_categories (organization_id, name) VALUES (?, ?)');
      for (const category of DEFAULT_TASK_CATEGORIES) insertCategory.run(orgId, category);

      const user = db
        .prepare(`INSERT INTO users (organization_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'MANAGER')`)
        .run(orgId, data.name, data.email, passwordHash);
      return Number(user.lastInsertRowid);
    });

    res.status(201).json(createSession(db, jwtSecret, userId));
  });

  router.post('/login', rateLimit({ max: 5, windowMs: 60_000 }), async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Informe e-mail e senha.' });
    const { email, password } = parsed.data;

    const user = db.prepare('SELECT id, password_hash, active FROM users WHERE email = ?').get(email) as
      | LoginRow
      | undefined;
    // Mesma mensagem para e-mail ou senha errados, para não revelar quais e-mails existem.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }
    if (!user.active) return res.status(403).json({ error: 'Seu acesso foi desativado pelo gestor.' });

    res.json(createSession(db, jwtSecret, user.id));
  });

  router.get('/me', requireAuth(db, jwtSecret), (req, res) => {
    res.json(createSession(db, jwtSecret, req.user!.id).user);
  });

  return router;
}
