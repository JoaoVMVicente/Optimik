// Tudo que conversa com o backend fica aqui.
// O token JWT é salvo no localStorage e enviado em todas as requisições.

export type TransactionType = 'INCOME' | 'EXPENSE';

export type User = { id: number; name: string; email: string };

export type Category = { id: number; name: string; type: TransactionType };

export type Transaction = {
  id: number;
  type: TransactionType;
  amount: number;
  category_id: number | null;
  category_name: string | null;
  description: string | null;
  date: string;
};

export type TransactionInput = {
  type: TransactionType;
  amount: number;
  category_id: number | null;
  description: string;
  date: string;
};

export type Summary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  expensesByCategory: Array<{ category: string; total: number }>;
};

const TOKEN_KEY = 'optimik:token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Chamado quando o token expira, para o app voltar à tela de login.
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStorage.get();
  const res = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new Error(data.error ?? 'Algo deu errado. Tente novamente.');
  }
  return data as T;
}

const monthQuery = (month: number, year: number) => `?month=${month}&year=${year}`;

export const api = {
  register: (body: { name: string; email: string; password: string }) =>
    request<{ id: number }>('/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body }),

  categories: () => request<Category[]>('/categories'),

  transactions: (month: number, year: number) => request<Transaction[]>(`/transactions${monthQuery(month, year)}`),
  createTransaction: (body: TransactionInput) => request<Transaction>('/transactions', { method: 'POST', body }),
  updateTransaction: (id: number, body: TransactionInput) =>
    request<Transaction>(`/transactions/${id}`, { method: 'PUT', body }),
  deleteTransaction: (id: number) => request<void>(`/transactions/${id}`, { method: 'DELETE' }),

  summary: (month: number, year: number) => request<Summary>(`/dashboard/summary${monthQuery(month, year)}`),
};
