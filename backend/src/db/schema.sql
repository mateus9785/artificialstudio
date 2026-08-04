CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NULL,
  excerpt TEXT NOT NULL,
  content LONGTEXT,
  image_url VARCHAR(500) NULL,
  tag VARCHAR(100) NOT NULL,
  tag_color VARCHAR(20) NOT NULL DEFAULT '#22d3ee',
  trending BOOLEAN NOT NULL DEFAULT FALSE,
  published_at DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE posts ADD COLUMN slug VARCHAR(255) NULL AFTER title;

ALTER TABLE posts ADD COLUMN image_url VARCHAR(500) NULL AFTER content;

ALTER TABLE posts ADD UNIQUE KEY posts_slug_unique (slug);

ALTER TABLE posts DROP COLUMN read_time;

CREATE TABLE IF NOT EXISTS chat_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL UNIQUE,
  visitor_name VARCHAR(100),
  status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender ENUM('visitor', 'admin') NOT NULL,
  text TEXT NOT NULL,
  read_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  read_by_visitor BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
  INDEX idx_messages_conversation (conversation_id)
);

-- Programa de afiliados (a area /indique, o cadastro, o login e o painel do
-- parceiro) foi removido do produto. As tabelas sao dropadas na ordem filho para
-- pai por causa das FOREIGN KEYs: affiliate_notifications aponta para as duas
-- outras, e referrals aponta para affiliates.
DROP TABLE IF EXISTS affiliate_notifications;
DROP TABLE IF EXISTS referrals;
DROP TABLE IF EXISTS affiliates;

CREATE TABLE IF NOT EXISTS kanban_labels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20) NOT NULL DEFAULT '#22d3ee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE kanban_labels ADD COLUMN color VARCHAR(20) NOT NULL DEFAULT '#22d3ee' AFTER name;

CREATE TABLE IF NOT EXISTS kanban_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  label_id INT NOT NULL,
  status ENUM('todo', 'doing', 'done', 'error') NOT NULL DEFAULT 'todo',
  plan_status ENUM('none', 'requested', 'planning', 'error') NOT NULL DEFAULT 'none',
  plan_error TEXT,
  run_immediately BOOLEAN NOT NULL DEFAULT FALSE,
  tmux_session VARCHAR(100),
  error TEXT,
  git_watch BOOLEAN NOT NULL DEFAULT FALSE,
  base_commit VARCHAR(64),
  auto_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (label_id) REFERENCES kanban_labels(id),
  INDEX idx_kanban_cards_status (status),
  INDEX idx_kanban_cards_label (label_id)
);

-- Card "Planejar" (produção automatizada): reescreve a descrição via um
-- claim-next-to-plan/plan-result análogo ao do fluxo de execução, processado
-- pelo worker local (claude-kanban) rodando `claude -p` em modo leitura.
ALTER TABLE kanban_cards ADD COLUMN plan_status ENUM('none', 'requested', 'planning', 'error') NOT NULL DEFAULT 'none' AFTER status;
ALTER TABLE kanban_cards ADD COLUMN plan_error TEXT AFTER error;

-- Linha única (id fixo 1) com o snapshot mais recente de uso do plano Claude
-- Code (sessão de 5h e semana), reportado pelo worker local claude-kanban.
CREATE TABLE IF NOT EXISTS claude_usage (
  id TINYINT PRIMARY KEY DEFAULT 1,
  session_used_percent DECIMAL(5,2),
  session_resets_at TIMESTAMP NULL,
  week_used_percent DECIMAL(5,2),
  week_resets_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('entrada', 'saida') NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  occurred_on DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_financeiro_occurred_on (occurred_on),
  INDEX idx_financeiro_type (type)
);

-- ==========================================================================
-- Pegasus Etapa 1 (scout): prospeccao passiva de empresas
--
-- Preenchidas pelo projeto pegasus-scout/ (CLI local, fora deste backend). Ele
-- nao duplica este DDL: valida a presenca das tabelas via information_schema e
-- manda rodar `npm run migrate` aqui.
--
-- Restricao de estilo imposta por migrate.js, que corta este arquivo em cada
-- ponto e virgula (por isso nenhum comentario aqui pode conter um) e que so
-- ignora ER_DUP_FIELDNAME, ER_DUP_KEYNAME, ER_TABLE_EXISTS_ERROR e
-- ER_CANT_DROP_FIELD_OR_KEY: toda FOREIGN KEY precisa ser inline no CREATE
-- TABLE. Um ALTER TABLE ADD CONSTRAINT repetido devolve ER_FK_DUP_NAME, que
-- nao esta na lista de ignorados e derrubaria a migracao inteira na segunda vez
-- que alguem rodasse.
-- ==========================================================================

