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
 * Mirror an issued license into the shared `licenses` table. Lifetime theme
 * licences have no expiry (expires_at stays NULL) and are 'active' on issue —
 * the PHP verify endpoint binds machine_id on first activation. Never throws.
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

    // plan 'lifetime', status 'active', expires_at NULL (perpetual). meta is a
    // JSON string bound to the JSON column. ON DUPLICATE KEY keeps it idempotent.
    await prisma.$executeRaw`
      INSERT INTO licenses (license_key, assigned_email, plan, status, meta, created_at)
      VALUES (${input.licenseKey}, ${input.email}, 'lifetime', 'active', ${meta}, NOW())
      ON DUPLICATE KEY UPDATE
        assigned_email = VALUES(assigned_email),
        plan           = VALUES(plan),
        status         = VALUES(status),
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
