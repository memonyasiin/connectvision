// ═════════════════════════════════════════════════════════════════════════════
// License-server bridge — register issued marketplace licenses (MODULE 16)
// ─────────────────────────────────────────────────────────────────────────────
// When /api/checkout/verify or /api/checkout/webhook issues a CV-XXXXX license,
// this helper mirrors it into the `licenses` table that the ConnectVision-PHP
// license server (https://license.connectvision.us) reads. Distributed theme
// bundles + the admin panel can then recognise the key via the PHP server's
// POST /api/license/verify endpoint.
//
// WHY RAW SQL
//   The license server + the Next.js marketplace SHARE one MySQL database
//   (perfect4_Connect_cv). The `licenses` table is owned by the PHP app and is
//   NOT in the Prisma schema, so we write to it with prisma.$executeRaw rather
//   than adding a Prisma model (which would fight `prisma migrate`). One DB,
//   one connection pool, zero extra network hop.
//
// IDEMPOTENCY
//   `license_key` is UNIQUE in the PHP schema. ON DUPLICATE KEY UPDATE makes
//   this safe to call from BOTH the verify path and the webhook path for the
//   same purchase (whichever lands first inserts; the other refreshes meta).
//
// FAILURE POSTURE — FIRE-AND-FORGET
//   A license-server registration failure MUST NOT block the purchase or the
//   buyer's license reveal. Callers `void` this; it never throws.
// ═════════════════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/prisma';

export interface RegisterLicenseInput {
  licenseKey: string;
  email: string | null;
  themeSlug: string;
  themeName: string;
  draftId: string;
  businessName: string;
}

export interface RegisterLicenseResult {
  ok: boolean;
  error?: string;
}

/**
 * Mirror an issued license into the shared `licenses` table as 'unassigned'
 * (registered + ready to activate). Lifetime theme licences have no expiry
 * (expires_at NULL). The consumer (theme bundle / site) calls the license
 * server's activate endpoint on first run to bind a machine_id and flip the
 * row to 'active'; verify() then passes. Registering as 'active' here would be
 * wrong — verify() requires a machine_id match, which doesn't exist until
 * activation. Never throws.
 */
export async function registerLicenseInServer(
  input: RegisterLicenseInput,
): Promise<RegisterLicenseResult> {
  try {
    const meta = JSON.stringify({
      source: 'saas-marketplace',
      themeSlug: input.themeSlug,
      themeName: input.themeName,
      draftId: input.draftId,
      businessName: input.businessName,
    });

    // status 'unassigned', expires_at NULL (perpetual). meta is a JSON string
    // bound to the JSON column. ON DUPLICATE KEY keeps the verify+webhook race
    // idempotent WITHOUT downgrading a license the consumer may have already
    // activated (don't touch status / machine_id on conflict — only backfill
    // the assigned_email if it was null, and refresh meta).
    await prisma.$executeRaw`
      INSERT INTO licenses (license_key, assigned_email, plan, status, expires_at, meta, created_at)
      VALUES (${input.licenseKey}, ${input.email}, 'lifetime', 'unassigned', NULL, ${meta}, NOW())
      ON DUPLICATE KEY UPDATE
        assigned_email = COALESCE(licenses.assigned_email, VALUES(assigned_email)),
        meta           = VALUES(meta)
    `;
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'license-server register fault',
    };
  }
}
