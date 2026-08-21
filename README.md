# Artificial Studio

![CI](https://github.com/mateus9785/artificialstudio/actions/workflows/ci.yml/badge.svg)

Site institucional e backend administrativo de uma agência de IA/desenvolvimento web: uma landing page pública (blog, serviços, CTA de WhatsApp) e uma SPA `/admin` que roda o negócio de fato: uma IA vendedora que responde leads no WhatsApp, um pipeline de prospecção que busca e qualifica negócios locais, um kanban para transformar orçamentos fechados em trabalho entregue, e um controle financeiro.

A IA não é um widget de chat colado por cima, ela é a operadora. Toda mensagem de WhatsApp de um lead qualificado recebe uma resposta sugerida, gerada pelo Claude Code rodando como subprocesso, que um humano aprova, edita, regenera ou descarta. Nada é enviado sem esse clique.

## Stack

**Backend** (`backend/`)
- **Node.js 24** + **Express 4** + **TypeScript** (`strict: true`): executa arquivos `.ts` diretamente via type-stripping nativo do Node, **sem build step, sem bundler, sem `ts-node`/`tsx`**; `tsc --noEmit` é usado só como type-checker no CI
- **MySQL** via o driver **mysql2** puro, sem ORM
- Autenticação via **JWT** (`jsonwebtoken`), `bcryptjs`, `express-rate-limit`
- **Baileys**: cliente do protocolo WhatsApp Web (sem a API Business paga)
- **Claude Code CLI**, invocado como subprocesso (sem chave de API da Anthropic): alimenta tanto o chat do site quanto a IA vendedora do WhatsApp
- **Vitest**: testes unitários e de integração
- **oxlint**: lint (rápido e sem type-awareness por design; `tsc --strict` já faz a checagem de tipos, então um linter type-aware duplicaria esse sinal)

**Frontend** (`frontend/`)
- **React 19** + **Vite 8** + **TypeScript** (`strict: true`)
- **React Router 7**, **Tailwind CSS 4**
- **Vitest** + **React Testing Library**
- **oxlint**

## Arquitetura

```
backend/src/
  routes/      auth · posts · chat · kanban · financeiro · whatsapp · scoutRuns
  services/    claudeRunner/claudeGate (Claude Code subprocess + queue)
               aiChatWorker / waSuggestionWorker (DB-queue workers)
               whatsappClient (Baileys session) · waSellerRunner · quoteExtractor
  db/          pool · migrate · seed · schema.sql
  middleware/  requireAdmin (JWT) · asyncHandler · upload (multer)
  ai-atendimento/   prompts as versioned content, not code (see below)

frontend/src/
  App.tsx + components/    public landing page (SEO-critical, see CLAUDE.md)
  admin/                   /admin SPA: Login, Posts, ConversasIA, WhatsApp,
                            ProducaoAutomatizada (kanban), Financeiro
  lib/                     api client, auth/session storage, analytics
```

`backend/` e `frontend/` são dois projetos npm independentes, cada um com seu próprio `package.json`/lockfile, sem workspace, sem código compartilhado. O `docker-compose.yml` na raiz do repositório só provisiona o MySQL; as duas aplicações rodam via `npm run dev` diretamente no host, sem container de aplicação.

**Prompts são conteúdo versionado, não código.** `backend/ai-atendimento/` (`CLAUDE.md` = persona, `ROTEIRO.md` = script de vendas/funil, `PRECOS.md` = preços, `EXEMPLOS.md` = exemplos few-shot) é `.md`, editado sem tocar em TypeScript. Um fingerprint SHA-256 dos mtimes desses arquivos marca cada resposta da IA e cada rodada de avaliação, então uma edição de prompt é rastreável até as conversas que ela afetou. Existem **duas** funções de fingerprint independentes, `promptFingerprint()` para o chat do site e `sellerFingerprint()` para a vendedora do WhatsApp, porque cada uma observa um conjunto diferente de arquivos (`waSellerRunner.ts` também tem seu próprio `ai-atendimento/vendedor-wa/`).

**Worker em fila no banco, não uma biblioteca de jobs.** `aiChatWorker.ts` e `waSuggestionWorker.ts` fazem polling cada um na sua própria tabela (`chat_ai_jobs`, `whatsapp_ai_suggestions`) atrás de linhas `pending`, reivindicam uma, rodam o subprocesso do Claude Code e gravam o resultado de volta, sem Redis/BullMQ, sem processo de worker separado. O estado sobrevive a um restart porque são linhas no MySQL, não memória; a fila FIFO em processo do `claudeGate.ts` (`MAX_CONCURRENT=1`, `MAX_QUEUE_DEPTH=8`) limita quantos subprocessos rodam ao mesmo tempo, independentemente de quantas linhas estejam `pending`.

## Decisões Técnicas

- **Sem build step no backend.** O Node 24 executa arquivos `.ts` diretamente (type-stripping ativado por padrão): `dev`/`start` chamam `node src/index.ts` sem modificação, e `tsc --noEmit` só faz checagem de tipos no CI. O custo real: o resolvedor ESM do Node **não** substitui `.js` por `.ts` nos specifiers de import como `tsc`/bundlers fazem, então todo arquivo migrado para TypeScript exigiu atualizar os specifiers de quem o importava, na mesma mudança. O bundler do Vite resolve os imports sem extensão do frontend sozinho, não há um problema equivalente ali.
- **`oxlint` nos dois lados, não ESLint em um e oxlint no outro.** O frontend já usava oxlint; estender a mesma ferramenta ao backend é melhor do que introduzir um segundo linter só para seguir o template de outro repositório. Nenhum dos dois linters faz checagem type-aware: `tsc --strict` já cobre isso, então um linter type-aware seria sinal duplicado pelo custo de execução.
- **Tipos de linha/resposta calibrados pelos campos realmente lidos, não espelhos completos do schema.** `schema.sql` tem 24 tabelas; as interfaces TypeScript modelam o que cada query seleciona e o que cada tela do frontend consome, não toda coluna que existe.
- **Subprocesso da CLI `claude`, não a API da Anthropic.** Não há chave de API para gerenciar, e reaproveita a autenticação do `claude` que já existe no host. O tradeoff: o backend precisa do `claude` instalado e autenticado **como o mesmo usuário que o executa**, inclusive em produção (ver Configuração).
- **O estado de sessão do `whatsappClient.ts` é feito de variáveis mutáveis no nível do módulo** (`socket`, `status`, `reconnectAttempts`, `qrData`), não uma classe ou uma store. O próprio Baileys é uma conexão singleton de vida longa por processo, então isso reflete essa realidade em vez de lutar contra ela; está documentado como uma limitação de testabilidade (ver Limitações conhecidas), e não foi silenciosamente refatorado no meio da migração.

## Segurança

- **`claude --dangerously-skip-permissions` + `--disallowed-tools Bash,Read,Write,Edit,NotebookEdit,WebFetch,WebSearch,Glob,Grep,Task,TodoWrite`** em toda chamada de subprocesso de IA (tanto no chat do site quanto na vendedora do WhatsApp). Isso é uma **defesa deliberada contra prompt injection vinda das próprias mensagens do visitante**, não um risco deixado sem mitigação: pular os prompts de permissão é seguro justamente *porque* toda ferramenta capaz de agir no sistema de arquivos ou na rede está explicitamente desabilitada, uma instrução injetada não tem o que executar. Validado contra 20 personas adversariais, incluindo um caso explícito de prompt injection (`npm run test:personas:wa`).
- **Autenticação**: hashes de senha com bcrypt, JWT com claim `audience` restrita (tokens emitidos para o painel admin não podem ser reaplicados em um endpoint com escopo diferente), regex de senha forte na criação de conta, e `express-rate-limit` em `/auth/login` (20 requisições / 15 min).
- **Sem superfície de SQL injection**: toda query é parametrizada via mysql2; não há SQL concatenado por string em nenhum lugar do código.
- **Nenhum segredo commitado**: `.env.example` em `backend/` e `frontend/` traz só placeholders; os arquivos `.env` reais estão no gitignore.

## Configuração

Requer Node 22.6+, MySQL 8, e a CLI `claude` instalada e autenticada **como o mesmo usuário do SO que executa o processo do backend** (necessário tanto para o chat do site quanto para a vendedora de IA do WhatsApp; sem isso, esses recursos falham de forma segura e os visitantes caem de volta para um link comum de WhatsApp).

```bash
# MySQL (docker-compose.yml at the repo root, MySQL 8.4 on port 3307)
docker compose up -d

# Backend
cd backend
npm ci
cp .env.example .env    # fill in JWT_SECRET, ADMIN_SEED_USERNAME/PASSWORD at minimum
npm run migrate         # applies schema.sql
npm run seed            # creates the admin user + example blog posts
npm run dev             # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm ci
cp .env.example .env    # VITE_GA4_ID / VITE_CLARITY_ID / VITE_PIXEL_ID, once you have real ids
npm run dev             # http://localhost:5173
```

Site em `http://localhost:5173`, painel admin em `http://localhost:5173/admin/login`.

## Testes

```bash
cd backend && npm test    # Vitest: claudeGate concurrency, both fingerprint
                           # functions, claudeRunner retry/backoff (child_process
                           # mocked, never shells out to the real claude binary)
cd frontend && npm test   # Vitest + React Testing Library
```

O CI (`.github/workflows/ci.yml`) roda dois jobs em paralelo: `backend` (`oxlint` → `tsc --noEmit` → `vitest`) e `frontend` (`oxlint` → `tsc --noEmit` → `vitest` → `vite build`).

A cobertura de testes é representativa, não exaustiva: o backend cobre a fronteira do subprocesso do Claude (enfileiramento, retry, as duas funções de fingerprint), não cada route handler. O frontend cobre utils puros, o hook `useAdminGuard` de tratamento de 401, e os dois componentes com maior risco real de bug (as guardas de limite do `Pagination`, o controle de consentimento LGPD do `CookieConsent`), não cada tela e componente dentro de `admin/`.

`backend/scripts/test-personas.js` (10 personas, chat do site) e `test-personas-wa.js` (20 personas, vendedora do WhatsApp) **não** fazem parte dessa suíte nem do gate de CI: são harnesses de avaliação do tipo LLM-as-judge que rodam contra a CLI `claude` real (custo real, autenticação real necessária) para pontuar a qualidade do prompt depois de uma edição em `ai-atendimento/`. Rode um `baseline` antes de mexer em um prompt e compare depois, via `compare-persona-runs.js`.

## Limitações conhecidas / Próximos passos

- **"Conversas IA" (o antigo pipeline de chat do site) está dormente mas ainda montado.** O widget de chat público foi substituído por um botão de CTA de WhatsApp, mas `chat.routes.ts`/`aiChatWorker.ts` continuam ligados atrás de `AI_CHAT_ENABLED`, e a tela do admin permanece para navegar conversas históricas e como um caminho de rollback barato caso o canal de WhatsApp precise ser desativado.
- **O estado de sessão do `whatsappClient.ts` é feito de variáveis mutáveis no nível do módulo**, não injetável, o que é um obstáculo real para testar esse módulo isoladamente (ver Decisões Técnicas). Não foi refatorado aqui; uma mudança de comportamento dessas não cabe dentro de uma etapa de migração de tipos.
- **Os harnesses de avaliação de personas não estão no CI** e não podem estar, a menos que o CI ganhe acesso pago ao `claude`; eles são um gate manual de qualidade para mudanças de prompt, não um gate de correção para mudanças de código.
- **`npm audit` reporta 4 vulnerabilidades transitivas de alta severidade no frontend** (`nanoid`, `postcss`, `react-router`) no momento desta revisão; nenhuma explorável no uso real desta aplicação, deixadas para uma atualização de dependências dedicada em vez de misturadas em um PR não relacionado.
- A cobertura de testes dos dois lados é representativa, não exaustiva (ver Testes).

## Licença

[MIT](./LICENSE)
