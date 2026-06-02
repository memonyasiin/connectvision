// ═════════════════════════════════════════════════════════════════════════════
// Purchase Confirmation Email Builder (MODULE 15)
// ─────────────────────────────────────────────────────────────────────────────
// Renders the HTML body of the "your ConnectVision purchase is ready" email.
//
// DESIGN PRINCIPLES
//   - Email-client safe: inline styles (Gmail strips <style> blocks), tables
//     for layout (not flexbox/grid — many clients still strip them), web-safe
//     fonts only (no Google Fonts in email — they're often blocked).
//   - Mobile-responsive without media queries: max-width 600px on the outer
//     table + fluid inner content.
//   - Brand-on-brand: emerald (#1c4d2a) + gold (#D4AF37) accents matching
//     the marketplace landing's colour story.
//   - Light/dark agnostic: avoids hairline borders + dark backgrounds that
//     break under iOS dark-mode auto-inversion.
//
// CONTENT
//   - Hero block: "Your purchase is ready" + ConnectVision wordmark
//   - License key card: BIG, scannable, copy-paste friendly monospace
//   - Three action buttons: View Dashboard, View Invoice, Download Bundle
//   - "What you can do" 3-step list
//   - Support footer with email + brand line
//
// PLAIN-TEXT FALLBACK
//   buildPurchaseEmailText() emits a clean plaintext equivalent — important
//   for deliverability (Gmail / Outlook score emails higher when both parts
//   are present) AND for screen-reader accessibility.
// ═════════════════════════════════════════════════════════════════════════════

