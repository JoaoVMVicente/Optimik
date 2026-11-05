# Optimik — Documento de Requisitos de Produto (PRD)

**Versão 2.0** · Time Sheet com transparência entre gestão, cliente e desenvolvedor
**Substitui:** v1 (organizador financeiro pessoal), arquivada em [`v1-financas/`](v1-financas/)

---

## 1. Visão geral

| | |
|---|---|
| **Produto** | Optimik |
| **Problema** | Horas de trabalho são registradas em planilhas soltas ou de memória. O desenvolvedor esquece de anotar, o gestor não sabe quanto do orçamento já foi consumido e o cliente recebe uma fatura sem entender de onde vieram aquelas horas, o que gera desconfiança e retrabalho. |
| **Proposta de valor** | Um time sheet que registra as horas **no momento em que o trabalho acontece** (cronômetro por projeto) e cria um **canal único** entre desenvolvedor, gestor e cliente: cada hora lançada pode ser revisada, comentada, aprovada ou contestada, com histórico completo. |
| **Objetivo do MVP** | Validar o ciclo completo: **dev registra → gestor aprova → cliente aprova → gestor fatura**, com comunicação e histórico em cada etapa. |

### Por que mudamos de direção
Organizadores de finanças pessoais já existem em abundância. Ferramentas de time sheet que tratem a
**comunicação entre as três partes** (e não só o registro de horas) são escassas, principalmente
para equipes pequenas e freelancers no Brasil.

---

## 2. Personas

| Persona | Quem é | O que precisa |
|---|---|---|
| **Desenvolvedor** | Freelancer ou membro de uma equipe que trabalha por hora em projetos de clientes. | Registrar horas sem esforço, sem precisar lembrar no fim do dia. Saber se suas horas foram aceitas e por quê. |
| **Gestor** | Dono da empresa/equipe ou o próprio freelancer na função administrativa. | Cadastrar clientes e projetos, revisar horas antes do cliente ver, acompanhar orçamento e faturamento. |
| **Cliente** | Quem contrata e paga pelo projeto. | Ver com clareza onde as horas foram gastas, questionar o que não entender e aprovar antes de pagar. |

> Um freelancer solo é **gestor e desenvolvedor ao mesmo tempo**: o gestor também pode lançar horas.

---

## 3. Escopo do MVP

### 3.1 Contas, organizações e papéis
- Quem cria a conta cria também uma **organização** e se torna **Gestor** dela.
- O gestor **convida** desenvolvedores e clientes gerando um **link de convite** (copiável). Quem abre o link define nome e senha.
- Cada usuário tem um papel: `GESTOR`, `DESENVOLVEDOR` ou `CLIENTE`. Cada cliente-usuário fica vinculado a um cliente cadastrado.

### 3.2 Clientes e projetos (Gestor)
- Cadastro de **clientes** (nome, e-mail de contato).
- Cadastro de **projetos**: cliente, nome, **valor da hora**, **horas previstas** (orçamento, opcional), status (ativo/arquivado).
- Alocação de **desenvolvedores** em cada projeto.
- Lista de **categorias de tarefa** (padrão: Backend, Frontend, Banco de Dados, Documentação, Reunião; o gestor pode editar).

### 3.3 Registro de horas (Desenvolvedor)
- **Início do dia guiado:** ao abrir o Optimik, a primeira pergunta é *"Em qual projeto você vai trabalhar?"*. Ao escolher, o **cronômetro inicia**.
- **Abrir junto com o computador:** o Optimik pode ser instalado como aplicativo (PWA) e configurado para abrir automaticamente quando o usuário entra no Windows.
- **Cronômetro:** iniciar, pausar/parar e **trocar de projeto** (troca encerra o lançamento atual e inicia outro).
- **Lançamento manual:** para quando o dev esqueceu de ligar o cronômetro (data, início, fim, projeto, categoria, descrição).
- **Proteção contra esquecimento:** se o cronômetro estiver rodando há mais de 10 horas, o app pergunta, ao ser aberto, qual foi o horário real de término.
- O dev revisa seus lançamentos e os **envia para aprovação** (individualmente ou em lote, ex.: "enviar a semana").

