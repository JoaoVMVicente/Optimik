// Testes da API cobrindo os critérios de aceite do PRD (US01 a US04).
// Cada teste usa um banco SQLite em memória, então nada é gravado em disco.
import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp(createDatabase(':memory:'), 'segredo-de-teste');
});

async function registerAndLogin(email = 'ana@example.com') {
  await request(app).post('/api/auth/register').send({ name: 'Ana', email, password: '123456' });
  const res = await request(app).post('/api/auth/login').send({ email, password: '123456' });
  return res.body.token as string;
}

async function categoryId(token: string, name: string) {
  const res = await request(app).get('/api/categories').set('Authorization', `Bearer ${token}`);
  return res.body.find((c: { name: string }) => c.name === name).id as number;
}

describe('US01 - Autenticação', () => {
  it('cadastra e faz login retornando um token JWT', async () => {
    const reg = await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@example.com', password: '123456' });
    expect(reg.status).toBe(201);
    expect(reg.body.id).toBeTypeOf('number');

    const login = await request(app).post('/api/auth/login').send({ email: 'ana@example.com', password: '123456' });
    expect(login.status).toBe(200);
    expect(login.body.token.split('.')).toHaveLength(3);
    expect(login.body.user).toEqual({ id: reg.body.id, name: 'Ana', email: 'ana@example.com' });
  });

  it('não permite e-mail duplicado', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@example.com', password: '123456' });
    const dup = await request(app).post('/api/auth/register').send({ name: 'Outra', email: 'ANA@example.com', password: '654321' });
    expect(dup.status).toBe(409);
  });

  it('rejeita senha incorreta', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@example.com', password: '123456' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@example.com', password: 'errada' });
    expect(login.status).toBe(401);
  });

  it('bloqueia rotas protegidas sem token', async () => {
    const res = await request(app).get('/api/transactions?month=1&year=2026');
    expect(res.status).toBe(401);
  });
});

describe('US02 - Lançamentos', () => {
  it('cria, edita e exclui um lançamento', async () => {
    const token = await registerAndLogin();
    const auth = { Authorization: `Bearer ${token}` };
    const food = await categoryId(token, 'Alimentação');

    const created = await request(app).post('/api/transactions').set(auth)
      .send({ type: 'EXPENSE', amount: 45.9, category_id: food, description: 'Mercado', date: '2026-03-10' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ type: 'EXPENSE', amount: 45.9, category_name: 'Alimentação' });

    const updated = await request(app).put(`/api/transactions/${created.body.id}`).set(auth).send({ amount: 50 });
    expect(updated.status).toBe(200);
    expect(updated.body.amount).toBe(50);
    expect(updated.body.description).toBe('Mercado');

    const deleted = await request(app).delete(`/api/transactions/${created.body.id}`).set(auth);
    expect(deleted.status).toBe(204);
  });

  it('exige valor estritamente positivo', async () => {
    const token = await registerAndLogin();
    for (const amount of [0, -10]) {
      const res = await request(app).post('/api/transactions').set('Authorization', `Bearer ${token}`)
        .send({ type: 'INCOME', amount, date: '2026-03-10' });
      expect(res.status).toBe(400);
    }
  });

  it('rejeita categoria de tipo diferente do lançamento', async () => {
    const token = await registerAndLogin();
    const salary = await categoryId(token, 'Salário');
    const res = await request(app).post('/api/transactions').set('Authorization', `Bearer ${token}`)
      .send({ type: 'EXPENSE', amount: 10, category_id: salary, date: '2026-03-10' });
    expect(res.status).toBe(400);
  });

  it('isola os dados entre usuários', async () => {
    const ana = await registerAndLogin('ana@example.com');
    const bob = await registerAndLogin('bob@example.com');

    const created = await request(app).post('/api/transactions').set('Authorization', `Bearer ${ana}`)
      .send({ type: 'INCOME', amount: 100, date: '2026-03-10' });

    const bobAuth = { Authorization: `Bearer ${bob}` };
    expect((await request(app).get('/api/transactions?month=3&year=2026').set(bobAuth)).body).toEqual([]);
    expect((await request(app).put(`/api/transactions/${created.body.id}`).set(bobAuth).send({ amount: 1 })).status).toBe(404);
    expect((await request(app).delete(`/api/transactions/${created.body.id}`).set(bobAuth)).status).toBe(404);
  });
});

describe('US03/US04 - Resumo e filtro por mês', () => {
  it('filtra por mês e calcula receitas, despesas e saldo', async () => {
    const token = await registerAndLogin();
    const auth = { Authorization: `Bearer ${token}` };
    const food = await categoryId(token, 'Alimentação');

    const post = (body: object) => request(app).post('/api/transactions').set(auth).send(body);
    await post({ type: 'INCOME', amount: 0.1, date: '2026-03-01' });
    await post({ type: 'INCOME', amount: 0.2, date: '2026-03-31' });
    await post({ type: 'EXPENSE', amount: 1, category_id: food, date: '2026-03-15' });
    await post({ type: 'EXPENSE', amount: 999, date: '2026-04-01' }); // outro mês

    const list = await request(app).get('/api/transactions?month=3&year=2026').set(auth);
    expect(list.body.map((t: { date: string }) => t.date)).toEqual(['2026-03-31', '2026-03-15', '2026-03-01']);

    const summary = await request(app).get('/api/dashboard/summary?month=3&year=2026').set(auth);
    expect(summary.body).toEqual({
      totalIncome: 0.3,
      totalExpense: 1,
      balance: -0.7,
      expensesByCategory: [{ category: 'Alimentação', total: 1 }],
    });
  });

  it('valida mês e ano', async () => {
    const token = await registerAndLogin();
    const res = await request(app).get('/api/dashboard/summary?month=13&year=2026').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