-- Cache de geocoding do Nominatim/OpenStreetMap. A politica de uso deles pede no
-- maximo 1 requisicao por segundo, e a mesma cidade e consultada em toda busca.
CREATE TABLE IF NOT EXISTS scout_geocode_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  query VARCHAR(255) NOT NULL UNIQUE,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  display_name VARCHAR(500),
  provider VARCHAR(40) NOT NULL DEFAULT 'nominatim',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Uma linha por execucao de `scout discover`.
CREATE TABLE IF NOT EXISTS scout_searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  niche VARCHAR(120) NOT NULL,
  city VARCHAR(120) NOT NULL,
  state CHAR(2) NULL,
  country CHAR(2) NOT NULL DEFAULT 'BR',
  center_lat DECIMAL(10, 7) NULL,
  center_lng DECIMAL(10, 7) NULL,
  radius_km DECIMAL(6, 2) NOT NULL DEFAULT 5.00,
  tile_count SMALLINT NOT NULL DEFAULT 1,
  max_results INT NOT NULL DEFAULT 100,
  source ENUM('google_maps', 'manual') NOT NULL DEFAULT 'google_maps',
  query_text VARCHAR(255) NOT NULL,
  params_json JSON NULL,
  status ENUM('running', 'completed', 'partial', 'failed', 'canceled') NOT NULL DEFAULT 'running',
  discovered_count INT NOT NULL DEFAULT 0,
  new_count INT NOT NULL DEFAULT 0,
  updated_count INT NOT NULL DEFAULT 0,
  error TEXT NULL,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scout_searches_status (status),
  INDEX idx_scout_searches_niche_city (niche, city)
);

