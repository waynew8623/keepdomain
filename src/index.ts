import { Hono, type Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import {
  listDomains,
  createDomain,
  updateDomain,
  deleteDomain,
  confirmDomain,
  getSettings,
  updateSettings,
  DEFAULT_NOTIFY_DAYS,
  type DomainInput,
} from './db';
import { createSessionToken, verifySessionToken, getOrCreateSessionSecret } from './auth';
import { sendEmail } from './email';
import { runDailyNotification, isValidDate } from './notify';
import { ADMIN_HTML } from './ui';

type Env = {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  APP_NAME?: string;
};

const DEFAULT_PASSWORD = 'admin123';

const app = new Hono<{ Bindings: Env }>();
const COOKIE = 'keepdomain_session';

type Ctx = Context<{ Bindings: Env }>;

function adminPassword(env: Env): string {
  return env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

async function isAuthed(c: Ctx, env: Env): Promise<boolean> {
  const token = getCookie(c, COOKIE);
  const secret = await getOrCreateSessionSecret(env.DB);
  return verifySessionToken(secret, token);
}

function isHttps(c: Ctx): boolean {
  try {
    return new URL(c.req.url).protocol === 'https:';
  } catch {
    return false;
  }
}

function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return key.slice(0, 2) + '****';
  return key.slice(0, 6) + '****' + key.slice(-4);
}

// ---- 页面 ----
app.get('/', (c) => c.html(ADMIN_HTML));

// ---- 鉴权 ----
app.post('/api/login', async (c) => {
  const env = c.env;
  const body = await c.req.json().catch(() => null);
  const password = body && typeof body.password === 'string' ? body.password : '';
  if (password !== adminPassword(env)) {
    return c.json({ error: '密码错误' }, 401);
  }
  const secret = await getOrCreateSessionSecret(env.DB);
  const token = await createSessionToken(secret);
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isHttps(c),
    path: '/',
    maxAge: 7 * 24 * 3600,
  });
  return c.json({ ok: true });
});

app.post('/api/logout', (c) => {
  deleteCookie(c, COOKIE, { path: '/' });
  return c.json({ ok: true });
});

app.get('/api/me', async (c) => {
  if (await isAuthed(c, c.env)) return c.json({ ok: true });
  return c.json({ ok: false }, 401);
});

// ---- 域名 CRUD ----
app.get('/api/domains', async (c) => {
  if (!(await isAuthed(c, c.env))) return c.json({ error: '未登录' }, 401);
  const domains = await listDomains(c.env.DB);
  return c.json({ domains });
});

app.post('/api/domains', async (c) => {
  if (!(await isAuthed(c, c.env))) return c.json({ error: '未登录' }, 401);
  const body = await c.req.json().catch(() => null);
  const { input, error } = parseDomainInput(body);
  if (error || !input) return c.json({ error: error || '请求体无效' }, 400);
  const d = await createDomain(c.env.DB, input);
  return c.json({ domain: d }, 201);
});

