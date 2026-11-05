// Cadastro de uma nova organização; quem cria vira o gestor (US01).
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { useAuth } from '../auth';
import { AuthLayout, ErrorMessage, Field, primaryButton } from '../components/ui';

export function SignupPage() {
  const { startSession } = useAuth();
  const [form, setForm] = useState({ organizationName: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      startSession(await api.signup(form));
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Criar conta" subtitle="Você será o gestor e poderá convidar sua equipe e seus clientes.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome da empresa (ou o seu, se for freelancer)" required maxLength={100} value={form.organizationName} onChange={set('organizationName')} />
        <Field label="Seu nome" autoComplete="name" required maxLength={100} value={form.name} onChange={set('name')} />
        <Field label="E-mail" type="email" autoComplete="email" required maxLength={150} value={form.email} onChange={set('email')} />
        <Field label="Senha (mínimo 6 caracteres)" type="password" autoComplete="new-password" required minLength={6} maxLength={72} value={form.password} onChange={set('password')} />
        <ErrorMessage>{error}</ErrorMessage>
        <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
          {loading ? 'Criando...' : 'Criar conta'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Já tem conta? <Link to="/login" className="font-medium text-blue-700 hover:underline">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
