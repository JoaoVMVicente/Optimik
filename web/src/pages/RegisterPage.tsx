import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api';
import { AuthLayout, ErrorMessage, Field, primaryButton } from '../components/ui';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.register({ name, email, password });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Criar conta" subtitle="Leva menos de um minuto.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome" autoComplete="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="E-mail" type="email" autoComplete="email" required maxLength={150} value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Senha (mínimo 6 caracteres)"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          maxLength={72}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ErrorMessage>{error}</ErrorMessage>
        <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
          {loading ? 'Criando...' : 'Criar conta'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Já tem conta?{' '}
        <Link to="/login" className="font-medium text-emerald-700 hover:underline">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
