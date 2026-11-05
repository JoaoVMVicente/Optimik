// Equipe (somente gestor): pessoas da organização, convites por link e ativar/desativar acesso.
import { useState, type FormEvent } from 'react';
import { api, type Client, type Role, type TeamMember } from '../api';
import { useAuth } from '../auth';
import { formatDate, ROLE_LABELS } from '../format';
import {
  Badge, Card, EmptyState, ErrorMessage, Field, linkButton, Modal, PageHeader, primaryButton, secondaryButton, SelectField,
} from '../components/ui';
import { useLoad } from '../useLoad';

const ROLE_COLORS = { MANAGER: 'blue', DEVELOPER: 'green', CLIENT: 'amber' } as const;

export function TeamPage() {
  const { user } = useAuth();
  const { data: team, error, loading, reload } = useLoad(api.team, [] as TeamMember[]);
  const { data: clients } = useLoad(api.clients, [] as Client[]);
  const [inviting, setInviting] = useState(false);
  const [actionError, setActionError] = useState('');

  async function toggleActive(member: TeamMember) {
    const verb = member.active ? 'desativar' : 'reativar';
    if (!confirm(`Deseja ${verb} o acesso de ${member.name}?`)) return;
    try {
      await api.setActive(member.id, !member.active);
      setActionError('');
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <>
      <PageHeader
        title="Equipe"
        subtitle="Desenvolvedores lançam horas; clientes acompanham e aprovam."
        action={<button onClick={() => setInviting(true)} className={primaryButton}>+ Convidar pessoa</button>}
      />
      <ErrorMessage>{error || actionError}</ErrorMessage>

      <Card>
        {!loading && team.length === 0 ? (
          <EmptyState>Ninguém por aqui ainda.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {team.map((m) => (
              <li key={m.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${m.active ? '' : 'opacity-60'}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-slate-800">{m.name}</p>
                    <Badge color={ROLE_COLORS[m.role]}>{ROLE_LABELS[m.role]}</Badge>
                    {!m.active && <Badge>Desativado</Badge>}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {m.email}
                    {m.clientName && ` · ${m.clientName}`}
                  </p>
                </div>
                {m.id !== user!.id && (
                  <button onClick={() => toggleActive(m)} className={linkButton}>
                    {m.active ? 'Desativar' : 'Reativar'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {inviting && <InviteForm clients={clients} onClose={() => setInviting(false)} />}
    </>
  );
}

// Gera o link de convite. Não enviamos e-mail: o gestor copia o link e manda por onde preferir.
function InviteForm({ clients, onClose }: { clients: Client[]; onClose: () => void }) {
  const [role, setRole] = useState<Role>('DEVELOPER');
  const [clientId, setClientId] = useState(clients[0]?.id ?? 0);
  const [email, setEmail] = useState('');
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const invite = await api.createInvite({
        role,
        clientId: role === 'CLIENT' ? clientId : undefined,
        email: email || undefined,
      });
      setLink({ url: `${window.location.origin}${invite.url}`, expiresAt: invite.expiresAt });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(link!.url);
    setCopied(true);
  }

  if (link) {
    return (
      <Modal title="Convite criado" onClose={onClose}>
        <p className="mb-3 text-sm text-slate-600">
          Envie este link para a pessoa. Ele funciona <strong>uma única vez</strong> e vale até {formatDate(link.expiresAt)}.
        </p>
        <input readOnly value={link.url} onFocus={(e) => e.target.select()} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className={secondaryButton}>Fechar</button>
          <button onClick={copy} className={primaryButton}>{copied ? 'Copiado ✓' : 'Copiar link'}</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Convidar pessoa" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField label="Papel" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="DEVELOPER">Desenvolvedor — lança horas</option>
          <option value="CLIENT">Cliente — acompanha e aprova horas</option>
          <option value="MANAGER">Gestor — administra tudo</option>
        </SelectField>
        {role === 'CLIENT' &&
          (clients.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Cadastre um cliente antes de convidá-lo.</p>
          ) : (
            <SelectField label="De qual cliente?" value={clientId} onChange={(e) => setClientId(Number(e.target.value))}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
          ))}
        <Field label="E-mail (opcional, só para lembrar quem é)" type="email" maxLength={150} value={email} onChange={(e) => setEmail(e.target.value)} />
        <ErrorMessage>{error}</ErrorMessage>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancelar</button>
          <button type="submit" disabled={saving || (role === 'CLIENT' && clients.length === 0)} className={primaryButton}>
            {saving ? 'Gerando...' : 'Gerar link'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
