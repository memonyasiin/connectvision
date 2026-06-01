# ConnectVision — Cloudflare Routing & SSL Playbook

> Production cutover runbook for the `connectvision.io` (and `connectvision.ai`)
> apex domains. Maps DNS, Page Rules, and TLS settings end-to-end so the
> June 1 launch can roll out wildcard-customer subdomains plus operator-
> configured custom apexes without certificate lag, redirect loops, or
> multi-tenant cache bleed.

---

## 0. Prerequisites

| | |
|---|---|
| Registrar | Cloudflare Registrar (or transfer to it) — at-cost renewals, no markup |
| DNS provider | Cloudflare DNS (apex on the same account that issues Universal SSL) |
| Hosting target | Vercel project `connectvision-saas` |
| Owner account | `dns-ops@pataainternational.com` (rotate when handing off) |
| Wildcard certificate | Cloudflare Advanced Certificate Manager — required for `*.connectvision.io` |

> **Why Advanced Certificate Manager, not Universal SSL?**
> Universal SSL only covers the apex + 1-level depth (`*.example.com`). When
> customers bring their own apex domains (`memonbeauty.com`) and we issue
> per-customer subdomains under that (`booking.memonbeauty.com`), Advanced
> Certificate Manager handles the depth-2 and SAN coverage cleanly.
> Cost: ~$10/mo flat per zone, justified once we have >50 paying customers.

---

## 1. Apex DNS records

Tenants under `*.connectvision.io` are served by the Vercel edge after the
middleware (`proxy.ts`) rewrites the host. Apex + `www` go directly to
Vercel's anycast endpoints.

| Type | Name | Value | Proxy | TTL |
|---|---|---|---|---|
| A | `@` | `76.76.21.21` | Proxied (orange cloud) | Auto |
| CNAME | `www` | `cname.vercel-dns.com` | Proxied | Auto |
| CNAME | `*` | `cname.vercel-dns.com` | Proxied | Auto |

**Important notes:**
- The wildcard `*` CNAME is what makes `<anything>.connectvision.io` resolve
  to Vercel. Without it, only the explicit subdomains we list resolve.
- Both apex + wildcard MUST be proxied (orange cloud). Setting "DNS only"
  bypasses the Cloudflare cache and breaks the per-tenant `x-vercel-cache-tag`
  invalidation pattern wired in `src/lib/vercelProxy.ts`.
- `76.76.21.21` is Vercel's documented anycast apex address (October 2025).
  Verify against https://vercel.com/docs/projects/domains/working-with-domains
  before each major DNS reconfigure.

---

## 2. SSL / TLS settings

**Zone → SSL/TLS → Overview**

| Setting | Value | Reason |
|---|---|---|
| SSL/TLS encryption mode | **Full (Strict)** | Vercel terminates with valid CA cert — anything weaker exposes us to MITM at the Vercel ↔ Cloudflare hop |
| Minimum TLS Version | **TLS 1.2** | TLS 1.0/1.1 deprecated in all modern browsers; 1.2 keeps the long tail of older Indian Android devices working |
| Opportunistic Encryption | On | Free perf win |
| TLS 1.3 | On | Required for HTTP/3 |
| Automatic HTTPS Rewrites | On | Auto-upgrades mixed content |
| Always Use HTTPS | On | Forces 301 from `http://*` to `https://*` |

**Zone → SSL/TLS → Edge Certificates**

| Setting | Value |
|---|---|
| Universal SSL | **Disable** (let Advanced Certificate Manager own all cert issuance) |
| Advanced Certificate | Enable, hosts: `connectvision.io`, `*.connectvision.io`, `*.*.connectvision.io` |
| HSTS | Enable — max-age 31536000, include subdomains, no preload (yet — preload after 30 days clean) |
| Minimum TLS Version | TLS 1.2 |
| TLS 1.3 | On |
| Automatic HTTPS Rewrites | On |
| Certificate Transparency Monitoring | On |

> The `*.*.connectvision.io` SAN matters: it covers two-level subdomains
> like `dashboard.tenant-x.connectvision.io` which we expect from customers
> who set up sub-apps under their slug.

---

## 3. Page Rules / Rulesets

Cloudflare Page Rules are being deprecated in favour of Rulesets. The
configurations below are written as Rulesets (Rules → Configuration Rules
and Rules → Cache Rules), with the equivalent legacy Page Rule footnoted
for back-compat with admins who haven't migrated yet.

### 3.1 Cache Rule — bypass tenant HTML (let `x-vercel-cache-tag` rule)

> Rules → Cache Rules → Create rule

```
Name:         CV: Bypass Cloudflare cache on tenant HTML (Vercel owns it)
When:         (http.host wildcard "*.connectvision.io" and not starts_with(http.request.uri.path, "/_next/static"))
Then:
  Cache eligibility:  Bypass cache
  Edge cache TTL:     n/a
```

**Why bypass instead of "respect origin"?** Vercel's edge already runs the
SWR strategy from `vercelProxy.ts`. Layering Cloudflare's cache on top
would shadow our `x-vercel-cache-tag`-based per-tenant purges, leading to
the classic "old branding sticks for 4 hours after the customer updates
their logo" support ticket.

### 3.2 Cache Rule — long-cache static assets

```
Name:         CV: Long-cache _next/static
When:         (starts_with(http.request.uri.path, "/_next/static"))
Then:
  Cache eligibility:  Eligible for cache
  Edge cache TTL:     1 month
  Browser cache TTL:  1 year
```

### 3.3 Configuration Rule — disable Browser Integrity Check on API

```
Name:         CV: Disable BIC on API
When:         (starts_with(http.request.uri.path, "/api/"))
Then:
  Browser Integrity Check: Off
  Security Level:           Essentially Off
  Disable Apps:             On
```

