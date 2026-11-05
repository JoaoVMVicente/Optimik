// Distribuição dos gastos por categoria, para achar onde o dinheiro está indo.
import type { Summary } from '../api';
import { formatMoney } from '../format';

export function CategoryBreakdown({ summary }: { summary: Summary | null }) {
  const items = summary?.expensesByCategory ?? [];
  const total = summary?.totalExpense ?? 0;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 font-semibold text-slate-900">Para onde foi o dinheiro</h2>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Nenhuma despesa neste mês.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const percent = total > 0 ? (item.total / total) * 100 : 0;
            return (
              <li key={item.category}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-slate-700">{item.category}</span>
                  <span className="shrink-0 text-slate-500">
                    {formatMoney(item.total)} <span className="text-xs">({percent.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-rose-500" style={{ width: `${percent}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