-- A empresa prospectada. `dedupe_key` e a chave natural: o ftid do Google quando
-- disponivel, senao nome normalizado + coordenada arredondada. Ela e NOT NULL de
-- proposito -- com place_ftid NULL o MySQL aceitaria varios NULLs no indice unico
-- e o re-scraping duplicaria toda empresa sem ftid.
CREATE TABLE IF NOT EXISTS scout_prospects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source ENUM('google_maps', 'manual') NOT NULL DEFAULT 'google_maps',
  dedupe_key VARCHAR(160) NOT NULL,
  place_ftid VARCHAR(80) NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(120) NULL,
  maps_url TEXT NULL,
  phone_raw VARCHAR(60) NULL,
  phone_e164 VARCHAR(20) NULL,
  phone_kind ENUM('mobile', 'fixed', 'unknown') NOT NULL DEFAULT 'unknown',
  whatsapp_phone_e164 VARCHAR(20) NULL,
  whatsapp_source ENUM('maps_phone', 'site_link', 'business_profile', 'manual') NULL,
  website VARCHAR(500) NULL,
  domain VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  address VARCHAR(500) NULL,
  city VARCHAR(120) NULL,
  state CHAR(2) NULL,
  lat DECIMAL(10, 7) NULL,
  lng DECIMAL(10, 7) NULL,
  rating DECIMAL(2, 1) NULL,
  reviews_count INT NULL,
  hours_json JSON NULL,
  instagram_url VARCHAR(500) NULL,
  instagram_followers INT NULL,
  instagram_last_post_at TIMESTAMP NULL,
  facebook_url VARCHAR(500) NULL,
  facebook_response_time VARCHAR(120) NULL,
  chat_widget VARCHAR(60) NULL,
  ecommerce_platform VARCHAR(60) NULL,
  enrichment_status ENUM('pending', 'running', 'done', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  enriched_at TIMESTAMP NULL,
  social_status ENUM('pending', 'running', 'done', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  social_checked_at TIMESTAMP NULL,
  wa_check_status ENUM('pending', 'running', 'done', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  wa_checked_at TIMESTAMP NULL,
  automation_verdict ENUM('indefinido', 'provavelmente_manual', 'provavelmente_automatizado') NOT NULL DEFAULT 'indefinido',
  fit_score TINYINT NULL,
  score_version VARCHAR(20) NULL,
  scored_at TIMESTAMP NULL,
  pipeline_status ENUM('novo', 'qualificado', 'descartado', 'em_atendimento') NOT NULL DEFAULT 'novo',
  duplicate_of_prospect_id INT NULL,
  notes TEXT NULL,
  first_seen_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY scout_prospects_dedupe (source, dedupe_key),
  INDEX idx_scout_prospects_phone (phone_e164),
  INDEX idx_scout_prospects_wa (whatsapp_phone_e164),
  INDEX idx_scout_prospects_domain (domain),
  INDEX idx_scout_prospects_verdict (automation_verdict),
  INDEX idx_scout_prospects_pipeline (pipeline_status, fit_score),
  INDEX idx_scout_prospects_enrichment (enrichment_status)
);

-- Juncao N:M: a mesma empresa aparece em varias buscas (nichos vizinhos, raios
-- diferentes). `snapshot_json` guarda como ela apareceu naquela vez.
CREATE TABLE IF NOT EXISTS scout_search_prospects (
  search_id INT NOT NULL,
  prospect_id INT NOT NULL,
  position SMALLINT NULL,
  tile_index SMALLINT NULL,
  distance_km DECIMAL(6, 2) NULL,
  is_new BOOLEAN NOT NULL DEFAULT FALSE,
  snapshot_json JSON NULL,
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (search_id, prospect_id),
  FOREIGN KEY (search_id) REFERENCES scout_searches(id) ON DELETE CASCADE,
  FOREIGN KEY (prospect_id) REFERENCES scout_prospects(id) ON DELETE CASCADE,
  INDEX idx_scout_sp_prospect (prospect_id)
);

-- Evidencia auditavel de cada sinal detectado. `evidence` guarda o trecho que
-- provou o sinal, o que atende dois objetivos: depurar um detector que errou, e
-- registrar a origem do dado (exigencia de LGPD para prospeccao B2B).
CREATE TABLE IF NOT EXISTS scout_prospect_signals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prospect_id INT NOT NULL,
  stage ENUM('discovery', 'enrichment', 'social', 'whatsapp_check', 'scoring') NOT NULL,
  signal_key VARCHAR(80) NOT NULL,
  signal_value VARCHAR(500) NULL,
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
  evidence TEXT NULL,
  source_url VARCHAR(500) NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (prospect_id) REFERENCES scout_prospects(id) ON DELETE CASCADE,
  UNIQUE KEY scout_signals_unique (prospect_id, stage, signal_key),
  INDEX idx_scout_signals_key (signal_key)
);

-- Resultado do check PASSIVO de WhatsApp Web. Nao existe nenhuma coluna de
-- mensagem aqui de proposito: a Etapa 1 nunca envia nada. Medir tempo de
-- resposta de verdade exige conversar, e isso e Etapa 2.
CREATE TABLE IF NOT EXISTS scout_whatsapp_checks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prospect_id INT NOT NULL,
  phone_e164 VARCHAR(20) NOT NULL,
  exists_on_whatsapp BOOLEAN NULL,
  is_business BOOLEAN NULL,
  has_catalog BOOLEAN NULL,
  has_away_message_hint BOOLEAN NULL,
  profile_description TEXT NULL,
  business_category VARCHAR(120) NULL,
  declared_hours_json JSON NULL,
  status ENUM('ok', 'not_found', 'failed', 'skipped') NOT NULL DEFAULT 'ok',
  error TEXT NULL,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prospect_id) REFERENCES scout_prospects(id) ON DELETE CASCADE,
  UNIQUE KEY scout_wa_check_unique (prospect_id, phone_e164),
  INDEX idx_scout_wa_checks_status (status)
);