### 3.4 Fluxo de aprovação (duas etapas)

```
 RASCUNHO ──enviar──▶ ENVIADO ──gestor aprova──▶ APROVADO_GESTOR ──cliente aprova──▶ APROVADO_CLIENTE ──gestor fatura──▶ FATURADO
    ▲                    │                              │
    │              gestor rejeita                 cliente rejeita
    │              (motivo obrigatório)           (motivo obrigatório)
    └──── REJEITADO ◀────┴──────────────────────────────┘
          (dev corrige e reenvia)
```

- Rejeição **sempre exige motivo**, que fica visível para o dev.
- Aprovação e rejeição podem ser feitas **em lote**.
- Lançamentos aprovados ficam **bloqueados** para edição.

### 3.5 Comunicação e transparência
- **Comentários** em cada lançamento (conversa entre as três partes, ex.: *"por que essa tarefa levou 6h?"*).
- **Notificações no app** (sininho): horas aguardando aprovação, lançamento rejeitado, novo comentário, horas aprovadas pelo cliente.
- **Histórico de alterações** de cada lançamento: quem criou, editou, enviou, aprovou, rejeitou ou comentou, e quando. O histórico **não pode ser apagado**.

### 3.6 Painéis e relatórios
- **Desenvolvedor:** horas hoje/semana/mês, lançamentos por status, rejeições pendentes.
- **Gestor:** horas lançadas, **valor faturado/a faturar**, **valor hora médio**, progresso de horas vs. previsto por projeto, distribuição por categoria, fila de aprovação.
- **Cliente:** horas e valores aprovados dos seus projetos, distribuição por categoria, fila de aprovação.
- **Exportação CSV** dos lançamentos filtrados (para enviar junto com a fatura).

---

## 4. Histórias de usuário e critérios de aceite

| ID | História | Critérios de aceite |
|---|---|---|
| **US01** | Como **gestor**, quero criar minha conta e organização, para começar a cadastrar projetos. | 1. E-mail único no sistema. 2. Senha com hash (bcrypt). 3. Quem cria vira `GESTOR` da organização. |
| **US02** | Como **gestor**, quero convidar devs e clientes por link, para que entrem na minha organização. | 1. Link expira em 7 dias e só pode ser usado uma vez. 2. Convite de cliente exige vincular a um cliente cadastrado. 3. O papel é definido pelo convite, não por quem aceita. |
| **US03** | Como **gestor**, quero cadastrar clientes e projetos com valor da hora e horas previstas, para controlar o orçamento. | 1. Valor da hora > 0. 2. Projeto pertence a um cliente. 3. Só devs alocados podem lançar horas no projeto. |
| **US04** | Como **desenvolvedor**, quero que o Optimik pergunte em qual projeto vou trabalhar ao abrir, para o cronômetro começar sem esforço. | 1. Se não houver cronômetro rodando, a tela inicial é a escolha de projeto. 2. Só aparecem projetos ativos onde estou alocado. 3. Ao escolher, o cronômetro inicia na hora. |
| **US05** | Como **desenvolvedor**, quero parar ou trocar de projeto, para que cada hora vá para o projeto certo. | 1. Só um cronômetro rodando por usuário. 2. Trocar de projeto encerra o lançamento atual e inicia outro. 3. Ao parar, posso informar categoria e descrição. |
| **US06** | Como **desenvolvedor**, quero lançar horas manualmente, para corrigir quando esqueci o cronômetro. | 1. Fim maior que início. 2. Nenhum lançamento acima de 12h. 3. Não pode sobrepor outro lançamento meu. 4. Não pode ser no futuro. |
| **US07** | Como **desenvolvedor**, quero enviar minhas horas para aprovação, para que sejam revisadas. | 1. Só lançamentos em `RASCUNHO` ou `REJEITADO` podem ser enviados. 2. Envio em lote. 3. Após enviar, não posso editar. |
| **US08** | Como **gestor**, quero aprovar ou rejeitar horas enviadas, para garantir a qualidade antes de o cliente ver. | 1. Rejeitar exige motivo. 2. Aprovar/rejeitar em lote. 3. O dev é notificado. |
| **US09** | Como **cliente**, quero ver e aprovar as horas dos meus projetos, para pagar só pelo que entendi e concordei. | 1. O cliente só vê projetos do próprio cliente. 2. Só vê lançamentos já aprovados pelo gestor. 3. Rejeitar exige motivo; gestor e dev são notificados. |
| **US10** | Como **qualquer participante**, quero comentar em um lançamento, para tirar dúvidas sem sair da ferramenta. | 1. Só quem pode ver o lançamento pode comentar. 2. Os demais participantes são notificados. 3. Comentários não podem ser apagados (podem ser editados por 5 min). |
| **US11** | Como **qualquer participante**, quero ver o histórico de um lançamento, para saber quem fez o quê e quando. | 1. Toda mudança de status, edição e comentário gera um registro. 2. Registro mostra autor, data/hora, ação e motivo (se houver). 3. Histórico é somente leitura. |
| **US12** | Como **gestor**, quero um painel com horas, valor faturado e progresso por projeto, para acompanhar o negócio. | 1. Filtro por mês/ano e por projeto. 2. Valor = horas aprovadas × valor da hora **vigente no lançamento**. 3. Alerta visual quando o projeto passar de 80% e de 100% das horas previstas. |
| **US13** | Como **gestor**, quero marcar horas como faturadas e exportar CSV, para emitir a cobrança. | 1. Só lançamentos `APROVADO_CLIENTE` podem ser faturados. 2. CSV com data, dev, projeto, categoria, descrição, duração, valor. |

