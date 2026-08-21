import 'dotenv/config'
import { pool } from './pool.ts'
import { ensureUniqueSlug } from '../utils/slug.ts'

interface SeedBlogPost {
  title: string
  excerpt: string
  tag: string
  tagColor: string
  trending: boolean
  publishedAt: string
  content: string
}

const POSTS: SeedBlogPost[] = [
  {
    title: 'Quanto Custa Desenvolver um Aplicativo ou Sistema Web? Entenda os Custos Reais e Invisíveis',
    excerpt:
      'Do MVP a plataformas enterprise: entenda os custos visíveis e invisíveis de um app ou sistema web e veja como a IA está reduzindo preços e prazos no Brasil.',
    tag: 'Desenvolvimento de Software',
    tagColor: '#34d399',
    trending: false,
    publishedAt: '2026-05-01',
    content: `Transformar uma ideia inovadora em um aplicativo de sucesso ou em um sistema web robusto é o sonho de muitas empresas e empreendedores. No entanto, uma das primeiras dúvidas que surgem no caminho é: "Afinal, quanto custa desenvolver um aplicativo ou plataforma digital?"

A resposta rápida é: depende. No mercado brasileiro, os valores podem variar de R$ 15.000 para um MVP (Produto Mínimo Viável) até mais de R$ 300.000 para ecossistemas complexos.

Mas a verdadeira resposta vai muito além da cotação inicial. Existem custos ocultos, decisões técnicas e despesas recorrentes que a maioria das pessoas só descobre quando o projeto já está no ar.

Neste guia completo da Artificial Studio, vamos desmistificar os custos reais e invisíveis do desenvolvimento de software e mostrar como a Inteligência Artificial está redefinindo os preços e os prazos desse mercado.

## 1. O Que Compõe o Custo Visível do Desenvolvimento?

O custo inicial visível é a parte do orçamento que você vê na proposta comercial de uma fábrica de software. Ele é calculado com base nas horas de trabalho da equipe (UX/UI Designers, Desenvolvedores e Product Managers).

### Estimativa de valores por complexidade do projeto

- MVP ou App Enxuto — funcionalidades básicas (login, 3 a 5 telas, CRUD simples, integração básica). Investimento de R$ 15.000 a R$ 40.000, com prazo de 1 a 2 meses.
- App / Sistema Intermediário — 10 a 25 telas, painel administrativo, gateway de pagamento, múltiplos perfis. Investimento de R$ 40.000 a R$ 120.000, com prazo de 3 a 5 meses.
- Plataforma Complexa / Enterprise — alta visibilidade, infraestrutura para milhares de acessos, IA integrada, integrações legadas. Investimento a partir de R$ 120.000 (podendo passar de R$ 300.000), com prazo de 6 meses ou mais.

Nota: esses valores refletem o mercado tradicional. Na Artificial Studio, o uso de ferramentas de IA no fluxo de engenharia reduz drasticamente as horas de codificação repetitiva, otimizando o orçamento.

## 2. Os Custos Invisíveis: O Que Ninguém Te Conta na Proposta

Desenvolver o código é apenas o começo. Para manter um aplicativo ou sistema web funcionando com segurança e performance, existem custos recorrentes e operacionais que devem entrar no seu planejamento financeiro.

### 1. Infraestrutura e hospedagem cloud

Servidores como AWS, Google Cloud ou Azure não são gratuitos. O valor varia conforme o tráfego do sistema e o consumo de dados. Custo médio: de R$ 200/mês (apps iniciais) a R$ 5.000+/mês (sistemas com grande volume de dados).

### 2. Taxas das lojas de aplicativos

Para publicar seu app no celular dos usuários, as lojas cobram taxas de desenvolvedor:

- Google Play Store: taxa única de US$ 25.
- Apple App Store: anuidade de US$ 99/ano.
- Comissões em compras in-app: de 15% a 30% sobre pagamentos realizados dentro do app.

### 3. Manutenção, bugs e atualizações (15% a 20% ao ano)

Sistemas operacionais (iOS e Android) e navegadores atualizam constantemente. Se o seu app não passar por manutenção contínua, ele para de funcionar. O mercado estima que a manutenção anual custe cerca de 15% a 20% do valor inicial do desenvolvimento.

### 4. Licenças de APIs de terceiros

Seu app precisa enviar SMS de confirmação? Fazer pagamentos com cartão de crédito? Usar mapas? APIs cobram por requisição: serviços como Twilio, SendGrid, Google Maps e Stripe possuem custos por uso que crescem junto com o número de usuários do seu sistema.

## 3. Como a Inteligência Artificial Transforma o Custo de Software?

Historicamente, criar software sob medida era um privilégio de grandes corporações com orçamentos milionários. A Inteligência Artificial mudou essa regra do jogo. Na Artificial Studio, utilizamos a IA em etapas estratégicas do desenvolvimento para entregar produtos mais robustos com um custo inteligente:

- Geração e refatoração de código com IA: automação de códigos repetitivos, reduzindo o tempo de desenvolvimento em até 40%.
- Detecção automática de bugs: testes automatizados por IA identificam falhas antes do lançamento, evitando custos astronômicos de correção pós-produto no ar.
- Inclusão de recursos inteligentes nativamente: chatbots avançados, análise preditiva e automação de processos já nascem integrados ao seu produto digital.

## 4. Dicas para Não Estourar o Orçamento do Seu Projeto

- Comece com um MVP inteligente: não tente colocar 50 funcionalidades na versão 1.0. Valide a ideia principal primeiro e evolua com base nos dados dos usuários.
- Priorize arquitetura escalável: contratar soluções baratas sem estrutura pode fazer você ter que reescrever todo o código do zero quando o negócio crescer.
- Trabalhe com propostas claras: exija um escopo bem detalhado e saiba exatamente quais tecnologias serão utilizadas.

## Conclusão: Quanto Vale Tirar Sua Ideia do Papel?

O custo de um aplicativo ou sistema web depende do tamanho da sua ambição e das escolhas técnicas do projeto. No entanto, o custo real de não inovar costuma ser muito maior do que o investimento no desenvolvimento.

Se você quer entender exatamente quanto custaria o seu projeto — sem surpresas no meio do caminho e com a eficiência do desenvolvimento impulsionado por IA —, fale com a equipe da Artificial Studio e solicite uma estimativa personalizada.`,
  },
  {
    title: 'O Fim da Era dos Campos Vazios: Como as IAs de Atendimento Estão Engolindo os Formulários Estáticos',
    excerpt:
      'Formulários convencionais convertem 2-4%. IAs de qualificação chegam a 30%. Entenda a tecnologia que está mudando o jogo.',
    tag: 'Inteligência Artificial',
    tagColor: '#22d3ee',
    trending: true,
    publishedAt: '2026-06-20',
    content: `Formulários convencionais convertem míseros 2% a 4%. IAs de qualificação e atendimento inteligente já alcançam taxas de conversão de até 30%. Entenda a tecnologia que está mudando as regras do jogo e como a sua empresa pode parar de perder leads valiosos.

Imagine o seguinte cenário: um potencial cliente chega ao seu site altamente interessado no seu produto ou serviço. Ele clica em "Fale Conosco" e se depara com um formulário estático de 12 campos obrigatórios — pedindo desde o faturamento anual até o cargo exato, telefone e uma descrição detalhada da demanda.

O que acontece na maioria das vezes? Frustração e abandono. Os formulários tradicionais, que por anos foram o padrão do Inbound Marketing, estão morrendo. O motivo é simples: as pessoas não querem preencher planilhas antes mesmo de saber se você pode ajudá-las. Elas querem conversar, tirar dúvidas e obter respostas imediatas.

É aqui que entram as IAs de atendimento e qualificação, transformando interações frias em conversas dinâmicas e de alto impacto.

## O Problema Silencioso do "Preencha e Aguarde"

Os formulários tradicionais possuem taxas de conversão médias que flutuam entre 2% e 4%. Isso significa que cerca de 96% das pessoas que demonstram algum interesse ao visitar seu site vão embora sem deixar rastro. Os principais motivos para essa "morte silenciosa" de leads são:

- Fricção cognitiva: ver um bloco de campos em branco causa preguiça visual e sensação de esforço.
- Abandono de carrinho/fluxo: mais de 70% dos usuários desistem de um formulário no meio do caminho se ele parecer excessivamente longo ou invasivo.
- Tempo de resposta comercial lento: após o envio do formulário, o lead costuma esperar de 24 a 48 horas para receber um contato humano. Um lead contatado nos primeiros 5 minutos tem 21 vezes mais chances de fechar negócio do que um contatado após 30 minutos — se demorar um dia, o lead já esfriou por completo.

## Por que as IAs de Qualificação Estão Ganhando de Lavada?

As plataformas modernas de automação conversacional e as IAs generativas não servem apenas para responder perguntas frequentes (FAQs). Elas atuam como agentes ativos de vendas e qualificação de leads, operando com três grandes vantagens estruturais:

### 1. Divulgação progressiva (progressive disclosure)

Em vez de jogar 10 perguntas na tela de uma vez, a IA de qualificação adota uma conversa natural de pergunta e resposta. Perguntar o nome, depois o desafio do cliente e, aos poucos, puxar os dados de contato parece um bate-papo informal, e não um interrogatório. Isso reduz a percepção de esforço do usuário.

### 2. Lógica condicional adaptativa em tempo real

Se o visitante interage dizendo que é um profissional autônomo, a IA o direciona para um conteúdo de autoatendimento. Se o visitante informa que faturou milhões e gerencia um time de 100 pessoas, a IA imediatamente altera o tom, faz perguntas avançadas de qualificação e oferece um link integrado ao calendário do seu time de vendas de elite para agendamento instantâneo.

### 3. Integração e enriquecimento de dados

As melhores soluções de desenvolvimento de software de IA conectam esses agentes diretamente ao seu CRM (como HubSpot, Salesforce ou Pipefy). Enquanto conversa, a IA busca informações de contexto na web e enriquece o perfil do lead antes mesmo do vendedor ler a conversa.

## O Embate Direto: Formulários Estáticos vs. IA Conversacional

Para facilitar a visualização do impacto dessa transição na sua operação de marketing e vendas, veja o comparativo das principais métricas de desempenho:

- Taxa média de conversão: formulário estático de 2% a 4%, contra 15% a 30% com IA conversacional.
- Tempo médio de resposta: de 24 a 48 horas em formulários (depende de humanos), contra resposta instantânea, em menos de 5 segundos, com IA.
- Disponibilidade: formulário passivo, que aguarda preenchimento, contra IA ativa 24 horas por dia, 7 dias por semana.
- Engajamento e experiência: fricção alta e experiência estática e fria em formulários, contra uma experiência fluida, personalizada e focada em contexto com IA.
- Qualificação do lead: baseada em filtros rígidos e manuais em formulários, contra qualificação dinâmica, com base no tom, dor e perfil do cliente, com IA.
- Taxa de abandono: acima de 70% em formulários longos, reduzida drasticamente com a dinâmica de chat.

## A Tecnologia por Trás da Revolução

Esse salto de desempenho não acontece por acaso. Ele é impulsionado por avanços robustos em Processamento de Linguagem Natural (PLN) e Modelos de Linguagem de Grande Porte (LLMs).

Diferente dos chatbots antigos baseados em árvores de decisão rígidas (onde qualquer erro de digitação travava o sistema), os agentes de IA de hoje entendem nuances, gírias, erros gramaticais e a intenção real do usuário. Eles conseguem extrair dados estruturados (e-mail, tamanho da empresa, telefone) de parágrafos informais digitados de forma livre, gerando dados limpos e precisos para sua base.

## Como Implementar Essa Transformação no Seu Negócio?

Trocar um formulário tradicional por uma solução inteligente exige estratégia, tecnologia e personalização. É preciso que o robô fale o idioma da sua marca, conheça seus produtos e integre-se sem falhas aos seus sistemas internos de vendas.

Se você quer parar de perder as dezenas de leads que abandonam seu site diariamente e transformar seu funil de vendas em uma máquina ultraeficiente, conte com a Artificial Studio.

Somos especialistas em desenvolvimento de software com IA sob medida. Criamos agentes e sistemas de geração de leads com IA e automação conversacional focados em maximizar suas taxas de conversão e otimizar os processos de atendimento da sua equipe. Nossa equipe desenha pipelines inteligentes de qualificação que se integram aos seus CRMs, ERPs e ferramentas de comunicação, garantindo que sua empresa ofereça o atendimento rápido, inteligente e humanizado que o mercado atual exige.

Chega de ver potenciais clientes sumirem por causa de um formulário burocrático. Descubra como a Inteligência Artificial pode impulsionar suas conversões com as soluções da Artificial Studio.`,
  },
  {
    title: 'O Segredo do Tráfego Pago para Páginas de Alta Conversão',
    excerpt:
      'Gastar em anúncios sem uma landing page otimizada é jogar dinheiro fora. Veja o checklist que usamos antes de ligar qualquer campanha.',
    tag: 'Marketing Digital',
    tagColor: '#a855f7',
    trending: false,
    publishedAt: '2026-06-05',
    content: `Você já sentiu a frustração de ver o orçamento do seu tráfego pago escorrer pelo ralo? Você planeja a campanha, define o público ideal, cria criativos incríveis, mas, na hora de olhar o painel do gerenciador de anúncios... o custo por clique está ótimo, mas as vendas ou leads simplesmente não aparecem.

Se isso está acontecendo, a verdade é dolorosa, mas precisa ser dita: gastar em anúncios sem uma landing page otimizada é jogar dinheiro fora.

No cenário atual de marketing digital, onde a atenção do usuário dura menos de 3 segundos e os custos por clique (CPC) estão cada vez mais altos, a sua página de destino é onde o jogo é ganho ou perdido.

Na Artificial Studio, como especialistas em desenvolvimento de software com IA, nós não criamos apenas tecnologia; nós criamos sistemas focados em resultados. Por isso, desenvolvemos um checklist interno rigoroso que usamos antes de ligar qualquer campanha de tráfego pago. Abaixo, revelamos o segredo das páginas de alta conversão e como a tecnologia pode multiplicar o seu ROI (Retorno sobre o Investimento).

## Por que a Maioria das Landing Pages Falha em Converter?

O maior erro das empresas é enviar o tráfego qualificado de campanhas (como Google Ads ou Meta Ads) diretamente para a Home Page do site.

A página inicial do seu site é como um livro de "escolha sua própria aventura": ela tem menu institucional, blog, dezenas de links e informações sobre a empresa. O usuário, diante de tantas opções, simplesmente se perde e vai embora.

Uma verdadeira landing page de alta conversão precisa ter um único objetivo, uma única mensagem e remover todas as distrações do caminho do usuário.

### Landing page comum vs. landing page otimizada com IA

- Tempo de carregamento: acima de 4 segundos numa página comum (lento), contra menos de 1,5 segundo numa página otimizada (ultra veloz).
- Experiência mobile: desktop reduzido para caber na tela numa página comum, contra um layout construído com foco mobile-first numa página otimizada.
- Conteúdo e copy: genérico, o mesmo para todos, numa página comum, contra conteúdo dinâmico e personalizado por IA numa página otimizada.
- Navegação: menu completo no topo e links externos numa página comum, contra uma página sem distrações, focada em um único CTA.

## O Checklist de Alta Conversão da Artificial Studio

Antes de subir qualquer campanha de tráfego pago e inteligência artificial, passe a sua página por este crivo técnico e psicológico:

### 1. Message match (sincronia perfeita)

O seu anúncio promete uma coisa e a sua página entrega outra? Se o seu criativo no Instagram promete "Desenvolvimento de Software sob medida para Logística", a sua landing page deve começar exatamente com essa frase no cabeçalho (headline). Se o usuário clicar e cair em uma página genérica dizendo "Nós desenvolvemos sites", ele sairá em menos de dois segundos. A mensagem precisa ser um espelho do anúncio.

### 2. Performance e velocidade limítrofe (o poder do código limpo)

Cada segundo de atraso no carregamento da sua página pode reduzir suas conversões em até 7%. Na Artificial Studio, entendemos que a velocidade não é apenas um detalhe técnico, é uma métrica de negócios. Páginas lentas destroem seu orçamento porque você paga pelo clique, mas o usuário desiste antes mesmo de a página abrir. O desenvolvimento de software focado em performance garante carregamentos abaixo de 1,5 segundos.

### 3. Design mobile-first (onde 80% do seu tráfego está)

Mais de 80% do tráfego vindo de anúncios pagos vem de dispositivos móveis. Se a sua página foi desenhada no computador e apenas "espremida" para caber no celular, você está perdendo dinheiro. A experiência móvel precisa ser natural, com botões fáceis de clicar, textos legíveis e formulários simples de preencher na tela do smartphone.

### 4. Inteligência artificial e personalização dinâmica

O futuro da otimização de landing pages está na personalização em tempo real. Através do uso de Inteligência Artificial para marketing, é possível alterar dinamicamente o título, as imagens ou os benefícios da página com base no perfil de quem está clicando. Se o visitante vem de uma campanha focada em varejo, a página se adapta para mostrar cases de varejo. Se vem da indústria, a linguagem muda automaticamente.

### 5. Formulários simplificados (apenas o essencial)

Cada campo extra que você adiciona no seu formulário de contato reduz a sua taxa de conversão. Se você precisa qualificar leads profundos, nós na Artificial Studio preferimos implementar sistemas de formulários inteligentes em etapas (progressive profiling) ou agentes de conversação inteligentes (chatbots de IA) para qualificar o usuário de forma fluida e humanizada, sem barreiras de atrito.

Dica de ouro: a sua landing page deve oferecer apenas duas opções ao visitante — converter ou ir embora. Remova qualquer menu de navegação que permita que ele fuja do seu objetivo principal.

## Como a Artificial Studio Une Tecnologia de Ponta e Conversão

A maioria das agências foca apenas no design ou no gerenciamento de mídia. Na Artificial Studio, nós olhamos para a estrutura lógica da sua conversão.

Unimos a precisão do desenvolvimento de software com IA a um design focado na jornada cognitiva do usuário. Criamos sistemas web de alta performance e inteligências conversacionais que não apenas recebem o tráfego do seu Google Ads ou Meta Ads, mas o transformam em receita real.

Se você quer parar de queimar dinheiro com anúncios e transformar suas campanhas de tráfego pago em uma máquina de aquisição previsível, você precisa de tecnologia inteligente trabalhando a seu favor.`,
  },
  {
    title: 'Por Que a Velocidade do Seu Site Define o Seu Faturamento (e Como Batemos Score 98+ no PageSpeed)',
    excerpt:
      'Para cada segundo a mais de carregamento, você perde 7% de conversão. Aprenda como chegamos a scores acima de 98 no PageSpeed.',
    tag: 'Performance Web',
    tagColor: '#f59e0b',
    trending: true,
    publishedAt: '2026-05-20',
    content: `Imagine que você acabou de investir milhares de reais em campanhas de tráfego pago. O anúncio é impecável, o produto é altamente desejado e a oferta é irresistível. O usuário clica. A tela fica em branco por um, dois, três segundos... Pronto. Você acabou de perder um cliente.

No mercado digital moderno, a paciência do usuário é medida em milissegundos. Se o seu site não carrega instantaneamente, você não está apenas frustrando o seu público — você está ativamente enviando seus potenciais clientes para a concorrência e queimando o seu orçamento de marketing.

Na Artificial Studio, unimos o desenvolvimento de software de alta performance à inteligência artificial para quebrar a barreira da lentidão. Neste artigo, vamos te mostrar a matemática cruel por trás dos segundos de carregamento e revelar os bastidores técnicos de como colocamos nossos projetos com pontuações acima de 98 no Google PageSpeed Insights.

## A Matemática do Carregamento: Como 1 Segundo Drena o Seu Caixa

Muitas empresas tratam a velocidade do site como uma vaidade técnica. Mas a realidade é puramente financeira. Estudos globais de gigantes do e-commerce (como a Amazon e o Walmart) já comprovaram a correlação direta entre milissegundos e milhões de dólares.

O dado que você não pode ignorar: para cada 1 segundo a mais de carregamento, o seu site perde, em média, 7% em taxa de conversão. Para entender o impacto real disso no seu faturamento, veja a simulação abaixo, considerando um tráfego de 100 mil visitas com ticket médio de R$ 150:

- Sub 1 segundo (ideal): 3,0% de conversão, R$ 450.000 de faturamento mensal e nenhuma perda.
- 2 segundos: 2,79% de conversão (-7%), R$ 418.500 de faturamento mensal e R$ 378.000 de perda estimada por ano.
- 3 segundos: 2,58% de conversão (-14%), R$ 387.000 de faturamento mensal e R$ 756.000 de perda estimada por ano.
- 4 segundos: 2,37% de conversão (-21%), R$ 355.500 de faturamento mensal e R$ 1.134.000 de perda estimada por ano.

Se o seu site demora 4 segundos para carregar, você está deixando mais de 1 milhão de reais na mesa por ano. Além disso, o Google penaliza sites lentos nos resultados de busca orgânica (SEO) e cobra mais caro pelo clique nos anúncios do Google Ads, pois a "experiência na página de destino" é um fator crítico de qualidade.

## O Que o Google Analisa? Os Core Web Vitals

Não basta o site parecer rápido para você, no seu computador de última geração com internet de fibra óptica. O Google avalia a experiência real de usuários reais (através de conexões móveis 3G/4G e dispositivos intermediários). Para medir isso, ele utiliza os Core Web Vitals:

- Largest Contentful Paint (LCP): mede a velocidade de carregamento percebida — o tempo que leva para o maior bloco de conteúdo (geralmente a imagem principal ou o título) aparecer na tela. Meta: abaixo de 2,5 segundos.
- Interaction to Next Paint (INP): mede a interatividade do site — quanto tempo a página leva para responder ao clique de um usuário. Meta: abaixo de 200 milissegundos.
- Cumulative Layout Shift (CLS): mede a estabilidade visual, como quando um banner carrega de repente e empurra o botão em que você ia clicar. Meta: abaixo de 0,1.

## Como a Artificial Studio Atinge Scores Acima de 98 no PageSpeed Insights

Bater um score excelente no PageSpeed não acontece por acaso ou usando plugins de otimização automática de forma desordenada. Exige engenharia de software limpa, arquitetura moderna e o toque inteligente de automação e IA que desenvolvemos aqui na Artificial Studio. Aqui estão as principais práticas que aplicamos em nossos projetos:

### 1. Arquiteturas modernas e renderização híbrida

Esqueça plataformas pesadas e legadas que processam tudo no servidor a cada clique. Nós utilizamos estruturas modernas com renderização híbrida (como Server-Side Rendering - SSR e Static Site Generation - SSG). Isso significa que as páginas principais do seu site são pré-renderizadas e entregues ao usuário instantaneamente, reduzindo o tempo de resposta do servidor (TTFB) a quase zero.

### 2. Otimização inteligente de ativos (imagens e vídeos)

Imagens gigantes são as maiores vilãs da performance. Nosso fluxo de desenvolvimento inclui:

- Conversão automática de imagens para formatos de última geração como WebP e AVIF, que reduzem o tamanho do arquivo em até 80% sem perder qualidade.
- Responsive Images: entrega do tamanho exato da imagem que a tela do usuário precisa — um celular não precisa carregar uma imagem feita para uma tela 4K.
- Lazy Loading nativo: imagens que estão no final da página só são carregadas quando o usuário rola a tela até elas.

### 3. Eliminação de JavaScript inútil (code splitting)

Muitos sites carregam scripts de páginas inteiras que o usuário nem acessou. Nós aplicamos o Code Splitting (divisão de código): o navegador só baixa o código estritamente necessário para renderizar o que o usuário está vendo naquele exato segundo. O restante é carregado sob demanda, em segundo plano.

### 4. IA aplicada à performance e código limpo

Na Artificial Studio, utilizamos Inteligência Artificial para analisar estruturas de código, identificar gargalos de processamento de forma preditiva e refatorar funções complexas. A IA nos ajuda a garantir que o banco de dados seja consultado da forma mais eficiente possível e que nenhum loop desnecessário atrase a renderização da página.

### 5. Cache agressivo e CDN global

Garantimos que o conteúdo estático do seu site seja distribuído em servidores espalhados pelo mundo todo (Content Delivery Network - CDN). Se o seu cliente está em São Paulo ou em Nova York, os arquivos do site serão entregues a partir do servidor fisicamente mais próximo dele, eliminando a latência da rede.

## Velocidade Não é Custo, é Investimento com Retorno Imediato

Se você continua tratando a lentidão do seu site como "um detalhe para resolver depois", o seu concorrente — que carrega em menos de 1 segundo — agradece.

Ter uma pontuação de 98+ no PageSpeed significa que você está oferecendo a melhor experiência possível para o seu usuário, reduzindo o custo dos seus anúncios, melhorando o seu SEO orgânico e, o mais importante de tudo, destravando o faturamento que hoje está preso na barra de carregamento.`,
  },
]

async function seedBlogPosts(): Promise<void> {
  const connection = await pool.getConnection()
  try {
    const [existing] = await connection.query('SELECT COUNT(*) AS count FROM posts')
    await connection.query('DELETE FROM posts')
    console.log(`${(existing as Array<{ count: number }>)[0].count} post(s) existente(s) removido(s).`)

    for (const post of POSTS) {
      const slug = await ensureUniqueSlug(connection, post.title)
      await connection.query(
        `INSERT INTO posts (title, slug, excerpt, content, tag, tag_color, trending, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [post.title, slug, post.excerpt, post.content, post.tag, post.tagColor, post.trending, post.publishedAt],
      )
      console.log(`Post criado: ${slug}`)
    }

    console.log(`${POSTS.length} post(s) inserido(s) com sucesso.`)
  } finally {
    connection.release()
    await pool.end()
  }
}

seedBlogPosts().catch((err) => {
  console.error('Falha no seed de posts:', err)
  process.exit(1)
})
