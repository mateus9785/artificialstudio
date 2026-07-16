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
- **Conversas**: histórico do chat do site — as respostas são enviadas manualmente por aqui (sem IA).

## Rastreamento (Backstage)

O site carrega GA4, Microsoft Clarity e Meta Pixel de forma invisível, mas só depois que o visitante
aceita o banner de cookies (LGPD). Os IDs ficam em `VITE_GA4_ID`, `VITE_CLARITY_ID` e `VITE_PIXEL_ID`.

---

Template original: React + Vite com Oxlint. Veja [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react).