-- Analise interpretativa do site, produzida pelo CLI `claude` rodando como
-- subprocesso (mesmo mecanismo do chatbot_7m, sem API paga). Guarda o que regex
-- nao consegue extrair: o que a empresa vende, porte, dor de atendimento e o
-- gancho de abordagem que a Etapa 2 vai usar para personalizar a mensagem.
--
-- `analyzer_version` e `model` ficam gravados para que uma reanalise futura possa
-- ser comparada com a anterior em vez de sobrescrever cegamente.
CREATE TABLE IF NOT EXISTS scout_prospect_briefs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prospect_id INT NOT NULL,
  analyzer_version VARCHAR(20) NOT NULL,
  model VARCHAR(60) NOT NULL,
  segmento VARCHAR(160) NULL,
  vende_json JSON NULL,
  catalogo ENUM('nenhum', 'pequeno', 'medio', 'grande', 'indefinido') NOT NULL DEFAULT 'indefinido',
  vende_online BOOLEAN NULL,
  atende_por_whatsapp BOOLEAN NULL,
  sinais_automacao_json JSON NULL,
  dores_json JSON NULL,
  integracoes_json JSON NULL,
  porte ENUM('mei', 'micro', 'pequeno', 'medio', 'grande', 'indefinido') NOT NULL DEFAULT 'indefinido',
  resumo TEXT NULL,
  gancho_abordagem TEXT NULL,
  confianca DECIMAL(3, 2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (prospect_id) REFERENCES scout_prospects(id) ON DELETE CASCADE,
  UNIQUE KEY scout_brief_unique (prospect_id, analyzer_version),
  INDEX idx_scout_briefs_porte (porte)
);

-- Opt-out. Criada ja na Etapa 1 porque a Etapa 2 tem de consultar isto antes de
-- qualquer envio, e honrar opt-out e obrigacao legal -- nao pode virar um arquivo
-- solto na maquina de alguem.
CREATE TABLE IF NOT EXISTS scout_blocklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_e164 VARCHAR(20) NULL,
  domain VARCHAR(255) NULL,
  reason ENUM('opt_out', 'manual', 'cliente', 'concorrente', 'invalido', 'denuncia') NOT NULL DEFAULT 'manual',
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY scout_blocklist_phone (phone_e164),
  INDEX idx_scout_blocklist_domain (domain)
);

-- ==========================================================================
-- Atendimento comercial com IA no chat do site
--
-- Reaproveita chat_conversations/chat_messages: a IA passa a ser um remetente
-- ('ai') ao lado do humano ('admin'), entao o historico antigo continua valendo
-- e a resposta manual pelo admin continua funcionando.
--
-- Mesma restricao de estilo do bloco acima: migrate.js corta o arquivo em cada
-- ponto e virgula, entao nenhum comentario pode conter um, e toda FOREIGN KEY
-- precisa ser inline no CREATE TABLE.
-- ==========================================================================

ALTER TABLE chat_messages MODIFY COLUMN sender ENUM('visitor', 'admin', 'ai') NOT NULL;

-- `mode` e o freio manual: com 'human' o worker para de responder aquela
-- conversa e ela fica so para o admin, que e o que se quer quando a IA trava ou
-- quando o assunto virou negociacao fina.
ALTER TABLE chat_conversations ADD COLUMN mode ENUM('ai', 'human') NOT NULL DEFAULT 'ai';

-- Sessao do CLI `claude` daquela conversa. O historico vive dentro da sessao
-- (--resume), nao em um array de mensagens montado por nos.
ALTER TABLE chat_conversations ADD COLUMN claude_session_id VARCHAR(64) NULL;

-- Hash dos mtimes de CLAUDE.md + PRECOS.md + ROTEIRO.md de quando a sessao
-- comecou. O conteudo desses arquivos entra no contexto uma unica vez, no inicio
-- da sessao: sem comparar o hash, editar a tabela de precos nao teria efeito
-- nenhum nas conversas ja abertas e o robo seguiria cotando o valor antigo.
ALTER TABLE chat_conversations ADD COLUMN prompt_fingerprint VARCHAR(64) NULL;

ALTER TABLE chat_conversations ADD COLUMN visitor_contact VARCHAR(200) NULL;

ALTER TABLE chat_conversations ADD COLUMN quote_status ENUM('none', 'presented', 'confirmed') NOT NULL DEFAULT 'none';

-- Fila de turnos da IA. Um turno leva de 30s a 2min, entao a rota publica so
-- enfileira e responde na hora -- o visitante ficaria olhando um request pendurado
-- se fosse sincrono. A fila e uma tabela, e nao um setTimeout em memoria, porque
-- um deploy no meio do turno perderia a mensagem do cliente para sempre.
CREATE TABLE IF NOT EXISTS chat_ai_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  trigger_message_id INT NULL,
  kind ENUM('reply', 'quote') NOT NULL DEFAULT 'reply',
  status ENUM('pending', 'running', 'done', 'error') NOT NULL DEFAULT 'pending',
  attempts TINYINT NOT NULL DEFAULT 0,
  error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
  INDEX idx_chat_ai_jobs_pending (status, id),
  INDEX idx_chat_ai_jobs_conversation (conversation_id)
);