export interface PurchaseEmailInput {
  /** The customer's business name (from CustomizationDraft.businessName). */
  businessName: string;
  /** The theme they bought, e.g. "Memon Beauty". */
  themeName: string;
  /** Their lifetime license key (CV-XXXXX-XXXXX-XXXXX). */
  licenseKey: string;
  /** Recipient email — used for the dashboard re-lookup link. */
  toEmail: string;
  /** Draft id — used to build the dashboard / invoice / bundle deep links. */
  draftId: string;
  /** Base URL of the deployment, e.g. "https://www.connectvision.us". */
  siteBaseUrl: string;
  /** Optional: ISO timestamp when purchase happened. */
  purchasedAtIso?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject line — keep short for mobile preview pane
// ─────────────────────────────────────────────────────────────────────────────

export function buildPurchaseEmailSubject(themeName: string): string {
  return `Your ${themeName} licence is ready · ConnectVision`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML body — inline-styled, table-based, email-client tested
// ─────────────────────────────────────────────────────────────────────────────

export function buildPurchaseEmail(input: PurchaseEmailInput): string {
  const eBusiness = escapeHtml(input.businessName);
  const eTheme = escapeHtml(input.themeName);
  const eKey = escapeHtml(input.licenseKey);
  const eEmail = escapeAttr(input.toEmail);
  const base = input.siteBaseUrl.replace(/\/$/, '');

  const dashboardUrl = `${base}/dashboard?draft=${encodeURIComponent(input.draftId)}`;
  const invoiceUrl   = `${base}/api/dashboard/invoice/${encodeURIComponent(input.draftId)}`;
  const bundleUrl    = `${base}/api/dashboard/bundle/${encodeURIComponent(input.draftId)}`;
  const supportEmail = 'support@connectvision.us';

  const purchasedDateLine = input.purchasedAtIso
    ? new Date(input.purchasedAtIso).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${escapeHtml(buildPurchaseEmailSubject(input.themeName))}</title>
</head>
<body style="margin:0; padding:0; background:#fafaf9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; color:#1a1a1a; line-height:1.55;">

<!-- Preview text — shown in inbox preview pane next to subject -->
<div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
  Your ${eTheme} licence + download links + GST invoice — keep this email safe.
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fafaf9;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <!-- Card -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- Hero -->
        <tr>
          <td style="background:linear-gradient(135deg,#1c4d2a 0%,#2a5f3a 50%,#1c4d2a 100%); padding:48px 40px 36px; text-align:center;">
            <div style="font-size:11px; font-weight:700; letter-spacing:0.22em; color:#D4AF37; text-transform:uppercase; margin-bottom:14px;">
              ConnectVision · Purchase Complete
            </div>
            <div style="font-size:30px; line-height:1.12; font-weight:800; color:#ffffff; margin:0; letter-spacing:-0.02em;">
              Your purchase is ready
            </div>
            <div style="font-size:15px; color:#d1fae5; margin-top:14px;">
              Hi ${eBusiness}, thanks for choosing <b style="color:#fff;">${eTheme}</b>.${purchasedDateLine ? `<br/>Purchased on ${escapeHtml(purchasedDateLine)}.` : ''}
            </div>
          </td>
        </tr>

        <!-- License key card -->
        <tr>
          <td style="padding:32px 40px 8px;">
            <div style="font-size:11px; font-weight:600; letter-spacing:0.15em; color:#737373; text-transform:uppercase; margin-bottom:10px;">
              Your lifetime licence key
            </div>
            <div style="background:#ecfdf5; border:1.5px solid #6ee7b7; border-radius:10px; padding:18px 20px; font-family:'Courier New',monospace; font-size:18px; font-weight:700; color:#065f46; letter-spacing:0.04em; word-break:break-all;">
              ${eKey}
            </div>
            <div style="font-size:12px; color:#737373; margin-top:10px; line-height:1.5;">
              Save this key — it's the proof-of-purchase the deployed theme uses for runtime verification. Lose it and you can recover it from the dashboard with your email.
            </div>
          </td>
        </tr>

        <!-- Actions -->
        <tr>
          <td style="padding:24px 40px 12px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="center" style="padding-bottom:10px;">
                  <a href="${escapeAttr(dashboardUrl)}" style="display:inline-block; width:100%; max-width:520px; padding:16px 22px; background:#1c4d2a; color:#ffffff; text-decoration:none; border-radius:10px; font-weight:700; font-size:15px; text-align:center;">
                    Open my dashboard →
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="50%" style="padding:4px;">
                        <a href="${escapeAttr(bundleUrl)}" style="display:block; padding:14px 18px; background:#ffffff; color:#1c4d2a; text-decoration:none; border:1.5px solid #1c4d2a; border-radius:10px; font-weight:600; font-size:13px; text-align:center;">
                          ⬇ Download theme bundle
                        </a>
                      </td>
                      <td width="50%" style="padding:4px;">
                        <a href="${escapeAttr(invoiceUrl)}" style="display:block; padding:14px 18px; background:#ffffff; color:#92400e; text-decoration:none; border:1.5px solid #f59e0b; border-radius:10px; font-weight:600; font-size:13px; text-align:center;">
                          📄 View GST invoice
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- What you can do -->
        <tr>
          <td style="padding:28px 40px 8px;">
            <div style="font-size:11px; font-weight:600; letter-spacing:0.15em; color:#737373; text-transform:uppercase; margin-bottom:12px;">
              What happens next
            </div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="top" width="32" style="padding:6px 12px 6px 0;">
                  <div style="width:24px; height:24px; border-radius:50%; background:#ecfdf5; color:#065f46; font-weight:800; font-size:11px; line-height:24px; text-align:center;">1</div>
                </td>
                <td valign="top" style="padding:6px 0; font-size:14px; color:#404040;">
                  <b style="color:#1a1a1a;">Download the bundle</b> · click the button above to get a .zip with your personalised HTML + deploy configs for Vercel or Netlify.
                </td>
              </tr>
              <tr>
                <td valign="top" width="32" style="padding:6px 12px 6px 0;">
                  <div style="width:24px; height:24px; border-radius:50%; background:#fef3c7; color:#92400e; font-weight:800; font-size:11px; line-height:24px; text-align:center;">2</div>
                </td>
                <td valign="top" style="padding:6px 0; font-size:14px; color:#404040;">
                  <b style="color:#1a1a1a;">Keep the GST invoice safe</b> · use the button above to view + print/save as PDF for your records.
                </td>
              </tr>
              <tr>
                <td valign="top" width="32" style="padding:6px 12px 6px 0;">
                  <div style="width:24px; height:24px; border-radius:50%; background:#ecfdf5; color:#065f46; font-weight:800; font-size:11px; line-height:24px; text-align:center;">3</div>
                </td>
                <td valign="top" style="padding:6px 0; font-size:14px; color:#404040;">
                  <b style="color:#1a1a1a;">Re-customise anytime</b> · open the dashboard with email <code style="background:#f5f5f4; padding:1px 5px; border-radius:3px; font-size:12px;">${eEmail}</code>. Your licence covers unlimited future edits.
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Support -->
        <tr>
          <td style="padding:28px 40px 36px;">
            <div style="background:#f5f5f4; border-left:3px solid #1c4d2a; padding:14px 18px; border-radius:0 8px 8px 0; font-size:13px; color:#404040;">
              <b style="color:#1a1a1a;">Need help?</b><br/>
              Reply to this email or write to <a href="mailto:${escapeAttr(supportEmail)}" style="color:#1c4d2a;">${escapeHtml(supportEmail)}</a> — include your licence key (above) for fastest service.
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px 32px; background:#f5f5f4; border-top:1px solid #e7e5e4; text-align:center;">
            <div style="font-size:12px; color:#737373; margin-bottom:6px;">
              ConnectVision OS · India's zero-friction website marketplace
            </div>
            <div style="font-size:11px; color:#a3a3a3;">
              You're receiving this because you bought a lifetime theme licence.<br/>
              <a href="${escapeAttr(base)}" style="color:#1c4d2a; text-decoration:none;">www.connectvision.us</a>
              · <a href="${escapeAttr(dashboardUrl)}" style="color:#1c4d2a; text-decoration:none;">dashboard</a>
            </div>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plain-text fallback — deliverability boost + accessibility
// ─────────────────────────────────────────────────────────────────────────────

export function buildPurchaseEmailText(input: PurchaseEmailInput): string {
  const base = input.siteBaseUrl.replace(/\/$/, '');
  const dashboardUrl = `${base}/dashboard?draft=${encodeURIComponent(input.draftId)}`;
  const invoiceUrl   = `${base}/api/dashboard/invoice/${encodeURIComponent(input.draftId)}`;
  const bundleUrl    = `${base}/api/dashboard/bundle/${encodeURIComponent(input.draftId)}`;

  return `Your ${input.themeName} purchase is ready

Hi ${input.businessName},

Thanks for choosing ${input.themeName}. Your lifetime licence is below — save this email.

LICENCE KEY:  ${input.licenseKey}

DASHBOARD:        ${dashboardUrl}
DOWNLOAD BUNDLE:  ${bundleUrl}
GST INVOICE:      ${invoiceUrl}

The dashboard lets you re-download the bundle, view the invoice, or
re-customise the theme as many times as you like — your licence covers
unlimited edits.

Need help? Reply to this email or write to support@connectvision.us
with your licence key.

— ConnectVision OS
https://www.connectvision.us
`;
}
