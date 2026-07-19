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

CREATE TABLE IF NOT EXISTS affiliates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  whatsapp VARCHAR(30) NOT NULL,
  pix_key VARCHAR(150),
  password_hash VARCHAR(255) NOT NULL,
  reset_token VARCHAR(64),
  reset_token_expires TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_affiliates_reset_token (reset_token)
);

ALTER TABLE affiliates ADD COLUMN reset_token VARCHAR(64);
ALTER TABLE affiliates ADD COLUMN reset_token_expires TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  affiliate_id INT NOT NULL,
  contact_name VARCHAR(150) NOT NULL,
  company_name VARCHAR(150),
  contact_info VARCHAR(150) NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  already_notified BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('novo', 'contatado', 'negociando', 'fechado', 'finalizado', 'sem_interesse', 'cancelado') NOT NULL DEFAULT 'novo',
  commission_type ENUM('unico', 'mensalidade') NOT NULL DEFAULT 'unico',
  closed_value DECIMAL(10, 2),
  commission_value DECIMAL(10, 2),
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
  INDEX idx_referrals_affiliate (affiliate_id),
  INDEX idx_referrals_status (status)
);

ALTER TABLE referrals MODIFY COLUMN status ENUM('novo', 'contatado', 'negociando', 'fechado', 'finalizado', 'sem_interesse', 'cancelado') NOT NULL DEFAULT 'novo';

CREATE TABLE IF NOT EXISTS affiliate_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  affiliate_id INT NOT NULL,
  referral_id INT,
  message VARCHAR(255) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
  FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE SET NULL,
  INDEX idx_notifications_affiliate (affiliate_id)
);

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
