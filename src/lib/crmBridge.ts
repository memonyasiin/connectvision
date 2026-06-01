// ─────────────────────────────────────────────────────────────────────────────
// Pataa CRM Bridge (Tier 3 — Cross-Platform Unified Ecosystem Hook)
// ─────────────────────────────────────────────────────────────────────────────
// Single intake endpoint. Every generated tenant site's contact form,
// floating WhatsApp widget, and "book a call" CTA POST here. We normalize,
// stamp tenant/section/intent context, and forward to the Pataa CRM lead
// intake endpoint with a service-to-service auth token.
//
// Why a thin bridge: keeps tenant builds free of CRM credentials; CV stays
// the only system that holds PATAA_CRM_SYNC_TOKEN.

export interface CrmLeadPayload {
  /** Tenant subdomain or buildId — identifies which Pataa CRM owner this is for. */
  tenantId: string;
  /** Lead's name (free-form). */
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  /** Section the user submitted from (e.g. "hero", "contact-form"). */
  sourceSection?: string;
  /** Free-form intent tag from the form/widget. */
  intent?: string;
  /** Optional product / service id. */
  productTag?: string;
  /** Page URL. */
  pageUrl?: string;
  /** Activity payload from the client-side tracker (scroll-depth, etc). */
  activity?: {
    scrollDepthPct?: number;
    activeSections?: string[];
    timeOnPageSec?: number;
    referrer?: string;
  };
  /** Server-stamped timestamp (ISO 8601). */
  receivedAt?: string;
}

export interface CrmBridgeResult {
  ok: boolean;
  /** Pataa CRM lead id if the upstream returned one. */
  crmLeadId?: string;
  error?: string;
}

/**
 * Forwards a normalized lead to Pataa CRM. Designed to be called from the
 * `/api/crm-sync/lead` server route (NOT directly from the browser).
 *
 * Environment:
 *   PATAA_CRM_BASE_URL       e.g. https://pataainternational.com
 *   PATAA_CRM_LEAD_ENDPOINT  e.g. /api/crm/leads/intake
 *   PATAA_CRM_SYNC_TOKEN     bearer token configured on the Pataa side
 */
export async function pushLeadToPataaCrm(payload: CrmLeadPayload): Promise<CrmBridgeResult> {
  const base = process.env.PATAA_CRM_BASE_URL;
  const path = process.env.PATAA_CRM_LEAD_ENDPOINT ?? '/api/crm/leads/intake';
  const token = process.env.PATAA_CRM_SYNC_TOKEN;

  if (!base || !token) {
    return { ok: false, error: 'PATAA_CRM_BASE_URL / PATAA_CRM_SYNC_TOKEN not configured' };
  }

  const body = JSON.stringify({ ...payload, receivedAt: payload.receivedAt ?? new Date().toISOString() });

  try {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Source-Platform': 'connectvision',
      },
      body,
      // Bound the wait so a slow Pataa upstream doesn't pin our edge fn.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `Pataa CRM ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = await res.json().catch(() => ({} as { id?: string }));
    return { ok: true, crmLeadId: data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Mirror to Pataa Workops if a workspace-channel lead routing rule is
 * configured (e.g. specific industries always get pinged in Workops first).
 * Soft-fails — Workops being down should never block the primary CRM intake.
 */
export async function mirrorToWorkops(payload: CrmLeadPayload): Promise<void> {
  const base = process.env.PATAA_WORKOPS_BASE_URL;
  const token = process.env.PATAA_WORKOPS_SYNC_TOKEN;
  if (!base || !token) return;
  try {
    await fetch(`${base}/api/workops/intake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Source-Platform': 'connectvision',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* swallow — secondary mirror */
  }
}
