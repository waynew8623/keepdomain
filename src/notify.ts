import { listActiveDomains, getSettings, setLastNotifiedDate, type Domain } from './db';
import { sendEmail } from './email';

export function todayInShanghai(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return get('year') + '-' + get('month') + '-' + get('day');
}

export function daysUntil(dateStr: string, todayStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const a = Date.UTC(y, m - 1, d);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((a - b) / 86400000);
}

export function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export interface NotificationResult {
  sent: number;      // 本次发送的邮件封数（0 或 1）
  domains: number;   // 本次邮件覆盖的域名数
  skipped: number;   // 已在本日通知过、被跳过的域名数
  errors: string[];
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface DueItem {
  d: Domain;
  left: number;
}

function daysText(left: number): string {
  return left < 0 ? '已逾期 ' + Math.abs(left) + ' 天' : '剩余 ' + left + ' 天';
}

function buildHtml(items: DueItem[]): string {
  const th = 'padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;text-align:left;font-weight:600';
  const td = 'padding:8px;border-bottom:1px solid #e5e7eb';
  const head =
    '<thead><tr>' +
    '<th style="' + th + '">账户</th>' +
    '<th style="' + th + '">平台</th>' +
    '<th style="' + th + '">域名</th>' +
    '<th style="' + th + '">到期时间</th>' +
    '<th style="' + th + '">状态</th>' +
    '</tr></thead>';
  const rows = items
    .map(({ d, left }) => {
      const overdue = left < 0;
      const color = overdue ? '#dc2626' : '#d97706';
      return (
        '<tr>' +
        '<td style="' + td + '">' + (d.account ? esc(d.account) : '—') + '</td>' +
        '<td style="' + td + '">' + esc(d.platform) + '</td>' +
        '<td style="' + td + '"><b>' + esc(d.domain) + '</b></td>' +
        '<td style="' + td + '">' + esc(d.expire_date) + '</td>' +
        '<td style="' + td + ';color:' + color + ';font-weight:600">' + daysText(left) + '</td>' +
        '</tr>'
      );
    })
    .join('');

  return (
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1f2937">' +
    '<h2 style="margin:0 0 16px">域名续费提醒</h2>' +
    '<p>以下 ' + items.length + ' 个域名即将到期或已到期，请及时处理：</p>' +
    '<table style="width:100%;border-collapse:collapse">' +
    head +
    '<tbody>' + rows + '</tbody>' +
    '</table>' +
    '<p style="margin-top:16px">处理完成后，请到管理页点击「已续费」或「放弃续费」，否则将每天收到此提醒。</p>' +
    '</div>'
  );
}

function buildText(items: DueItem[]): string {
  const lines = items.map(({ d, left }) => {
    return '- ' + d.domain + '（' +
      (d.account ? '账户：' + d.account + '，' : '') +
      '平台：' + d.platform + '，到期：' + d.expire_date + '，' + daysText(left) + '）';
  });
  return '【域名续费提醒】以下 ' + items.length + ' 个域名即将到期或已到期，请及时处理：\n' +
    lines.join('\n') +
    '\n\n处理完成后，请到管理页确认「已续费」或「放弃续费」，否则将每天收到此提醒。';
}

export async function runDailyNotification(env: { DB: D1Database }): Promise<NotificationResult> {
  const result: NotificationResult = { sent: 0, domains: 0, skipped: 0, errors: [] };
  const settings = await getSettings(env.DB);
  if (!settings.notify_email || !settings.from_email) {
    result.errors.push('通知邮箱或发件地址未配置，跳过发送');
    return result;
  }
  if (!settings.resend_api_key) {
    result.errors.push('Resend API Key 未配置，请在管理页填写');
    return result;
  }

  const today = todayInShanghai();
  const domains = await listActiveDomains(env.DB);

  // 收集当天需要通知的域名
  const due: DueItem[] = [];
  for (const d of domains) {
    const left = daysUntil(d.expire_date, today);
    // 仅提醒「到期前 N 天」内、以及已过期仍未处理的域名（N 为每个域名独立设置的提前天数）
    if (left > d.notify_days_ahead) continue;
    if (d.last_notified_date === today) {
      result.skipped++;
      continue;
    }
    due.push({ d, left });
  }

  // 没有需要提醒的域名，不发信
  if (due.length === 0) return result;

  const subject = '【域名续费提醒】今日有 ' + due.length + ' 个域名需要处理';
  const r = await sendEmail({
    apiKey: settings.resend_api_key,
    from: settings.from_email,
    to: settings.notify_email,
    subject,
    html: buildHtml(due),
    text: buildText(due),
  });

  if (r.ok) {
    // 发送成功后，把当天所有域名都标记为已通知，避免重复发送
    for (const item of due) {
      await setLastNotifiedDate(env.DB, item.d.id, today);
    }
    result.sent = 1;
    result.domains = due.length;
  } else {
    result.errors.push(r.error ?? '发送失败');
  }
  return result;
}
