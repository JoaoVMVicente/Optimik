// Seletor de mês/ano do topo da página (US04).
import { MONTHS } from '../format';

type Props = { month: number; year: number; onChange: (month: number, year: number) => void };

export function MonthPicker({ month, year, onChange }: Props) {
  const shift = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    onChange(d.getMonth() + 1, d.getFullYear());
  };

  // Anos disponíveis: 10 para trás e 5 para frente a partir do ano exibido.
  const years = Array.from({ length: 16 }, (_, i) => year - 10 + i);

  const arrow = 'grid h-10 w-10 place-items-center rounded-xl text-xl text-slate-600 transition hover:bg-slate-100';

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
      <button type="button" className={arrow} onClick={() => shift(-1)} aria-label="Mês anterior">‹</button>
      <div className="flex items-center gap-1">
        <select
          aria-label="Mês"
          value={month}
          onChange={(e) => onChange(Number(e.target.value), year)}
          className="cursor-pointer rounded-lg bg-transparent px-1 py-1 font-semibold text-slate-900 outline-none hover:bg-slate-100"
        >
          {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
        </select>
        <select
          aria-label="Ano"
          value={year}
          onChange={(e) => onChange(month, Number(e.target.value))}
          className="cursor-pointer rounded-lg bg-transparent px-1 py-1 font-semibold text-slate-900 outline-none hover:bg-slate-100"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <button type="button" className={arrow} onClick={() => shift(1)} aria-label="Próximo mês">›</button>
    </div>
  );
}
