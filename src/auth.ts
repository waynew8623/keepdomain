import { getSetting, setSettingIfAbsent } from './db';

const encoder = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const bytes = new Uint8Array(sig);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string, ttlSeconds = 7 * 24 * 3600): Promise<string> {
  const exp = Date.now() + ttlSeconds * 1000;
  const payload = 'admin:' + exp;
  const sig = await hmac(secret, payload);
  return payload + '.' + sig;
}

export async function verifySessionToken(secret: string, token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(secret, payload);
  if (!timingSafeEqual(sig, expected)) return false;
  const parts = payload.split(':');
  if (parts.length !== 2 || parts[0] !== 'admin') return false;
  const exp = Number(parts[1]);
  return Number.isFinite(exp) && exp > Date.now();
}

/**
 * 会话签名密钥：首次运行时自动生成强随机值并持久化到 D1，
 * 之后复用同一密钥，跨请求、跨边缘节点一致，无需手动配置。
 */
export async function getOrCreateSessionSecret(db: D1Database): Promise<string> {
  const existing = await getSetting(db, 'session_secret');
  if (existing) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let secret = '';
  for (const b of bytes) secret += b.toString(16).padStart(2, '0');
  await setSettingIfAbsent(db, 'session_secret', secret);
  // 读回 DB 中的值，避免并发首次写入导致的密钥不一致
  return (await getSetting(db, 'session_secret')) || secret;
}
