# Contact-form runbook

The contact path built in WO-5 (M5). Resources are named, never numbered;
the account ID appears nowhere in this repository.

| Piece | Name |
|---|---|
| Front door | API Gateway **HTTP API** `wis-contact-v2`, route `POST /contact`, stage `$default` (auto-deploy) |
| Function | Lambda `wis-contact-v2` — Node.js 22, arm64, 256 MB, 10 s, SDK v3 bundled |
| Role | `wis-contact-v2-role` — `ses:SendEmail`/`SendRawEmail` on the `wrightintel.net` domain identity, plus its own log group. **Not** the old `LambdaSESRole`. |
| Logs | `/aws/lambda/wis-contact-v2` and `/aws/apigateway/wis-contact-v2-access`, both 30-day retention |
| Sender | `contact_page@wrightintel.net` (kept mailbox — bounces and auto-replies land where a human reads them). DKIM/SPF alignment comes from the **domain** identity; the address-level identity's status is irrelevant. |
| Recipient | `aww@wrightintel.net` |
| Front end | `src/pages/contact/index.astro`, endpoint from `PUBLIC_CONTACT_ENDPOINT` (`.env`, baked in at build) |

The old path — Lambda `WIS_Contact_Two`, REST API `wis_contact`, stage
`Stage_Three`, role `LambdaSESRole` — is **untouched** and still serves the
live site until M7 cutover.

## Configuration lives in environment variables

Lambda: `MAIL_TO`, `MAIL_FROM`, `MAIL_FROM_NAME`, `ALLOWED_ORIGINS`,
`TURNSTILE_SECRET` (optional). Change with:

```bash
aws lambda update-function-configuration --function-name wis-contact-v2 \
  --environment 'Variables={MAIL_TO=...,MAIL_FROM=...,MAIL_FROM_NAME=...,ALLOWED_ORIGINS=...}'
```

(`update-function-configuration` replaces the whole map — always pass every
variable.) Site: `PUBLIC_CONTACT_ENDPOINT` and optionally
`PUBLIC_TURNSTILE_SITEKEY` in `.env`, then rebuild.

## Test procedure

Run against the endpoint directly. `EP` is the invoke URL + `/contact`.

| # | Test | Expect |
|---|---|---|
| 1 | valid JSON, `Origin: https://www.wrightintel.net` | 200 `{ok:true}`; mail at `aww@` within a minute |
| 2 | the local form at `http://localhost:4321/contact/` | 200; mail; success text replaces the form |
| 3 | `website` field non-empty | 200; **no mail**; log line `honeypot:1, outcome:honeypot_drop` |
| 4 | bad email / empty message / 2001-char message | 400 with `errors[]`; no mail |
| 5 | `Origin: https://evil.example` | 403 |
| 6 | non-JSON content-type, or JSON content-type with junk | 400 |
| 7 | 40 parallel requests | some 429s in the access log |
| 8 | raw source of the test-1 mail | `spf=pass` (Return-Path under `mail.wrightintel.net`), `dkim=pass d=wrightintel.net`, `dmarc=pass`; `Reply-To` = submitted address; `From` = `MAIL_FROM` |

```bash
curl -s -w ' %{http_code}\n' -X POST "$EP" -H 'origin: https://www.wrightintel.net' \
  -H 'content-type: application/json' \
  -d '{"name":"Test","email":"someone@example.com","message":"hello"}'
```

Logs:

```bash
aws logs filter-log-events --log-group-name /aws/lambda/wis-contact-v2 --filter-pattern '{ $.outcome = * }'
aws logs filter-log-events --log-group-name /aws/apigateway/wis-contact-v2-access
```

## Turning Turnstile on (OQ-6 — dormant at launch)

1. Create a Turnstile widget at Cloudflare; note the site key (public) and secret.
2. `aws lambda update-function-configuration … TURNSTILE_SECRET=<secret>` (secret never enters this repo).
3. Add `PUBLIC_TURNSTILE_SITEKEY=<site key>` to `.env`; rebuild and deploy the site.

No code change: the Lambda requires and verifies `turnstileToken` when the
secret is set; the page renders the widget when the site key is set.
4. **Edge CSP (M6/M7):** the viewer-response CloudFront Function
   (`infra/cloudfront/viewer-response.js`) sets `script-src 'self' '<hash>'`
   and `frame-src 'self'`. Turnstile needs `https://challenges.cloudflare.com`
   added to both, then the function republished — otherwise the widget is
   blocked and the form cannot submit.

## Pre-cutover checklist (WO-7)

- [ ] **Remove `http://localhost:4321`** from both the API's CORS `AllowOrigins` and the Lambda's `ALLOWED_ORIGINS`. It exists only for M5 testing.
  ```bash
  aws apigatewayv2 update-api --api-id <api id> --cors-configuration \
    'AllowOrigins=https://www.wrightintel.net,https://wrightintel.net,AllowMethods=POST,OPTIONS,AllowHeaders=content-type,MaxAge=600'
  aws lambda update-function-configuration --function-name wis-contact-v2 --environment 'Variables={…,ALLOWED_ORIGINS=https://www.wrightintel.net,https://wrightintel.net}'
  ```
- [ ] Confirm `.env` on the build machine carries the production endpoint before the M7 build.
- [ ] Re-run tests 1, 3, 5 after the origin change.

## FR-CF.7 cleanup list (WO-7, after cutover)

Order matters: the live site posts to `Stage_Three` until the new site is
serving.

1. Before cutover, safe now: REST API `wis_contact` stage `STage_two` (dead), Lambda `contactFormLambda` (orphan) and its role `contactFormLambda-role-…`, the root `POST /` method on the REST API.
2. After cutover and a clean week: Lambda `WIS_Contact_Two`, stage `Stage_Three`, then the REST API `wis_contact` itself, role `LambdaSESRole` (check nothing else uses it), log group `/aws/lambda/WIS_Contact_Two`, role `API_Roles_for_wis_contact`.
