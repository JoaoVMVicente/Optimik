// Tudo que conversa com o backend fica aqui.
// O token JWT é salvo no localStorage e enviado em todas as requisições.

export type Role = 'MANAGER' | 'DEVELOPER' | 'CLIENT';

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  organizationId: number;
  organizationName: string;
  clientId: number | null;
};

export type Session = { token: string; user: User };

export type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: Role;
  clientId: number | null;
  clientName: string | null;
  active: boolean;
};

export type Client = { id: number; name: string; contactEmail: string | null; activeProjects: number };
export type ClientInput = { name: string; contactEmail: string | null };

export type Project = {
  id: number;
  clientId: number;
  clientName: string;
  name: string;
  hourlyRate: number | null; // null quando o dev não pode ver valores
  budgetHours: number | null;
  showValuesToDevs: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
  members?: Array<{ id: number; name: string }>; // só para o gestor
};

export type ProjectInput = {
  clientId: number;
  name: string;
  hourlyRate: number;
  budgetHours: number | null;
  showValuesToDevs: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
};

export type Category = { id: number; name: string };

export type InviteInfo = {
  organizationName: string;
  role: Role;
  clientName: string | null;
  email: string | null;
  expiresAt: string;
};

const TOKEN_KEY = 'optimik:token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Chamado quando o token expira ou o acesso é desativado, para o app voltar à tela de login.
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStorage.get();
  const res = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new Error(data.error ?? 'Algo deu errado. Tente novamente.');
  }
  return data as T;
}

export const api = {
  signup: (body: { organizationName: string; name: string; email: string; password: string }) =>
    request<Session>('/auth/signup', { method: 'POST', body }),
  login: (body: { email: string; password: string }) => request<Session>('/auth/login', { method: 'POST', body }),
  me: () => request<User>('/auth/me'),

  createInvite: (body: { role: Role; clientId?: number; email?: string }) =>
    request<{ url: string; expiresAt: string }>('/invites', { method: 'POST', body }),
  inviteInfo: (token: string) => request<InviteInfo>(`/invites/${token}`),
  acceptInvite: (token: string, body: { name: string; email: string; password: string }) =>
    request<Session>(`/invites/${token}/accept`, { method: 'POST', body }),

  team: () => request<TeamMember[]>('/users'),
  setActive: (id: number, active: boolean) => request<TeamMember>(`/users/${id}`, { method: 'PATCH', body: { active } }),

  clients: () => request<Client[]>('/clients'),
  createClient: (body: ClientInput) => request<Client>('/clients', { method: 'POST', body }),
  updateClient: (id: number, body: ClientInput) => request<Client>(`/clients/${id}`, { method: 'PUT', body }),

  projects: () => request<Project[]>('/projects'),
  createProject: (body: ProjectInput) => request<Project>('/projects', { method: 'POST', body }),
  updateProject: (id: number, body: ProjectInput) => request<Project>(`/projects/${id}`, { method: 'PUT', body }),
  setMembers: (id: number, userIds: number[]) =>
    request<Project>(`/projects/${id}/members`, { method: 'PUT', body: { userIds } }),

  categories: () => request<Category[]>('/categories'),
  createCategory: (name: string) => request<Category>('/categories', { method: 'POST', body: { name } }),
  updateCategory: (id: number, name: string) => request<Category>(`/categories/${id}`, { method: 'PUT', body: { name } }),
};
