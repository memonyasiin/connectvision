# ConnectVision Core OS — Deployment Runbook

> Step-by-step procedure for the **June 1, 2026** production cutover.
> Optimised for a single-operator launch with rollback at every step.
> Maintained alongside `infra-cloudflare-routing.md` (DNS specifics).

---

## 0. Pre-flight (T-7 days)

Run these before launch day to surface friction early.

- [ ] **Accounts present**
  - Cloudflare (Registrar + DNS)
  - Vercel (paid plan recommended — see §5)
  - GitHub (private repo for ConnectVision-SaaS)
  - Razorpay (live keys, not test)
  - MSG91 (DLT-registered SMS gateway)
  - Groq or Anthropic (LLM API key)
- [ ] **Domain check** — `dig connectvision.io @1.1.1.1` returns NXDOMAIN (still available)
- [ ] **Local build green** — `cd ConnectVision-SaaS && npm run build` exits 0
- [ ] **Local tsc green** — `npx tsc --noEmit` exits 0
- [ ] **`.env.production` filled** with all `CHANGE_ME` slots replaced
  - 32-byte secrets: `openssl rand -hex 32` for each `[G]`-tagged var
  - Total to generate: `NEXTAUTH_SECRET`, `CV_VALIDATION_TOKEN`, `INTERNAL_SECRET`, `CRON_SECRET`, `PATAAWAA_WEBHOOK_SECRET`
- [ ] **MySQL pool provisioned** on Bluehost OR a managed pool (PlanetScale / RDS Proxy)
  - Hobby Bluehost MySQL works for the first ~100 tenants; bump to managed before scale
- [ ] **Backup current Pataa repo** — `cd pataainternational && git push origin main`

---

## 1. Domain purchase (T-0, June 1, ~09:00 IST)

### 1.1 Cloudflare Registrar

```
1. dash.cloudflare.com → Registrar → Register Domain
2. Search "connectvision.io" → Confirm available
3. Add to cart — annual ~₹3,500–4,500 at-cost
4. Pay with card / UPI
5. Domain provisions in ~15 min; Cloudflare auto-creates the DNS zone
```

**If `.io` taken last-minute** → fallback to `.co` then `.ai`. Update every
reference in `.env.production` + `next.config.mjs` + `vercel.json` + this
runbook accordingly.

**Rollback**: domain registration is irreversible for 60 days. Cost only.

### 1.2 DNS records (Cloudflare → DNS → Records)

| Type  | Name | Value                    | Proxy | TTL  |
|-------|------|--------------------------|-------|------|
| A     | `@`  | `76.76.21.21`            | ✅ Proxied | Auto |
| CNAME | `www`| `cname.vercel-dns.com`   | ✅ Proxied | Auto |
| CNAME | `*`  | `cname.vercel-dns.com`   | ✅ Proxied | Auto |

⚠️ All three MUST be proxied (orange cloud). "DNS only" bypasses our
edge cache invalidation pattern.

### 1.3 SSL/TLS

Cloudflare → SSL/TLS → Overview:
- **Encryption mode:** Full (Strict)
- **Min TLS version:** 1.2
- **Always Use HTTPS:** On
- **Automatic HTTPS Rewrites:** On
- **TLS 1.3:** On

Cloudflare → SSL/TLS → Edge Certificates:
- **Disable Universal SSL** (we use Advanced Certificate Manager instead)
- **Enable Advanced Certificate Manager** (~$10/mo flat per zone)
  - Hosts: `connectvision.io`, `*.connectvision.io`, `*.*.connectvision.io`
- **HSTS:** Enable — max-age 31536000, include subdomains, no preload (yet)

Verify after ~10 min:
```bash
curl -sI https://connectvision.io | grep -i strict-transport-security
# Expect: strict-transport-security: max-age=31536000; includeSubDomains
```

**Rollback**: Flip records to grey-cloud (DNS only) → traffic bypasses
Cloudflare entirely.

---

## 2. GitHub repo (T+30 min)

```bash
cd C:\Users\USER\Desktop\ConnectVision-SaaS

# Bundle the current state into the existing local commit history
git status                                    # should show only intentional changes
git add .
git commit -m "Core OS production freeze — Modules 1-5 + infra"

# Create the GitHub repo (private)
# Option A — via gh CLI: gh repo create memonyasiin/connectvision-saas --private --source=. --push
# Option B — via web: github.com/new → connectvision-saas, private
git remote add origin git@github.com:memonyasiin/connectvision-saas.git
git push -u origin main
```

