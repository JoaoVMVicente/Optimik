// Cadastro de clientes (somente gestor).
import { useState, type FormEvent } from 'react';
import { api, type Client } from '../api';
import { Card, EmptyState, ErrorMessage, Field, linkButton, Modal, PageHeader, primaryButton, secondaryButton } from '../components/ui';
import { useLoad } from '../useLoad';

export function ClientsPage() {
  const { data: clients, error, loading, reload } = useLoad(api.clients, [] as Client[]);
  // undefined = fechado, null = novo, Client = editando
  const [editing, setEditing] = useState<Client | null | undefined>(undefined);

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Quem contrata os projetos. Depois você pode convidar o cliente para acompanhar as horas."
        action={<button onClick={() => setEditing(null)} className={primaryButton}>+ Novo cliente</button>}
      />
      <ErrorMessage>{error}</ErrorMessage>

      <Card>
        {!loading && clients.length === 0 ? (
          <EmptyState>Nenhum cliente cadastrado ainda.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {clients.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{c.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {c.contactEmail ?? 'Sem e-mail de contato'} · {c.activeProjects} projeto(s) ativo(s)
                  </p>
                </div>
                <button onClick={() => setEditing(c)} className={linkButton}>Editar</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing !== undefined && (
        <ClientForm
          client={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
    </>
  );
}

function ClientForm({ client, onClose, onSaved }: { client: Client | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(client?.name ?? '');
  const [contactEmail, setContactEmail] = useState(client?.contactEmail ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = { name, contactEmail: contactEmail || null };
    try {
      if (client) await api.updateClient(client.id, body);
      else await api.createClient(body);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={client ? 'Editar cliente' : 'Novo cliente'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome" required maxLength={100} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="E-mail de contato (opcional)" type="email" maxLength={150} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        <ErrorMessage>{error}</ErrorMessage>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancelar</button>
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </Modal>
  );
}
