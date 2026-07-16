import { useRef, useState } from 'react'
import { ExternalLink, ArrowUpRight, ChevronDown } from 'lucide-react'

const THEMES = [
  {
    accent: '#22d3ee',
    gradient: 'linear-gradient(135deg, rgba(8,145,178,0.8) 0%, rgba(6,182,212,0.4) 100%)',
    bg: 'linear-gradient(135deg, #0c2a33 0%, #071a20 100%)',
  },
  {
    accent: '#a855f7',
    gradient: 'linear-gradient(135deg, rgba(124,58,237,0.8) 0%, rgba(168,85,247,0.4) 100%)',
    bg: 'linear-gradient(135deg, #1a0d2e 0%, #0f0718 100%)',
  },
  {
    accent: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(180,83,9,0.8) 0%, rgba(245,158,11,0.4) 100%)',
    bg: 'linear-gradient(135deg, #1f1505 0%, #140e02 100%)',
  },
  {
    accent: '#22c55e',
    gradient: 'linear-gradient(135deg, rgba(22,163,74,0.8) 0%, rgba(34,197,94,0.4) 100%)',
    bg: 'linear-gradient(135deg, #0a1f0f 0%, #051208 100%)',
  },
  {
    accent: '#ec4899',
    gradient: 'linear-gradient(135deg, rgba(219,39,119,0.8) 0%, rgba(236,72,153,0.4) 100%)',
    bg: 'linear-gradient(135deg, #2e0a1f 0%, #1a0512 100%)',
  },
  {
    accent: '#3b82f6',
    gradient: 'linear-gradient(135deg, rgba(29,78,216,0.8) 0%, rgba(59,130,246,0.4) 100%)',
    bg: 'linear-gradient(135deg, #0a1530 0%, #050b1c 100%)',
  },
  {
    accent: '#f43f5e',
    gradient: 'linear-gradient(135deg, rgba(190,18,60,0.8) 0%, rgba(244,63,94,0.4) 100%)',
    bg: 'linear-gradient(135deg, #2e0a12 0%, #1a050a 100%)',
  },
  {
    accent: '#6366f1',
    gradient: 'linear-gradient(135deg, rgba(79,70,229,0.8) 0%, rgba(99,102,241,0.4) 100%)',
    bg: 'linear-gradient(135deg, #150f30 0%, #0b081c 100%)',
  },
  {
    accent: '#14b8a6',
    gradient: 'linear-gradient(135deg, rgba(15,118,110,0.8) 0%, rgba(20,184,166,0.4) 100%)',
    bg: 'linear-gradient(135deg, #062421 0%, #031513 100%)',
  },
  {
    accent: '#f97316',
    gradient: 'linear-gradient(135deg, rgba(194,65,12,0.8) 0%, rgba(249,115,22,0.4) 100%)',
    bg: 'linear-gradient(135deg, #2b1305 0%, #1a0b02 100%)',
  },
]

