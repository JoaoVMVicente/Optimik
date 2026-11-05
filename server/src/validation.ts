// Regras de validação compartilhadas entre as rotas (usando a biblioteca zod).
import { z } from 'zod';

export const transactionType = z.enum(['INCOME', 'EXPENSE'], {
  error: 'O tipo deve ser INCOME (receita) ou EXPENSE (despesa).',
});

// Aceita apenas datas reais no formato AAAA-MM-DD (ex.: rejeita 2025-02-30).
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'A data deve estar no formato AAAA-MM-DD.')
  .refine((value) => {
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
  }, 'Data inválida.');

// Valor em reais: estritamente positivo (US02) e cabe em DECIMAL(10,2).
export const amount = z
  .number({ error: 'O valor deve ser um número.' })
  .positive('O valor deve ser maior que zero.')
  .max(99_999_999.99, 'Valor muito alto.');

export const monthQuery = z.object({
  month: z.coerce.number().int().min(1, 'Mês inválido.').max(12, 'Mês inválido.'),
  year: z.coerce.number().int().min(1900, 'Ano inválido.').max(9999, 'Ano inválido.'),
});

// Converte mês/ano no intervalo de datas usado nas consultas SQL.
export function monthRange(month: number, year: number) {
  const mm = String(month).padStart(2, '0');
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-31` };
}

export const toCents = (reais: number) => Math.round(reais * 100);
export const toReais = (cents: number) => cents / 100;

// Primeira mensagem de erro do zod, para devolver ao usuário.
export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Dados inválidos.';
}
