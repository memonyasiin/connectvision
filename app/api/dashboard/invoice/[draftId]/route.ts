// ═════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard/invoice/[draftId] — GST-compliant invoice (MODULE 14)
// ─────────────────────────────────────────────────────────────────────────────
// Returns a self-contained printable HTML invoice for any PURCHASED draft.
// The HTML is print-stylesheet aware — Ctrl+P in any browser produces a
// PDF identical to a downloaded one. Avoids adding a pdf-generation dep
// (no `pdfkit` / `puppeteer`) while staying GST-compliant per CBIC rules
// for digital services (SAC 998314).
//
// GST COMPLIANCE NOTES
//   - Tax type: We default to **IGST 18%** because buyer state is unknown
//     at purchase time (no address parsing yet). IGST is the safe choice
//     under CBIC's "Place of Supply" rules — when buyer is outside the
//     seller's home state, IGST applies. If buyer state happens to match
//     seller, IGST is still legal but they can't claim ITC; operator can
//     re-issue as CGST+SGST manually on request.
//   - HSN/SAC: 998314 ("Information technology design and development
//     services") is the standard SAC code for software/website services.
//   - Gross price → taxable value: customer paid `priceInr` inclusive of
//     GST. Taxable value = priceInr / 1.18 (rounded to paise).
//   - Invoice number: deterministic `${PREFIX}${YYYY-MM}-${last8(draftId)}`
//     so the same draft always generates the same invoice number.
//   - Amount in words: simple Indian-rupees converter for the legal
//     "amount in words" line every GST invoice requires.
//
// SELLER DETAILS — ENV-DRIVEN (set in Vercel before going live with real GST)
//   CV_INVOICE_SELLER_NAME           default: "ConnectVision OS"
//   CV_INVOICE_SELLER_GSTIN          REQUIRED for real invoices (placeholder shown otherwise)
//   CV_INVOICE_SELLER_ADDRESS        multi-line; use \n for newlines
//   CV_INVOICE_SELLER_STATE_CODE     2-digit code (e.g. "27" for Maharashtra)
//   CV_INVOICE_SELLER_PAN            derived from GSTIN by default
//   CV_INVOICE_SAC                   default: "998314"
//   CV_INVOICE_SERIES_PREFIX         default: "CV/"
//
// AUTH
//   PUBLIC + cuid-gated (same posture as MODULE 13 /bundle route).
//   Gates by `draft.status === 'PURCHASED'`.
// ═════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findThemeBySlug } from '@/data/themeMarketplaceCatalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Constants + env helpers
// ─────────────────────────────────────────────────────────────────────────────

const GST_RATE_PCT = 18;
const SAC_CODE_DEFAULT = '998314';
const SERIES_PREFIX_DEFAULT = 'CV/';

