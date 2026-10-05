CREATE DATABASE IF NOT EXISTS taskflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE taskflow;

CREATE TABLE IF NOT EXISTS users (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100)  NOT NULL,
  username     VARCHAR(40)   NOT NULL,
  email        VARCHAR(150)  NOT NULL,
  password     VARCHAR(255)  NOT NULL,
  role         ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  avatar       VARCHAR(255)  DEFAULT NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT uq_users_username UNIQUE (username),
  INDEX idx_users_email (email)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS projects (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(150)  NOT NULL,
  description  TEXT          DEFAULT NULL,
  start_date   DATE          DEFAULT NULL,
  end_date     DATE          DEFAULT NULL,
  status       ENUM('PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD') NOT NULL DEFAULT 'PLANNING',
  created_by   INT UNSIGNED  NOT NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_projects_created_by (created_by),
  INDEX idx_projects_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_members (
  project_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  role ENUM('MANAGER', 'MEMBER', 'VIEWER') NOT NULL DEFAULT 'MEMBER',
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id),
  CONSTRAINT fk_project_members_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;



CREATE TABLE IF NOT EXISTS tasks (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id   INT UNSIGNED  NOT NULL,
  title        VARCHAR(200)  NOT NULL,
  description  TEXT          DEFAULT NULL,
  priority     ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
  status       ENUM('TODO', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'TODO',
  due_date     DATE          DEFAULT NULL,
  created_by   INT UNSIGNED  NOT NULL,
  assigned_to  INT UNSIGNED  DEFAULT NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_tasks_project    FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by)  REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_tasks_assigned   FOREIGN KEY (assigned_to) REFERENCES users(id)    ON DELETE SET NULL,

  INDEX idx_tasks_project_id  (project_id),
  INDEX idx_tasks_assigned_to (assigned_to),
  INDEX idx_tasks_status      (status),
  INDEX idx_tasks_priority    (priority)
) ENGINE=InnoDB;
