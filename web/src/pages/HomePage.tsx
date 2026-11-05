// Tela inicial. Nesta etapa mostra os projetos visíveis para cada papel e, para o gestor,
// um guia dos primeiros passos. O cronômetro e os painéis de horas chegam nas próximas etapas.
import { Link } from 'react-router';
import { api, type Project } from '../api';
import { useAuth } from '../auth';
import { formatMoney } from '../format';
import { Badge, Card, EmptyState, ErrorMessage, PageHeader } from '../components/ui';
import { useLoad } from '../useLoad';

export function HomePage() {
  const { user } = useAuth();
  const { data: projects, error, loading } = useLoad(api.projects, [] as Project[]);
  const active = projects.filter((p) => p.status === 'ACTIVE');

  const firstName = user!.name.split(' ')[0];
  const subtitle = {
    MANAGER: 'Organize clientes, projetos e equipe para começar a registrar horas.',
    DEVELOPER: 'Estes são os projetos em que você está alocado.',
    CLIENT: 'Acompanhe os projetos contratados com a equipe.',
  }[user!.role];

  return (
    <>
      <PageHeader title={`Olá, ${firstName}!`} subtitle={subtitle} />
      <ErrorMessage>{error}</ErrorMessage>

      {user!.role === 'MANAGER' && <ManagerChecklist projects={projects} loading={loading} />}

      <Card className="mt-6">
        <h2 className="px-4 pt-4 font-semibold text-slate-900">Projetos ativos</h2>
        {!loading && active.length === 0 ? (
          <EmptyState>
            {user!.role === 'MANAGER'
              ? 'Nenhum projeto ativo ainda.'
              : 'Você ainda não está em nenhum projeto ativo. Fale com o gestor da equipe.'}
          </EmptyState>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {active.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{p.name}</p>
                  <p className="truncate text-xs text-slate-500">{p.clientName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm text-slate-500">
                  {p.budgetHours && <Badge>{p.budgetHours}h previstas</Badge>}
                  {p.hourlyRate !== null && <span>{formatMoney(p.hourlyRate)}/h</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {user!.role !== 'CLIENT' && (
        <p className="mt-6 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
          ⏱️ Em breve: o cronômetro. Ao abrir o Optimik você vai escolher o projeto e as horas começam a contar.
        </p>
      )}
    </>
  );
}

// Passo a passo para o gestor configurar a organização pela primeira vez.
function ManagerChecklist({ projects, loading }: { projects: Project[]; loading: boolean }) {
  const { data: clients } = useLoad(api.clients, []);
  const { data: team } = useLoad(api.team, []);
  if (loading) return null;

  const steps = [
    { done: clients.length > 0, label: 'Cadastre um cliente', to: '/clientes' },
    { done: projects.length > 0, label: 'Crie um projeto com valor da hora', to: '/projetos' },
    { done: team.some((m) => m.role === 'DEVELOPER'), label: 'Convide um desenvolvedor', to: '/equipe' },
    { done: projects.some((p) => (p.members?.length ?? 0) > 0), label: 'Aloque pessoas em um projeto', to: '/projetos' },
    { done: team.some((m) => m.role === 'CLIENT'), label: 'Convide o cliente para acompanhar', to: '/equipe' },
  ];
  if (steps.every((s) => s.done)) return null;

  return (
    <Card className="p-4">
      <h2 className="mb-3 font-semibold text-slate-900">Primeiros passos</h2>
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-3 text-sm">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                step.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {step.done ? '✓' : ''}
            </span>
            {step.done ? (
              <span className="text-slate-400 line-through">{step.label}</span>
            ) : (
              <Link to={step.to} className="font-medium text-blue-700 hover:underline">{step.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
