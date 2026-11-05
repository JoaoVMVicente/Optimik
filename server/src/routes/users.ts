// Equipe da organização (somente gestor): listar pessoas e ativar/desativar acesso.
// Desativamos em vez de apagar para não perder o histórico de quem fez o quê.
import { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../db.js';
import { firstError, paramId } from '../validation.js';

const updateSchema = z.object({ active: z.boolean({ error: 'Informe se o usuário está ativo.' }) });

export function userRoutes(db: Database) {
  const router = Router();

  const select = `
    SELECT u.id, u.name, u.email, u.role, u.client_id AS clientId, c.name AS clientName,
           u.active = 1 AS active, u.created_at AS createdAt
    FROM users u LEFT JOIN clients c ON c.id = u.client_id`;

  const serialize = (row: Record<string, unknown>) => ({ ...row, active: Boolean(row.active) });

  router.get('/', (req, res) => {
    const rows = db.prepare(`${select} WHERE u.organization_id = ? ORDER BY u.role, u.name`).all(req.user!.organizationId);
    res.json(rows.map(serialize));
  });

  router.patch('/:id', (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });

    const userId = paramId(req.params.id);
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Você não pode desativar o seu próprio acesso.' });
    }

    const result = db
      .prepare('UPDATE users SET active = ? WHERE id = ? AND organization_id = ?')
      .run(parsed.data.active ? 1 : 0, userId, req.user!.organizationId);
    if (result.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

    res.json(serialize(db.prepare(`${select} WHERE u.id = ?`).get(userId) as Record<string, unknown>));
  });

  return router;
}
