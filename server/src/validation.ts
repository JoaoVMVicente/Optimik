// Regras de validação compartilhadas entre as rotas (usando a biblioteca zod).
import { z } from 'zod';

export const ROLES = ['MANAGER', 'DEVELOPER', 'CLIENT'] as const;
export type Role = (typeof ROLES)[number];

export const name = (max: number, label = 'Nome') =>
  z.string({ error: `Informe o ${label.toLowerCase()}.` }).trim().min(1, `Informe o ${label.toLowerCase()}.`).max(max, `${label} muito longo.`);

export const email = z.string({ error: 'Informe o e-mail.' }).trim().toLowerCase().email('E-mail inválido.').max(150, 'E-mail muito longo.');

export const password = z
  .string({ error: 'Informe a senha.' })
  .min(6, 'A senha deve ter pelo menos 6 caracteres.')
  .max(72, 'Senha muito longa.');

export const id = z.number({ error: 'Identificador inválido.' }).int().positive('Identificador inválido.');

// Valor em reais: estritamente positivo e cabe em DECIMAL(10,2).
export const money = z
  .number({ error: 'O valor deve ser um número.' })
  .positive('O valor deve ser maior que zero.')
  .max(99_999_999.99, 'Valor muito alto.');

export const toCents = (reais: number) => Math.round(reais * 100);
export const toReais = (cents: number) => cents / 100;

// Converte o `:id` da URL em número (ou NaN, que nunca encontra registro).
export const paramId = (value: string | string[] | undefined) => Number(value);

// Primeira mensagem de erro do zod, para devolver ao usuário.
export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Dados inválidos.';
}
