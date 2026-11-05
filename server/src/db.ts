// Conexão com o SQLite e criação das tabelas (TDD, seção 3).
// Usamos o módulo `node:sqlite`, que já vem embutido no Node.js 22.5+,
// então não é preciso instalar nenhum driver extra.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Database = DatabaseSync;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE'))
  );

  -- amount é guardado em CENTAVOS (inteiro) para evitar erros de arredondamento
  -- de números decimais (ex.: 0.1 + 0.2 = 0.30000000000000004).
  -- A API recebe e devolve o valor em reais normalmente.
  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id),
    type        VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    amount      INTEGER NOT NULL CHECK (amount > 0),
    description VARCHAR(255),
    date        DATE NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date);
`;

const DEFAULT_CATEGORIES: Array<[string, 'INCOME' | 'EXPENSE']> = [
  ['Salário', 'INCOME'],
  ['Freelance', 'INCOME'],
  ['Investimentos', 'INCOME'],
  ['Outras receitas', 'INCOME'],
  ['Alimentação', 'EXPENSE'],
  ['Moradia', 'EXPENSE'],
  ['Transporte', 'EXPENSE'],
  ['Saúde', 'EXPENSE'],
  ['Educação', 'EXPENSE'],
  ['Lazer', 'EXPENSE'],
  ['Compras', 'EXPENSE'],
  ['Contas e serviços', 'EXPENSE'],
  ['Outras despesas', 'EXPENSE'],
];

export function createDatabase(path: string): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);

  // Cadastra as categorias padrão apenas na primeira vez.
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM categories').get() as { total: number };
  if (total === 0) {
    const insert = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)');
    for (const [name, type] of DEFAULT_CATEGORIES) insert.run(name, type);
  }

  return db;
}
