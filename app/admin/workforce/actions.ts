// ═════════════════════════════════════════════════════════════════════════════
// app/admin/workforce/actions.ts — Server actions for the workforce hub
// ─────────────────────────────────────────────────────────────────────────────
// Next.js 15+ server actions called from the client RecomputeButton. The
// browser never sees the X-CV-Validation-Token — the action runs server-
// side, reads the secret from env, hits the existing /api/admin/workforce
// route, and returns a small typed result envelope.
//
// WHY VIA HTTP NOT DIRECT IMPORT
//   /api/admin/workforce already does the full scan + DB write transaction.
//   Calling it via fetch preserves a single code path for the scanner —
//   no risk of the action and the cron diverging in behaviour.
//
// AUTH POSTURE
//   The action is GATED at the page level (once admin session middleware
//   lands). For now the page is unauth — the action's secret-token-only
//   call to /api/admin/workforce is the perimeter.
// ═════════════════════════════════════════════════════════════════════════════

'use server';

import { revalidatePath } from 'next/cache';

export interface RecomputeResult {
  ok: boolean;
  status: number;
  detail?: string;
  /** Summary echoed back from the scanner on success. */
  summary?: {
    overdueAbsentCount: number;
    ghostStateCount: number;
    totalPenaltyInr: number;
  };
}

/**
 * Trigger a fresh workforce scan via /api/admin/workforce. The scanner:
 *   - re-classifies open attendance rows (auto-flag OVERDUE_ABSENT)
 *   - computes per-day penalty INR + stamps it on the row
 *   - re-checks GHOST_STATE across the last 30 min telemetry window
 *   - emits a telemetry POST to Pataa CRM (fire-and-forget)
 *
 * On success the workforce page is revalidated so the next render shows
 * the freshly-stamped state.
 */
export async function recomputeWorkforceAction(): Promise<RecomputeResult> {
  const token = process.env.CV_VALIDATION_TOKEN;
  const cronSecret = process.env.CRON_SECRET;
  const internalSecret = process.env.INTERNAL_SECRET;

  // Build absolute URL — Vercel + local dev both expose the deployment
  // host via VERCEL_URL / NEXTAUTH_URL / fallback to localhost.
  const host =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const url = `${host.replace(/\/$/, '')}/api/admin/workforce`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  // Prefer the project-standard X-CV-Validation-Token; fall back to Bearer
  // if only the legacy secrets are configured (dev environments).
  if (token) {
    headers['X-ConnectVision-Validation-Token'] = token;
  } else if (internalSecret) {
    headers['Authorization'] = `Bearer ${internalSecret}`;
  } else if (cronSecret) {
    headers['Authorization'] = `Bearer ${cronSecret}`;
  } else {
    return {
      ok: false,
      status: 0,
      detail: 'No auth secret configured (CV_VALIDATION_TOKEN / INTERNAL_SECRET / CRON_SECRET).',
    };
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
      // Cap on the scan call. The cron version typically completes in
      // < 2s; 20s gives a wide safety margin without leaving the button
      // spinning forever on a stuck DB.
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        ok: false,
        status: res.status,
        detail: body.slice(0, 200) || `Upstream HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      overdueAbsentCount?: number;
      ghostStateCount?: number;
      totalPenaltyInr?: number;
    };
    // Revalidate the page so the next render reflects the fresh stamps.
    revalidatePath('/admin/workforce');
    return {
      ok: true,
      status: res.status,
      summary: {
        overdueAbsentCount: data.overdueAbsentCount ?? 0,
        ghostStateCount: data.ghostStateCount ?? 0,
        totalPenaltyInr: data.totalPenaltyInr ?? 0,
      },
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      detail: err instanceof Error ? err.message : 'Network fault',
    };
  }
}