**Rollback**: `gh repo delete memonyasiin/connectvision-saas --yes` (or web).

---

## 3. Vercel project link (T+45 min)

### 3.1 Project creation

```bash
cd C:\Users\USER\Desktop\ConnectVision-SaaS

# CLI install if missing
npm i -g vercel

vercel login                                  # browser auth
vercel link --yes                             # creates the Vercel project
                                              # framework auto-detected as Next.js
```

### 3.2 Environment variables

```bash
# Push every variable from .env.production into Vercel's production env
vercel env pull .env.production.local         # pull existing (should be empty)
# Then for each variable, push:
vercel env add DATABASE_URL production        # paste pooled URL when prompted
vercel env add DIRECT_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
vercel env add CV_VALIDATION_TOKEN production
vercel env add CV_VALIDATION_TOKEN_HEADER_NAME production    # X-ConnectVision-Validation-Token
vercel env add INTERNAL_SECRET production
vercel env add CRON_SECRET production
vercel env add CV_HTML_S_MAXAGE_SEC production
vercel env add CV_HTML_SWR_SEC production
vercel env add CV_FLUTTER_API_S_MAXAGE_SEC production
vercel env add CV_FLUTTER_API_SWR_SEC production
vercel env add CV_ROUTING_VERSION production
vercel env add ALLOWED_ORIGINS production
vercel env add TENANT_HEADER_NAME production
vercel env add TENANT_ROUTING_KEY_HEADER_NAME production
vercel env add TENANT_BASE_DOMAIN production
vercel env add PATAA_CRM_BASE_URL production
vercel env add PATAA_CRM_LEAD_ENDPOINT production
vercel env add PATAA_CRM_SYNC_TOKEN production
vercel env add PATAAWAA_BASE_URL production
vercel env add PATAAWAA_GATEWAY_TOKEN production
vercel env add PATAAWAA_WEBHOOK_SECRET production
vercel env add SMS_GATEWAY_URL production
vercel env add SMS_GATEWAY_TOKEN production
vercel env add LLM_PROVIDER production
vercel env add LLM_API_KEY production
vercel env add LLM_MODEL production
vercel env add RAZORPAY_KEY_ID production
vercel env add RAZORPAY_KEY_SECRET production
vercel env add RAZORPAY_WEBHOOK_SECRET production
vercel env add CLOUDFLARE_ZONE_ID production
vercel env add CLOUDFLARE_API_TOKEN production
vercel env add VERCEL_PROJECT_ID production
vercel env add CV_FEATURE_WORKFORCE_AUTOFLAG production       # true
vercel env add CV_FEATURE_MARKETPLACE_PUBLIC production       # true
```

Verify:
```bash
vercel env ls production
# Should list all variables above with masked values.
```

### 3.3 Add the domain to Vercel

```
Vercel Dashboard → Project → Settings → Domains
  → Add → "connectvision.io"  → Production
  → Add → "www.connectvision.io"  → Production (redirect to apex)
  → Add → "*.connectvision.io"  → Production (wildcard)
```

Vercel will display a DNS verification step — already satisfied because
our records in §1.2 point to `cname.vercel-dns.com`. Verification status
should flip to "Valid Configuration" within 5 min.

**Rollback**: `vercel domains rm connectvision.io` removes the binding.
DNS remains pointed at Vercel but no project handles it (Vercel returns
a generic 404).

---

## 4. First deployment (T+90 min)

```bash
cd C:\Users\USER\Desktop\ConnectVision-SaaS

# Preview deploy first — sanity check before pushing to apex
vercel                                        # deploys to a preview URL
# Note the preview URL → curl it → confirm 200

# Production deploy
vercel --prod
# Watch the build log. Expected output: "✓ Compiled successfully"
# Production URL: https://connectvision.io
```

### 4.1 Post-deploy smoke (run from your machine)

