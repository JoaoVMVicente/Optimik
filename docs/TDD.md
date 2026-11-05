# Optimik — Documento de Especificação Técnica (TDD)

**Versão 2.0** · Time Sheet · Arquitetura, modelagem de dados, API e regras de negócio
**Requisitos:** [PRD.md](PRD.md)

---

## 1. Stack tecnológica

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | React, TypeScript, Tailwind CSS, React Router | Mantido da v1 |
| App instalável | **PWA** (`vite-plugin-pwa`) | Permite instalar e abrir com o Windows (ver §6) |
| Backend | Node.js 24, Express 5, TypeScript, zod | Mantido da v1 |
| Banco | SQLite (`node:sqlite`) | Mantido da v1; migração para PostgreSQL planejada antes da produção |
| Autenticação | JWT + bcrypt | Mantido da v1, agora com papel do usuário no token |
| Testes / CI | Vitest + Supertest, GitHub Actions | Mantido da v1 |

**Reaproveitado da v1:** autenticação, estrutura de pastas, validação, CI, deploy em serviço único.
**Removido da v1:** tabelas `categories` e `transactions` (finanças pessoais). Não há dados de produção, então o banco é recriado do zero.

---

## 2. Arquitetura

```
┌──────────────────────────┐          HTTPS + JSON (Bearer JWT)          ┌──────────────────────────┐      ┌────────┐
│ PWA React                │ ──────────────────────────────────────────▶ │ API Express              │ ───▶ │ SQLite │
│ • Tela "qual projeto?"   │ ◀────────────────────────────────────────── │ • auth + papéis          │      └────────┘
│ • Cronômetro             │      polling /notifications a cada 30 s     │ • regras de aprovação    │
│ • Painéis por papel      │                                             │ • histórico (auditoria)  │
└──────────────────────────┘                                             └──────────────────────────┘
```

- **Uma camada de serviço** por domínio (`timer`, `entries`, `approvals`...) concentra as regras; as rotas só validam a entrada e chamam o serviço.
- **Toda mudança em lançamento passa por uma única função** (`changeEntry`) que valida a transição, grava o histórico e cria as notificações **na mesma transação**. Isso garante que nunca exista mudança sem histórico.

---

## 3. Modelagem de dados

Convenções: datas/horas em **UTC, ISO 8601**; dinheiro em **centavos (INTEGER)**; durações em **segundos (INTEGER)**.

### 3.1 Organização e pessoas

**organizations**
| Coluna | Tipo | Restrições |
|---|---|---|
| id | INTEGER | PK |
| name | VARCHAR(100) | NOT NULL |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**clients**
| Coluna | Tipo | Restrições |
|---|---|---|
| id | INTEGER | PK |
| organization_id | INTEGER | FK organizations, NOT NULL |
| name | VARCHAR(100) | NOT NULL |
| contact_email | VARCHAR(150) | NULL |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**users**
| Coluna | Tipo | Restrições |
|---|---|---|
| id | INTEGER | PK |
| organization_id | INTEGER | FK organizations, NOT NULL |
| client_id | INTEGER | FK clients, **obrigatório se role = CLIENT**, nulo nos demais |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(150) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| role | VARCHAR(12) | `MANAGER` \| `DEVELOPER` \| `CLIENT` |
| active | BOOLEAN | DEFAULT 1 (desativar em vez de apagar, para preservar histórico) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**invites**
| Coluna | Tipo | Restrições |
|---|---|---|
| id | INTEGER | PK |
| organization_id | INTEGER | FK, NOT NULL |
| role | VARCHAR(12) | `DEVELOPER` \| `CLIENT` \| `MANAGER` |
| client_id | INTEGER | FK clients, obrigatório se role = CLIENT |
| email | VARCHAR(150) | NULL (opcional, só para referência) |
| token_hash | VARCHAR(64) | NOT NULL, UNIQUE (SHA-256 do token; o token em si só aparece no link) |
| expires_at | TIMESTAMP | NOT NULL (criação + 7 dias) |
| accepted_at | TIMESTAMP | NULL |
| created_by | INTEGER | FK users |

### 3.2 Projetos

**projects**
| Coluna | Tipo | Restrições |
|---|---|---|
| id | INTEGER | PK |
| organization_id | INTEGER | FK, NOT NULL |
| client_id | INTEGER | FK clients, NOT NULL |
| name | VARCHAR(100) | NOT NULL |
| hourly_rate_cents | INTEGER | NOT NULL, > 0 |
| budget_hours | INTEGER | NULL (horas previstas) |
| show_values_to_devs | BOOLEAN | DEFAULT 0 (decisão D2 do PRD) |
| status | VARCHAR(10) | `ACTIVE` \| `ARCHIVED` |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**project_members** — devs alocados
| Coluna | Tipo | Restrições |
|---|---|---|
| project_id | INTEGER | FK projects, PK composta |
| user_id | INTEGER | FK users, PK composta |

