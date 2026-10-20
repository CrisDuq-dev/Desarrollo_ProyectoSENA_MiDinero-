-- =====================================================================
--  MI DINERO+ — ESQUEMA DE BASE DE DATOS
-- =====================================================================
--  Proyecto : Mi Dinero+ (gestor de finanzas personales)
--  Autor    : Cristian Camilo Duque Franco
--  Motor    : MySQL 8+ / MariaDB 10.4+ / TiDB Cloud (compatible con MySQL)
--  Charset  : utf8mb4  |  Collation: utf8mb4_unicode_ci
--
--  Este archivo contiene SOLO la estructura (tablas, llaves, índices y
--  relaciones). No incluye ningún dato de usuarios ni registros.
--  Es seguro ejecutarlo varias veces: usa CREATE ... IF NOT EXISTS.
--
--  CÓMO USARLO
--  -----------
--  * Local (XAMPP + MySQL Workbench / phpMyAdmin):
--      ejecutar el archivo completo. Crea la base `mi_dinero_plus`.
--  * Nube (TiDB Cloud Starter u otro MySQL gestionado):
--      si tu plataforma ya te entrega una base creada, borra o comenta
--      las líneas CREATE DATABASE y USE de abajo, selecciona tu base
--      y ejecuta el resto.
--
--  MAPA DE TABLAS
--  --------------
--   1. users                       Cuentas de usuario y datos de autenticación
--   2. user_profiles               Perfil laboral y avatar del usuario
--   3. simulation_settings         Preferencias de la aplicación por usuario
--   4. transactions                Ingresos y gastos
--   5. savings_goals               Metas de ahorro
--   6. savings_goal_contributions  Aportes realizados a cada meta
--   7. debts                       Deudas del usuario
--   8. debt_payments               Pagos (abonos) realizados a cada deuda
--   9. financial_activities        Centro de actividad / notificaciones
--  10. refresh_tokens              Sesiones renovables (refresh tokens)
--
--  RELACIONES
--  ----------
--  users 1 ─── 1 user_profiles
--  users 1 ─── 1 simulation_settings
--  users 1 ─── N transactions
--  users 1 ─── N savings_goals ─── N savings_goal_contributions
--  users 1 ─── N debts         ─── N debt_payments
--  users 1 ─── N financial_activities
--  users 1 ─── N refresh_tokens
--  Todas las llaves foráneas usan ON DELETE CASCADE: al eliminar un
--  usuario se eliminan también todos sus datos asociados.
--
--  NOTAS DE DISEÑO
--  ---------------
--  * Todos los valores monetarios se guardan en COP (pesos colombianos)
--    con DECIMAL(18,2); las tasas USD/EUR de cada transacción se guardan
--    aparte para poder mostrar su equivalente histórico.
--  * Metas, deudas y transacciones usan "borrado lógico" (deleted_at):
--    el registro no se elimina, solo se marca como eliminado.
--  * Los tokens de verificación, recuperación y refresh se guardan con
--    expiración; los refresh tokens se almacenan como hash SHA-256.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `mi_dinero_plus`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `mi_dinero_plus`;

SET NAMES utf8mb4;


-- =====================================================================
-- 1. users
--    Cuentas de usuario. Soporta registro local (correo + contraseña)
--    e inicio de sesión con Google. Guarda también los tokens
--    temporales de verificación de correo y recuperación de contraseña.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
                           COMMENT 'Identificador único del usuario',
  `full_name`              VARCHAR(150) NOT NULL
                           COMMENT 'Nombre completo',
  `email`                  VARCHAR(255) NOT NULL
                           COMMENT 'Correo electrónico (único)',
  `email_verified_at`      TIMESTAMP NULL DEFAULT NULL
                           COMMENT 'Fecha en que se verificó el correo (opcional)',
  `password_hash`          VARCHAR(255) NULL DEFAULT NULL
                           COMMENT 'Hash bcrypt de la contraseña; NULL si la cuenta es solo de Google',
  `account_status`         ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active'
                           COMMENT 'Estado de la cuenta',
  `email_verified`         TINYINT(1) NOT NULL DEFAULT 0
                           COMMENT '1 = correo verificado, 0 = pendiente',
  `email_verify_token`     VARCHAR(64) NULL DEFAULT NULL
                           COMMENT 'Token temporal para verificar el correo',
  `email_verify_expires`   DATETIME NULL DEFAULT NULL
                           COMMENT 'Vencimiento del token de verificación',
  `reset_password_token`   VARCHAR(64) NULL DEFAULT NULL
                           COMMENT 'Token temporal para recuperar la contraseña',
  `reset_password_expires` DATETIME NULL DEFAULT NULL
                           COMMENT 'Vencimiento del token de recuperación',
  `google_id`              VARCHAR(64) NULL DEFAULT NULL
                           COMMENT 'Identificador de la cuenta de Google (inicio con Google)',
  `auth_provider`          VARCHAR(20) NOT NULL DEFAULT 'local'
                           COMMENT 'Método de registro: local o google',
  `created_at`             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                           COMMENT 'Fecha de creación',
  `updated_at`             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                           COMMENT 'Última modificación',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_google_id` (`google_id`),
  KEY `idx_users_verify_token` (`email_verify_token`),
  KEY `idx_users_reset_token` (`reset_password_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cuentas de usuario y datos de autenticación';