---

## 5. Fora do escopo do MVP

- Pagamento online, emissão de nota fiscal ou integração bancária.
- **Monitoramento de tela, teclado, mouse ou capturas de tela.** O Optimik registra apenas o tempo que o próprio usuário inicia, de forma transparente (decisão de produto e de LGPD).
- Detecção automática de inatividade (planejada para a versão desktop, fase 2).
- Aplicativo mobile nativo e notificações por e-mail/WhatsApp.
- Integrações (Jira, GitHub, Trello), múltiplas moedas e múltiplas organizações por usuário.

---

## 6. Requisitos não funcionais

- **Privacidade (LGPD):** o desenvolvedor vê tudo o que é registrado sobre ele; nada é coletado em segundo plano.
- **Segurança:** isolamento total entre organizações; permissões por papel verificadas no backend; cliente nunca vê rascunhos nem outros clientes.
- **Integridade:** valores monetários em centavos; valor da hora "congelado" no lançamento; histórico imutável.
- **Usabilidade:** iniciar o cronômetro em **até 2 cliques** a partir da abertura do app; interface responsiva (mobile-first).
- **Desempenho:** respostas da API abaixo de 500 ms para listagens do mês.
- **Fuso horário:** horários armazenados em UTC e exibidos no fuso do usuário (padrão `America/Sao_Paulo`).

---

## 7. Como saberemos que o MVP funcionou

- Um freelancer consegue completar o ciclo **lançar → aprovar → aprovar (cliente) → faturar** sozinho com um cliente real.
- 80% das horas lançadas vêm do **cronômetro**, e não de lançamento manual (sinal de que o "início guiado" funciona).
- Rejeições e dúvidas são resolvidas **dentro** da ferramenta (comentários), sem precisar de WhatsApp/e-mail.

---

## 8. Decisões em aberto

| # | Pergunta | Proposta atual |
|---|---|---|
| D1 | Como o cliente acessa? | **Login próprio** via convite (assumido; confirmar). |
| D2 | O desenvolvedor pode ver o valor da hora e quanto suas horas geram? | Não, por padrão; o gestor pode liberar por projeto. |
| D3 | O cliente aprova lançamento por lançamento ou por período (semana/mês)? | Por lançamento, com aprovação em lote para agilizar. |
