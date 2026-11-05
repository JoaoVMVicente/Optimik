# Optimik

Time sheet que registra horas de trabalho com clareza para **gestão, cliente e desenvolvedor**.

A especificação está em [`docs/PRD.md`](docs/PRD.md) (o quê) e [`docs/TDD.md`](docs/TDD.md) (como).
A versão anterior do projeto, um organizador financeiro pessoal, está documentada em [`docs/v1-financas/`](docs/v1-financas/).

## Andamento

| Etapa | Entrega | Status |
| ----- | ------- | ------ |
| 1 | Organização, papéis, convites, clientes, projetos, categorias | ✅ |
| 2 | Cronômetro, tela "qual projeto?", lançamento manual | ⏳ |
| 3 | Envio, aprovação em duas etapas, histórico | ⏳ |
| 4 | Comentários e notificações | ⏳ |
| 5 | Painéis por papel, faturamento e CSV | ⏳ |
| 6 | PWA instalável e inicialização com o Windows | ⏳ |

### O que já funciona (etapa 1)

- **Criar conta**: quem se cadastra cria a organização e vira **gestor** (US01)
- **Convites por link** para desenvolvedores, clientes e outros gestores; o link vale 7 dias e funciona uma vez (US02)
- **Clientes e projetos** com valor da hora, horas previstas e equipe alocada (US03)
- **Cada papel vê só o que lhe cabe**: o dev vê os projetos em que está e não vê o valor da hora (a não ser que o gestor libere); o cliente vê só os projetos dele
- **Equipe**: o gestor desativa e reativa acessos (quem é desativado perde o acesso na hora)
- **Categorias de tarefa** editáveis (Backend, Frontend, Banco de Dados, Documentação, Reunião)

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org) **24 ou mais novo** (o projeto usa o SQLite que já vem no Node).

```bash
# 1. Instala as dependências (só na primeira vez)
npm run setup

# 2. Sobe a API e o site juntos
npm run dev
```

Abra **http://localhost:5173** e crie uma conta. Para testar outros papéis, gere um convite em
**Equipe**, saia da conta e abra o link do convite.

Para rodar os testes automáticos da API: `npm test`.

> Opcional: copie `server/.env.example` para `server/.env` e troque o `JWT_SECRET`.
> Sem o `.env`, o projeto usa valores padrão de desenvolvimento.

## Como contribuir (fluxo de branches)

A branch `main` é protegida: ninguém faz commit direto nela. Todo código entra por Pull Request,
e o PR só pode ser mergeado quando a verificação automática (`.github/workflows/ci.yml`) passar.

```bash
git switch main && git pull               # parte da main atualizada
git switch -c feat/minha-mudanca          # cria uma branch nova
# ... edita o código ...
git add . && git commit -m "feat: descreve a mudança"
git push -u origin feat/minha-mudanca     # envia a branch
```

Depois, no GitHub, clique em **Compare & pull request**. O CI roda sozinho (tipos, testes e build);
com tudo verde, clique em **Merge**.

## Hospedagem (produção)

Em produção, o backend também entrega o site compilado, então é um único serviço.
O arquivo `railway.json` já configura o build e o start para o [Railway](https://railway.com).

Variáveis de ambiente necessárias:

| Variável | Valor |
| -------- | ----- |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | um texto longo e aleatório (o servidor não sobe sem ele) |
| `DATABASE_PATH` | `/data/optimik.db` (dentro de um volume persistente montado em `/data`) |

## Estrutura

```
Optimik/
├── docs/                  # PRD e TDD
├── server/                # Backend: Node.js + Express + TypeScript + SQLite
│   ├── src/
│   │   ├── server.ts      # Ponto de entrada (sobe a API na porta 3333)
│   │   ├── app.ts         # Monta o Express e registra as rotas
│   │   ├── db.ts          # Conexão SQLite e migrações (evolução do banco)
│   │   ├── session.ts     # Gera o token JWT de quem entra
│   │   ├── validation.ts  # Regras de validação compartilhadas
│   │   ├── middleware/    # Login obrigatório, papéis e limite de tentativas
│   │   └── routes/        # auth, invites, users, clients, projects, categories
│   └── tests/             # Testes dos critérios de aceite
└── web/                   # Frontend: React + TypeScript + Tailwind CSS
    └── src/
        ├── main.tsx       # Rotas das páginas e quem pode abrir cada uma
        ├── api.ts         # Todas as chamadas ao backend
        ├── auth.tsx       # Quem está logado (login/logout)
        ├── pages/         # Telas
        └── components/    # Menu lateral e peças reutilizáveis
```

## API

Exceto as rotas públicas, todas exigem o cabeçalho `Authorization: Bearer <token>`.
A lista completa planejada (todas as etapas) está no [TDD, seção 4](docs/TDD.md#4-api-rest).

| Método | Rota | Quem | Descrição |
| ------ | ---- | ---- | --------- |
| POST | `/api/auth/signup` | pública | Cria organização + gestor e já devolve `{ token, user }` |
| POST | `/api/auth/login` | pública | `{ email, password }` → `{ token, user }` (máx. 5 tentativas/min) |
| GET | `/api/auth/me` | todos | Usuário logado |
| POST | `/api/invites` | gestor | `{ role, clientId?, email? }` → `{ url, expiresAt }` |
| GET | `/api/invites/:token` | pública | Dados do convite |
| POST | `/api/invites/:token/accept` | pública | `{ name, email, password }` → `{ token, user }` |
| GET / PATCH | `/api/users`, `/api/users/:id` | gestor | Equipe; `{ active }` ativa/desativa |
| GET / POST / PUT | `/api/clients`, `/api/clients/:id` | gestor | Clientes |
| GET | `/api/projects` | todos | Projetos visíveis para o papel de quem pede |
| POST / PUT | `/api/projects`, `/api/projects/:id` | gestor | `{ clientId, name, hourlyRate, budgetHours?, showValuesToDevs?, status? }` |
| PUT | `/api/projects/:id/members` | gestor | `{ userIds }` define quem está alocado |
| GET | `/api/categories` | gestor, dev | Categorias de tarefa |
| POST / PUT | `/api/categories`, `/api/categories/:id` | gestor | `{ name }` |

## Decisões técnicas

- **Valores em centavos** (inteiro) no banco: números decimais no computador têm erros de
  arredondamento (`0.1 + 0.2 = 0.30000000000000004`). A API recebe e devolve reais.
- **Migrações numeradas** em `server/src/db.ts`: cada mudança no banco é um passo novo, aplicado uma
  única vez. Um banco da v1 é convertido automaticamente.
- **Convites guardam só o hash do token**: nem quem acessa o banco consegue usar os links.
- **O papel é relido do banco a cada requisição**: desativar alguém tem efeito imediato.
- **Acesso negado a algo de outra organização responde 404**, para não revelar que o item existe.