```bash
# Apex
curl -sI https://connectvision.io | head -3
# Expect: HTTP/2 200, x-cv-tenant header absent (apex isn't a tenant)

# Marketplace preview
curl -sI https://connectvision.io/marketplace/themes/skincare-luxe/preview | head -3
# Expect: HTTP/2 200, cache-control: public, s-maxage=10, stale-while-revalidate=60

# Tenant subdomain rewrite
curl -sI https://memon-beauty.connectvision.io | grep -iE "x-cv-tenant|x-vercel-cache-tag"
# Expect:
#   x-cv-tenant: memon-beauty
#   x-vercel-cache-tag: tenant:memon-beauty

# Cache headers on every theme preview
for t in skincare-luxe fitness-bold hospitality-warm medical-clinical; do
  curl -sI https://connectvision.io/marketplace/themes/$t/preview \
    | grep -iE "HTTP|cache-control" | head -2
done

# Service-token-protected endpoint should 401 without auth
curl -sI https://connectvision.io/api/admin/workforce
# Expect: HTTP/2 401

# Service-token-protected endpoint should 200 with CRON_SECRET
curl -sI -H "Authorization: Bearer $CRON_SECRET" https://connectvision.io/api/admin/workforce
# Expect: HTTP/2 200 (or 500 if MySQL pool not reachable from Vercel — see §5)
```

### 4.2 Rollback

```bash
vercel rollback                               # interactive — picks previous deploy
# OR via dashboard: Deployments → previous → "Promote to Production"
```

DNS doesn't need to change — Vercel re-routes traffic to the previous build
immediately on promotion.

---

## 5. ⚠️ Hobby vs Pro plan decision (CRITICAL)

The `vercel.json` includes a `*/30 * * * *` cron schedule.

### 5.1 Hobby plan limits

| Resource | Hobby cap | What breaks if we hit it |
|---|---|---|
| Cron frequency | **DAILY ONLY** | `*/30` cron silently fails to fire — **entire deployment rejected** if vercel.json contains sub-daily schedule |
| Function memory | 1024 MB | We're exactly at the ceiling — no headroom |
| Function maxDuration | 10s (default), 60s (boostable) | We use 60s for workforce — works on Hobby |
| Concurrent function invocations | 12 | Fine for early traffic |
| Bandwidth | 100 GB / month | Fine for first ~6 months |

### 5.2 Decision tree

```
ARE YOU ON HOBBY?
├─ YES → Two options:
│        a) Upgrade to Pro ($20/mo per member) before deploy
│           → Cron works as configured, all features functional
│        b) Remove the `crons` block from vercel.json BEFORE deploy
│           → Use Bluehost crontab fallback (see §5.3)
│           → Deployment succeeds, workforce auto-flag runs via Bluehost
│
└─ NO (Pro) → Deploy as-is, cron fires every 30 min automatically
```

### 5.3 Bluehost crontab fallback (Hobby path)

We already use this pattern for PataaWaa→CRM sync. Add another row:

```bash
# SSH into Bluehost
ssh bluehost
crontab -e

# Add this line (every 30 minutes, between :02 and :32 to avoid even-minute spike):
2,32 * * * * curl -sS -H "Authorization: Bearer THE_CRON_SECRET_VALUE" https://connectvision.io/api/admin/workforce > /tmp/cv-workforce.log 2>&1
```

Replace `THE_CRON_SECRET_VALUE` with the actual `CRON_SECRET` env value.
Per-minute granularity is free on Bluehost — bypasses the Hobby restriction.

### 5.4 If you keep Hobby + don't add Bluehost fallback

Workforce auto-flagger never runs. Symptoms:
- OVERDUE_ABSENT rows never auto-transition
- Ghost-state detection never fires
- Payroll penalties don't accrue
- No telemetry to Pataa CRM workforce endpoint

→ Operator must manually `curl` the endpoint daily, OR upgrade.

---

## 6. Cloudflare cache rules (T+2h)

Per `infra-cloudflare-routing.md` §3. Quick recap:

| Rule | Match | Action |
|---|---|---|
| Bypass tenant HTML | `*.connectvision.io` (not `/_next/static`) | Cache eligibility: Bypass cache (Vercel SWR is the source of truth) |
| Long-cache static | `/_next/static/*` | Edge TTL 1 month, Browser TTL 1 year |
| BIC off on API | `/api/*` | Browser Integrity Check: Off (breaks webhooks otherwise) |

---

## 7. Post-launch monitoring (T+1d → T+7d)

### 7.1 Daily checks

```bash
# Apex + 4 tenant previews all return 200
for u in https://connectvision.io \
         https://connectvision.io/marketplace/themes/skincare-luxe/preview \
         https://connectvision.io/marketplace/themes/fitness-bold/preview \
         https://connectvision.io/marketplace/themes/hospitality-warm/preview \
         https://connectvision.io/marketplace/themes/medical-clinical/preview \
         https://memon-beauty.connectvision.io \
         https://powerhouse-gym.connectvision.io \
         https://rasoi-by-anand.connectvision.io \
         https://sunshine-clinic.connectvision.io ; do
  printf "%-70s %s\n" "$u" "$(curl -sI -o /dev/null -w '%{http_code}' --max-time 10 "$u")"
done
```

