// Funções pequenas de formatação usadas em várias telas.

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatMoney = (value: number) => brl.format(value);

// "2026-03-10" -> "10/03/2026" (sem usar Date, para não sofrer com fuso horário).
export const formatDate = (iso: string) => iso.split('-').reverse().join('/');

// Data de hoje no fuso do usuário, no formato AAAA-MM-DD.
export function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Converte o texto digitado ("1.234,56" ou "1234.56") em número.
export function parseMoney(text: string) {
  const clean = text.trim().replace(/\s|R\$/g, '');
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  return Number(normalized);
}
