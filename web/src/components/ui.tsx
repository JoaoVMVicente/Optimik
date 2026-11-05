// Peças visuais reutilizadas em várias telas.
import { useEffect, useRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

export const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100';

export const linkButton = 'rounded-lg px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50';

export function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input className={inputClass} {...props} />
    </label>
  );
}

export function SelectField({ label, children, ...props }: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select className={inputClass} {...props}>{children}</select>
    </label>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{children}</p>;
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect x="4" y="18" width="5" height="10" rx="1" fill="#3b82f6" />
        <rect x="12" y="12" width="5" height="16" rx="1" fill="#60a5fa" />
        <rect x="20" y="7" width="5" height="21" rx="1" fill="#22c55e" />
        <path d="M4 14 L13 7 L19 10 L28 3" stroke="#22c55e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
      <span className={`text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>Optimik</span>
    </div>
  );
}

// Moldura das telas de login, cadastro e convite.
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo light /></div>
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 ${className}`}>{children}</section>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-slate-400">{children}</p>;
}

const BADGE_COLORS = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  slate: 'bg-slate-100 text-slate-600',
  amber: 'bg-amber-100 text-amber-800',
};

export function Badge({ color = 'slate', children }: { color?: keyof typeof BADGE_COLORS; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE_COLORS[color]}`}>{children}</span>;
}

// Janela modal usando o <dialog> nativo do navegador (fecha com Esc e prende o foco).
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => ref.current?.showModal(), []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 shadow-xl backdrop:bg-slate-900/50"
    >
      <div className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