const PROJECT_BRIEFS = [
  {
    title: 'LogiFlow SaaS',
    category: 'SaaS de Logística',
    description:
      'Plataforma completa de rastreamento e gestão de entregas com dashboard em tempo real, integrações de API e automação de notificações.',
    icon: '🚚',
  },
  {
    title: 'ConvertPro Page',
    category: 'Landing Page Premium',
    description:
      'Landing page de alto impacto para lançamento de produto com A/B testing integrado, vídeo hero e funil de conversão otimizado.',
    icon: '⚡',
  },
  {
    title: 'SalesBoard CRM',
    category: 'Dashboard Comercial',
    description:
      'Dashboard analítico completo para equipes de vendas com métricas em tempo real, IA de previsão de receita e relatórios automatizados.',
    icon: '📊',
  },
  {
    title: 'MedConnect App',
    category: 'Plataforma MedTech',
    description:
      'Sistema de agendamento e telemedicina com IA de triagem, prontuário eletrônico e integração com planos de saúde.',
    icon: '🏥',
  },
  {
    title: 'EduSpark LMS',
    category: 'Plataforma de Ensino Online',
    description:
      'Ambiente de aprendizagem gamificado com trilhas personalizadas por IA, videoaulas interativas e certificação automática.',
    icon: '🎓',
  },
  {
    title: 'FinTrack Wallet',
    category: 'App de Gestão Financeira',
    description:
      'Aplicativo de controle financeiro pessoal com categorização automática de gastos via IA, metas inteligentes e open finance.',
    icon: '💳',
  },
  {
    title: 'PropertyHub Real Estate',
    category: 'Portal Imobiliário',
    description:
      'Marketplace imobiliário com tour virtual 3D, matching de imóveis por IA e assinatura digital de contratos.',
    icon: '🏠',
  },
  {
    title: 'FoodieGo Delivery',
    category: 'App de Delivery',
    description:
      'Plataforma de delivery multi-restaurante com roteirização inteligente de entregadores e previsão de tempo por IA.',
    icon: '🍔',
  },
  {
    title: 'LegalMind Assistant',
    category: 'SaaS Jurídico',
    description:
      'Assistente jurídico com IA para análise de contratos, geração de petições e monitoramento de prazos processuais.',
    icon: '⚖️',
  },
  {
    title: 'FitPulse Coach',
    category: 'App de Treino Personalizado',
    description:
      'Aplicativo de treino com planos gerados por IA, acompanhamento de evolução e integração com wearables.',
    icon: '💪',
  },
  {
    title: 'EventSphere Platform',
    category: 'Gestão de Eventos',
    description:
      'Plataforma completa de eventos com venda de ingressos, check-in por QR Code e dashboard de vendas em tempo real.',
    icon: '🎟️',
  },
  {
    title: 'GreenGrid Energy',
    category: 'Monitoramento de Energia Solar',
    description:
      'Dashboard de monitoramento de usinas solares com previsão de geração por IA e alertas de manutenção preditiva.',
    icon: '☀️',
  },
  {
    title: 'TalentForge HR',
    category: 'Plataforma de Recrutamento',
    description:
      'Sistema de recrutamento com triagem de currículos por IA, testes comportamentais e pipeline visual de candidatos.',
    icon: '🧑‍💼',
  },
  {
    title: 'PetCare Connect',
    category: 'App para Pet Shops',
    description:
      'Aplicativo de agendamento para pet shops e clínicas veterinárias com prontuário digital do animal e lembretes automáticos.',
    icon: '🐾',
  },
  {
    title: 'ArtisanMarket',
    category: 'E-commerce de Artesanato',
    description:
      'Marketplace para artesãos locais com vitrine personalizável, checkout otimizado e recomendação de produtos por IA.',
    icon: '🎨',
  },
  {
    title: 'TravelNest Booking',
    category: 'Plataforma de Viagens',
    description:
      'Sistema de reservas de viagens com comparador de preços em tempo real e chatbot de suporte multilíngue.',
    icon: '✈️',
  },
  {
    title: 'BuildTrack Construction',
    category: 'Gestão de Obras',
    description:
      'Plataforma de gestão de obras com cronograma físico-financeiro, diário de obra digital e relatórios fotográficos.',
    icon: '🏗️',
  },
  {
    title: 'RestaurantOS',
    category: 'Sistema para Restaurantes',
    description:
      'Sistema de gestão para restaurantes com comanda digital, controle de estoque inteligente e integração com iFood.',
    icon: '🍽️',
  },
  {
    title: 'StreamCast Studio',
    category: 'Plataforma de Streaming',
    description:
      'Plataforma de streaming de conteúdo com player adaptativo, recomendação por IA e painel de monetização para criadores.',
    icon: '🎬',
  },
  {
    title: 'AgroSense IoT',
    category: 'Monitoramento Agrícola',
    description:
      'Plataforma de agricultura de precisão com sensores IoT, previsão de safra por IA e mapas de calor de plantio.',
    icon: '🌾',
  },
  {
    title: 'SecureVault Auth',
    category: 'Plataforma de Segurança Digital',
    description:
      'Sistema de autenticação multifator e gestão de identidades com detecção de fraude por IA e monitoramento contínuo de acessos.',
    icon: '🔐',
  },
  {
    title: 'InsureFlow Claims',
    category: 'Insurtech de Sinistros',
    description:
      'Automação do processo de sinistros com análise de documentos por IA, aprovação inteligente e acompanhamento em tempo real.',
    icon: '🛡️',
  },
  {
    title: 'TuneWave Studio',
    category: 'Distribuição Musical',
    description:
      'Distribuição de música para streamings com relatórios de royalties automatizados e análise de audiência por IA.',
    icon: '🎵',
  },
  {
    title: 'QuestArena Gaming',
    category: 'Plataforma de Torneios eSports',
    description:
      'Sistema de gestão de campeonatos com chaveamento automático, transmissão ao vivo integrada e ranking de jogadores.',
    icon: '🎮',
  },
  {
    title: 'WorkNest Coworking',
    category: 'Gestão de Espaços Compartilhados',
    description:
      'Plataforma de reserva de salas e estações de trabalho com controle de acesso inteligente e faturamento automático.',
    icon: '🏢',
  },
  {
    title: 'CleanSpin Laundry',
    category: 'App de Lavanderia sob Demanda',
    description:
      'Aplicativo de lavanderia com coleta e entrega agendada, rastreamento de pedidos e pagamento integrado.',
    icon: '🧺',
  },
  {
    title: 'RentACar Fleet',
    category: 'Locação de Veículos',
    description:
      'Sistema de locação de frotas com check-in digital, rastreamento por GPS e manutenção preditiva por IA.',
    icon: '🚗',
  },
  {
    title: 'RideShare Connect',
    category: 'App de Caronas Corporativas',
    description:
      'Aplicativo de caronas compartilhadas para empresas com otimização de rotas por IA e relatório de redução de carbono.',
    icon: '🚙',
  },
  {
    title: 'ParkSmart System',
    category: 'Gestão Inteligente de Estacionamentos',
    description:
      'Plataforma de estacionamentos com reserva de vagas, reconhecimento de placas por visão computacional e pagamento automático.',
    icon: '🅿️',
  },
  {
    title: 'WareHouse360 WMS',
    category: 'Gestão de Armazéns',
    description:
      'Sistema de gestão de estoque com robótica de separação, previsão de demanda por IA e rastreabilidade completa.',
    icon: '📦',
  },
  {
    title: 'BoxCraft Subscriptions',
    category: 'Assinaturas Personalizadas',
    description:
      'Plataforma de clubes de assinatura com curadoria por IA, gestão de recorrência e logística integrada.',
    icon: '🎁',
  },
  {
    title: 'MindWell Therapy',
    category: 'Telepsicologia e Bem-estar Mental',
    description:
      'Plataforma de terapia online com agendamento seguro, prontuário criptografado e triagem inicial por IA.',
    icon: '🧠',
  },
  {
    title: 'NutriPlan AI',
    category: 'App de Nutrição Personalizada',
    description:
      'Aplicativo de planejamento alimentar com cardápios gerados por IA, lista de compras automática e acompanhamento nutricional.',
    icon: '🥗',
  },
  {
    title: 'ElderCare Connect',
    category: 'Cuidados para Idosos',
    description:
      'Sistema de gestão de cuidadores com monitoramento de saúde remoto, alertas de emergência e comunicação familiar.',
    icon: '🧓',
  },
  {
    title: 'LittleSteps Daycare',
    category: 'Gestão de Creches e Escolinhas',
    description:
      'Plataforma de gestão escolar infantil com check-in dos pais, relatórios diários e comunicação em tempo real.',
    icon: '🧸',
  },
  {
    title: 'ForeverDay Weddings',
    category: 'Marketplace para Casamentos',
    description:
      'Marketplace que conecta noivos a fornecedores com orçamentos automáticos, checklist inteligente e gestão de contratos.',
    icon: '💍',
  },
  {
    title: 'FrameStory Photography',
    category: 'Plataforma para Fotógrafos Profissionais',
    description:
      'Sistema de galeria online e venda de fotos com entrega digital protegida e agendamento de sessões.',
    icon: '📸',
  },
  {
    title: 'MoveEasy Relocation',
    category: 'Mudanças e Logística Residencial',
    description:
      'Aplicativo de mudanças com cotação instantânea, rastreamento da transportadora e inventário digital dos itens.',
    icon: '📦',
  },
  {
    title: 'FixIt Home Services',
    category: 'Marketplace de Prestadores de Serviço',
    description:
      'Marketplace de serviços residenciais com matching por IA, avaliação de profissionais e pagamento seguro por etapa.',
    icon: '🔧',
  },
  {
    title: 'SparkleClean Services',
    category: 'Faxina e Limpeza sob Demanda',
    description:
      'Plataforma de contratação de diaristas com agenda recorrente, avaliação de qualidade e pagamento automatizado.',
    icon: '🧹',
  },
  {
    title: 'LeagueMaster Sports',
    category: 'Gestão de Ligas Esportivas Amadoras',
    description:
      'Sistema de gestão de campeonatos amadores com tabela automática, estatísticas dos jogadores e transmissão de jogos.',
    icon: '🏆',
  },
  {
    title: 'CultureTix Museums',
    category: 'Bilheteria Digital para Atrações',
    description:
      'Sistema de bilheteria digital com filas virtuais, tour guiado por realidade aumentada e analytics de visitantes.',
    icon: '🎫',
  },
  {
    title: 'BookNook Library',
    category: 'Gestão de Bibliotecas',
    description:
      'Plataforma de gestão de acervo com empréstimos digitais, recomendação de leitura por IA e reservas online.',
    icon: '📚',
  },
  {
    title: 'GivingHand Donations',
    category: 'Plataforma de Doações para ONGs',
    description:
      'Sistema de arrecadação para ONGs com doações recorrentes, transparência de impacto e relatórios automáticos para doadores.',
    icon: '🤲',
  },
  {
    title: 'FundLaunch Crowdfunding',
    category: 'Financiamento Coletivo',
    description:
      'Plataforma de crowdfunding com verificação de projetos por IA, gestão de recompensas e pagamentos escalonados.',
    icon: '🚀',
  },
  {
    title: 'FreelanceHub Marketplace',
    category: 'Marketplace de Freelancers',
    description:
      'Marketplace de talentos freelancers com matching inteligente, contratos digitais e sistema de escrow de pagamentos.',
    icon: '💼',
  },
  {
    title: 'InfluenceIQ Marketing',
    category: 'Marketing de Influência',
    description:
      'Sistema de gestão de campanhas com influenciadores, análise de ROI por IA e relatórios de engajamento em tempo real.',
    icon: '📱',
  },
  {
    title: 'PodStream Studio',
    category: 'Hospedagem de Podcasts',
    description:
      'Plataforma de hospedagem e distribuição de podcasts com transcrição automática por IA e monetização integrada.',
    icon: '🎙️',
  },
  {
    title: 'InboxCraft Newsletters',
    category: 'Plataforma de Newsletters Premium',
    description:
      'Sistema de criação e monetização de newsletters com segmentação inteligente e editor visual de alto desempenho.',
    icon: '📰',
  },
  {
    title: 'PrintOnDemand Studio',
    category: 'Produtos Personalizados sob Demanda',
    description:
      'Sistema de print-on-demand com mockup gerado por IA, integração com gráficas parceiras e checkout otimizado.',
    icon: '🖨️',
  },
  {
    title: 'MakerCloud 3D',
    category: 'Marketplace de Impressão 3D',
    description:
      'Marketplace que conecta criadores a impressoras 3D parceiras com orçamento automático e rastreamento de produção.',
    icon: '🧵',
  },
  {
    title: 'SkyView Drones',
    category: 'Serviços com Drones',
    description:
      'Sistema de agendamento de serviços aéreos com drones, geração de mapas 3D e relatórios de inspeção automatizados.',
    icon: '🛸',
  },
  {
    title: 'EcoCycle Waste',
    category: 'Gestão de Resíduos e Reciclagem',
    description:
      'Plataforma de logística reversa com roteirização de coleta, rastreabilidade de materiais e relatórios de impacto ambiental.',
    icon: '♻️',
  },
  {
    title: 'AquaFlow Utilities',
    category: 'Monitoramento de Consumo de Água',
    description:
      'Dashboard de monitoramento de consumo hídrico com detecção de vazamentos por IA e alertas em tempo real.',
    icon: '💧',
  },
  {
    title: 'HomeSense Automation',
    category: 'Automação Residencial',
    description:
      'Sistema de automação para casas inteligentes com controle por voz, rotinas por IA e monitoramento de energia.',
    icon: '🏡',
  },
  {
    title: 'ChargePoint EV',
    category: 'Rede de Carregamento Elétrico',
    description:
      'Plataforma de gestão de estações de recarga com reserva antecipada, pagamento integrado e monitoramento remoto.',
    icon: '🔌',
  },
  {
    title: 'PedalShare Bikes',
    category: 'Bicicletas Compartilhadas',
    description:
      'Plataforma de bike sharing com desbloqueio via QR Code, geofencing inteligente e manutenção preditiva da frota.',
    icon: '🚲',
  },
  {
    title: 'TransitTrack Mobility',
    category: 'Rastreamento de Transporte Público',
    description:
      'Aplicativo de rastreamento de ônibus e metrô em tempo real com previsão de chegada por IA e rotas otimizadas.',
    icon: '🚌',
  },
  {
    title: 'HarvestGuard Insurance',
    category: 'Seguro Agrícola Paramétrico',
    description:
      'Plataforma de seguro agrícola com dados de satélite, previsão climática por IA e pagamento automático de sinistros.',
    icon: '🌦️',
  },
  {
    title: 'ChainTrace Supply',
    category: 'Rastreabilidade de Cadeia de Suprimentos',
    description:
      'Sistema de rastreabilidade com blockchain para cadeia de suprimentos, garantindo transparência da origem ao consumidor.',
    icon: '🔗',
  },
  {
    title: 'ColdKeep Storage',
    category: 'Monitoramento de Câmaras Frias',
    description:
      'Plataforma de monitoramento de temperatura para câmaras frias com alertas em tempo real e histórico de conformidade.',
    icon: '❄️',
  },
  {
    title: 'FranchiseOS Management',
    category: 'Gestão de Franquias',
    description:
      'Plataforma de gestão multi-unidades para franquias com dashboard consolidado e padronização de processos.',
    icon: '🏬',
  },
  {
    title: 'LoyaltyPlus Rewards',
    category: 'Fidelidade e Recompensas',
    description:
      'Sistema de programa de fidelidade com gamificação, recomendação de recompensas por IA e carteira digital de pontos.',
    icon: '⭐',
  },
  {
    title: 'GiftCard Central',
    category: 'Vale-Presentes Digitais',
    description:
      'Sistema de emissão e resgate de vale-presentes digitais com integração multi-lojista e antifraude por IA.',
    icon: '🎀',
  },
  {
    title: 'DealSpot Aggregator',
    category: 'Agregador de Cupons e Promoções',
    description:
      'Plataforma agregadora de cupons com curadoria automática de ofertas e notificações personalizadas por IA.',
    icon: '🏷️',
  },
  {
    title: 'ReputeTrack Reviews',
    category: 'Gestão de Reputação Online',
    description:
      'Plataforma de monitoramento de avaliações com análise de sentimento por IA e resposta automatizada a clientes.',
    icon: '📣',
  },
  {
    title: 'BookMyTime Scheduling',
    category: 'Agendamento Universal',
    description:
      'Plataforma white-label de agendamento online com sincronização de calendários e lembretes automáticos via WhatsApp.',
    icon: '📅',
  },
  {
    title: 'FieldForce Ops',
    category: 'Gestão de Equipes de Campo',
    description:
      'Sistema de gestão de técnicos externos com roteirização inteligente, checklist digital e assinatura eletrônica de OS.',
    icon: '🛠️',
  },
  {
    title: 'FactoryPulse MES',
    category: 'Execução de Manufatura',
    description:
      'Sistema MES para chão de fábrica com monitoramento de produção em tempo real e detecção de gargalos por IA.',
    icon: '🏭',
  },
  {
    title: 'VisionQC Inspection',
    category: 'Controle de Qualidade por Visão Computacional',
    description:
      'Sistema de inspeção visual automatizada com detecção de defeitos por IA em linhas de produção industrial.',
    icon: '🔍',
  },
  {
    title: 'PayrollEasy HR',
    category: 'Folha de Pagamento',
    description:
      'Sistema de folha de pagamento com cálculo automático de encargos, holerites digitais e conformidade fiscal.',
    icon: '💰',
  },
  {
    title: 'ExpenseWise Corporate',
    category: 'Gestão de Despesas Corporativas',
    description:
      'Plataforma de gestão de despesas com captura de notas fiscais por IA, aprovação em cadeia e cartões virtuais.',
    icon: '🧾',
  },
  {
    title: 'ProcureFlow B2B',
    category: 'Compras Corporativas',
    description:
      'Sistema de procurement B2B com cotação automática entre fornecedores e aprovação de compras por workflow.',
    icon: '🛒',
  },
  {
    title: 'SupplyLink Marketplace',
    category: 'Marketplace B2B de Fornecedores',
    description:
      'Marketplace que conecta indústrias a fornecedores homologados com negociação integrada e gestão de contratos.',
    icon: '🤝',
  },
  {
    title: 'LinguaBridge Translate',
    category: 'Tradução em Tempo Real',
    description:
      'Sistema de tradução simultânea para reuniões com IA multilíngue e transcrição automática de atas.',
    icon: '🌐',
  },
  {
    title: 'HelpDeskPro Support',
    category: 'Atendimento ao Cliente',
    description:
      'Sistema de helpdesk com triagem de tickets por IA, base de conhecimento inteligente e SLA automatizado.',
    icon: '🎧',
  },
  {
    title: 'PulseSurvey Feedback',
    category: 'Pesquisas e Feedback',
    description:
      'Sistema de pesquisas de satisfação com análise de sentimento por IA e dashboards de NPS em tempo real.',
    icon: '📋',
  },
  {
    title: 'SkillForge Corporate',
    category: 'Treinamento Corporativo',
    description:
      'LMS corporativo com trilhas de capacitação personalizadas por IA e certificação de competências.',
    icon: '🎯',
  },
  {
    title: 'TeamSync Collab',
    category: 'Colaboração Remota',
    description:
      'Plataforma de colaboração para equipes remotas com quadros visuais, videochamadas integradas e automação de tarefas.',
    icon: '🧩',
  },
  {
    title: 'TimeGuard Tracking',
    category: 'Controle de Ponto e Produtividade',
    description:
      'Aplicativo de controle de jornada com reconhecimento facial, geolocalização e relatórios de produtividade por IA.',
    icon: '⏱️',
  },
  {
    title: 'InvoiceFlow Billing',
    category: 'Faturamento Recorrente',
    description:
      'Sistema de faturamento e cobrança recorrente com régua de cobrança automática e conciliação bancária inteligente.',
    icon: '🧮',
  },
  {
    title: 'TaxEasy Assistant',
    category: 'Assistente de Declaração Fiscal',
    description:
      'Plataforma que automatiza a apuração de impostos com leitura de documentos por IA e simulação de cenários tributários.',
    icon: '📑',
  },
  {
    title: 'WealthPath Advisor',
    category: 'Robo-Advisor de Investimentos',
    description:
      'Plataforma de gestão de investimentos com carteiras recomendadas por IA e rebalanceamento automático de ativos.',
    icon: '📈',
  },
  {
    title: 'PortfolioTrack Assets',
    category: 'Gestão de Portfólio de Ativos',
    description:
      'Dashboard de acompanhamento de portfólio com consolidação multi-corretora e alertas de performance por IA.',
    icon: '💹',
  },
  {
    title: 'MealPlan Weekly',
    category: 'Planejador de Refeições',
    description:
      'Aplicativo de planejamento semanal de refeições com sugestões por IA e integração com supermercados parceiros.',
    icon: '🍱',
  },
  {
    title: 'FreshCart Grocery',
    category: 'Delivery de Supermercado',
    description:
      'Aplicativo de compras de supermercado com entrega expressa, lista inteligente e recomendação de produtos por IA.',
    icon: '🛍️',
  },
  {
    title: 'ChefBox Kits',
    category: 'Kits de Refeição por Assinatura',
    description:
      'Sistema de assinatura de kits de refeição com curadoria de receitas, logística refrigerada e gestão de recorrência.',
    icon: '👨‍🍳',
  },
  {
    title: 'VineClub Wines',
    category: 'Clube de Assinatura de Vinhos',
    description:
      'Plataforma de clube de vinhos com curadoria por sommelier virtual, conteúdo educativo e entregas mensais.',
    icon: '🍷',
  },
  {
    title: 'BrewLoyal Coffee',
    category: 'Fidelidade para Cafeterias',
    description:
      'Aplicativo de fidelidade para redes de cafeteria com carteira digital, pedidos antecipados e ofertas personalizadas.',
    icon: '☕',
  },
  {
    title: 'GlowBook Beauty',
    category: 'Agendamento para Salões',
    description:
      'Sistema de agendamento para salões de beleza com lembretes automáticos, gestão de comissões e catálogo de serviços.',
    icon: '💇',
  },
  {
    title: 'SerenitySpa Wellness',
    category: 'Gestão para Spas',
    description:
      'Plataforma de gestão para spas e centros de bem-estar com reserva online, pacotes personalizados e CRM de clientes.',
    icon: '🧖',
  },
  {
    title: 'DentalCare Suite',
    category: 'Gestão para Clínicas Odontológicas',
    description:
      'Plataforma de gestão clínica com prontuário digital, agenda inteligente e lembretes de retorno automatizados.',
    icon: '🦷',
  },
  {
    title: 'VisionOptics Store',
    category: 'E-commerce de Óculos',
    description:
      'Loja virtual de óculos com prova virtual por realidade aumentada e recomendação de armação por IA.',
    icon: '👓',
  },
  {
    title: 'ReStyle Fashion',
    category: 'Marketplace de Moda de Segunda Mão',
    description:
      'Marketplace de moda circular com autenticação de peças por IA, precificação inteligente e logística reversa integrada.',
    icon: '👗',
  },
  {
    title: 'KickTrade Sneakers',
    category: 'Marketplace de Tênis de Colecionador',
    description:
      'Marketplace especializado em sneakers com autenticação por IA, leilões em tempo real e escrow de pagamento.',
    icon: '👟',
  },
  {
    title: 'CraftDesk Furniture',
    category: 'Configurador de Móveis Personalizados',
    description:
      'Plataforma de personalização de móveis sob medida com visualização 3D em tempo real e orçamento instantâneo.',
    icon: '🛋️',
  },
  {
    title: 'RoomVision Design',
    category: 'Design de Interiores com IA',
    description:
      'Aplicativo que gera projetos de decoração por IA a partir de fotos do ambiente, com lista de compras integrada.',
    icon: '🖼️',
  },
  {
    title: 'RenoQuote Home',
    category: 'Orçamentos para Reformas',
    description:
      'Plataforma que conecta proprietários a empreiteiros com orçamentos comparativos e acompanhamento de obra por fotos.',
    icon: '🧱',
  },
  {
    title: 'TutorMatch Learning',
    category: 'Marketplace de Aulas Particulares',
    description:
      'Marketplace de professores particulares com matching por IA, videoaulas integradas e pagamento por sessão.',
    icon: '📖',
  },
  {
    title: 'FluentPath Languages',
    category: 'Aprendizado de Idiomas com IA',
    description:
      'Aplicativo de idiomas com tutor conversacional por IA, correção de pronúncia em tempo real e trilha adaptativa.',
    icon: '🗣️',
  },
]

