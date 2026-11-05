// Clientes da organização (somente gestor).
import { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../db.js';
import { email, firstError, name, paramId } from '../validation.js';

const clientSchema = z.object({
  name: name(100),
  contactEmail: email.nullable().optional().or(z.literal('').transform(() => null)),
});

export function clientRoutes(db: Database) {
  const router = Router();

  const select = `
    SELECT c.id, c.name, c.contact_email AS contactEmail, c.created_at AS createdAt,
           (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id AND p.status = 'ACTIVE') AS activeProjects
    FROM clients c`;

  router.get('/', (req, res) => {
    res.json(db.prepare(`${select} WHERE c.organization_id = ? ORDER BY c.name`).all(req.user!.organizationId));
  });

  router.post('/', (req, res) => {
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });

    const result = db
      .prepare('INSERT INTO clients (organization_id, name, contact_email) VALUES (?, ?, ?)')
      .run(req.user!.organizationId, parsed.data.name, parsed.data.contactEmail ?? null);

    res.status(201).json(db.prepare(`${select} WHERE c.id = ?`).get(result.lastInsertRowid));
  });

  router.put('/:id', (req, res) => {
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });

    const clientId = paramId(req.params.id);
    const result = db
      .prepare('UPDATE clients SET name = ?, contact_email = ? WHERE id = ? AND organization_id = ?')
      .run(parsed.data.name, parsed.data.contactEmail ?? null, clientId, req.user!.organizationId);
    if (result.changes === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });

    res.json(db.prepare(`${select} WHERE c.id = ?`).get(clientId));
  });

  return router;
}
