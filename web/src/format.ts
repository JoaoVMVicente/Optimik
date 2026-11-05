// Funções pequenas de formatação usadas em várias telas.
import type { Role } from './api';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatMoney = (value: number) => brl.format(value);

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

// Converte o texto digitado ("1.234,56" ou "1234.56") em número.
export function parseMoney(text: string) {
  const clean = text.trim().replace(/\s|R\$/g, '');
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  return Number(normalized);
}

// Mostra um número no formato do campo de dinheiro: 120.5 -> "120,50".
export const moneyInput = (value: number | null | undefined) => (value == null ? '' : value.toFixed(2).replace('.', ','));

export const ROLE_LABELS: Record<Role, string> = {
  MANAGER: 'Gestor',
  DEVELOPER: 'Desenvolvedor',
  CLIENT: 'Cliente',
};
