// Tela aberta pelo link de convite: mostra para qual organização e papel é o convite
// e pede nome, e-mail e senha para criar o acesso (US02).
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { api, type InviteInfo } from '../api';
import { useAuth } from '../auth';
import { ROLE_LABELS } from '../format';
import { AuthLayout, ErrorMessage, Field, primaryButton } from '../components/ui';

export function AcceptInvitePage() {
  const { token = '' } = useParams();
  const { startSession } = useAuth();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [invalid, setInvalid] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .inviteInfo(token)
      .then((info) => {
        setInvite(info);
        if (info.email) setForm((f) => ({ ...f, email: info.email! }));
      })
      .catch((err) => setInvalid((err as Error).message));
  }, [token]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      startSession(await api.acceptInvite(token, form));
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  if (invalid) {
    return (
      <AuthLayout title="Convite indisponível" subtitle={invalid}>
        <p className="text-sm text-slate-600">Peça um novo link para o gestor da sua equipe.</p>
        <Link to="/login" className={`${primaryButton} mt-6 w-full`}>Ir para o login</Link>
      </AuthLayout>
    );
  }

  if (!invite) return <AuthLayout title="Carregando convite..." subtitle=""><span /></AuthLayout>;

  const role = ROLE_LABELS[invite.role].toLowerCase();
  return (
    <AuthLayout
      title={`Entrar em ${invite.organizationName}`}
      subtitle={
        <>
          Você foi convidado como <strong>{role}</strong>
          {invite.clientName && <> de <strong>{invite.clientName}</strong></>}.
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Seu nome" autoComplete="name" required maxLength={100} value={form.name} onChange={set('name')} />
        <Field label="E-mail" type="email" autoComplete="email" required maxLength={150} value={form.email} onChange={set('email')} />
        <Field label="Crie uma senha (mínimo 6 caracteres)" type="password" autoComplete="new-password" required minLength={6} maxLength={72} value={form.password} onChange={set('password')} />
        <ErrorMessage>{error}</ErrorMessage>
        <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
          {loading ? 'Entrando...' : 'Aceitar convite'}
        </button>
      </form>
    </AuthLayout>
  );
}
