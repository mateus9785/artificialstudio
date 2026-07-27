# Artificial Studio

Monorepo com `backend/` (Express + MySQL) e `frontend/` (React + Vite + Tailwind), incluindo a landing pública e o painel `/admin`.

## Prioridade: SEO

SEO é prioridade máxima no site público (`frontend/src/App.jsx` e componentes de `frontend/src/components/`). Qualquer mudança nessas áreas deve preservar ou melhorar os três pilares abaixo — não regredir por conveniência de implementação.

### 1. HTML Semântico
- Use as tags corretamente: **um único `<h1>`** por página (título principal), `<h2>` para subtítulos de seção, `<h3>`/`<h4>` em sequência sem pular níveis, `<p>` para parágrafos.
- Toda `<img>` precisa de `alt` descritivo. Prefira `<section>`, `<nav>`, `<footer>`, `<article>` a `<div>` genérico quando o elemento representa essa função.
- Isso ajuda os robôs do Google a entender a hierarquia do conteúdo.

### 2. Velocidade de Carregamento
- Meta: carregar em **menos de 2 segundos**.
- Imagens: sempre compactar antes de subir para `frontend/public/`. Preferir `.webp` quando possível; nunca subir PNG/JPEG de câmera/design sem otimizar primeiro (já aconteceu de um logo de 32px em tela ir para produção com 650KB — checar sempre o tamanho do arquivo final).
- Evitar scripts de terceiros bloqueando a renderização inicial — scripts de analytics/tracking devem carregar de forma assíncrona e só após consentimento (ver `frontend/src/lib/analytics.js`).
- Rotas que não são a landing pública (`/admin`) devem ficar em chunks separados via `React.lazy` (ver `frontend/src/main.jsx`) para não inflar o bundle inicial da página que importa para SEO.

### 3. Mobile-First (Responsividade)
- Mais de 60% das buscas vêm do celular — o Google penaliza sites que não funcionam bem em telas pequenas.
- Testar todo componente novo em viewport mobile antes de considerar pronto.
- Usar as classes responsivas do Tailwind (`sm:`, `md:`, `lg:`) partindo do layout mobile como base, não o contrário.

## Domínio de produção

`https://artificialstudio.com.br` — usado em canonical, Open Graph, `robots.txt` e `sitemap.xml` (todos em `frontend/index.html` e `frontend/public/`). Atualizar esses arquivos se o domínio mudar.