-- =====================================================================
-- 2. user_profiles
--    Perfil de cada usuario (relación 1 a 1 con users): cargo, empresa
--    y configuración del avatar (editor DiceBear).
-- =====================================================================
CREATE TABLE IF NOT EXISTS `user_profiles` (
  `user_id`        BIGINT UNSIGNED NOT NULL
                   COMMENT 'Usuario dueño del perfil (PK y FK a users.id)',
  `job_role`       VARCHAR(100) NULL DEFAULT 'Asesor Comercial'
                   COMMENT 'Cargo o rol del usuario',
  `company_name`   VARCHAR(150) NULL DEFAULT 'Meta Autos Medellín'
                   COMMENT 'Empresa donde trabaja',
  `avatar_mode`    ENUM('initial','animal') NULL DEFAULT 'initial'
                   COMMENT 'Modo de avatar heredado: inicial o animal',
  `avatar_color`   VARCHAR(12) NULL DEFAULT '#10B981'
                   COMMENT 'Color de fondo del avatar (hexadecimal)',
  `avatar_type`    VARCHAR(30) NULL DEFAULT 'dicebear'
                   COMMENT 'Tipo de avatar',
  `avatar_style`   VARCHAR(60) NULL DEFAULT 'avataaars'
                   COMMENT 'Estilo DiceBear del avatar',
  `avatar_seed`    VARCHAR(120) NULL DEFAULT NULL
                   COMMENT 'Semilla que genera el avatar',
  `avatar_options` LONGTEXT NULL DEFAULT NULL
                   COMMENT 'Opciones del avatar guardadas como texto JSON',
  `avatar_url`     TEXT NULL DEFAULT NULL
                   COMMENT 'URL final del avatar generado',
  `avatar_animal`  VARCHAR(50) NULL DEFAULT NULL
                   COMMENT 'Animal elegido (modo animal)',
  `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                   COMMENT 'Última modificación',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_profile_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Perfil laboral y avatar del usuario';


-- =====================================================================
-- 3. simulation_settings
--    Preferencias de la aplicación por usuario: moneda, nivel
--    educativo del asistente, IA, animaciones y tema visual.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `simulation_settings` (
  `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
                         COMMENT 'Identificador de la configuración',
  `user_id`              BIGINT UNSIGNED NOT NULL
                         COMMENT 'Usuario dueño de la configuración (único)',
  `currency_code`        CHAR(3) NULL DEFAULT 'COP'
                         COMMENT 'Moneda de visualización (código ISO)',
  `education_level`      ENUM('basic','intermediate','advanced') NULL DEFAULT 'basic'
                         COMMENT 'Nivel educativo financiero para el asistente',
  `ai_assistant_enabled` TINYINT(1) NULL DEFAULT 1
                         COMMENT '1 = asistente de IA activo',
  `animations_enabled`   TINYINT(1) NULL DEFAULT 1
                         COMMENT '1 = animaciones activas',
  `theme`                ENUM('light','dark') NULL DEFAULT 'light'
                         COMMENT 'Tema visual: claro u oscuro',
  `updated_at`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                         COMMENT 'Última modificación',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_settings_user` (`user_id`),
  CONSTRAINT `fk_settings_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Preferencias de la aplicación por usuario';


-- =====================================================================
-- 4. transactions
--    Ingresos y gastos del usuario. Guarda la tasa USD y EUR del día
--    para poder mostrar el equivalente en otras monedas. Borrado lógico.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `transactions` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
                     COMMENT 'Identificador de la transacción',
  `user_id`          BIGINT UNSIGNED NOT NULL
                     COMMENT 'Usuario dueño de la transacción',
  `transaction_type` ENUM('income','expense') NOT NULL
                     COMMENT 'Tipo: income = ingreso, expense = gasto',
  `amount_cop`       DECIMAL(18,2) NOT NULL
                     COMMENT 'Monto en pesos colombianos',
  `rate_usd`         DECIMAL(18,10) NULL DEFAULT NULL
                     COMMENT 'Tasa COP→USD vigente al registrar',
  `rate_eur`         DECIMAL(18,10) NULL DEFAULT NULL
                     COMMENT 'Tasa COP→EUR vigente al registrar',
  `transaction_date` DATE NOT NULL
                     COMMENT 'Fecha en que ocurrió la transacción',
  `description`      VARCHAR(255) NOT NULL
                     COMMENT 'Descripción de la transacción',
  `category_code`    VARCHAR(50) NOT NULL
                     COMMENT 'Categoría (Salario, Alimentación, Transporte, etc.)',
  `created_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                     COMMENT 'Fecha de creación',
  `updated_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                     COMMENT 'Última modificación',
  `deleted_at`       TIMESTAMP NULL DEFAULT NULL
                     COMMENT 'Borrado lógico: NULL = activa, fecha = eliminada',
  PRIMARY KEY (`id`),
  KEY `idx_tx_user_date` (`user_id`, `transaction_date`),
  KEY `idx_tx_user_type` (`user_id`, `transaction_type`),
  CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Ingresos y gastos del usuario';


-- =====================================================================
-- 5. savings_goals
--    Metas de ahorro: monto objetivo, monto acumulado, fecha límite y
--    prioridad. Borrado lógico.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `savings_goals` (
  `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
                       COMMENT 'Identificador de la meta',
  `user_id`            BIGINT UNSIGNED NOT NULL
                       COMMENT 'Usuario dueño de la meta',
  `name`               VARCHAR(150) NOT NULL
                       COMMENT 'Nombre de la meta',
  `target_amount_cop`  DECIMAL(18,2) NOT NULL
                       COMMENT 'Monto objetivo en COP',
  `current_amount_cop` DECIMAL(18,2) NOT NULL DEFAULT 0.00
                       COMMENT 'Monto ahorrado hasta el momento en COP',
  `deadline`           DATE NOT NULL
                       COMMENT 'Fecha límite para cumplir la meta',
  `priority`           ENUM('low','medium','high') NULL DEFAULT 'medium'
                       COMMENT 'Prioridad: baja, media o alta',
  `status`             ENUM('active','completed','cancelled') NULL DEFAULT 'active'
                       COMMENT 'Estado: activa, completada o cancelada',
  `completed_at`       TIMESTAMP NULL DEFAULT NULL
                       COMMENT 'Fecha en que se completó la meta',
  `created_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                       COMMENT 'Fecha de creación',
  `updated_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                       COMMENT 'Última modificación',
  `deleted_at`         TIMESTAMP NULL DEFAULT NULL
                       COMMENT 'Borrado lógico: NULL = activa, fecha = eliminada',
  PRIMARY KEY (`id`),
  KEY `idx_goals_user` (`user_id`),
  CONSTRAINT `fk_goals_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Metas de ahorro del usuario';


-- =====================================================================
-- 6. savings_goal_contributions
--    Aportes que el usuario realiza a cada meta de ahorro.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `savings_goal_contributions` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
                      COMMENT 'Identificador del aporte',
  `goal_id`           BIGINT UNSIGNED NOT NULL
                      COMMENT 'Meta a la que pertenece el aporte',
  `amount_cop`        DECIMAL(18,2) NOT NULL
                      COMMENT 'Monto aportado en COP',
  `contribution_date` DATE NOT NULL
                      COMMENT 'Fecha del aporte',
  `created_at`        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                      COMMENT 'Fecha de registro',
  PRIMARY KEY (`id`),
  KEY `idx_contrib_goal` (`goal_id`),
  CONSTRAINT `fk_contributions_goal` FOREIGN KEY (`goal_id`)
    REFERENCES `savings_goals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Aportes realizados a cada meta de ahorro';


-- =====================================================================
-- 7. debts
--    Deudas del usuario: monto total, saldo pendiente, interés mensual
--    y fecha de vencimiento. Borrado lógico.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `debts` (
  `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
                          COMMENT 'Identificador de la deuda',
  `user_id`               BIGINT UNSIGNED NOT NULL
                          COMMENT 'Usuario dueño de la deuda',
  `name`                  VARCHAR(150) NOT NULL
                          COMMENT 'Nombre o acreedor de la deuda',
  `total_amount_cop`      DECIMAL(18,2) NOT NULL
                          COMMENT 'Monto total original en COP',
  `pending_balance_cop`   DECIMAL(18,2) NOT NULL
                          COMMENT 'Saldo pendiente por pagar en COP',
  `due_date`              DATE NOT NULL
                          COMMENT 'Fecha de vencimiento',
  `interest_rate_monthly` DECIMAL(8,4) NULL DEFAULT 0.0000
                          COMMENT 'Interés mensual en porcentaje',
  `status`                ENUM('active','paid','cancelled') NULL DEFAULT 'active'
                          COMMENT 'Estado: activa, pagada o cancelada',
  `paid_at`               TIMESTAMP NULL DEFAULT NULL
                          COMMENT 'Fecha en que se pagó por completo',
  `created_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                          COMMENT 'Fecha de creación',
  `updated_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                          COMMENT 'Última modificación',
  `deleted_at`            TIMESTAMP NULL DEFAULT NULL
                          COMMENT 'Borrado lógico: NULL = activa, fecha = eliminada',
  PRIMARY KEY (`id`),
  KEY `idx_debts_user` (`user_id`),
  CONSTRAINT `fk_debts_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Deudas del usuario';


-- =====================================================================
-- 8. debt_payments
--    Pagos (abonos) realizados a cada deuda, con el saldo restante
--    después de cada pago.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `debt_payments` (
  `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
                          COMMENT 'Identificador del pago',
  `debt_id`               BIGINT UNSIGNED NOT NULL
                          COMMENT 'Deuda a la que pertenece el pago',
  `amount_cop`            DECIMAL(18,2) NOT NULL
                          COMMENT 'Monto pagado en COP',
  `payment_date`          DATE NOT NULL
                          COMMENT 'Fecha del pago',
  `remaining_balance_cop` DECIMAL(18,2) NOT NULL
                          COMMENT 'Saldo pendiente después del pago, en COP',
  `created_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                          COMMENT 'Fecha de registro',
  PRIMARY KEY (`id`),
  KEY `idx_payments_debt` (`debt_id`),
  CONSTRAINT `fk_payments_debt` FOREIGN KEY (`debt_id`)
    REFERENCES `debts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Pagos realizados a cada deuda';


-- =====================================================================
-- 9. financial_activities
--    Centro de actividad: historial y notificaciones de lo que el
--    usuario hace (crear transacciones, aportar a metas, pagar deudas).
-- =====================================================================
CREATE TABLE IF NOT EXISTS `financial_activities` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
                COMMENT 'Identificador de la actividad',
  `user_id`     BIGINT UNSIGNED NOT NULL
                COMMENT 'Usuario al que pertenece la actividad',
  `category`    ENUM('transactions','goals','debts') NOT NULL
                COMMENT 'Módulo que generó la actividad',
  `event_type`  VARCHAR(80) NOT NULL
                COMMENT 'Tipo de evento (por ejemplo: debt_created, debt_payment_created)',
  `title`       VARCHAR(160) NOT NULL
                COMMENT 'Texto que se muestra al usuario',
  `event_date`  DATE NOT NULL
                COMMENT 'Fecha del evento',
  `event_time`  TIME NULL DEFAULT NULL
                COMMENT 'Hora del evento',
  `entity_type` VARCHAR(50) NULL DEFAULT NULL
                COMMENT 'Tipo de registro relacionado (transaction, goal, debt)',
  `entity_id`   BIGINT UNSIGNED NULL DEFAULT NULL
                COMMENT 'Id del registro relacionado',
  `payload`     LONGTEXT NULL DEFAULT NULL
                COMMENT 'Datos adicionales del evento en texto JSON',
  `is_read`     TINYINT(1) NULL DEFAULT 0
                COMMENT '0 = no leída, 1 = leída',
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                COMMENT 'Fecha de creación',
  PRIMARY KEY (`id`),
  KEY `idx_activities_user_created` (`user_id`, `created_at`),
  KEY `idx_activities_user_read` (`user_id`, `is_read`),
  CONSTRAINT `fk_activities_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Centro de actividad y notificaciones del usuario';


-- =====================================================================
-- 10. refresh_tokens
--     Sesiones renovables. Cada fila es una sesión: el token se guarda
--     como hash SHA-256 (nunca en claro) y se rota en cada renovación.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
                COMMENT 'Identificador de la sesión',
  `user_id`     BIGINT UNSIGNED NOT NULL
                COMMENT 'Usuario dueño de la sesión',
  `token_hash`  CHAR(64) NOT NULL
                COMMENT 'Hash SHA-256 del refresh token',
  `expires_at`  DATETIME NOT NULL
                COMMENT 'Fecha de vencimiento de la sesión',
  `revoked_at`  DATETIME NULL DEFAULT NULL
                COMMENT 'Fecha de revocación (cierre de sesión o rotación); NULL = vigente',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                COMMENT 'Fecha de creación',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refresh_hash` (`token_hash`),
  KEY `idx_refresh_user` (`user_id`),
  KEY `idx_refresh_expires` (`expires_at`),
  CONSTRAINT `fk_refresh_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Sesiones renovables (refresh tokens con rotación)';


-- =====================================================================
-- FIN DEL ESQUEMA — base de datos vacía y lista para usarse.
-- Los registros se crean desde la aplicación (registro de usuarios).
-- =====================================================================