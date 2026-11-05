// Convites por link (US02). O gestor gera o link; quem abre define nome e senha.
// Só guardamos o hash do token: mesmo quem tiver acesso ao banco não consegue usar os links.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { transaction, type Database } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createSession } from '../session.js';
import { email, firstError, id, name, password, ROLES } from '../validation.js';

const INVITE_DAYS = 7;

const createSchema = z
  .object({
    role: z.enum(ROLES, { error: 'Papel inválido.' }),
    clientId: id.nullable().optional(),
    email: email.nullable().optional(),
  })
  .refine((d) => d.role !== 'CLIENT' || d.clientId, { message: 'Convite de cliente precisa de um cliente vinculado.' });

const acceptSchema = z.object({ name: name(100), email, password });

type InviteRow = {
  id: number;
  organization_id: number;
  organization_name: string;
  role: string;
  client_id: number | null;
  client_name: string | null;
  email: string | null;
  expires_at: string;
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function inviteRoutes(db: Database, jwtSecret: string) {
  const router = Router();

  // Convite válido = existe, não expirou e ainda não foi usado.
  const findValid = (token: string) =>
    db
      .prepare(
        `SELECT i.id, i.organization_id, o.name AS organization_name, i.role, i.client_id, c.name AS client_name,
                i.email, i.expires_at
         FROM invites i
         JOIN organizations o ON o.id = i.organization_id
         LEFT JOIN clients c ON c.id = i.client_id
         WHERE i.token_hash = ? AND i.accepted_at IS NULL AND i.expires_at > ?`,
      )
      .get(hashToken(token), new Date().toISOString()) as InviteRow | undefined;

  router.post('/', requireAuth(db, jwtSecret), requireRole('MANAGER'), (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
    const data = parsed.data;
    const orgId = req.user!.organizationId;

    const clientId = data.role === 'CLIENT' ? data.clientId! : null;
    if (clientId && !db.prepare('SELECT 1 FROM clients WHERE id = ? AND organization_id = ?').get(clientId, orgId)) {
      return res.status(400).json({ error: 'Cliente não encontrado.' });
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(
      `INSERT INTO invites (organization_id, role, client_id, email, token_hash, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(orgId, data.role, clientId, data.email ?? null, hashToken(token), expiresAt, req.user!.id);

    // O frontend completa com o endereço do site (ex.: https://optimik.app/convite/abc...).
    res.status(201).json({ url: `/convite/${token}`, expiresAt });
  });

  router.get('/:token', (req, res) => {
    const invite = findValid(req.params.token);
    if (!invite) return res.status(404).json({ error: 'Convite inválido, expirado ou já utilizado.' });

    res.json({
      organizationName: invite.organization_name,
      role: invite.role,
      clientName: invite.client_name,
      email: invite.email,
      expiresAt: invite.expires_at,
    });
  });

  router.post('/:token/accept', async (req, res) => {
    const parsed = acceptSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
    const data = parsed.data;

    const invite = findValid(req.params.token);
    if (!invite) return res.status(404).json({ error: 'Convite inválido, expirado ou já utilizado.' });

    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(data.email)) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const userId = transaction(db, () => {
      // Marca como usado só se ninguém usou entre a checagem e agora (evita uso duplo simultâneo).
      const used = db.prepare('UPDATE invites SET accepted_at = ? WHERE id = ? AND accepted_at IS NULL').run(
        new Date().toISOString(),
        invite.id,
      );
      if (used.changes === 0) return null;

      // O papel vem do convite, nunca do que a pessoa envia (US02, critério 3).
      const user = db
        .prepare(
          'INSERT INTO users (organization_id, client_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(invite.organization_id, invite.client_id, data.name, data.email, passwordHash, invite.role);
      return Number(user.lastInsertRowid);
    });

    if (userId === null) return res.status(404).json({ error: 'Convite inválido, expirado ou já utilizado.' });
    res.status(201).json(createSession(db, jwtSecret, userId));
  });

  return router;
}
