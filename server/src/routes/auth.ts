// Rotas de autenticação (US01): cadastro e login.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { Database } from '../db.js';
import { firstError } from '../validation.js';

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Informe seu nome.').max(100, 'Nome muito longo.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.').max(150, 'E-mail muito longo.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.').max(72, 'Senha muito longa.'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string(),
});

type UserRow = { id: number; name: string; email: string; password_hash: string };

export function authRoutes(db: Database, jwtSecret: string) {
  const router = Router();

  router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
    const { name, email, password } = parsed.data;

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });

    // Nunca guardamos a senha em texto puro: só o hash gerado pelo bcrypt.
    const passwordHash = await bcrypt.hash(password, 10);
    const result = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name, email, passwordHash);

    return res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Usuário cadastrado com sucesso.' });
  });

  router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Informe e-mail e senha.' });
    const { email, password } = parsed.data;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    // Mesma mensagem para e-mail ou senha errados, para não revelar quais e-mails existem.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const token = jwt.sign({ sub: String(user.id) }, jwtSecret, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  });

  return router;
}
