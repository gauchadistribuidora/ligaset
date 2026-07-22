// Envio de e-mails transacionais via Resend (https://resend.com).
// Desativa com segurança se RESEND_API_KEY não estiver configurada:
// nenhuma ação do app quebra por causa de e-mail.

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  bcc?: string | string[];
};

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped?: boolean; error: string };

export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "LigaSet <no-reply@gauchadistribuidora.com.br>";
  const to = (Array.isArray(args.to) ? args.to : [args.to]).filter(Boolean);
  if (to.length === 0) return { ok: false, error: "sem destinatário" };
  if (!key) {
    console.warn("[email] RESEND_API_KEY ausente — e-mail não enviado:", args.subject);
    return { ok: false, skipped: true, error: "RESEND_API_KEY ausente" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        bcc: args.bcc,
        subject: args.subject,
        html: args.html,
        text: args.text,
        reply_to: args.replyTo,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email] falha Resend", res.status, body);
      return { ok: false, error: `Resend ${res.status}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id ?? null };
  } catch (e: any) {
    console.error("[email] erro", e?.message);
    return { ok: false, error: e?.message || "erro desconhecido" };
  }
}

// Layout HTML simples e responsivo para os e-mails.
export function emailLayout(opts: {
  title: string;
  intro: string;
  bodyHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const { title, intro, bodyHtml = "", ctaLabel, ctaUrl } = opts;
  const cta =
    ctaLabel && ctaUrl
      ? `<tr><td style="padding:22px 0 4px"><a href="${ctaUrl}" style="background:#10b981;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block">${ctaLabel}</a></td></tr>`
      : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#10b981,#0c1b2a);padding:22px 28px">
          <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:.5px">LigaSet</span>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3">${title}</h1>
          <p style="margin:0;color:#475569;font-size:15px;line-height:1.5">${intro}</p>
          ${bodyHtml}
          <table role="presentation" cellpadding="0" cellspacing="0">${cta}</table>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
          Você recebe este e-mail porque participa de um grupo no LigaSet.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