Reason: PataaWaa webhook & Razorpay UPI webhook hit `/api/waa/webhook` and
`/api/payments/webhook`. BIC's challenge page breaks them.

### 3.4 Configuration Rule — force HTTPS + HSTS for tenant apexes

```
Name:         CV: Force HTTPS for tenants
When:         (http.host wildcard "*.connectvision.io")
Then:
  Always Use HTTPS: On
  Automatic HTTPS Rewrites: On
```

### 3.5 Legacy Page Rule equivalents (for admins on the old UI)

| Match | Action |
|---|---|
| `*.connectvision.io/*` | Cache Level: Bypass; Always Use HTTPS: On |
| `*connectvision.io/_next/static/*` | Cache Level: Cache Everything; Edge Cache TTL: 1 month; Browser Cache TTL: 1 year |
| `*connectvision.io/api/*` | Browser Integrity Check: Off; Security Level: Essentially Off |

---

## 4. Customer-supplied apex domains

When a paying customer attaches their own apex (e.g. `memonbeauty.com`), the
flow is:

1. Customer enters their domain in `/dashboard/domains`.
2. Backend creates `TenantDomain` row, sets `customDomainVerified=false`,
   issues a TXT verification challenge.
3. Customer adds `TXT _cv-verify.memonbeauty.com = "cv_<random>"` at their
   own DNS provider.
4. Vercel API (or our cron) checks the TXT every 15 min; once it matches,
   we POST to Vercel's `/v9/projects/<id>/domains` endpoint to add the
   custom domain.
5. We send the customer instructions to flatten `memonbeauty.com` →
   `cname.vercel-dns.com` (apex flattening / ALIAS). On Cloudflare-DNS
   customers this just works; for non-Cloudflare DNS we issue the four
   Vercel IPs as A records.
6. On verification success, set `customDomainVerified=true` and stamp
   `customDomainVerifiedAt` on the Prisma row.

The middleware (`src/middleware.ts`) has a placeholder block for the
custom-domain lookup; when wiring it up, route through Cloudflare Workers
KV (NOT Prisma — Edge can't reach MySQL) populated by a backend job that
syncs the Vercel domain manifest every 5 min.

---

## 5. Pre-launch checklist (June 1 cutover)

- [ ] DNS records 1.1 / 1.2 / 1.3 all return `proxied=true` in `dig +short cf-ray …`
- [ ] `curl -sI https://connectvision.io | grep -i strict-transport-security` returns HSTS header
- [ ] `curl -sI https://memon-beauty.connectvision.io` returns `x-vercel-cache-tag: tenant:memon-beauty`
- [ ] `curl -sI https://connectvision.io/_next/static/<hash>.css | grep -i cache-control` shows `max-age=31536000, immutable`
- [ ] SSL Labs scan returns A or A+ for `connectvision.io` and a sample wildcard host
- [ ] Cloudflare → Analytics → Traffic shows non-zero hits for both apex + wildcard hosts
- [ ] PataaWaa webhook (`/api/waa/webhook`) returns 200 on a synthetic POST
- [ ] Razorpay webhook (`/api/payments/webhook`) returns 200 on a synthetic POST
- [ ] Vercel project domain settings list `connectvision.io`, `www.connectvision.io`, `*.connectvision.io`
- [ ] Advanced Certificate Manager shows status `active` for all three SANs

---

## 6. Rollback plan

If a Cloudflare config change breaks production traffic:

1. **DNS only mode:** Flip the `@` and `*` records' proxy status to grey
   cloud. Cloudflare drops out of the path; traffic goes straight to
   Vercel via Cloudflare DNS resolution only.
2. **Revert SSL mode to Flexible** temporarily if Advanced Cert issuance
   stalls (loses end-to-end encryption — acceptable for <1h emergency only).
3. **Roll back the Ruleset:** Cloudflare keeps versioned snapshots under
   Rules → Configuration Rules → Versions. One-click revert.

If the issue is at the Vercel layer (not Cloudflare), the rollback is to
revert the most recent Vercel deployment from the project dashboard.
`vercel rollback` is the CLI equivalent.

---

## 7. Quick reference — commands operators will need

```bash
# Verify wildcard resolution
dig +short A memon-beauty.connectvision.io
dig +short CNAME memon-beauty.connectvision.io
# Expect: cname.vercel-dns.com -> A 76.76.21.21 (or current Vercel anycast)

# Verify tenant cache headers
curl -sI -H "Host: memon-beauty.connectvision.io" https://connectvision.io | grep -iE "cache-control|x-vercel-cache-tag|x-cv-tenant"

# Purge a single tenant's cache by tag
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone_id>/purge_cache" \
  -H "Authorization: Bearer <api_token>" \
  -H "Content-Type: application/json" \
  -d '{"tags":["tenant:memon-beauty"]}'
# Equivalent via Vercel API (when Vercel-cache-tag based):
curl -X POST "https://api.vercel.com/v1/edge-config/<id>/purge" \
  -H "Authorization: Bearer <token>" \
  -d '{"tags":["tenant:memon-beauty"]}'

# Force-renew Advanced Certificate
# Cloudflare dashboard → SSL/TLS → Edge Certificates → click certificate → "Validate"
```

---

## 8. Open questions / pending decisions

| Topic | Owner | Resolve by |
|---|---|---|
| Move to Vercel-only DNS (drop CF entirely)? | Architecture | After 30 days launch-data |
| Cloudflare Workers KV vs Vercel Edge Config for custom-domain map | Engineering | June 15 |
| Per-tenant rate limit ruleset (DDoS scenarios) | Security | June 30 |
| WAF custom rules for OWASP top 10 | Security | July 15 |
