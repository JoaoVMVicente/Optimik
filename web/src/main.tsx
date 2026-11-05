import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import type { Role } from './api';
import { AuthProvider, useAuth } from './auth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { HomePage } from './pages/HomePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ClientsPage } from './pages/ClientsPage';
import { TeamPage } from './pages/TeamPage';
import { CategoriesPage } from './pages/CategoriesPage';
import './index.css';

// Páginas privadas: sem login, manda para /login. Com `roles`, exige um desses papéis.
function Private({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// Páginas públicas: se já estiver logado, vai direto para o início.
function Public({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
}

const manager: Role[] = ['MANAGER'];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Public><LoginPage /></Public>} />
          <Route path="/cadastro" element={<Public><SignupPage /></Public>} />
          <Route path="/convite/:token" element={<Public><AcceptInvitePage /></Public>} />

          <Route element={<Private><Layout /></Private>}>
            <Route path="/" element={<HomePage />} />
            <Route path="/projetos" element={<Private roles={manager}><ProjectsPage /></Private>} />
            <Route path="/clientes" element={<Private roles={manager}><ClientsPage /></Private>} />
            <Route path="/equipe" element={<Private roles={manager}><TeamPage /></Private>} />
            <Route path="/categorias" element={<Private roles={manager}><CategoriesPage /></Private>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
