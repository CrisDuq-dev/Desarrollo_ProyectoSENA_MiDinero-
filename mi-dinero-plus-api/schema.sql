-- ============================================================
-- Mi Dinero+ — Esquema de base de datos (MySQL 8+)
-- Inferido y documentado a partir del código de la API.
-- Usar con MySQL Workbench / XAMPP. Charset utf8mb4.
-- ============================================================

CREATE DATABASE IF NOT EXISTS mi_dinero_plus
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mi_dinero_plus;

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name             VARCHAR(120) NOT NULL,
  email                 VARCHAR(255) NOT NULL,
  password_hash         VARCHAR(255) NULL COMMENT 'NULL cuando auth_provider = google',
  email_verified        TINYINT(1) NOT NULL DEFAULT 0,
  email_verify_token    VARCHAR(64) NULL,
  email_verify_expires  DATETIME NULL,
  password_reset_token  VARCHAR(64) NULL,
  password_reset_expires DATETIME NULL,
  google_id             VARCHAR(64) NULL,
  auth_provider         ENUM('local', 'google') NOT NULL DEFAULT 'local',
  account_status        ENUM('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active',
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_google_id (google_id),
  KEY idx_users_verify_token (email_verify_token),
  KEY idx_users_reset_token (password_reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- user_profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id               BIGINT UNSIGNED NOT NULL,
  avatar_url            VARCHAR(512) NULL,
  education_level       ENUM('basic', 'intermediate', 'advanced') NULL DEFAULT 'basic',
  preferred_currency    VARCHAR(8) NULL DEFAULT 'COP',
  timezone              VARCHAR(64) NULL,
  onboarding_completed  TINYINT(1) NOT NULL DEFAULT 0,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- simulation_settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS simulation_settings (
  user_id               BIGINT UNSIGNED NOT NULL,
  initial_balance_cop   DECIMAL(15,2) NULL DEFAULT 0,
  simulation_started_at DATETIME NULL,
  is_active             TINYINT(1) NOT NULL DEFAULT 1,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_sim_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- transactions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id               BIGINT UNSIGNED NOT NULL,
  transaction_type      ENUM('income', 'expense') NOT NULL,
  amount_cop            DECIMAL(15,2) NOT NULL,
  rate_usd              DECIMAL(12,6) NULL,
  rate_eur              DECIMAL(12,6) NULL,
  transaction_date      DATE NOT NULL,
  description           VARCHAR(255) NULL,
  category_code         VARCHAR(64) NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tx_user_date (user_id, transaction_date),
  KEY idx_tx_user_type (user_id, transaction_type),
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- savings_goals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings_goals (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id               BIGINT UNSIGNED NOT NULL,
  name                  VARCHAR(120) NOT NULL,
  target_amount_cop     DECIMAL(15,2) NOT NULL,
  current_amount_cop    DECIMAL(15,2) NOT NULL DEFAULT 0,
  deadline              DATE NULL,
  status                ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_goals_user (user_id),
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- savings_goal_contributions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings_goal_contributions (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  goal_id               INT UNSIGNED NOT NULL,
  amount_cop            DECIMAL(15,2) NOT NULL,
  contribution_date     DATE NOT NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contrib_goal (goal_id),
  CONSTRAINT fk_contrib_goal FOREIGN KEY (goal_id) REFERENCES savings_goals (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- debts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS debts (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id               BIGINT UNSIGNED NOT NULL,
  name                  VARCHAR(120) NOT NULL,
  principal_cop         DECIMAL(15,2) NOT NULL,
  remaining_balance_cop DECIMAL(15,2) NOT NULL,
  interest_rate         DECIMAL(8,4) NULL,
  due_date              DATE NULL,
  status                ENUM('active', 'paid', 'cancelled') NOT NULL DEFAULT 'active',
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_debts_user (user_id),
  CONSTRAINT fk_debts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- debt_payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS debt_payments (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  debt_id               INT UNSIGNED NOT NULL,
  amount_cop            DECIMAL(15,2) NOT NULL,
  payment_date          DATE NOT NULL,
  remaining_balance_cop DECIMAL(15,2) NOT NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_debt (debt_id),
  CONSTRAINT fk_payments_debt FOREIGN KEY (debt_id) REFERENCES debts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- financial_activities (feed de actividad)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_activities (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id               BIGINT UNSIGNED NOT NULL,
  activity_type         VARCHAR(64) NOT NULL,
  title                 VARCHAR(255) NOT NULL,
  description           VARCHAR(512) NULL,
  related_id            INT UNSIGNED NULL COMMENT 'id de transacción/meta/deuda según tipo',
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_act_user_created (user_id, created_at),
  CONSTRAINT fk_act_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- refresh_tokens (rotación, un dispositivo/sesión por fila)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  token_hash    CHAR(64) NOT NULL COMMENT 'SHA-256 del refresh en claro',
  expires_at    DATETIME NOT NULL,
  revoked_at    DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_hash (token_hash),
  KEY idx_refresh_user (user_id),
  KEY idx_refresh_expires (expires_at),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
