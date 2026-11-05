// Testes da etapa 1 do time sheet, cobrindo os critérios de aceite do PRD (US01 a US03)
// e as regras de segurança do TDD (§5.2 e §5.6).
// Cada teste usa um banco SQLite em memória, então nada é gravado em disco.
import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createDatabase } from '../src/db.js';
import { bearer, createClient, inviteAndAccept, newApp, signupManager, type App } from './helpers.js';

let app: App;

beforeEach(() => {
  app = newApp();
});

describe('US01 - Conta e organização', () => {
  it('cria organização, gestor e categorias padrão, já logado', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ organizationName: 'Estúdio', name: 'Ana', email: 'ana@example.com', password: '123456' });

    expect(res.status).toBe(201);
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(res.body.user).toMatchObject({ name: 'Ana', role: 'MANAGER', organizationName: 'Estúdio', clientId: null });

    const categories = await request(app).get('/api/categories').set(bearer(res.body.token));
    expect(categories.body.map((c: { name: string }) => c.name)).toContain('Backend');
  });

  it('não permite e-mail duplicado', async () => {
    const body = { organizationName: 'X', name: 'Ana', email: 'ana@example.com', password: '123456' };
    await request(app).post('/api/auth/signup').send(body);
    const dup = await request(app).post('/api/auth/signup').send({ ...body, email: 'ANA@example.com' });
    expect(dup.status).toBe(409);
  });

  it('faz login e rejeita senha errada', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ organizationName: 'X', name: 'Ana', email: 'ana@example.com', password: '123456' });

    const ok = await request(app).post('/api/auth/login').send({ email: 'ana@example.com', password: '123456' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.role).toBe('MANAGER');

    const wrong = await request(app).post('/api/auth/login').send({ email: 'ana@example.com', password: 'errada' });
    expect(wrong.status).toBe(401);
  });

  it('limita tentativas de login a 5 por minuto', async () => {
    const attempt = () => request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'x' });
    for (let i = 0; i < 5; i++) expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(429);
  });

  it('bloqueia rotas protegidas sem token', async () => {
    expect((await request(app).get('/api/projects')).status).toBe(401);
  });
});

describe('US02 - Convites', () => {
  it('convida um desenvolvedor, que entra com o papel definido no convite', async () => {
    const manager = await signupManager(app);
    const invite = await request(app).post('/api/invites').set(bearer(manager.token)).send({ role: 'DEVELOPER' });
    expect(invite.status).toBe(201);
    const token = invite.body.url.split('/').pop();

    const info = await request(app).get(`/api/invites/${token}`);
    expect(info.body).toMatchObject({ organizationName: 'Estúdio Teste', role: 'DEVELOPER' });

    // Mesmo tentando se passar por gestor, o papel vem do convite.
    const accepted = await request(app)
      .post(`/api/invites/${token}/accept`)
      .send({ name: 'Dev', email: 'dev@example.com', password: '123456', role: 'MANAGER' });
    expect(accepted.status).toBe(201);
    expect(accepted.body.user).toMatchObject({ role: 'DEVELOPER', organizationId: manager.user.organizationId });
  });

  it('o link só pode ser usado uma vez', async () => {
    const manager = await signupManager(app);
    const invite = await request(app).post('/api/invites').set(bearer(manager.token)).send({ role: 'DEVELOPER' });
    const token = invite.body.url.split('/').pop();

    await request(app).post(`/api/invites/${token}/accept`).send({ name: 'A', email: 'a@example.com', password: '123456' });
    const again = await request(app).post(`/api/invites/${token}/accept`).send({ name: 'B', email: 'b@example.com', password: '123456' });
    expect(again.status).toBe(404);
  });

  it('o link expira em 7 dias', async () => {
    const db = createDatabase(':memory:');
    const { createApp } = await import('../src/app.js');
    app = createApp(db, 'segredo-de-teste');

    const manager = await signupManager(app);
    const invite = await request(app).post('/api/invites').set(bearer(manager.token)).send({ role: 'DEVELOPER' });
    const token = invite.body.url.split('/').pop();

    const expires = new Date(invite.body.expiresAt).getTime() - Date.now();
    expect(Math.round(expires / 86_400_000)).toBe(7);

    db.prepare('UPDATE invites SET expires_at = ?').run(new Date(Date.now() - 1000).toISOString());
    expect((await request(app).get(`/api/invites/${token}`)).status).toBe(404);
  });

  it('convite de cliente exige um cliente da própria organização', async () => {
    const manager = await signupManager(app);
    const other = await signupManager(app, 'Outra Org');
    const otherClient = await createClient(app, other.token);

    const missing = await request(app).post('/api/invites').set(bearer(manager.token)).send({ role: 'CLIENT' });
    expect(missing.status).toBe(400);

    const foreign = await request(app).post('/api/invites').set(bearer(manager.token)).send({ role: 'CLIENT', clientId: otherClient });
    expect(foreign.status).toBe(400);
  });

  it('só o gestor pode convidar', async () => {
    const manager = await signupManager(app);
    const dev = await inviteAndAccept(app, manager.token, 'DEVELOPER');
    const res = await request(app).post('/api/invites').set(bearer(dev.token)).send({ role: 'DEVELOPER' });
    expect(res.status).toBe(403);
  });
});