function envOrDefault(key: string, fallback: string): string {
  const v = process.env[key];
  return v && v.trim() && !v.startsWith('CHANGE_ME') ? v : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Round to 2 decimal places — paise precision. */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Format INR with grouping (Indian numbering — lakhs/crores). */
function inr(n: number): string {
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Invoice number — deterministic per draft. */
function invoiceNumber(draftId: string, purchasedAt: Date): string {
  const prefix = envOrDefault('CV_INVOICE_SERIES_PREFIX', SERIES_PREFIX_DEFAULT);
  const ym = `${purchasedAt.getUTCFullYear()}-${String(purchasedAt.getUTCMonth() + 1).padStart(2, '0')}`;
  const suffix = draftId.slice(-8).toUpperCase();
  return `${prefix}${ym}/${suffix}`;
}

/**
 * Convert a positive integer ≤ 99,99,99,999 (~99.99 crore) to Indian
 * English words. Enough for marketplace invoices (max ₹5000 here, so
 * the upper bound is heavily over-engineered, but good for the future
 * when bulk SKUs ship).
 */
function rupeesInWords(n: number): string {
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function below100(num: number): string {
    if (num < 20) return ones[num] ?? '';
    const t = tens[Math.floor(num / 10)] ?? '';
    const o = ones[num % 10] ?? '';
    return o ? `${t} ${o}`.trim() : t;
  }
  function below1000(num: number): string {
    const h = Math.floor(num / 100);
    const r = num % 100;
    const parts: string[] = [];
    if (h > 0) parts.push(`${ones[h] ?? ''} Hundred`);
    if (r > 0) parts.push(below100(r));
    return parts.join(' ').trim();
  }

  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh  = Math.floor((n % 10_000_000) / 100_000);
  const thou  = Math.floor((n % 100_000) / 1000);
  const rest  = n % 1000;

  if (crore > 0) parts.push(`${below100(crore)} Crore`);
  if (lakh  > 0) parts.push(`${below100(lakh)} Lakh`);
  if (thou  > 0) parts.push(`${below100(thou)} Thousand`);
  if (rest  > 0) parts.push(below1000(rest));
  return parts.join(' ').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice line model
// ─────────────────────────────────────────────────────────────────────────────

interface InvoiceLine {
  description: string;
  sac: string;
  qty: number;
  rateInclusive: number;     // what the customer paid per unit (gross)
  taxableValue: number;       // back-calculated: rate / 1.18 per unit × qty
  igstAmount: number;         // 18% on taxable value
  totalAmount: number;        // taxableValue + igstAmount (~ rate × qty)
}

function buildLine(description: string, rateInclusive: number): InvoiceLine {
  const taxableUnit = r2(rateInclusive / (1 + GST_RATE_PCT / 100));
  const igstUnit    = r2(rateInclusive - taxableUnit);
  return {
    description,
    sac: envOrDefault('CV_INVOICE_SAC', SAC_CODE_DEFAULT),
    qty: 1,
    rateInclusive,
    taxableValue: taxableUnit,
    igstAmount:   igstUnit,
    totalAmount:  rateInclusive,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML invoice template
// ─────────────────────────────────────────────────────────────────────────────

interface InvoiceContext {
  invoiceNo: string;
  invoiceDate: Date;
  draftId: string;
  buyer: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  themeName: string;
  licenseKey: string;
  razorpayPaymentId: string | null;
  line: InvoiceLine;
}

function renderInvoiceHtml(ctx: InvoiceContext): string {
  const seller = {
    name:    envOrDefault('CV_INVOICE_SELLER_NAME',     'ConnectVision OS'),
    gstin:   envOrDefault('CV_INVOICE_SELLER_GSTIN',    'GSTIN-NOT-CONFIGURED'),
    address: envOrDefault('CV_INVOICE_SELLER_ADDRESS',  'Address not configured (set CV_INVOICE_SELLER_ADDRESS env)'),
    state:   envOrDefault('CV_INVOICE_SELLER_STATE_CODE', '00'),
    pan:     envOrDefault('CV_INVOICE_SELLER_PAN',      'PAN-NOT-CONFIGURED'),
  };

  const dateStr = ctx.invoiceDate.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const subtotal = ctx.line.taxableValue * ctx.line.qty;
  const igst     = ctx.line.igstAmount * ctx.line.qty;
  const grand    = ctx.line.totalAmount * ctx.line.qty;
  const grandFloor = Math.floor(grand);
  const words = `${rupeesInWords(grandFloor)} Rupees Only`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tax Invoice ${escapeHtml(ctx.invoiceNo)} — ${escapeHtml(seller.name)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1a1a1a; background: #f5f5f4;
      font-size: 11pt; line-height: 1.45;
    }
    .sheet {
      max-width: 760px; margin: 24px auto;
      background: #fff; padding: 40px 44px;
      border: 1px solid #e7e5e4; border-radius: 8px;
      box-shadow: 0 12px 32px -16px rgba(0,0,0,0.12);
    }
    .toolbar {
      max-width: 760px; margin: 24px auto 12px; padding: 0 4px;
      display: flex; justify-content: space-between; align-items: center;
      gap: 12px;
    }
    .toolbar a, .toolbar button {
      display: inline-flex; align-items: center; gap: 6px;
      background: #1c4d2a; color: #fff;
      border: 0; border-radius: 8px;
      padding: 8px 14px; font-size: 12px; font-weight: 600;
      cursor: pointer; text-decoration: none;
    }
    .toolbar .ghost { background: #fff; color: #1c4d2a; border: 1px solid #1c4d2a; }

    .invoice-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 2px solid #1c4d2a;
      padding-bottom: 18px; margin-bottom: 24px;
    }
    .seller h1 {
      margin: 0 0 4px; font-size: 18pt; font-weight: 800; color: #1c4d2a;
      letter-spacing: -0.01em;
    }
    .seller .addr {
      font-size: 9.5pt; color: #525252; white-space: pre-line; margin-top: 6px;
    }
    .seller .ids { font-size: 9pt; color: #404040; margin-top: 8px; font-family: 'Courier New', monospace; }
    .meta {
      text-align: right; font-size: 10pt; color: #1a1a1a;
    }
    .meta .label {
      font-size: 9pt; letter-spacing: 0.12em;
      text-transform: uppercase; color: #737373;
      font-weight: 600;
    }
    .meta .value { font-weight: 700; font-size: 12pt; margin-bottom: 8px; font-family: 'Courier New', monospace; }
    .meta .invoice-title {
      font-size: 22pt; font-weight: 800; color: #1c4d2a;
      letter-spacing: 0.03em; margin-bottom: 12px;
    }

    .bill-to {
      background: #f5f5f4; border-left: 3px solid #1c4d2a;
      padding: 14px 18px; border-radius: 0 6px 6px 0;
      margin-bottom: 24px;
    }
    .bill-to .label {
      font-size: 9pt; letter-spacing: 0.12em;
      text-transform: uppercase; color: #737373; font-weight: 600;
      margin-bottom: 6px;
    }
    .bill-to .name { font-weight: 700; font-size: 13pt; }
    .bill-to .meta-row { font-size: 10pt; color: #525252; margin-top: 3px; }

    table.items {
      width: 100%; border-collapse: collapse; margin-bottom: 24px;
      font-size: 10pt;
    }
    table.items thead th {
      background: #1c4d2a; color: #fff; text-align: left;
      padding: 10px 12px; font-weight: 600; font-size: 9.5pt;
      letter-spacing: 0.03em;
    }
    table.items thead th.num { text-align: right; }
    table.items tbody td {
      border-bottom: 1px solid #e7e5e4;
      padding: 14px 12px; vertical-align: top;
    }
    table.items tbody td.num { text-align: right; font-family: 'Courier New', monospace; }
    table.items tbody td.sac { font-family: 'Courier New', monospace; font-size: 9.5pt; color: #525252; }
    .desc-meta { font-size: 9pt; color: #737373; margin-top: 4px; }

    .totals {
      display: flex; justify-content: flex-end; margin-top: 8px;
    }
    .totals-table {
      width: 320px; font-size: 10pt;
    }
    .totals-table .row {
      display: flex; justify-content: space-between;
      padding: 6px 0; border-bottom: 1px solid #f5f5f4;
    }
    .totals-table .row.grand {
      border-top: 2px solid #1c4d2a; border-bottom: 2px solid #1c4d2a;
      padding: 10px 0; margin-top: 6px;
      font-weight: 800; font-size: 12pt; color: #1c4d2a;
    }
    .totals-table .row .v { font-family: 'Courier New', monospace; }

    .amount-words {
      background: #f5f5f4; border-radius: 6px;
      padding: 12px 16px; margin-top: 18px;
      font-size: 10pt; color: #404040;
    }
    .amount-words b { color: #1a1a1a; }

    .payment-meta {
      margin-top: 18px; padding: 12px 14px;
      background: #ecfdf5; border-left: 3px solid #059669;
      font-size: 9.5pt;
    }

    .footer-note {
      margin-top: 32px; padding-top: 14px;
      border-top: 1px solid #e7e5e4;
      font-size: 9pt; color: #737373; text-align: center;
    }

    /* Print styles — hide toolbar + tighten margins */
    @media print {
      body { background: #fff; font-size: 10pt; }
      .toolbar { display: none !important; }
      .sheet {
        max-width: 100%; margin: 0; padding: 0;
        border: none; box-shadow: none; border-radius: 0;
      }
    }
  </style>
</head>
<body>

  <div class="toolbar">
    <a href="/dashboard?draft=${escapeHtml(ctx.draftId)}" class="ghost">← Back to dashboard</a>
    <button type="button" onclick="window.print()">🖨 Print / Save as PDF</button>
  </div>

  <div class="sheet">

    <div class="invoice-header">
      <div class="seller">
        <h1>${escapeHtml(seller.name)}</h1>
        <div class="addr">${escapeHtml(seller.address)}</div>
        <div class="ids">
          GSTIN: ${escapeHtml(seller.gstin)}<br/>
          PAN:   ${escapeHtml(seller.pan)}<br/>
          State Code: ${escapeHtml(seller.state)}
        </div>
      </div>
      <div class="meta">
        <div class="invoice-title">TAX INVOICE</div>
        <div class="label">Invoice No</div>
        <div class="value">${escapeHtml(ctx.invoiceNo)}</div>
        <div class="label">Date</div>
        <div class="value">${escapeHtml(dateStr)}</div>
        <div class="label">Place of Supply</div>
        <div class="value">Inter-State (IGST)</div>
      </div>
    </div>

    <div class="bill-to">
      <div class="label">Bill To</div>
      <div class="name">${escapeHtml(ctx.buyer.name)}</div>
      ${ctx.buyer.email   ? `<div class="meta-row">${escapeHtml(ctx.buyer.email)}</div>` : ''}
      ${ctx.buyer.phone   ? `<div class="meta-row">${escapeHtml(ctx.buyer.phone)}</div>` : ''}
      ${ctx.buyer.address ? `<div class="meta-row">${escapeHtml(ctx.buyer.address)}</div>` : ''}
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="width: 56%">Description</th>
          <th style="width: 14%">SAC</th>
          <th class="num" style="width: 6%">Qty</th>
          <th class="num" style="width: 12%">Rate</th>
          <th class="num" style="width: 12%">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div><b>ConnectVision Lifetime Theme Licence</b></div>
            <div class="desc-meta">
              Theme: ${escapeHtml(ctx.themeName)}<br/>
              Licence key: ${escapeHtml(ctx.licenseKey)}
            </div>
          </td>
          <td class="sac">${escapeHtml(ctx.line.sac)}</td>
          <td class="num">${ctx.line.qty}</td>
          <td class="num">₹${inr(ctx.line.taxableValue)}</td>
          <td class="num">₹${inr(ctx.line.taxableValue * ctx.line.qty)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-table">
        <div class="row">
          <span>Sub-total (taxable value)</span>
          <span class="v">₹${inr(subtotal)}</span>
        </div>
        <div class="row">
          <span>IGST @ ${GST_RATE_PCT}%</span>
          <span class="v">₹${inr(igst)}</span>
        </div>
        <div class="row grand">
          <span>Grand Total (INR)</span>
          <span class="v">₹${inr(grand)}</span>
        </div>
      </div>
    </div>

    <div class="amount-words">
      <b>Amount in words:</b> ${escapeHtml(words)}
    </div>

    ${ctx.razorpayPaymentId ? `
      <div class="payment-meta">
        ✓ Payment captured via UPI / Razorpay · Reference:
        <code>${escapeHtml(ctx.razorpayPaymentId)}</code>
      </div>
    ` : ''}

    <div class="footer-note">
      This is a computer-generated tax invoice. No signature required.<br/>
      Issued under Section 31 of the CGST Act, 2017. Reverse charge: <b>No</b>.<br/>
      Subject to ${escapeHtml(seller.name)} terms of service. Disputes: jurisdiction per GSTIN state.
    </div>

  </div>

</body>
</html>
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ draftId: string }>;
}

export async function GET(_req: Request, context: RouteContext): Promise<Response> {
  const { draftId } = await context.params;
  if (!draftId || typeof draftId !== 'string' || draftId.trim() === '') {
    return NextResponse.json(
      { ok: false, error: 'INVALID_DRAFT_ID', detail: 'draftId is required.' },
      { status: 400 },
    );
  }

  const draft = await prisma.customizationDraft.findUnique({
    where: { id: draftId.trim() },
  });
  if (!draft) {
    return NextResponse.json(
      { ok: false, error: 'NOT_FOUND', detail: 'Draft not found.' },
      { status: 404 },
    );
  }
  if (draft.status !== 'PURCHASED' || !draft.licenseKey || !draft.purchasedAt) {
    return NextResponse.json(
      {
        ok: false,
        error: 'NOT_PURCHASED',
        detail: 'Invoice is generated only after successful purchase.',
      },
      { status: 403 },
    );
  }
  const theme = findThemeBySlug(draft.themeSlug);
  if (!theme) {
    return NextResponse.json(
      { ok: false, error: 'THEME_UNAVAILABLE', detail: 'Source theme no longer in marketplace.' },
      { status: 503 },
    );
  }

  const line = buildLine(`Lifetime licence: ${theme.name}`, theme.priceInr);
  const ctx: InvoiceContext = {
    invoiceNo:   invoiceNumber(draft.id, draft.purchasedAt),
    invoiceDate: draft.purchasedAt,
    draftId:     draft.id,
    buyer: {
      name:    draft.businessName,
      email:   draft.contactEmail ?? draft.customerEmail,
      phone:   draft.contactPhone,
      address: draft.contactAddress,
    },
    themeName:        theme.name,
    licenseKey:       draft.licenseKey,
    razorpayPaymentId: draft.razorpayPaymentId,
    line,
  };

  const html = renderInvoiceHtml(ctx);
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
