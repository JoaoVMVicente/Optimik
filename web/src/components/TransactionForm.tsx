// Janela para criar ou editar um lançamento (US02).
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Category, Transaction, TransactionInput, TransactionType } from '../api';
import { parseMoney, today } from '../format';
import { ErrorMessage, inputClass, primaryButton, secondaryButton } from './ui';

type Props = {
  categories: Category[];
  editing: Transaction | null; // null = novo lançamento
  onSubmit: (data: TransactionInput) => Promise<void>;
  onClose: () => void;
};

export function TransactionForm({ categories, editing, onSubmit, onClose }: Props) {
  const [type, setType] = useState<TransactionType>(editing?.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(editing ? editing.amount.toFixed(2).replace('.', ',') : '');
  const [categoryId, setCategoryId] = useState<number | ''>(editing?.category_id ?? '');
  const [date, setDate] = useState(editing?.date ?? today());
  const [description, setDescription] = useState(editing?.description ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => dialogRef.current?.showModal(), []);

  const available = categories.filter((c) => c.type === type);

  function changeType(next: TransactionType) {
    setType(next);
    setCategoryId(''); // categorias de receita e despesa são diferentes
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = parseMoney(amount);
    if (!(value > 0)) return setError('Informe um valor maior que zero.');

    setError('');
    setSaving(true);
    try {
      await onSubmit({ type, amount: value, category_id: categoryId === '' ? null : categoryId, description, date });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const typeButton = (value: TransactionType, label: string, active: string) => (
    <button
      type="button"
      onClick={() => changeType(value)}
      aria-pressed={type === value}
      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
        type === value ? `${active} shadow-sm` : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {label}
    </button>
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Editar lançamento' : 'Novo lançamento'}</h2>

        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {typeButton('EXPENSE', 'Despesa', 'bg-white text-rose-600')}
          {typeButton('INCOME', 'Receita', 'bg-white text-emerald-600')}
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Valor (R$)</span>
          <input
            className={`${inputClass} text-lg font-semibold`}
            inputMode="decimal"
            placeholder="0,00"
            required
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Categoria</span>
            <select
              className={inputClass}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Sem categoria</option>
              {available.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Data</span>
            <input type="date" className={inputClass} required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Descrição (opcional)</span>
          <input
            className={inputClass}
            maxLength={255}
            placeholder="Ex.: Mercado do mês"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <ErrorMessage>{error}</ErrorMessage>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancelar</button>
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </dialog>
  );
}
