import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { useAuth } from '../auth';
import { AuthLayout, ErrorMessage, Field, primaryButton } from '../components/ui';

export function LoginPage() {
  const { startSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      startSession(await api.login({ email, password }));
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Entrar" subtitle="Horas registradas com clareza para equipe, gestão e cliente.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Senha" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorMessage>{error}</ErrorMessage>
        <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Quer usar o Optimik na sua empresa?{' '}
        <Link to="/cadastro" className="font-medium text-blue-700 hover:underline">Crie uma conta</Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-400">Recebeu um convite? Use o link que o gestor enviou.</p>
    </AuthLayout>
  );
}
