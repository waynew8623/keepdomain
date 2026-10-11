export interface Domain {
  id: string;
  account: string;
  platform: string;
  domain: string;
  expire_date: string;
  notify_days_ahead: number;
  status: 'active' | 'renewed' | 'abandoned';
  last_notified_date: string | null;
  created_at: string;
  updated_at: string;
}

export type DomainInput = Pick<Domain, 'account' | 'platform' | 'domain' | 'expire_date' | 'notify_days_ahead'>;

export interface Settings {
  notify_email: string;
  from_email: string;
  resend_api_key: string;
}

export const DEFAULT_SETTINGS: Settings = {
  notify_email: '',
  from_email: 'notify@resend.dev',
  resend_api_key: '',
};

export const DEFAULT_NOTIFY_DAYS = 30;

export function nowIso(): string {
  return new Date().toISOString();
}

export function uuid(): string {
  return crypto.randomUUID();
}

export async function listDomains(db: D1Database): Promise<Domain[]> {
  const { results } = await db
    .prepare('SELECT * FROM domains ORDER BY expire_date ASC, domain ASC')
    .all<Domain>();
  return results ?? [];
}

export async function listActiveDomains(db: D1Database): Promise<Domain[]> {
  const { results } = await db
    .prepare("SELECT * FROM domains WHERE status = 'active' ORDER BY expire_date ASC")
    .all<Domain>();
  return results ?? [];
}

export async function getDomain(db: D1Database, id: string): Promise<Domain | null> {
  return db.prepare('SELECT * FROM domains WHERE id = ?').bind(id).first<Domain>();
}

export async function createDomain(db: D1Database, input: DomainInput): Promise<Domain> {
  const d: Domain = {
    id: uuid(),
    account: input.account,
    platform: input.platform,
    domain: input.domain,
    expire_date: input.expire_date,
    notify_days_ahead: input.notify_days_ahead,
    status: 'active',
    last_notified_date: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await db
    .prepare(
      'INSERT INTO domains (id, account, platform, domain, expire_date, notify_days_ahead, status, last_notified_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(d.id, d.account, d.platform, d.domain, d.expire_date, d.notify_days_ahead, d.status, d.last_notified_date, d.created_at, d.updated_at)
    .run();
  return d;
}

export async function updateDomain(db: D1Database, id: string, input: DomainInput): Promise<Domain | null> {
  const existing = await getDomain(db, id);
  if (!existing) return null;
  const updatedAt = nowIso();
  await db
    .prepare(
      'UPDATE domains SET account = ?, platform = ?, domain = ?, expire_date = ?, notify_days_ahead = ?, updated_at = ? WHERE id = ?'
    )
    .bind(input.account, input.platform, input.domain, input.expire_date, input.notify_days_ahead, updatedAt, id)
    .run();
  return { ...existing, ...input, updated_at: updatedAt };
}

export async function deleteDomain(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM domains WHERE id = ?').bind(id).run();
}

export async function confirmDomain(
  db: D1Database,
  id: string,
  status: 'renewed' | 'abandoned'
): Promise<Domain | null> {
  const existing = await getDomain(db, id);
  if (!existing) return null;
  const updatedAt = nowIso();
  await db
    .prepare('UPDATE domains SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, updatedAt, id)
    .run();
  return { ...existing, status, updated_at: updatedAt };
}

export async function setLastNotifiedDate(db: D1Database, id: string, dateStr: string): Promise<void> {
  await db.prepare('UPDATE domains SET last_notified_date = ? WHERE id = ?').bind(dateStr, id).run();
}

export async function getSettings(db: D1Database): Promise<Settings> {
  const { results } = await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  const map = new Map((results ?? []).map((r) => [r.key, r.value]));
  return {
    notify_email: map.get('notify_email') ?? DEFAULT_SETTINGS.notify_email,
    from_email: map.get('from_email') ?? DEFAULT_SETTINGS.from_email,
    resend_api_key: map.get('resend_api_key') ?? DEFAULT_SETTINGS.resend_api_key,
  };
}

export async function updateSettings(db: D1Database, s: Settings): Promise<void> {
  const entries: Array<[string, string]> = [
    ['notify_email', s.notify_email],
    ['from_email', s.from_email],
    ['resend_api_key', s.resend_api_key],
  ];
  for (const [k, v] of entries) {
    await db
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .bind(k, v)
      .run();
  }
}

export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
  return row ? row.value : null;
}

export async function setSettingIfAbsent(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING')
    .bind(key, value)
    .run();
}