**task_categories**
| Coluna | Tipo | Restrições |
|---|---|---|
| id | INTEGER | PK |
| organization_id | INTEGER | FK, NOT NULL |
| name | VARCHAR(50) | NOT NULL; padrão: Backend, Frontend, Banco de Dados, Documentação, Reunião |

### 3.3 Lançamentos de horas e comunicação

**time_entries**
| Coluna | Tipo | Restrições |
|---|---|---|
| id | INTEGER | PK |
| organization_id | INTEGER | FK, NOT NULL (facilita o isolamento nas consultas) |
| project_id | INTEGER | FK projects, NOT NULL |
| user_id | INTEGER | FK users, NOT NULL |
| category_id | INTEGER | FK task_categories, NULL |
| description | VARCHAR(500) | NULL |
| started_at | TIMESTAMP | NOT NULL |
| ended_at | TIMESTAMP | **NULL = cronômetro rodando** |
| duration_seconds | INTEGER | NULL enquanto roda; calculado ao parar |
| source | VARCHAR(6) | `TIMER` \| `MANUAL` (métrica de sucesso do PRD) |
| hourly_rate_cents | INTEGER | NOT NULL — **cópia** do valor do projeto no momento do lançamento |
| status | VARCHAR(20) | ver §5.1 |
| created_at / updated_at | TIMESTAMP | |

Índices:
- `UNIQUE (user_id) WHERE ended_at IS NULL` → **no máximo um cronômetro rodando por usuário**, garantido pelo banco.
- `(organization_id, started_at)` e `(project_id, status)` para painéis e filas de aprovação.

> **Por que copiar o valor da hora?** Se o gestor reajustar o valor do projeto em junho, as horas de maio
> já aprovadas pelo cliente não podem mudar de preço.

**entry_comments**
| Coluna | Tipo | Restrições |
|---|---|---|
| id | INTEGER | PK |
| entry_id | INTEGER | FK time_entries, NOT NULL |
| author_id | INTEGER | FK users, NOT NULL |
| body | VARCHAR(2000) | NOT NULL |
| created_at / edited_at | TIMESTAMP | edição permitida até 5 min após criar |

**entry_events** — histórico imutável (somente INSERT; nunca UPDATE/DELETE)
| Coluna | Tipo | Restrições |
|---|---|---|
| id | INTEGER | PK |
| entry_id | INTEGER | FK, NOT NULL |
| actor_id | INTEGER | FK users, NOT NULL |
| action | VARCHAR(20) | `CREATED`, `UPDATED`, `SUBMITTED`, `MANAGER_APPROVED`, `MANAGER_REJECTED`, `CLIENT_APPROVED`, `CLIENT_REJECTED`, `INVOICED`, `COMMENTED` |
| from_status / to_status | VARCHAR(20) | NULL quando não muda status |
| reason | VARCHAR(500) | obrigatório nas rejeições |
| changes_json | TEXT | campos alterados `{ campo: [antes, depois] }` em `UPDATED` |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**notifications**
| Coluna | Tipo | Restrições |
|---|---|---|
| id | INTEGER | PK |
| user_id | INTEGER | FK users (destinatário), NOT NULL |
| entry_id | INTEGER | FK, NULL |
| type | VARCHAR(30) | `APPROVAL_PENDING`, `ENTRY_REJECTED`, `ENTRY_APPROVED`, `NEW_COMMENT`, `TIMER_FORGOTTEN` |
| message | VARCHAR(255) | NOT NULL |
| read_at | TIMESTAMP | NULL = não lida |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

## 4. API REST

Todas as rotas abaixo de `/api`. Exceto as marcadas como públicas, exigem `Authorization: Bearer <token>`.
Coluna **Papéis**: G = Gestor, D = Desenvolvedor, C = Cliente.

### 4.1 Autenticação e convites
| Método | Rota | Papéis | Descrição |
|---|---|---|---|
| POST | `/auth/signup` | pública | `{ organizationName, name, email, password }` → cria organização + gestor |
| POST | `/auth/login` | pública | `{ email, password }` → `{ token, user: { id, name, email, role, organizationId, clientId } }` |
| GET | `/auth/me` | G D C | Usuário logado |
| POST | `/invites` | G | `{ role, clientId?, email? }` → `{ url, expiresAt }` |
| GET | `/invites/:token` | pública | Dados do convite (organização, papel) para a tela de aceite |
| POST | `/invites/:token/accept` | pública | `{ name, email, password }` → cria o usuário |
| GET / PATCH | `/users`, `/users/:id` | G | Listar e ativar/desativar usuários |