-- Orcamento extraido da conversa quando o cliente confirma. `kanban_card_id`
-- fica sem FOREIGN KEY de proposito: apagar o card na producao automatizada nao
-- pode apagar o registro comercial de que o orcamento existiu.
CREATE TABLE IF NOT EXISTS chat_quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  project_name VARCHAR(200) NOT NULL,
  client_name VARCHAR(150) NULL,
  company_name VARCHAR(150) NULL,
  contact VARCHAR(200) NULL,
  service_type VARCHAR(100) NULL,
  summary TEXT NULL,
  requirements_json JSON NULL,
  integrations_json JSON NULL,
  price_min_brl DECIMAL(10, 2) NULL,
  price_max_brl DECIMAL(10, 2) NULL,
  monthly_brl DECIMAL(10, 2) NULL,
  timeline_weeks VARCHAR(40) NULL,
  payment_terms VARCHAR(1000) NULL,
  status ENUM('draft', 'confirmed', 'card_created', 'error') NOT NULL DEFAULT 'draft',
  kanban_card_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
  INDEX idx_chat_quotes_conversation (conversation_id)
);

-- Condicoes de pagamento vinham cortadas no meio da frase dentro do card: o modelo
-- descreve as tres formas (etapas, cartao, PIX) com os valores de cada uma, e isso passa
-- folgado dos 255 caracteres do desenho original.
ALTER TABLE chat_quotes MODIFY COLUMN payment_terms VARCHAR(1000) NULL;

-- ==========================================================================
-- WhatsApp (canal via Baileys) - portado do ominichain, so a parte que fala
-- direto com o protocolo do WhatsApp Web (sem navegador) - sem os canais que
-- dependiam de Playwright/Chromium la (Shopee, Gmail, MercadoLivre, Procon,
-- ReclameAqui, GoogleMeuNegocio), que nao entraram nesta migracao.
--
-- Uma unica conta conectada (nao multi-tenant) - status/QR ficam em
-- whatsapp_connection, tabela de linha unica no mesmo padrao de claude_usage
-- acima. Mesma restricao de estilo do resto do arquivo: migrate.js corta por
-- ponto e virgula, entao nenhum comentario pode conter um, e toda FOREIGN KEY
-- precisa ser inline no CREATE TABLE.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS whatsapp_connection (
  id TINYINT PRIMARY KEY DEFAULT 1,
  status ENUM('pending_auth', 'connected', 'disconnected') NOT NULL DEFAULT 'disconnected',
  qr_data TEXT NULL,
  phone_number VARCHAR(20) NULL,
  last_connected_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  external_jid VARCHAR(80) NOT NULL UNIQUE,
  display_name VARCHAR(150) NULL,
  avatar_url VARCHAR(500) NULL,
  phone_number VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT NOT NULL,
  last_message_at TIMESTAMP NULL,
  last_message_preview VARCHAR(160) NULL,
  unread_count INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  UNIQUE KEY whatsapp_conversations_contact_unique (contact_id),
  INDEX idx_whatsapp_conversations_last_message (last_message_at)
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  direction ENUM('inbound', 'outbound') NOT NULL,
  status ENUM('queued', 'sent', 'delivered', 'failed') NOT NULL DEFAULT 'sent',
  external_message_id VARCHAR(120) NULL,
  text TEXT NULL,
  attachment_type VARCHAR(20) NULL,
  attachment_url VARCHAR(500) NULL,
  attachment_mime VARCHAR(100) NULL,
  error_message TEXT NULL,
  sent_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  UNIQUE KEY whatsapp_messages_external_unique (conversation_id, external_message_id),
  INDEX idx_whatsapp_messages_conversation (conversation_id, sent_at)
);

-- Distingue conversa aberta pelo admin (via painel de leads do pegasus-scout,
-- getOrCreateConversationByPhone) de conversa aberta por quem escreveu primeiro
-- (contato/lead). A tela WhatsApp usa isso para listar so as que o admin
-- iniciou, sem misturar contatos pessoais trazidos pelo sync de historico do
-- numero escaneado. So e definido na criacao da conversa, nunca muda depois.
ALTER TABLE whatsapp_conversations ADD COLUMN started_by ENUM('admin', 'contact') NOT NULL DEFAULT 'contact' AFTER contact_id;

