// Conexão com o SQLite e criação das tabelas (TDD, seção 3).
// Usamos o módulo `node:sqlite`, que já vem embutido no Node.js 22.5+,
// então não é preciso instalar nenhum driver extra.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Database = DatabaseSync;

// Migrações: cada item é um passo de evolução do banco, aplicado uma única vez e em ordem.
// O SQLite guarda em `PRAGMA user_version` quantos passos já foram aplicados.
// Nunca altere uma migração que já foi publicada: crie uma nova no fim da lista.
const MIGRATIONS: string[] = [
  // 1 — Time sheet, etapa 1: organizações, pessoas, clientes, projetos e categorias.
  // Remove as tabelas do MVP v1 (finanças pessoais), que não têm dados de produção.
  `
  DROP TABLE IF EXISTS transactions;
  DROP TABLE IF EXISTS categories;
  DROP TABLE IF EXISTS users;

  CREATE TABLE organizations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE clients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    name            VARCHAR(100) NOT NULL,
    contact_email   VARCHAR(150),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    client_id       INTEGER REFERENCES clients(id),
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(12) NOT NULL CHECK (role IN ('MANAGER', 'DEVELOPER', 'CLIENT')),
    active          INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Usuário-cliente sempre aponta para um cliente; os demais nunca.
    CHECK ((role = 'CLIENT') = (client_id IS NOT NULL))
  );

  CREATE TABLE invites (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    role            VARCHAR(12) NOT NULL CHECK (role IN ('MANAGER', 'DEVELOPER', 'CLIENT')),
    client_id       INTEGER REFERENCES clients(id),
    email           VARCHAR(150),
    token_hash      VARCHAR(64) NOT NULL UNIQUE,
    expires_at      TIMESTAMP NOT NULL,
    accepted_at     TIMESTAMP,
    created_by      INTEGER NOT NULL REFERENCES users(id),
    CHECK ((role = 'CLIENT') = (client_id IS NOT NULL))
  );

  CREATE TABLE projects (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    client_id           INTEGER NOT NULL REFERENCES clients(id),
    name                VARCHAR(100) NOT NULL,
    hourly_rate_cents   INTEGER NOT NULL CHECK (hourly_rate_cents > 0),
    budget_hours        INTEGER CHECK (budget_hours > 0),
    show_values_to_devs INTEGER NOT NULL DEFAULT 0,
    status              VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE project_members (
    project_id INTEGER NOT NULL REFERENCES projects(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    PRIMARY KEY (project_id, user_id)
  );

  CREATE TABLE task_categories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    name            VARCHAR(50) NOT NULL,
    UNIQUE (organization_id, name)
  );

  CREATE INDEX idx_users_org ON users (organization_id);
  CREATE INDEX idx_clients_org ON clients (organization_id);
  CREATE INDEX idx_projects_org ON projects (organization_id);
  `,
];

export const DEFAULT_TASK_CATEGORIES = ['Backend', 'Frontend', 'Banco de Dados', 'Documentação', 'Reunião'];

export function createDatabase(path: string): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

function migrate(db: Database) {
  const { user_version: current } = db.prepare('PRAGMA user_version').get() as { user_version: number };

  for (let version = current; version < MIGRATIONS.length; version++) {
    // As tabelas da v1 se referenciam; desligamos a checagem só durante a migração.
    db.exec('PRAGMA foreign_keys = OFF;');
    transaction(db, () => {
      db.exec(MIGRATIONS[version]);
      db.exec(`PRAGMA user_version = ${version + 1}`);
    });
    db.exec('PRAGMA foreign_keys = ON;');
  }
}

// Executa várias operações como uma só: ou todas são gravadas, ou nenhuma.
export function transaction<T>(db: Database, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