### 4.2 Clientes, projetos e categorias
| Método | Rota | Papéis | Descrição |
|---|---|---|---|
| GET / POST | `/clients` | G | Listar / criar clientes |
| PUT | `/clients/:id` | G | Editar cliente |
| GET | `/projects` | G D C | G: todos; D: onde está alocado; C: do seu cliente |
| POST / PUT | `/projects`, `/projects/:id` | G | Criar / editar (inclui arquivar) |
| PUT | `/projects/:id/members` | G | `{ userIds: [] }` → define devs alocados |
| GET / POST / PUT | `/categories` | G (escrita), G D (leitura) | Categorias de tarefa |

### 4.3 Cronômetro
| Método | Rota | Papéis | Descrição |
|---|---|---|---|
| GET | `/timer` | G D | Lançamento rodando (ou `null`) e alerta de esquecimento se > 10h |
| POST | `/timer/start` | G D | `{ projectId, categoryId?, description? }` — se já houver um rodando, ele é encerrado e o novo começa (**troca de projeto**) |
| POST | `/timer/stop` | G D | `{ endedAt?, categoryId?, description? }` — `endedAt` permite corrigir esquecimento |

### 4.4 Lançamentos
| Método | Rota | Papéis | Descrição |
|---|---|---|---|
| GET | `/entries` | G D C | Filtros: `from`, `to`, `projectId`, `userId`, `status`. Visibilidade por papel (§5.2) |
| POST | `/entries` | G D | Lançamento manual `{ projectId, categoryId?, description?, startedAt, endedAt }` |
| PUT | `/entries/:id` | G D (dono) | Editar; só em `DRAFT` ou `REJECTED` |
| DELETE | `/entries/:id` | G D (dono) | Só em `DRAFT` |
| POST | `/entries/submit` | G D | `{ ids: [] }` → `SUBMITTED` |
| POST | `/entries/review` | G C | `{ ids: [], decision: "APPROVE" \| "REJECT", reason? }` — a etapa (gestor ou cliente) é deduzida do papel |
| POST | `/entries/invoice` | G | `{ ids: [] }` → `INVOICED` |
| GET | `/entries/:id/history` | G D C | Eventos do lançamento |
| GET / POST | `/entries/:id/comments` | G D C | Listar / comentar |
| PATCH | `/comments/:id` | autor | Editar até 5 min após criar |
| GET | `/entries/export.csv` | G C | Mesmos filtros de `GET /entries` |

Ações em lote respondem com `{ updated: [ids], skipped: [{ id, reason }] }`: um item inválido não cancela os demais.

### 4.5 Notificações e painéis
| Método | Rota | Papéis | Descrição |
|---|---|---|---|
| GET | `/notifications?unread=true` | G D C | Lista + contador de não lidas (o app consulta a cada 30 s) |
| POST | `/notifications/read` | G D C | `{ ids: [] }` ou `{ all: true }` |
| GET | `/dashboard?month=MM&year=YYYY&projectId=` | G D C | Resposta varia por papel (§5.4) |

---

## 5. Regras de negócio e segurança

### 5.1 Máquina de estados do lançamento

No código os status usam nomes em inglês; no PRD e na interface aparecem em português
(`DRAFT` = Rascunho, `SUBMITTED` = Enviado, `MANAGER_APPROVED` = Aprovado pelo gestor,
`CLIENT_APPROVED` = Aprovado pelo cliente, `INVOICED` = Faturado, `REJECTED` = Rejeitado).

| Status | Significado | Quem pode mover | Para |
|---|---|---|---|
| `DRAFT` | Rascunho do dev | dono | `SUBMITTED` |
| `SUBMITTED` | Aguardando gestor | gestor | `MANAGER_APPROVED` ou `REJECTED` |
| `MANAGER_APPROVED` | Aguardando cliente | cliente do projeto | `CLIENT_APPROVED` ou `REJECTED` |
| `CLIENT_APPROVED` | Pronto para faturar | gestor | `INVOICED` |
| `INVOICED` | Faturado (final) | — | — |
| `REJECTED` | Devolvido ao dev com motivo | dono | `SUBMITTED` (após corrigir) |

