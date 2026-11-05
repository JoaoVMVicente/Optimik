// Moldura das telas logadas: menu lateral (no celular vira barra no topo) + conteúdo.
// Os itens do menu dependem do papel de quem está logado.
import { NavLink, Outlet } from 'react-router';
import type { Role } from '../api';
import { useAuth } from '../auth';
import { ROLE_LABELS } from '../format';
import { Logo } from './ui';

type NavItem = { to: string; label: string; icon: string; roles: Role[] };

const NAV: NavItem[] = [
  { to: '/', label: 'Início', icon: '▦', roles: ['MANAGER', 'DEVELOPER', 'CLIENT'] },
  { to: '/projetos', label: 'Projetos', icon: '▤', roles: ['MANAGER'] },
  { to: '/clientes', label: 'Clientes', icon: '◉', roles: ['MANAGER'] },
  { to: '/equipe', label: 'Equipe', icon: '◎', roles: ['MANAGER'] },
  { to: '/categorias', label: 'Categorias', icon: '◈', roles: ['MANAGER'] },
];

export function Layout() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const items = NAV.filter((item) => item.roles.includes(user.role));

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-navy-700 text-white' : 'text-slate-300 hover:bg-navy-800 hover:text-white'
    }`;

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-navy-900 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col">
        <div className="flex items-center justify-between px-4 py-4 md:px-5 md:py-6">
          <Logo light />
          <button onClick={logout} className="text-sm text-slate-300 hover:text-white md:hidden">Sair</button>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:pb-0">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
              <span aria-hidden className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-navy-700 p-4 md:block">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-400">
            {ROLE_LABELS[user.role]} · {user.organizationName}
          </p>
          <button onClick={logout} className="mt-3 text-sm text-slate-300 hover:text-white">Sair</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
