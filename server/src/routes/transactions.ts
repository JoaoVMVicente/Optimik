// CRUD de lançamentos (US02 e US04). Toda consulta filtra por user_id,
// garantindo que um usuário nunca veja nem altere dados de outro.
import { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../db.js';
import { amount, firstError, isoDate, monthQuery, monthRange, toCents, toReais, transactionType } from '../validation.js';

const transactionSchema = z.object({
  type: transactionType,
  amount,
  category_id: z.number().int().positive().nullable().optional(),
  description: z.string().trim().max(255, 'Descrição muito longa.').nullable().optional(),
  date: isoDate,
});

type TransactionRow = {
  id: number;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category_id: number | null;
  category_name: string | null;
  description: string | null;
  date: string;
  created_at: string;
};

const SELECT_TRANSACTION = `
  SELECT t.id, t.type, t.amount, t.category_id, c.name AS category_name,
         t.description, t.date, t.created_at
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
`;

const serialize = (row: TransactionRow) => ({ ...row, amount: toReais(row.amount) });

export function transactionRoutes(db: Database) {
  const router = Router();

  const findOwned = (id: number, userId: number) =>
    db.prepare(`${SELECT_TRANSACTION} WHERE t.id = ? AND t.user_id = ?`).get(id, userId) as TransactionRow | undefined;

  // A categoria precisa existir e ser do mesmo tipo do lançamento
  // (ex.: não dá para lançar uma despesa na categoria "Salário").
  const categoryError = (categoryId: number | null | undefined, type: string) => {
    if (categoryId == null) return null;
    const category = db.prepare('SELECT type FROM categories WHERE id = ?').get(categoryId) as { type: string } | undefined;
    if (!category) return 'Categoria não encontrada.';
    if (category.type !== type) return 'A categoria não corresponde ao tipo do lançamento.';
    return null;
  };

  router.get('/', (req, res) => {
    const parsed = monthQuery.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });

    const { start, end } = monthRange(parsed.data.month, parsed.data.year);
    const rows = db
      .prepare(`${SELECT_TRANSACTION} WHERE t.user_id = ? AND t.date BETWEEN ? AND ? ORDER BY t.date DESC, t.id DESC`)
      .all(req.userId!, start, end) as TransactionRow[];

    res.json(rows.map(serialize));
  });

  router.post('/', (req, res) => {
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
    const data = parsed.data;

    const error = categoryError(data.category_id, data.type);
    if (error) return res.status(400).json({ error });

    const result = db
      .prepare('INSERT INTO transactions (user_id, category_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.userId!, data.category_id ?? null, data.type, toCents(data.amount), data.description || null, data.date);

    res.status(201).json(serialize(findOwned(Number(result.lastInsertRowid), req.userId!)!));
  });

  router.put('/:id', (req, res) => {
    const id = Number(req.params.id);
    const current = findOwned(id, req.userId!);
    if (!current) return res.status(404).json({ error: 'Lançamento não encontrado.' });

    // Permite enviar só os campos que mudaram: mesclamos com o registro atual e validamos tudo.
    const merged = { ...serialize(current), ...req.body };
    const parsed = transactionSchema.safeParse(merged);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
    const data = parsed.data;

    const error = categoryError(data.category_id, data.type);
    if (error) return res.status(400).json({ error });

    db.prepare(
      'UPDATE transactions SET category_id = ?, type = ?, amount = ?, description = ?, date = ? WHERE id = ? AND user_id = ?',
    ).run(data.category_id ?? null, data.type, toCents(data.amount), data.description || null, data.date, id, req.userId!);

    res.json(serialize(findOwned(id, req.userId!)!));
  });

  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.userId!);
    if (result.changes === 0) return res.status(404).json({ error: 'Lançamento não encontrado.' });
    res.status(204).end();
  });

  return router;
}
