-- 从旧版 schema 迁移到新版（保留已有数据）
-- 变更点：
--   1. domains 表删除 register_date，新增 account、notify_days_ahead
--   2. settings 表删除 notify_days_ahead 行
--   3. 若 from_email 仍是旧默认值 onboarding@resend.dev，则更新为新默认值 notify@resend.dev

-- 1. 备份并重建 domains 表
CREATE TABLE domains_new (
  id                 TEXT PRIMARY KEY,
  account            TEXT NOT NULL DEFAULT '',
  platform           TEXT NOT NULL,
  domain             TEXT NOT NULL,
  expire_date        TEXT NOT NULL,
  notify_days_ahead  INTEGER NOT NULL DEFAULT 30,
  status             TEXT NOT NULL DEFAULT 'active',
  last_notified_date TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

INSERT INTO domains_new
  (id, account, platform, domain, expire_date, notify_days_ahead, status, last_notified_date, created_at, updated_at)
SELECT
  id, '', platform, domain, expire_date, 30, status, last_notified_date, created_at, updated_at
FROM domains;

DROP TABLE domains;
ALTER TABLE domains_new RENAME TO domains;
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains (status);

-- 2. 移除旧的全局提前天数配置（已改为每域名独立）
DELETE FROM settings WHERE key = 'notify_days_ahead';

-- 3. 发件地址旧默认值 → 新默认值（仅当仍为旧默认值时才更新，不影响你手动改过的值）
UPDATE settings SET value = 'notify@resend.dev' WHERE key = 'from_email' AND value = 'onboarding@resend.dev';
