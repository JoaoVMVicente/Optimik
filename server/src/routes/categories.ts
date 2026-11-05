// Lista as categorias disponíveis para o formulário de lançamento.
import { Router } from 'express';
import type { Database } from '../db.js';

export function categoryRoutes(db: Database) {
  const router = Router();

  router.get('/', (_req, res) => {
    const categories = db.prepare('SELECT id, name, type FROM categories ORDER BY type, name').all();
    res.json(categories);
  });

  return router;
}
