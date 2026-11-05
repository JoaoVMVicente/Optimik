// Resumo mensal (US03): totais de receitas, despesas, saldo
// e a distribuição das despesas por categoria.
import { Router } from 'express';
import type { Database } from '../db.js';
import { firstError, monthQuery, monthRange, toReais } from '../validation.js';

export function dashboardRoutes(db: Database) {
  const router = Router();

  router.get('/summary', (req, res) => {
    const parsed = monthQuery.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
    const { start, end } = monthRange(parsed.data.month, parsed.data.year);

    const totals = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'INCOME'  THEN amount END), 0) AS income,
           COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount END), 0) AS expense
         FROM transactions
         WHERE user_id = ? AND date BETWEEN ? AND ?`,
      )
      .get(req.userId!, start, end) as { income: number; expense: number };

    const byCategory = db
      .prepare(
        `SELECT COALESCE(c.name, 'Sem categoria') AS category, SUM(t.amount) AS total
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = ? AND t.type = 'EXPENSE' AND t.date BETWEEN ? AND ?
         GROUP BY category
         ORDER BY total DESC`,
      )
      .all(req.userId!, start, end) as Array<{ category: string; total: number }>;

    res.json({
      totalIncome: toReais(totals.income),
      totalExpense: toReais(totals.expense),
      balance: toReais(totals.income - totals.expense),
      expensesByCategory: byCategory.map((row) => ({ category: row.category, total: toReais(row.total) })),
    });
  });

  return router;
}