-- Backfill das conversas que ja existiam antes da coluna acima: olha a direcao
-- da primeira mensagem de cada conversa (outbound = admin mandou primeiro).
-- Conversa sem nenhuma mensagem so existe vinda do fluxo start-conversation,
-- entao tambem e do admin.
UPDATE whatsapp_conversations c
SET c.started_by = 'admin'
WHERE EXISTS (
  SELECT 1 FROM whatsapp_messages m
  WHERE m.conversation_id = c.id
  AND m.direction = 'outbound'
  AND m.sent_at = (SELECT MIN(m2.sent_at) FROM whatsapp_messages m2 WHERE m2.conversation_id = c.id)
)
OR NOT EXISTS (SELECT 1 FROM whatsapp_messages m3 WHERE m3.conversation_id = c.id);

-- Fila de execucoes do pegasus-scout, pedidas pelo admin em /admin/whatsapp e
-- processadas por um worker local (mesmo padrao do claude-kanban): o worker
-- reivindica a linha 'todo' mais antiga via /admin/scout/runs/claim-next e
-- reporta o resultado via mark-done/mark-error. So 1 linha fica 'doing' por
-- vez -- e 1 browser Playwright rodando numa maquina so.
CREATE TABLE IF NOT EXISTS scout_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  niche VARCHAR(160) NOT NULL,
  city VARCHAR(120) NOT NULL,
  state CHAR(2) NULL,
  radius_km DECIMAL(5, 2) NOT NULL DEFAULT 5,
  max_results INT NOT NULL DEFAULT 60,
  with_llm BOOLEAN NOT NULL DEFAULT TRUE,
  status ENUM('todo', 'doing', 'done', 'error') NOT NULL DEFAULT 'todo',
  result_json JSON NULL,
  error TEXT NULL,
  requested_by INT NULL,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_scout_runs_status (status)
);

-- ==========================================================================
-- IA vendedora no WhatsApp: sugestoes de resposta geradas pela IA que o admin
-- aprova/edita/descarta antes de enviar (nunca envio automatico -- numero real
-- em producao). A tabela whatsapp_ai_suggestions e fila E rascunho ao mesmo
-- tempo (status pending/running = fila, draft = rascunho aguardando o admin).
-- Fluxo: pending -> running -> draft -> approved_sent | discarded | superseded
-- (superseded = chegou mensagem nova ou o admin pediu regeneracao).
-- ==========================================================================

-- ai_enabled: o numero conectado e pessoal, entao o admin desliga a geracao
-- de sugestoes nas conversas que nao sao de venda (amigos/familia).
ALTER TABLE whatsapp_conversations ADD COLUMN ai_enabled BOOLEAN NOT NULL DEFAULT TRUE AFTER status;

-- collected_data: dados do cliente extraidos progressivamente pela IA durante
-- a conversa (nome, empresa, contato, servico, requisitos, estagio) -- exibidos
-- no painel lateral da tela WhatsApp, mesmo papel do QuotePanel de ConversasIA.
ALTER TABLE whatsapp_conversations ADD COLUMN collected_data JSON NULL AFTER ai_enabled;

CREATE TABLE IF NOT EXISTS whatsapp_ai_suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  kind ENUM('reply', 'cold_outreach') NOT NULL DEFAULT 'reply',
  status ENUM('pending', 'running', 'draft', 'approved_sent', 'discarded', 'superseded', 'error') NOT NULL DEFAULT 'pending',
  trigger_message_id INT NULL,
  prospect_id INT NULL,
  suggested_text TEXT NULL,
  final_text TEXT NULL,
  sent_message_id INT NULL,
  prompt_fingerprint VARCHAR(64) NULL,
  quote_marker ENUM('none', 'presented', 'confirmed') NOT NULL DEFAULT 'none',
  attempts TINYINT NOT NULL DEFAULT 0,
  error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  INDEX idx_wa_suggestions_pending (status, id),
  INDEX idx_wa_suggestions_conversation (conversation_id, id)
);

-- Mensagem que existiu de verdade no WhatsApp mas o Baileys nao conseguiu
-- ingerir sozinho (ex: falha de sessao/criptografia) -- o admin registra na mao
-- pra manter o historico e o contexto da IA completos. Sem external_message_id
-- porque nao veio de um evento do socket.
ALTER TABLE whatsapp_messages ADD COLUMN is_manual BOOLEAN NOT NULL DEFAULT FALSE AFTER direction;
