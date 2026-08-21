# Artificial Studio

![CI](https://github.com/mateus9785/artificialstudio/actions/workflows/ci.yml/badge.svg)

The marketing site and admin backend for an AI/web-dev agency: a public
landing page (blog, services, WhatsApp CTA) plus an `/admin` SPA that runs
the actual business — an AI sales rep that answers WhatsApp leads, a
prospecting pipeline that scouts and qualifies local businesses, a kanban for
turning closed quotes into delivered work, and a financeiro ledger.

The AI isn't a chat widget bolted on top — it's the operator. Every WhatsApp
message from a qualified lead gets a suggested reply drafted by Claude Code
running as a subprocess, which a human approves, edits, regenerates, or
discards. Nothing is ever sent without that click.

## Stack

**Backend** (`backend/`)
- **Node.js 24** + **Express 4** + **TypeScript** (`strict: true`) — runs
  `.ts` directly via Node's native type-stripping, **no build step, no
  bundler, no `ts-node`/`tsx`**; `tsc --noEmit` is CI's type-checker only
- **MySQL** via the raw **mysql2** driver, no ORM
- **JWT** auth (`jsonwebtoken`), `bcryptjs`, `express-rate-limit`
- **Baileys** — WhatsApp Web protocol client (no paid Business API)
- **Claude Code CLI**, invoked as a subprocess (no Anthropic API key) —
  powers both the site's chat and the WhatsApp sales rep
- **Vitest** — unit + integration tests
- **oxlint** — lint (fast, non-type-aware by design; `tsc --strict` already
  does type-checking, so a type-aware linter would just duplicate that signal)

**Frontend** (`frontend/`)
- **React 19** + **Vite 8** + **TypeScript** (`strict: true`)
- **React Router 7**, **Tailwind CSS 4**
- **Vitest** + **React Testing Library**
- **oxlint**

## Architecture

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
  admin/                   /admin SPA — Login, Posts, ConversasIA, WhatsApp,
                            ProducaoAutomatizada (kanban), Financeiro
  lib/                     api client, auth/session storage, analytics
```

`backend/` and `frontend/` are two independent npm projects — their own
`package.json`/lockfile each, no workspace, no shared code. `docker-compose.yml`
at the repo root only provisions MySQL; both apps run via `npm run dev`
directly on the host, no app container.

**Prompts are versioned content, not code.** `backend/ai-atendimento/`
(`CLAUDE.md` = persona, `ROTEIRO.md` = sales script/funnel, `PRECOS.md` =
pricing, `EXEMPLOS.md` = few-shot examples) is `.md`, edited without touching
TypeScript. A SHA-256 fingerprint of these files' mtimes tags every AI
response and every eval run, so a prompt edit is traceable to which
conversations it affected. There are **two** independent fingerprint
functions — `promptFingerprint()` for the site chat and
`sellerFingerprint()` for the WhatsApp seller — because they watch different
file sets (`waSellerRunner.ts` also has its own `ai-atendimento/vendedor-wa/`).

**Worker-in-a-DB-queue, not a job library.** `aiChatWorker.ts` and
`waSuggestionWorker.ts` each poll their own table (`chat_ai_jobs`,
`whatsapp_ai_suggestions`) for `pending` rows, claim one, run the Claude Code
subprocess, and write the result back — no Redis/BullMQ, no separate worker
process. State survives a restart because it's rows in MySQL, not memory;
`claudeGate.ts`'s in-process FIFO queue (`MAX_CONCURRENT=1`,
`MAX_QUEUE_DEPTH=8`) caps how many subprocesses run at once regardless of how
many rows are `pending`.

## Technical Decisions

- **No build step on the backend.** Node 24 runs `.ts` files directly
  (type-stripping is on by default) — `dev`/`start` call `node src/index.ts`
  unmodified, `tsc --noEmit` only type-checks in CI. The one real cost: Node's
  ESM resolver does **not** substitute `.js` → `.ts` in import specifiers the
  way `tsc`/bundlers do, so every file that migrated to TypeScript needed its
  importers' specifiers updated in the same change. Vite's bundler resolves
  the frontend's extensionless imports on its own — no equivalent problem
  there.
- **`oxlint` on both sides, not ESLint on one and oxlint on the other.** The
  frontend already used oxlint; extending the same tool to the backend beats
  introducing a second linter just to match a different repo's template.
  Neither linter does type-aware checking — `tsc --strict` already covers
  that ground, so a type-aware linter would be duplicate signal for the
  runtime cost.
- **Row/response types calibrated to fields actually read, not full schema
  mirrors.** `schema.sql` has 24 tables; the TypeScript interfaces model
  what each query selects and what each frontend screen consumes, not every
  column that exists.
- **`claude` CLI subprocess, not the Anthropic API.** No API key to manage,
  and it reuses whatever `claude` auth is already on the host. The tradeoff:
  the backend needs `claude` installed and authenticated **as the same user
  that runs it**, including in production — see Setup.
- **`whatsappClient.ts`'s session state is module-level mutable
  variables** (`socket`, `status`, `reconnectAttempts`, `qrData`), not a
  class or a store. Baileys itself is a long-lived singleton connection per
  process, so this mirrors that reality rather than fighting it — documented
  as a testability constraint (see Known limitations), not silently
  refactored mid-migration.

## Security

- **`claude --dangerously-skip-permissions` + `--disallowed-tools
  Bash,Read,Write,Edit,NotebookEdit,WebFetch,WebSearch,Glob,Grep,Task,TodoWrite`**
  on every AI subprocess call (site chat and WhatsApp seller alike). This is
  a **deliberate defense against prompt injection from the visitor's own
  messages**, not a risk left unmitigated: skipping permission prompts is
  safe specifically *because* every tool that could act on the filesystem or
  network is explicitly disallowed — an injected instruction has nothing to
  execute. Validated against 20 adversarial personas including an explicit
  prompt-injection case (`npm run test:personas:wa`).
- **Auth**: bcrypt password hashes, JWT with a scoped `audience` claim
  (tokens issued for the admin panel can't be replayed against a
  differently-scoped endpoint), a strong-password regex on account creation,
  and `express-rate-limit` on `/auth/login` (20 requests / 15 min).
- **No SQL injection surface** — every query is parameterized via mysql2;
  no string-concatenated SQL anywhere in the codebase.
- **No secrets committed** — `.env.example` in both `backend/` and
  `frontend/` ships placeholders only; real `.env` files are gitignored.

## Setup

Requires Node 22.6+, MySQL 8, and the `claude` CLI installed and
authenticated **as the same OS user that runs the backend process**
(required for both the site chat and the WhatsApp AI seller — without it,
those features fail closed and visitors fall back to a plain WhatsApp link).

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

Site at `http://localhost:5173`, admin panel at
`http://localhost:5173/admin/login`.

## Testing

```bash
cd backend && npm test    # Vitest: claudeGate concurrency, both fingerprint
                           # functions, claudeRunner retry/backoff (child_process
                           # mocked — never shells out to the real claude binary)
cd frontend && npm test   # Vitest + React Testing Library
```

CI (`.github/workflows/ci.yml`) runs two parallel jobs — `backend`
(`oxlint` → `tsc --noEmit` → `vitest`) and `frontend`
(`oxlint` → `tsc --noEmit` → `vitest` → `vite build`).

Test coverage is representative, not exhaustive: backend covers the
Claude-subprocess boundary (queueing, retry, the two fingerprint functions) —
not every route handler. Frontend covers pure utils, the `useAdminGuard`
401-handling hook, and the two components with the most real bug risk
(`Pagination`'s boundary guards, `CookieConsent`'s LGPD consent gating) — not
every screen and component under `admin/`.

`backend/scripts/test-personas.js` (10 personas, site chat) and
`test-personas-wa.js` (20 personas, WhatsApp seller) are **not** part of
this suite or the CI gate — they're LLM-as-judge eval harnesses that run
against the real `claude` CLI (real cost, real auth required) to score
prompt quality after an `ai-atendimento/` edit. Run a `baseline` before
touching a prompt and compare after, via `compare-persona-runs.js`.

## Known limitations / Roadmap

- **"Conversas IA" (the old site-chat pipeline) is dormant but still
  mounted.** The public-facing chat widget was replaced by a WhatsApp CTA
  button, but `chat.routes.ts`/`aiChatWorker.ts` are still wired up behind
  `AI_CHAT_ENABLED`, and the admin screen stays to browse historical
  conversations and as a cheap rollback path if the WhatsApp channel needs
  to be disabled.
- **`whatsappClient.ts`'s session state is module-level mutable
  variables**, not injectable — a real obstacle to unit-testing that module
  in isolation (see Technical Decisions). Not refactored here; a behavior
  change like that doesn't belong inside a type-migration pass.
- **Persona eval harnesses aren't in CI** and can't be, short of giving CI
  billed `claude` access — they're a manual quality gate for prompt changes,
  not a correctness gate for code changes.
- **`npm audit` reports 4 high-severity transitive vulnerabilities on the
  frontend** (`nanoid`, `postcss`, `react-router`) as of this pass — none
  exploitable in this app's actual usage, left for a dedicated dependency-bump
  pass rather than folded into an unrelated PR.
- Test coverage on both sides is representative, not exhaustive (see
  Testing).

## License

[MIT](./LICENSE)
