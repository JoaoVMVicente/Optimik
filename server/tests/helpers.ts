// Atalhos usados pelos testes para montar cenários (organização, convites, clientes...).
import request from 'supertest';
import { createDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

export type App = ReturnType<typeof createApp>;

export function newApp() {
  return createApp(createDatabase(':memory:'), 'segredo-de-teste');
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

let counter = 0;
const uniqueEmail = (prefix: string) => `${prefix}${++counter}@example.com`;

// Cria uma organização nova e devolve o token do gestor.
export async function signupManager(app: App, organizationName = 'Estúdio Teste') {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ organizationName, name: 'Gestora', email: uniqueEmail('gestor'), password: '123456' });
  return res.body as { token: string; user: { id: number; organizationId: number } };
}

export async function createClient(app: App, managerToken: string, name = 'Cliente ACME') {
  const res = await request(app).post('/api/clients').set(bearer(managerToken)).send({ name });
  return res.body.id as number;
}

// Gera um convite e já o aceita, devolvendo a sessão do novo usuário.
export async function inviteAndAccept(
  app: App,
  managerToken: string,
  role: 'DEVELOPER' | 'CLIENT' | 'MANAGER',
  clientId?: number,
) {
  const invite = await request(app).post('/api/invites').set(bearer(managerToken)).send({ role, clientId });
  const token = invite.body.url.split('/').pop();
  const res = await request(app)
    .post(`/api/invites/${token}/accept`)
    .send({ name: role === 'CLIENT' ? 'Cliente' : 'Dev', email: uniqueEmail(role.toLowerCase()), password: '123456' });
  return res.body as { token: string; user: { id: number; role: string } };
}
