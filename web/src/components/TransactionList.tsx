// Lista de lançamentos do mês, do mais recente para o mais antigo.
import type { Transaction } from '../api';
import { formatDate, formatMoney } from '../format';

type Props = {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
};

export function TransactionList({ transactions, onEdit, onDelete }: Props) {
  return (
    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <h2 className="px-4 pt-4 font-semibold text-slate-900">Lançamentos</h2>
      {transactions.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-400">
          Nenhum lançamento neste mês. Clique em <strong>Novo lançamento</strong> para começar.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {transactions.map((t) => {
            const income = t.type === 'INCOME';
            return (
              <li key={t.id} className="group flex items-center gap-3 px-4 py-3">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    income ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {income ? '↑' : '↓'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">
                    {t.description || t.category_name || (income ? 'Receita' : 'Despesa')}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {formatDate(t.date)}
                    {t.category_name && ` · ${t.category_name}`}
                  </p>
                </div>
                <p className={`shrink-0 font-semibold ${income ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {income ? '+' : '−'} {formatMoney(t.amount)}
                </p>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(t)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(t)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