describe('US03 - Clientes e projetos', () => {
  it('cria projeto com valor da hora e horas previstas', async () => {
    const manager = await signupManager(app);
    const clientId = await createClient(app, manager.token);

    const res = await request(app)
      .post('/api/projects')
      .set(bearer(manager.token))
      .send({ clientId, name: 'Site institucional', hourlyRate: 120.5, budgetHours: 100 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Site institucional', clientName: 'Cliente ACME', hourlyRate: 120.5, budgetHours: 100, status: 'ACTIVE', members: [] });
  });

  it('exige valor da hora maior que zero e cliente existente', async () => {
    const manager = await signupManager(app);
    const clientId = await createClient(app, manager.token);
    const post = (body: object) => request(app).post('/api/projects').set(bearer(manager.token)).send(body);

    expect((await post({ clientId, name: 'P', hourlyRate: 0 })).status).toBe(400);
    expect((await post({ clientId: 9999, name: 'P', hourlyRate: 100 })).status).toBe(400);
  });

  it('cada papel vê só os projetos que lhe cabem', async () => {
    const manager = await signupManager(app);
    const acme = await createClient(app, manager.token, 'ACME');
    const beta = await createClient(app, manager.token, 'Beta');
    const newProject = async (clientId: number, name: string) =>
      (await request(app).post('/api/projects').set(bearer(manager.token)).send({ clientId, name, hourlyRate: 100 })).body.id;

    const acmeProject = await newProject(acme, 'Projeto ACME');
    await newProject(beta, 'Projeto Beta');

    const dev = await inviteAndAccept(app, manager.token, 'DEVELOPER');
    const acmeUser = await inviteAndAccept(app, manager.token, 'CLIENT', acme);

    await request(app).put(`/api/projects/${acmeProject}/members`).set(bearer(manager.token)).send({ userIds: [dev.user.id] });

    const names = async (token: string) => (await request(app).get('/api/projects').set(bearer(token))).body.map((p: { name: string }) => p.name);
    expect(await names(manager.token)).toHaveLength(2);
    expect(await names(dev.token)).toEqual(['Projeto ACME']);
    expect(await names(acmeUser.token)).toEqual(['Projeto ACME']);
  });

  it('esconde o valor da hora do dev, a não ser que o gestor libere', async () => {
    const manager = await signupManager(app);
    const clientId = await createClient(app, manager.token);
    const project = (await request(app).post('/api/projects').set(bearer(manager.token)).send({ clientId, name: 'P', hourlyRate: 100 })).body;
    const dev = await inviteAndAccept(app, manager.token, 'DEVELOPER');
    await request(app).put(`/api/projects/${project.id}/members`).set(bearer(manager.token)).send({ userIds: [dev.user.id] });

    const devView = async () => (await request(app).get('/api/projects').set(bearer(dev.token))).body[0];
    expect((await devView()).hourlyRate).toBeNull();
    expect((await devView()).members).toBeUndefined();

    await request(app).put(`/api/projects/${project.id}`).set(bearer(manager.token)).send({ clientId, name: 'P', hourlyRate: 100, showValuesToDevs: true });
    expect((await devView()).hourlyRate).toBe(100);
  });

  it('só aloca devs e gestores ativos da própria organização', async () => {
    const manager = await signupManager(app);
    const clientId = await createClient(app, manager.token);
    const project = (await request(app).post('/api/projects').set(bearer(manager.token)).send({ clientId, name: 'P', hourlyRate: 100 })).body;
    const clientUser = await inviteAndAccept(app, manager.token, 'CLIENT', clientId);
    const outsider = await signupManager(app, 'Outra Org');

    const assign = (userIds: number[]) =>
      request(app).put(`/api/projects/${project.id}/members`).set(bearer(manager.token)).send({ userIds });

    expect((await assign([clientUser.user.id])).status).toBe(400);
    expect((await assign([outsider.user.id])).status).toBe(400);
    expect((await assign([manager.user.id])).status).toBe(200);
  });

  it('isola clientes e projetos entre organizações', async () => {
    const a = await signupManager(app, 'Org A');
    const b = await signupManager(app, 'Org B');
    const clientA = await createClient(app, a.token);
    const projectA = (await request(app).post('/api/projects').set(bearer(a.token)).send({ clientId: clientA, name: 'P', hourlyRate: 100 })).body;

    expect((await request(app).get('/api/clients').set(bearer(b.token))).body).toEqual([]);
    expect((await request(app).put(`/api/clients/${clientA}`).set(bearer(b.token)).send({ name: 'Hack' })).status).toBe(404);
    expect((await request(app).put(`/api/projects/${projectA.id}`).set(bearer(b.token)).send({ clientId: clientA, name: 'Hack', hourlyRate: 1 })).status).toBe(404);
  });

  it('dev e cliente não acessam clientes nem equipe', async () => {
    const manager = await signupManager(app);
    const clientId = await createClient(app, manager.token);
    const dev = await inviteAndAccept(app, manager.token, 'DEVELOPER');
    const clientUser = await inviteAndAccept(app, manager.token, 'CLIENT', clientId);

    for (const token of [dev.token, clientUser.token]) {
      expect((await request(app).get('/api/clients').set(bearer(token))).status).toBe(403);
      expect((await request(app).get('/api/users').set(bearer(token))).status).toBe(403);
    }
    expect((await request(app).get('/api/categories').set(bearer(clientUser.token))).status).toBe(403);
  });
});

describe('Equipe', () => {
  it('usuário desativado perde o acesso na hora, mesmo com token válido', async () => {
    const manager = await signupManager(app);
    const dev = await inviteAndAccept(app, manager.token, 'DEVELOPER');
    expect((await request(app).get('/api/projects').set(bearer(dev.token))).status).toBe(200);

    await request(app).patch(`/api/users/${dev.user.id}`).set(bearer(manager.token)).send({ active: false });
    expect((await request(app).get('/api/projects').set(bearer(dev.token))).status).toBe(401);
  });

  it('gestor não pode desativar a si mesmo', async () => {
    const manager = await signupManager(app);
    const res = await request(app).patch(`/api/users/${manager.user.id}`).set(bearer(manager.token)).send({ active: false });
    expect(res.status).toBe(400);
  });
});

describe('Migração do banco', () => {
  it('converte um banco da v1 (finanças) sem erro', async () => {
    const { DatabaseSync } = await import('node:sqlite');
    const { mkdtempSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const path = join(mkdtempSync(join(tmpdir(), 'optimik-')), 'v1.db');

    const v1 = new DatabaseSync(path);
    v1.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, password_hash TEXT);
      CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT, type TEXT);
      CREATE TABLE transactions (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id));
      INSERT INTO users VALUES (1, 'Antigo', 'antigo@example.com', 'x');
    `);
    v1.close();

    const db = createDatabase(path);
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all().map((t) => (t as { name: string }).name);
    expect(tables).toContain('organizations');
    expect(tables).not.toContain('transactions');
    db.close();
  });
});
