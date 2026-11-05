# Optimik

Organizador de gastos e entradas de dinheiro, sem planilhas gigantescas.

MVP construído a partir de [`docs/PRD.docx`](docs/PRD.docx) e [`docs/TDD.docx`](docs/TDD.docx).

## O que tem no MVP

- **Cadastro e login** com senha criptografada (bcrypt) e token JWT (US01)
- **Lançamentos**: criar, editar e excluir receitas e despesas (US02)
- **Resumo do mês**: total de receitas, despesas e saldo (verde = positivo, vermelho = negativo) (US03)
- **Filtro por mês/ano** que atualiza a lista e os cards sem recarregar a página (US04)
- **Gastos por categoria**, para ver para onde o dinheiro está indo

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org) **22.5 ou mais novo** (o projeto usa o SQLite que já vem no Node).

```bash
# 1. Instala as dependências (só na primeira vez)
npm run setup

# 2. Sobe a API e o site juntos
npm run dev
```

Abra **http://localhost:5173**, crie uma conta e comece a lançar.

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
│   │   ├── db.ts          # Conexão SQLite, criação das tabelas e categorias padrão
│   │   ├── validation.ts  # Regras de validação (valor > 0, datas, mês/ano)
│   │   ├── middleware/
│   │   │   └── auth.ts    # Protege rotas exigindo o token JWT
│   │   └── routes/        # auth, categories, transactions, dashboard
│   └── tests/             # Testes dos critérios de aceite
└── web/                   # Frontend: React + TypeScript + Tailwind CSS
    └── src/
        ├── main.tsx       # Rotas das páginas (login, cadastro, painel)
        ├── api.ts         # Todas as chamadas ao backend
        ├── auth.tsx       # Quem está logado (login/logout)
        ├── pages/         # Telas
        └── components/    # Pedaços reutilizáveis das telas
```

## API

Todas as rotas, exceto `/api/auth/*`, exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
| ------ | ---- | --------- |
| POST | `/api/auth/register` | `{ name, email, password }` → `{ id, message }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/api/categories` | Lista as categorias (receita e despesa) |
| GET | `/api/transactions?month=MM&year=YYYY` | Lançamentos do mês, mais recentes primeiro |
| POST | `/api/transactions` | `{ type, amount, category_id, description, date }` |
| PUT | `/api/transactions/:id` | Atualiza (pode mandar só os campos alterados) |
| DELETE | `/api/transactions/:id` | Exclui |
| GET | `/api/dashboard/summary?month=MM&year=YYYY` | `{ totalIncome, totalExpense, balance, expensesByCategory }` |

## Decisões que vão além do TDD

- **Valores guardados em centavos** (inteiro) no banco. Números decimais no computador
  têm erros de arredondamento (`0.1 + 0.2 = 0.30000000000000004`); com centavos a conta
  sempre fecha. A API continua recebendo e devolvendo reais.
- **Rota `GET /api/categories`**: o formulário precisa saber quais categorias existem.
  As categorias padrão são criadas automaticamente na primeira execução.
- **Categoria precisa combinar com o tipo**: não dá para lançar uma despesa como "Salário".
- **`expensesByCategory` no resumo**: atende o item "distribuição dos gastos" do PRD.
