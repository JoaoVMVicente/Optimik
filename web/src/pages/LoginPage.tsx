import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../auth';
import { AuthLayout, ErrorMessage, Field, primaryButton } from '../components/ui';

export function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const justRegistered = (location.state as { registered?: boolean } | null)?.registered;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Entrar" subtitle="Acompanhe seus gastos e ganhos sem planilhas.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {justRegistered && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Conta criada! Agora é só entrar.</p>
        )}
        <Field label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Senha" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorMessage>{error}</ErrorMessage>
        <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="font-medium text-emerald-700 hover:underline">Cadastre-se</Link>
      </p>
    </AuthLayout>
  );
}
