// Projetos (somente gestor): valor da hora, horas previstas e quem está alocado (US03).
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, type Client, type Project, type TeamMember } from '../api';
import { formatMoney, moneyInput, parseMoney } from '../format';
import {
  Badge, Card, EmptyState, ErrorMessage, Field, linkButton, Modal, PageHeader, primaryButton, secondaryButton, SelectField,
} from '../components/ui';
import { useLoad } from '../useLoad';

export function ProjectsPage() {
  const { data: projects, error, loading, reload } = useLoad(api.projects, [] as Project[]);
  const { data: clients } = useLoad(api.clients, [] as Client[]);
  const { data: team } = useLoad(api.team, [] as TeamMember[]);

  const [editing, setEditing] = useState<Project | null | undefined>(undefined);
  const [membersOf, setMembersOf] = useState<Project | null>(null);

  const close = () => {
    setEditing(undefined);
    setMembersOf(null);
    reload();
  };

  return (
    <>
      <PageHeader
        title="Projetos"
        subtitle="Defina o valor da hora, o orçamento de horas e quem trabalha em cada projeto."
        action={
          <button onClick={() => setEditing(null)} disabled={clients.length === 0} className={primaryButton}>
            + Novo projeto
          </button>
        }
      />
      <ErrorMessage>{error}</ErrorMessage>
      {!loading && clients.length === 0 && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Para criar um projeto, primeiro <Link to="/clientes" className="font-semibold underline">cadastre um cliente</Link>.
        </p>
      )}

      <Card>
        {!loading && projects.length === 0 ? (
          <EmptyState>Nenhum projeto ainda.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {projects.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-slate-800">{p.name}</p>
                    {p.status === 'ARCHIVED' && <Badge>Arquivado</Badge>}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {p.clientName} · {formatMoney(p.hourlyRate ?? 0)}/h
                    {p.budgetHours ? ` · ${p.budgetHours}h previstas` : ''}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {p.members?.length ? `👥 ${p.members.map((m) => m.name).join(', ')}` : '👥 Ninguém alocado'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setMembersOf(p)} className={linkButton}>Equipe</button>
                  <button onClick={() => setEditing(p)} className={linkButton}>Editar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing !== undefined && (
        <ProjectForm project={editing} clients={clients} onClose={() => setEditing(undefined)} onSaved={close} />
      )}
      {membersOf && <MembersForm project={membersOf} team={team} onClose={() => setMembersOf(null)} onSaved={close} />}
    </>
  );
}

type FormProps = { project: Project | null; clients: Client[]; onClose: () => void; onSaved: () => void };

function ProjectForm({ project, clients, onClose, onSaved }: FormProps) {
  const [clientId, setClientId] = useState(project?.clientId ?? clients[0]?.id ?? 0);
  const [name, setName] = useState(project?.name ?? '');
  const [rate, setRate] = useState(moneyInput(project?.hourlyRate));
  const [budget, setBudget] = useState(project?.budgetHours?.toString() ?? '');
  const [showValues, setShowValues] = useState(project?.showValuesToDevs ?? false);
  const [archived, setArchived] = useState(project?.status === 'ARCHIVED');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const hourlyRate = parseMoney(rate);
    if (!(hourlyRate > 0)) return setError('Informe um valor da hora maior que zero.');

    setSaving(true);
    const body = {
      clientId,
      name,
      hourlyRate,
      budgetHours: budget ? Number(budget) : null,
      showValuesToDevs: showValues,
      status: archived ? ('ARCHIVED' as const) : ('ACTIVE' as const),
    };
    try {
      if (project) await api.updateProject(project.id, body);
      else await api.createProject(body);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={project ? 'Editar projeto' : 'Novo projeto'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField label="Cliente" value={clientId} onChange={(e) => setClientId(Number(e.target.value))}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
        <Field label="Nome do projeto" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor da hora (R$)" inputMode="decimal" placeholder="0,00" required value={rate} onChange={(e) => setRate(e.target.value)} />
          <Field label="Horas previstas" type="number" min={1} step={1} placeholder="Opcional" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5" checked={showValues} onChange={(e) => setShowValues(e.target.checked)} />
          Desenvolvedores podem ver o valor da hora deste projeto
        </label>
        {project && (
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-0.5" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
            Arquivar projeto (some da lista de quem lança horas)
          </label>
        )}
        <ErrorMessage>{error}</ErrorMessage>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancelar</button>
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </Modal>
  );
}

type MembersProps = { project: Project; team: TeamMember[]; onClose: () => void; onSaved: () => void };

function MembersForm({ project, team, onClose, onSaved }: MembersProps) {
  // Só quem lança horas pode ser alocado: desenvolvedores e gestores ativos.
  const eligible = team.filter((m) => m.active && m.role !== 'CLIENT');
  const [selected, setSelected] = useState(new Set(project.members?.map((m) => m.id)));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.setMembers(project.id, [...selected]);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={`Equipe de ${project.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {eligible.length === 0 ? (
          <p className="text-sm text-slate-500">
            Ninguém disponível. <Link to="/equipe" className="font-medium text-blue-700 underline">Convide um desenvolvedor</Link>.
          </p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {eligible.map((m) => (
              <li key={m.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                  <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
                  <span className="text-sm font-medium text-slate-800">{m.name}</span>
                  <span className="text-xs text-slate-500">{m.role === 'MANAGER' ? 'Gestor' : 'Desenvolvedor'}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <ErrorMessage>{error}</ErrorMessage>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancelar</button>
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </Modal>
  );
}