- Qualquer transição fora desta tabela retorna **409 Conflict**.
- `REJECTED` sempre exige `reason` (mínimo 5 caracteres).
- Um lançamento com cronômetro rodando (`ended_at` nulo) não pode ser enviado.
- **Freelancer solo:** se o gestor for o dono do lançamento, ele pode aprovar a etapa do gestor nas próprias horas (o cliente continua aprovando depois).

### 5.2 Visibilidade (aplicada em toda consulta)
| Papel | Vê |
|---|---|
| Gestor | Tudo da sua organização |
| Desenvolvedor | Apenas os próprios lançamentos; valores em R$ só se `show_values_to_devs = 1` |
| Cliente | Lançamentos dos projetos do seu `client_id` com status ≥ `MANAGER_APPROVED`. Nunca vê rascunhos, outros clientes ou lançamentos rejeitados pelo gestor |

Tentativas de acessar recurso não visível retornam **404** (e não 403), para não revelar que ele existe.

### 5.3 Validações de tempo
- `ended_at > started_at`; duração máxima de **12 h** por lançamento.
- Sem sobreposição com outro lançamento do mesmo usuário.
- Nada no futuro (tolerância de 1 min para diferença de relógio).
- Cronômetro rodando há mais de **10 h**: `GET /timer` retorna `forgotten: true` e o app pede o horário real de término antes de qualquer outra ação.

### 5.4 Cálculos do painel
- **Horas lançadas:** soma de `duration_seconds` no período.
- **Valor faturado:** soma de `duration_seconds / 3600 × hourly_rate_cents` dos lançamentos `CLIENT_APPROVED` + `INVOICED`, arredondado por lançamento.
- **A faturar / em revisão:** mesma conta para `SUBMITTED` + `MANAGER_APPROVED`.
- **Valor hora médio:** valor faturado ÷ horas faturadas.
- **Progresso do projeto:** horas aprovadas ÷ `budget_hours`; alertas em 80% e 100%.
- **Progressão diária:** série acumulada de horas e valor por dia do mês.

### 5.5 Notificações geradas
| Evento | Quem recebe |
|---|---|
| Dev envia horas | Gestores da organização |
| Gestor aprova | Usuários-cliente do projeto (e o dev) |
| Gestor ou cliente rejeita | Dev dono (e gestores, se foi o cliente) |
| Novo comentário | Todos que podem ver o lançamento, exceto o autor |
| Cronômetro esquecido (> 10 h) | O próprio dev |

### 5.6 Segurança
- JWT com `sub`, `role` e `org`; expira em 7 dias. O papel é **sempre relido do banco** em rotas sensíveis (para um usuário desativado perder acesso imediatamente).
- Tokens de convite: 32 bytes aleatórios; só o hash SHA-256 é salvo.
- Limite de tentativas de login (5 por minuto por IP).
- Toda consulta filtra por `organization_id` do usuário logado.

---

## 6. "Abrir junto com o computador"

| Fase | Como funciona | Limitação |
|---|---|---|
| **MVP — PWA** | O usuário instala o Optimik pelo navegador (Chrome/Edge → "Instalar app"). Na tela de configurações mostramos o passo a passo para adicioná-lo à inicialização do Windows (atalho na pasta `shell:startup`). Ao abrir, a tela "Em qual projeto você vai trabalhar?" aparece se não houver cronômetro rodando. | Exige um passo manual do usuário; o navegador não permite que um site se registre sozinho na inicialização. |
| **Fase 2 — App desktop (Tauri)** | Empacotar o mesmo frontend em um app desktop com opção "Iniciar com o Windows" e detecção de inatividade ("você ficou 15 min ausente, descontar?"). | Mais trabalho de build e distribuição; fica para depois de validar o MVP. |

O cronômetro roda **no servidor** (guardamos `started_at`), então fechar o app ou desligar o computador não perde o registro: ao reabrir, o tempo continua correto.

---

## 7. Plano de entrega

| Etapa | Entrega | Histórias |
|---|---|---|
| 1 | Organização, papéis, convites, clientes, projetos, categorias | US01–US03 |
| 2 | Cronômetro, tela "qual projeto?", lançamento manual | US04–US06 |
| 3 | Envio, aprovação em duas etapas, histórico | US07–US09, US11 |
| 4 | Comentários e notificações | US10 |
| 5 | Painéis por papel, faturamento e CSV | US12–US13 |
| 6 | PWA instalável e guia de inicialização com o Windows | US04 (complemento) |

Cada etapa entra por um Pull Request próprio, com testes cobrindo os critérios de aceite das histórias correspondentes.