### 7.2 Vercel dashboard — first-week metrics to watch

| Metric | Healthy range | Investigate if |
|---|---|---|
| `/api/admin/workforce` invocations | 48/day (30-min cron) | <40 or >60 → cron drift |
| Function p95 latency | <2s | >5s → MySQL pool exhausted or LLM slow |
| Function error rate | <0.5% | >2% → check `vercel logs` |
| Edge cache hit ratio (HTML routes) | >70% | <40% → SWR window too short, bump CV_HTML_SWR_SEC |
| Bandwidth | <3 GB/day to start | Steep spike → Cloudflare bypass not working |

### 7.3 Logs

```bash
# Tail Vercel logs in real-time
vercel logs --follow

# Filter to a specific route
vercel logs --follow --scope api/admin/workforce
```

---

## 8. Rollback plan (any post-deploy issue)

### 8.1 Vercel revert (last good deploy)

```bash
vercel rollback
# Or: Dashboard → Deployments → previous ✓ → "Promote to Production"
```

**Recovery time:** ~30 seconds.

### 8.2 DNS bypass (Cloudflare layer broken)

Cloudflare → DNS → Records → flip `@` + `www` + `*` proxy to grey cloud.

**Recovery time:** ~5 min DNS propagation.

### 8.3 Full domain shutdown (worst case)

```
Cloudflare → DNS → Records → delete all three records
```

Site becomes NXDOMAIN immediately for all visitors. No partial-state risk.

---

## 9. Known parked items (NOT shipped — must wait for MODULE 6+)

| Feature | Reason parked | ETA |
|---|---|---|
| Customer signup + login (Auth.js wiring) | NextAuth route handlers not built | MODULE 6 |
| Razorpay checkout flow | UI not built; webhook stub only | MODULE 6 |
| `.zip` exporter for purchased themes | jszip in deps; route stubbed | MODULE 7 |
| Cloudflare subdomain provisioning (CV_KV) | Edge KV namespace not created | MODULE 7 |
| LLM agent — real prompt + tool use | Currently returns a canned greeting | MODULE 8 |
| AI text generation ("describe your business → fills sections") | LLM call structure exists; no UI | MODULE 8 |

**On launch day, the site is a marketing showcase + 4 demo tenants.**
Self-serve purchase + signup flows ship in MODULE 6.

---

## 10. Operator weekly tasks (post-launch steady state)

| Day  | Task | Time |
|------|------|------|
| Mon  | Vercel logs scan for ⨯ errors; investigate any spike | 15 min |
| Wed  | Pataa CRM telemetry check — verify workforce reports landing | 10 min |
| Fri  | Cloudflare Analytics — confirm cache hit ratio >70% | 10 min |
| 1st of month | Verify SSL cert auto-renewed (ACM dashboard) | 5 min |
| Quarterly | Rotate `CV_VALIDATION_TOKEN`, `INTERNAL_SECRET`, `CRON_SECRET` | 30 min (incl. Bluehost crontab update) |

---

## 11. Contact / escalation

| Surface | Owner | Channel |
|---|---|---|
| Vercel build / deploy issues | Vercel support | dashboard chat |
| Cloudflare DNS / cert issues | Cloudflare support | dashboard chat |
| Pataa CRM telemetry endpoint down | Pataa team (you) | direct fix |
| MySQL pool exhaustion | Bluehost support OR managed DB provider | account dashboard |

---

## 12. Sign-off checklist (before declaring "launched")

- [ ] Apex returns 200 with valid HSTS header
- [ ] All 4 marketplace previews return 200
- [ ] All 4 tenant subdomains return 200 with `x-cv-tenant` set
- [ ] `/api/admin/workforce` returns 401 unauthenticated + 200 with `Bearer CRON_SECRET`
- [ ] First scheduled cron has fired (check `vercel logs` or Bluehost cron log)
- [ ] SSL Labs scan returns A or A+ for apex + a sample tenant
- [ ] Pataa CRM /api/crm/telemetry/workforce received at least one payload
- [ ] Site is indexable: `curl https://connectvision.io/robots.txt` returns expected content
- [ ] OG card preview verified on twitter.com/share?url=https://connectvision.io

When every box above is ticked: **launched.**

---

*Last updated 2026-05-30 alongside the Phase 5 production infra freeze.*
