// Tela principal: seletor de mês, cards de resumo, gastos por categoria e lista de lançamentos.
import { useCallback, useEffect, useState } from 'react';
import { api, type Category, type Summary, type Transaction, type TransactionInput } from '../api';
import { useAuth } from '../auth';
import { MonthPicker } from '../components/MonthPicker';
import { SummaryCards } from '../components/SummaryCards';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { TransactionList } from '../components/TransactionList';
import { TransactionForm } from '../components/TransactionForm';
import { ErrorMessage, Logo, primaryButton } from '../components/ui';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');

  // undefined = formulário fechado, null = novo, Transaction = editando
  const [formFor, setFormFor] = useState<Transaction | null | undefined>(undefined);

  // Busca lista e resumo juntos; chamado ao trocar de mês e após qualquer alteração.
  const reload = useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([api.transactions(month, year), api.summary(month, year)]);
      setTransactions(list);
      setSummary(sum);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }, [month, year]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  async function handleSave(data: TransactionInput) {
    if (formFor) await api.updateTransaction(formFor.id, data);
    else await api.createTransaction(data);
    setFormFor(undefined);
    await reload();
  }

  async function handleDelete(t: Transaction) {
    if (!confirm('Excluir este lançamento?')) return;
    try {
      await api.deleteTransaction(t.id);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">Olá, {user?.name.split(' ')[0]}</span>
            <button onClick={logout} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
          <button onClick={() => setFormFor(null)} className={primaryButton}>+ Novo lançamento</button>
        </div>

        <ErrorMessage>{error}</ErrorMessage>

        <SummaryCards summary={summary} />

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <TransactionList transactions={transactions} onEdit={setFormFor} onDelete={handleDelete} />
          </div>
          <div className="lg:col-span-2">
            <CategoryBreakdown summary={summary} />
          </div>
        </div>
      </main>

      {formFor !== undefined && (
        <TransactionForm
          categories={categories}
          editing={formFor}
          onSubmit={handleSave}
          onClose={() => setFormFor(undefined)}
        />
      )}
    </div>
  );
}
