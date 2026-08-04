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
- **Conversas IA**: tela do antigo chat do site (pipeline hoje **dormant** — o widget foi trocado
  pelo botão de WhatsApp na landing). Fica no ar para consultar o histórico comercial e como
  rollback barato.
- **WhatsApp**: o canal de venda ativa. Mostra **só as conversas de leads do pegasus-scout** —
  visitantes do site (botão flutuante) e contatos pessoais você atende direto no aplicativo, sem
  passar pelo painel nem pela IA. Nas conversas de lead entra a **IA vendedora**: toda mensagem
  recebida (em conversa com "IA on") gera uma **sugestão de resposta** que você aprova, edita,
  regenera ou descarta — **nada é enviado sem o seu clique**.
  O painel lateral mostra os dados que a IA coleta durante a conversa (nome, empresa, contato,
  requisitos, estágio) e, quando o número é lead do scout, os dados de prospecção. A lateral direita
  lista os leads do [pegasus-scout](../pegasus-scout); o botão "iniciar conversa" enfileira uma
  **abordagem fria personalizada** gerada pela IA com os dados do lead (o gancho do brief fica de
  rascunho enquanto ela não chega). Quando uma sugestão aprovada confirma orçamento, o card é criado
  em **Produção Automatizada**. Ver `backend/src/services/waSuggestionWorker.js` e
  `backend/src/routes/whatsapp.routes.js`.

## IA vendedora (WhatsApp)

As regras do modo vendedor ficam em `backend/ai-atendimento/vendedor-wa/` (`CLAUDE.md` = persona e
técnicas de venda, `ROTEIRO.md` = funil + abordagem fria + follow-up, `EXEMPLOS.md` = few-shot de
mensagens boas e ruins). A tabela de preços é a mesma do chat do site: `backend/ai-atendimento/PRECOS.md`.
Tudo é conteúdo versionado, editável sem mexer em código — o fingerprint dos arquivos etiqueta cada
sugestão e cada rodada de testes, para comparar versões de prompt.

O backend chama o CLI `claude` como subprocesso (sem API paga), então **o `claude` precisa estar
instalado e autenticado no mesmo usuário que roda o backend** — inclusive no servidor. Para desligar
a geração de sugestões (e o chat do site): `AI_CHAT_ENABLED=false`. Para desligar só numa conversa
(ex.: contato pessoal), use o botão "IA on/off" no cabeçalho da conversa.

Teste do vendedor com 12 personas (abordagem fria, SPIN, objeções, opt-out, injection, orçamento):

```
cd backend
npm run test:personas:wa -- baseline    # todas, etiquetadas como "baseline"
npm run test:personas:wa -- 3 7 v2      # só as personas 3 e 7, etiqueta "v2"
node scripts/compare-persona-runs.js tests/personas-wa/results-A.json tests/personas-wa/results-B.json
```

Cada run grava JSON com notas de um LLM-judge (rubrica por persona) + violações verificadas por
código, e transcritos legíveis em `backend/tests/personas-wa/`. Rode um `baseline` antes de editar os
prompts e compare depois — é assim que se mede se a mudança melhorou o robô.

O harness antigo do chat do site continua disponível: `npm run test:personas` (10 personas, exige o
backend no ar com `AI_CHAT_ENABLED` ligado).

## Rastreamento (Backstage)

O site carrega GA4, Microsoft Clarity e Meta Pixel de forma invisível, mas só depois que o visitante
aceita o banner de cookies (LGPD). Os IDs ficam em `VITE_GA4_ID`, `VITE_CLARITY_ID` e `VITE_PIXEL_ID`.

---

Template original: React + Vite com Oxlint. Veja [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react).
