// Cards de Receitas, Despesas e Saldo do mês (US03).
import type { Summary } from '../api';
import { formatMoney } from '../format';

export function SummaryCards({ summary }: { summary: Summary | null }) {
  const balance = summary?.balance ?? 0;
  const positive = balance >= 0;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card label="Receitas" value={summary?.totalIncome} valueClass="text-emerald-600" icon="↑" iconClass="bg-emerald-100 text-emerald-700" />
      <Card label="Despesas" value={summary?.totalExpense} valueClass="text-rose-600" icon="↓" iconClass="bg-rose-100 text-rose-700" />
      <div className={`rounded-2xl p-4 text-white shadow-sm ${positive ? 'bg-emerald-600' : 'bg-rose-600'}`}>
        <p className="text-sm font-medium text-white/80">Saldo do mês</p>
        <p className="mt-1 text-2xl font-bold">{summary ? formatMoney(balance) : '—'}</p>
        <p className="mt-1 text-xs text-white/80">{positive ? 'Você está no azul 🎉' : 'Gastos acima das receitas'}</p>
      </div>
    </div>
  );
}

type CardProps = { label: string; value?: number; valueClass: string; icon: string; iconClass: string };

function Card({ label, value, valueClass, icon, iconClass }: CardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${iconClass}`}>{icon}</span>
      </div>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value === undefined ? '—' : formatMoney(value)}</p>
    </div>
  );
}
