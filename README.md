# Artificial Studio Landing

Landing page + backend (Node/Express/MySQL) com painel administrativo em `/admin`.

## Como rodar

1. Suba o MySQL local:
   ```
   docker compose up -d
   ```
   (se seu usuário não estiver no grupo `docker`, rode com `sudo` ou adicione o usuário ao grupo)

2. Configure e rode o backend:
   ```
   cd backend
   cp .env.example .env   # ajuste JWT_SECRET, ADMIN_SEED_USERNAME/PASSWORD se quiser
   npm install
   npm run migrate        # cria as tabelas
   npm run seed           # cria o admin inicial e os posts de exemplo
   npm run dev            # sobe a API em http://localhost:4000
   ```

3. Configure e rode o frontend (em outro terminal):
   ```
   cd frontend
   cp .env.example .env   # ajuste VITE_GA4_ID / VITE_CLARITY_ID / VITE_PIXEL_ID quando tiver os IDs
   npm install
   npm run dev
   ```

4. Acesse `http://localhost:5173` para o site e `http://localhost:5173/admin/login` para o painel
   (login com as credenciais definidas em `ADMIN_SEED_USERNAME` / `ADMIN_SEED_PASSWORD`).

## O que tem no painel `/admin`

- **Blog**: criar, editar e excluir os posts exibidos na landing page.
- **Analytics**: pageviews, sessões e consentimento LGPD coletados pelo próprio backend (dado próprio,
  independente dos dashboards do GA4/Clarity/Meta, que continuam disponíveis nas respectivas plataformas).
- **Conversas IA**: o chat do site é atendido por uma IA comercial que levanta os requisitos do
  projeto e fecha um orçamento. Quando o cliente confirma, um card é criado automaticamente em
  **Produção Automatizada** (em "Para Fazer", sem executar nada sozinho). Nesta tela você lê a
  conversa, vê o orçamento extraído, abre o card gerado e pode pausar a IA para responder você mesmo.
- **WhatsApp**: conversas do número conectado via WhatsApp Web (Baileys). A lateral direita lista os
  leads encontrados pelo [pegasus-scout](../pegasus-scout) (robô de prospecção que roda **local**, num
  worker controlado por esta tela — mesmo padrão do `claude-kanban`), com um formulário pra escolher
  nicho/cidade/UF e mandar rodar, e um botão por lead pra abrir a conversa com um rascunho de abordagem
  pronto (nunca envia nada sozinho — você revisa e clica Enviar). Ver
  `backend/src/routes/scoutRuns.routes.js` e `pegasus-scout/README.md` (seção "Controle remoto").

## Atendimento com IA (chat do site)

As regras, o funil e a tabela de preços do robô ficam em `backend/ai-atendimento/`
(`CLAUDE.md`, `ROTEIRO.md`, `PRECOS.md`) — é conteúdo versionado, editável sem mexer em código.
Editar qualquer um dos três descarta as sessões em andamento para que a mudança valha na hora.

O backend chama o CLI `claude` como subprocesso (mesmo mecanismo do `chatbot_7m`, sem API paga), então
**o `claude` precisa estar instalado e autenticado no mesmo usuário que roda o backend** — inclusive
no servidor. Sem ele, o visitante recebe uma mensagem de fallback com o WhatsApp em vez de silêncio.
Para desligar o atendimento automático: `AI_CHAT_ENABLED=false`.

Teste do atendimento ponta a ponta com 10 personas:

```
cd backend
npm run test:personas          # todas
npm run test:personas -- 3 7   # só as personas 3 e 7
```

Os transcritos saem em `backend/tests/personas/` e o resumo em `backend/tests/relatorio-<data>.md`.

## Rastreamento (Backstage)

O site carrega GA4, Microsoft Clarity e Meta Pixel de forma invisível, mas só depois que o visitante
aceita o banner de cookies (LGPD). Os IDs ficam em `VITE_GA4_ID`, `VITE_CLARITY_ID` e `VITE_PIXEL_ID`.

---

Template original: React + Vite com Oxlint. Veja [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react).
