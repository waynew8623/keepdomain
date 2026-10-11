export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface SendEmailOptions {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendResult> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + opts.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: opts.from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) {
      return { ok: false, error: data.message || data.name || 'Resend HTTP ' + res.status };
    }
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
