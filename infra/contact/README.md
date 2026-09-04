# `wis-contact-v2` — contact-form Lambda

Handles `POST /contact` from the wrightintel.net contact form: validates,
drops honeypot hits silently, and sends a plain-text mail through SES v2.
Runtime **Node.js 22 (arm64)**, AWS SDK **v3 only** (`@aws-sdk/client-sesv2`,
bundled in the deployment package — nothing relies on the runtime's built-in
SDK). Behaviour is specified in SRS FR-CF and WO-5 §2.1.

No account identifiers live in this directory. Resources are referred to by
name; the deploy script reads region and function name from the environment.

## Environment variables (FR-CF.9 — nothing is hard-coded)

| Variable | Purpose | Current value |
|---|---|---|
| `MAIL_TO` | Recipient | `aww@wrightintel.net` |
| `MAIL_FROM` | Sender (must be under a verified SES identity) | `contact_page@wrightintel.net` |
| `MAIL_FROM_NAME` | Sender display name | `Wright Intel Solutions Website` |
| `ALLOWED_ORIGINS` | Comma-separated exact origins; anything else → 403 | the two production origins (+ `http://localhost:4321` until cutover — see `docs/contact-runbook.md`) |
| `TURNSTILE_SECRET` | If set, a `turnstileToken` field is required and verified with Cloudflare. Unset = Turnstile off. | unset |

Changing a mailbox is a config change (`update-function-configuration`),
not a deploy — the WorkMail-EOL insurance in C-10.

## Build

```bash
cd infra/contact
npm ci
npm run build          # → function.zip (source + production deps)
```

`node_modules/`, `build/` and `function.zip` are gitignored; the zip is
always rebuilt from the lockfile.

## Deploy

```bash
CONTACT_FUNCTION_NAME=wis-contact-v2 AWS_REGION=us-east-1 bash scripts/deploy-contact.sh
```

or by hand:

```bash
aws lambda update-function-code --function-name wis-contact-v2 --zip-file fileb://function.zip
aws lambda wait function-updated-v2 --function-name wis-contact-v2
```

## Request / response contract

Request: `POST`, `content-type: application/json`, body
`{ name, email, message, website, turnstileToken? }` (`website` is the
honeypot and must be empty).

| Status | Meaning |
|---|---|
| 200 `{ok:true}` | sent — **or** honeypot drop (indistinguishable on purpose) |
| 400 `{ok:false, errors:[{field,error}]}` | validation failed (no input echoed) |
| 400 `{ok:false, error}` | wrong content-type / not JSON |
| 403 | origin not in `ALLOWED_ORIGINS` |
| 429 | throttled by API Gateway (burst 5, 2 req/s) |
| 502 | SES refused the send |

Every response carries CORS headers for the matched origin only.

## Logging

One JSON line per invocation: request id, origin, honeypot flag, outcome,
validation fields, SES message id. The submitter's address is masked after
the first character; the message body is never logged. Log group
`/aws/lambda/wis-contact-v2`, 30-day retention.
