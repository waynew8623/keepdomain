-- 域名记录表
CREATE TABLE IF NOT EXISTS domains (
  id                 TEXT PRIMARY KEY,                     -- UUID
  account            TEXT NOT NULL DEFAULT '',             -- 账户名
  platform           TEXT NOT NULL,                        -- 申请平台（阿里云/腾讯云/Cloudflare…）
  domain             TEXT NOT NULL,                        -- 域名
  expire_date        TEXT NOT NULL,                        -- 续费/到期时间 YYYY-MM-DD
  notify_days_ahead  INTEGER NOT NULL DEFAULT 30,          -- 提前提醒天数（每个域名独立设置）
  status             TEXT NOT NULL DEFAULT 'active',       -- active | renewed | abandoned
  last_notified_date TEXT,                                 -- 最近一次发信日期 YYYY-MM-DD（GMT+8），用于每日去重
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_domains_status ON domains (status);

-- 配置表（单行 key-value）
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 默认配置：notify_email / resend_api_key 留空，部署后到管理页填写
-- session_secret 由程序首次运行时自动生成，无需在此预置
INSERT INTO settings (key, value) VALUES
  ('notify_email', ''),
  ('from_email', 'notify@resend.dev'),
  ('resend_api_key', '')
ON CONFLICT(key) DO NOTHING;
