CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NOT NULL,
  content LONGTEXT,
  tag VARCHAR(100) NOT NULL,
  tag_color VARCHAR(20) NOT NULL DEFAULT '#22d3ee',
  read_time VARCHAR(20) NOT NULL DEFAULT '5 min',
  trending BOOLEAN NOT NULL DEFAULT FALSE,
  published_at DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consent_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  analytics_consent BOOLEAN NOT NULL,
  marketing_consent BOOLEAN NOT NULL,
  ip_address VARCHAR(64),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_consent_session (session_id)
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  page_path VARCHAR(255),
  referrer VARCHAR(255),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  meta JSON,
  ip_address VARCHAR(64),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_events_session (session_id),
  INDEX idx_events_created (created_at),
  INDEX idx_events_type (event_type)
);

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
