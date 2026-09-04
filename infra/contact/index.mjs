// wis-contact-v2 — contact-form handler for wrightintel.net (WO-5 §2.1).
//
// API Gateway HTTP API (payload v2) → this function → SES v2 → MAIL_TO.
//
// Everything that could ever change is an environment variable (FR-CF.9,
// C-10): MAIL_TO, MAIL_FROM, ALLOWED_ORIGINS, TURNSTILE_SECRET. Nothing is
// hard-coded, so retiring a mailbox is a config change, not a deploy.
//
// Order of checks, and why: origin first (cheapest, and a wrong origin
// should never reach parsing), then content-type/JSON, then the honeypot
// (a bot gets a 200 and learns nothing), then Turnstile if armed, then
// field validation. Only a request that passes all of them touches SES.

import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({});

const MAIL_TO = process.env.MAIL_TO ?? '';
const MAIL_FROM = process.env.MAIL_FROM ?? '';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME ?? 'Wright Intel Solutions Website';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET ?? '';

const LIMITS = { name: 100, email: 254, message: 2000 };

// ---------- helpers ----------

const json = (statusCode, body, origin) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...(origin
      ? {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          vary: 'Origin',
        }
      : {}),
  },
  body: JSON.stringify(body),
});

/** Strip C0/C1 control characters (CR/LF included) so nothing typed into a
 *  field can reach a mail header. Message bodies keep \n and \t. */
const stripControls = (s, keepNewlines = false) =>
  String(s ?? '').replace(keepNewlines ? /[^\P{Cc}\n\t]/gu : /\p{Cc}/gu, '');

/** Syntactic email check — deliberately simple: one @, no spaces, a dot in
 *  the domain, nothing that could smuggle a header. */
const looksLikeEmail = (s) => /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(s);

/** For logs: keep the local part's first char and the domain. */
const maskEmail = (s) => {
  const at = s.indexOf('@');
  return at > 0 ? `${s[0]}***@${s.slice(at + 1)}` : '***';
};

const log = (fields) => console.log(JSON.stringify(fields));

async function verifyTurnstile(token, ip) {
  const form = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token ?? '' });
  if (ip) form.set('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.success === true;
}

// ---------- handler ----------

export const handler = async (event) => {
  const reqId = event.requestContext?.requestId ?? '';
  const headers = Object.fromEntries(
    Object.entries(event.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const origin = headers.origin ?? '';
  const ip = event.requestContext?.http?.sourceIp ?? '';
  const method = event.requestContext?.http?.method ?? '';

  const base = { reqId, origin, honeypot: 0, outcome: '' };

  // 1. Origin — defence in depth behind API Gateway's own CORS config.
  if (!ALLOWED_ORIGINS.includes(origin)) {
    log({ ...base, outcome: 'forbidden_origin' });
    return json(403, { ok: false, error: 'Origin not allowed.' });
  }

  // Preflight never reaches a proxy integration on HTTP API when CORS is
  // configured, but answer it correctly if it does.
  if (method === 'OPTIONS') return json(204, {}, origin);
  if (method !== 'POST') {
    log({ ...base, outcome: 'method_not_allowed', method });
    return json(405, { ok: false, error: 'Method not allowed.' }, origin);
  }

  // 2. Content type + JSON body.
  const ctype = (headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (ctype !== 'application/json') {
    log({ ...base, outcome: 'bad_content_type', ctype });
    return json(400, { ok: false, error: 'Expected application/json.' }, origin);
  }
  let body;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : event.body ?? '';
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
  } catch {
    log({ ...base, outcome: 'bad_json' });
    return json(400, { ok: false, error: 'Body must be a JSON object.' }, origin);
  }

  // 3. Honeypot — silent drop. A bot that filled "website" gets a 200 and
  //    no mail is sent. Logged so the rate is visible.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    log({ ...base, honeypot: 1, outcome: 'honeypot_drop' });
    return json(200, { ok: true }, origin);
  }

  // 4. Turnstile — only when armed (OQ-6). Two env vars turn it on.
  if (TURNSTILE_SECRET) {
    const ok = await verifyTurnstile(body.turnstileToken, ip).catch(() => false);
    if (!ok) {
      log({ ...base, outcome: 'turnstile_failed' });
      return json(400, { ok: false, errors: [{ field: 'turnstileToken', error: 'Verification failed.' }] }, origin);
    }
  }

  // 5. Validate (FR-CF.4). Field-level errors, never echoing input.
  const name = stripControls(body.name).trim();
  const email = stripControls(body.email).trim();
  const message = stripControls(body.message, true).trim();
  const errors = [];
  if (name.length < 1 || name.length > LIMITS.name) errors.push({ field: 'name', error: `Required, 1–${LIMITS.name} characters.` });
  if (email.length < 1 || email.length > LIMITS.email || !looksLikeEmail(email)) errors.push({ field: 'email', error: 'A valid email address is required.' });
  if (message.length < 1 || message.length > LIMITS.message) errors.push({ field: 'message', error: `Required, 1–${LIMITS.message} characters.` });
  if (errors.length) {
    log({ ...base, outcome: 'validation_failed', fields: errors.map((e) => e.field) });
    return json(400, { ok: false, errors }, origin);
  }

  // 6. Plain-text mail. Labelled lines; nothing from the form reaches a
  //    header except the sanitised name in the subject and the checked
  //    address in Reply-To.
  const subject = `Website contact from ${name}`.slice(0, 200);
  const text = [
    'New message from the wrightintel.net contact form.',
    '',
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Origin:  ${origin}`,
    `Request: ${reqId}`,
    '',
    'Message:',
    '--------',
    message,
    '',
  ].join('\n');

  try {
    const out = await ses.send(
      new SendEmailCommand({
        FromEmailAddress: `${MAIL_FROM_NAME} <${MAIL_FROM}>`,
        Destination: { ToAddresses: [MAIL_TO] },
        ReplyToAddresses: [email],
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: { Text: { Data: text, Charset: 'UTF-8' } },
          },
        },
      }),
    );
    log({ ...base, outcome: 'sent', from: maskEmail(email), messageId: out.MessageId ?? '' });
    return json(200, { ok: true }, origin);
  } catch (err) {
    log({ ...base, outcome: 'ses_error', from: maskEmail(email), error: err?.name ?? 'Error' });
    return json(502, { ok: false, error: 'The message could not be sent. Please use the phone number or email address on the contact page.' }, origin);
  }
};
