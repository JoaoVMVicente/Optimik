// Categorias de tarefa (Backend, Frontend...). Gestor e devs leem; só o gestor altera.
import { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { firstError, name, paramId } from '../validation.js';

const categorySchema = z.object({ name: name(50) });

// Erro do SQLite quando a UNIQUE (organization_id, name) é violada.
const isDuplicate = (err: unknown) => err instanceof Error && err.message.includes('UNIQUE');

export function categoryRoutes(db: Database) {
  const router = Router();

  router.get('/', requireRole('MANAGER', 'DEVELOPER'), (req, res) => {
    res.json(
      db.prepare('SELECT id, name FROM task_categories WHERE organization_id = ? ORDER BY name').all(req.user!.organizationId),
    );
  });

  router.post('/', requireRole('MANAGER'), (req, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });

    try {
      const result = db
        .prepare('INSERT INTO task_categories (organization_id, name) VALUES (?, ?)')
        .run(req.user!.organizationId, parsed.data.name);
      res.status(201).json({ id: Number(result.lastInsertRowid), name: parsed.data.name });
    } catch (err) {
      if (isDuplicate(err)) return res.status(409).json({ error: 'Já existe uma categoria com esse nome.' });
      throw err;
    }
  });

  router.put('/:id', requireRole('MANAGER'), (req, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });

    const categoryId = paramId(req.params.id);
    try {
      const result = db
        .prepare('UPDATE task_categories SET name = ? WHERE id = ? AND organization_id = ?')
        .run(parsed.data.name, categoryId, req.user!.organizationId);
      if (result.changes === 0) return res.status(404).json({ error: 'Categoria não encontrada.' });
      res.json({ id: categoryId, name: parsed.data.name });
    } catch (err) {
      if (isDuplicate(err)) return res.status(409).json({ error: 'Já existe uma categoria com esse nome.' });
      throw err;
    }
  });

  return router;
}