const PROJECTS = PROJECT_BRIEFS.map((project, i) => ({
  ...project,
  ...THEMES[i % THEMES.length],
}))

const INITIAL_VISIBLE = 8
const LOAD_STEP = 12

function TiltCard({ project }) {
  const cardRef = useRef(null)
  const [transform, setTransform] = useState('')
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 })
  const [hovered, setHovered] = useState(false)

  const handleMouseMove = (e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const rotateX = ((y - cy) / cy) * -8
    const rotateY = ((x - cx) / cx) * 8
    setTransform(
      `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`
    )
    setGlowPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 })
  }

  const handleMouseLeave = () => {
    setTransform('perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)')
    setHovered(false)
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        transform,
        transition: hovered ? 'transform 0.1s ease' : 'transform 0.5s ease',
        background: project.bg,
        border: hovered
          ? `1px solid ${project.accent}44`
          : '1px solid rgba(255,255,255,0.06)',
        boxShadow: hovered
          ? `0 25px 60px rgba(0,0,0,0.6), 0 0 40px ${project.accent}18`
          : '0 4px 24px rgba(0,0,0,0.3)',
        willChange: 'transform',
      }}
    >
      {/* Mouse-follow glow */}
      {hovered && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle 200px at ${glowPos.x}% ${glowPos.y}%, ${project.accent}14, transparent 70%)`,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* Top gradient bar */}
      <div
        className="h-1 w-full"
        style={{
          background: project.gradient,
          opacity: hovered ? 1 : 0.6,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Card content */}
      <div className="p-6">
        {/* Icon + Category */}
        <div className="flex items-center justify-between mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{
              background: `${project.accent}14`,
              border: `1px solid ${project.accent}22`,
            }}
          >
            {project.icon}
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: `${project.accent}12`,
              border: `1px solid ${project.accent}25`,
              color: project.accent,
            }}
          >
            {project.category}
          </div>
        </div>

        {/* Title */}
        <h3
          className="text-xl font-bold mb-2 transition-colors duration-200"
          style={{ color: hovered ? '#f4f4f5' : '#d4d4d8', letterSpacing: '-0.3px' }}
        >
          {project.title}
        </h3>

        {/* Description */}
        <p className="text-sm leading-relaxed mb-5" style={{ color: '#71717a' }}>
          {project.description}
        </p>

        {/* Link */}
        <div
          className="flex items-center gap-1.5 text-sm font-medium transition-all duration-200"
          style={{ color: hovered ? project.accent : '#52525b' }}
        >
          Ver conceito
          <ArrowUpRight
            size={14}
            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </div>
      </div>
    </div>
  )
}

export default function Portfolio() {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const visibleProjects = PROJECTS.slice(0, visibleCount)
  const hasMore = visibleCount < PROJECTS.length

  const handleToggle = () => {
    setVisibleCount((count) =>
      hasMore ? Math.min(count + LOAD_STEP, PROJECTS.length) : INITIAL_VISIBLE
    )
  }

  return (
    <section
      id="portfolio"
      className="relative py-28 overflow-hidden scroll-mt-20"
      style={{ background: '#050505' }}
    >
      {/* Subtle divider glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(34,211,238,0.3), transparent)',
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs font-medium"
            style={{
              background: 'rgba(34,211,238,0.06)',
              border: '1px solid rgba(34,211,238,0.18)',
              color: '#22d3ee',
            }}
          >
            <ExternalLink size={11} />
            Portfólio de Soluções
          </div>
          <h2
            className="font-bold mb-4"
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              color: '#f4f4f5',
              letterSpacing: '-0.8px',
            }}
          >
            O que podemos construir para o seu negócio
          </h2>
          <p style={{ color: '#71717a', fontSize: '1.05rem', maxWidth: '520px', margin: '0 auto' }}>
            Conceitos de produtos que mostram como unimos design de alto nível a performance real — o padrão que
            aplicamos em cada projeto que desenvolvemos.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {visibleProjects.map((project) => (
            <TiltCard key={project.title} project={project} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <button
            onClick={handleToggle}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#a1a1aa',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)'
              e.currentTarget.style.color = '#22d3ee'
              e.currentTarget.style.background = 'rgba(34,211,238,0.04)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
              e.currentTarget.style.color = '#a1a1aa'
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            }}
          >
            {hasMore
              ? `Ver mais projetos (${visibleCount}/${PROJECTS.length})`
              : 'Ver menos projetos'}
            <ChevronDown
              size={15}
              className="transition-transform duration-300"
              style={{ transform: hasMore ? 'rotate(0deg)' : 'rotate(180deg)' }}
            />
          </button>
        </div>
      </div>
    </section>
  )
}