app.put('/api/domains/:id', async (c) => {
  if (!(await isAuthed(c, c.env))) return c.json({ error: '未登录' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const { input, error } = parseDomainInput(body);
  if (error || !input) return c.json({ error: error || '请求体无效' }, 400);
  const d = await updateDomain(c.env.DB, id, input);
  if (!d) return c.json({ error: '记录不存在' }, 404);
  return c.json({ domain: d });
});

app.delete('/api/domains/:id', async (c) => {
  if (!(await isAuthed(c, c.env))) return c.json({ error: '未登录' }, 401);
  const id = c.req.param('id');
  await deleteDomain(c.env.DB, id);
  return c.json({ ok: true });
});

app.post('/api/domains/:id/confirm', async (c) => {
  if (!(await isAuthed(c, c.env))) return c.json({ error: '未登录' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const action = body && body.action;
  if (action !== 'renewed' && action !== 'abandoned') {
    return c.json({ error: 'action 必须是 renewed 或 abandoned' }, 400);
  }
  const d = await confirmDomain(c.env.DB, id, action);
  if (!d) return c.json({ error: '记录不存在' }, 404);
  return c.json({ domain: d });
});

// ---- 设置 ----
app.get('/api/settings', async (c) => {
  if (!(await isAuthed(c, c.env))) return c.json({ error: '未登录' }, 401);
  const s = await getSettings(c.env.DB);
  return c.json({
    settings: {
      notify_email: s.notify_email,
      from_email: s.from_email,
      resend_api_key_masked: maskApiKey(s.resend_api_key),
      has_resend_api_key: !!s.resend_api_key,
    },
  });
});

app.put('/api/settings', async (c) => {
  if (!(await isAuthed(c, c.env))) return c.json({ error: '未登录' }, 401);
  const body = await c.req.json().catch(() => null);
  const notify_email = String((body && body.notify_email) ?? '').trim();
  const from_email = String((body && body.from_email) ?? '').trim();
  if (!from_email) return c.json({ error: '发件地址不能为空' }, 400);

  // Resend API Key：仅当传入了非空新值时才更新，留空/未传则保留旧值
  const current = await getSettings(c.env.DB);
  const newKey = body && typeof body.resend_api_key === 'string' ? body.resend_api_key.trim() : '';
  const resend_api_key = newKey ? newKey : current.resend_api_key;

  const settings = { notify_email, from_email, resend_api_key };
  await updateSettings(c.env.DB, settings);
  return c.json({
    settings: {
      notify_email,
      from_email,
      resend_api_key_masked: maskApiKey(resend_api_key),
      has_resend_api_key: !!resend_api_key,
    },
  });
});

app.post('/api/test-email', async (c) => {
  if (!(await isAuthed(c, c.env))) return c.json({ error: '未登录' }, 401);
  const settings = await getSettings(c.env.DB);
  if (!settings.notify_email) return c.json({ error: '请先配置收件邮箱' }, 400);
  if (!settings.resend_api_key) return c.json({ error: '请先在通知设置里填写 Resend API Key' }, 400);
  const r = await sendEmail({
    apiKey: settings.resend_api_key,
    from: settings.from_email,
    to: settings.notify_email,
    subject: '【域名续费提醒】测试邮件',
    html: '<p>这是一封测试邮件，说明 Resend 发信配置正确。</p>',
    text: '这是一封测试邮件，说明 Resend 发信配置正确。',
  });
  if (!r.ok) return c.json({ error: r.error || '发送失败' }, 502);
  return c.json({ ok: true, message: '测试邮件已发送至 ' + settings.notify_email });
});

app.notFound((c) => c.json({ error: 'Not Found' }, 404));

function parseDomainInput(body: any): { input: DomainInput | null; error: string | null } {
  if (!body || typeof body !== 'object') return { input: null, error: '请求体无效' };
  const account = String(body.account ?? '').trim();
  const platform = String(body.platform ?? '').trim();
  const domain = String(body.domain ?? '').trim();
  const expire_date = String(body.expire_date ?? '').trim();
  const notify_days_ahead = Number(body.notify_days_ahead ?? DEFAULT_NOTIFY_DAYS);
  if (!platform) return { input: null, error: '平台不能为空' };
  if (!domain) return { input: null, error: '域名不能为空' };
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return { input: null, error: '域名格式不正确' };
  if (!isValidDate(expire_date)) return { input: null, error: '到期时间格式应为 YYYY-MM-DD' };
  if (!Number.isInteger(notify_days_ahead) || notify_days_ahead < 1 || notify_days_ahead > 365) {
    return { input: null, error: '提前提醒天数须为 1-365 的整数' };
  }
  return { input: { account, platform, domain, expire_date, notify_days_ahead }, error: null };
}

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      runDailyNotification(env).then((r) => {
        console.log('[keepdomain] notification result:', JSON.stringify(r));
      })
    );
  },
};
