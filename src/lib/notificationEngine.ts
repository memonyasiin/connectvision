// ─────────────────────────────────────────────────────────────────────────────
// Notification Engine — multi-channel omnichannel router
// ─────────────────────────────────────────────────────────────────────────────
// Fires when an appointment transitions to a notification-relevant state
// (CONFIRMED, T-1h reminder, T-30min reminder, CANCELLED).
//
// Channels:
//   - sms      → MSG91 / Karix / DLT-registered transactional gateway
//   - whatsapp → PataaWaa multi-tenant gateway (server-to-server REST)
//
// Each dispatch:
//   1. Loads the appointment + tenant
//   2. Resolves the customer's stored locale (Shudh Hindi / Hinglish / English)
//   3. Formats subject + body from the translations dictionary
//   4. Calls the channel adapter(s)
//   5. Stamps `confirmationSentAt` / `reminder30MinSentAt` etc. on the row
//      so re-fires are idempotent.
//
// Designed to be invoked from:
//   - Razorpay UPI webhook (CONFIRMED branch)
//   - Cron / scheduler (reminder branches)
//   - Operator-initiated cancel (CANCELLED branch)

import 'server-only';

import { prisma } from './prisma';
import { resolveLocale, t, type Locale, type TranslationKey } from './translations';
import type { Prisma, BusinessAppointment } from '@prisma/client';

// ── Trigger taxonomy ─────────────────────────────────────────────────────────

export type NotificationTrigger =
  | 'confirmation'
  | 'reminder_30min'
  | 'reminder_1h'
  | 'cancelled'
  | 'slot_updated';

/** Operator-facing alerts that don't ride on a specific appointment row. */
export type WorkforceTrigger =
  | 'ghost_state'
  | 'leave_breach';

export type Channel = 'sms' | 'whatsapp' | 'both';

const TRIGGER_TRANSLATION_KEYS: Record<NotificationTrigger, { subject: TranslationKey; body: TranslationKey }> = {
  confirmation:    { subject: 'notify.confirmation.subject',   body: 'notify.confirmation.body'   },
  reminder_30min:  { subject: 'notify.reminder_30min.subject', body: 'notify.reminder_30min.body' },
  reminder_1h:     { subject: 'notify.reminder_1h.subject',    body: 'notify.reminder_1h.body'    },
  cancelled:       { subject: 'notify.cancelled.subject',      body: 'notify.cancelled.body'      },
  slot_updated:    { subject: 'notify.slot_updated.subject',   body: 'notify.slot_updated.body'   },
};

const WORKFORCE_TRIGGER_KEYS: Record<WorkforceTrigger, { subject: TranslationKey; body: TranslationKey }> = {
  ghost_state:  { subject: 'notify.ghost_state.subject',  body: 'notify.ghost_state.body'  },
  leave_breach: { subject: 'notify.leave_breach.subject', body: 'notify.leave_breach.body' },
};

const SENT_AT_FIELDS: Record<NotificationTrigger, keyof Prisma.BusinessAppointmentUpdateInput | null> = {
  confirmation:   'confirmationSentAt',
  reminder_30min: 'reminder30MinSentAt',
  reminder_1h:    'reminder1HrSentAt',
  cancelled:      null,
  slot_updated:   null, // legitimately re-fires whenever the slot changes again
};

// ── Input/output shape ───────────────────────────────────────────────────────

export interface DispatchInput {
  appointmentId: string;
  trigger: NotificationTrigger;
  /** Channel selector; defaults to 'both' on confirmation, 'whatsapp' otherwise. */
  channel?: Channel;
  /** Force a re-fire even if the idempotency stamp is already set. */
  force?: boolean;
}

export interface DispatchResult {
  ok: boolean;
  appointmentId: string;
  trigger: NotificationTrigger;
  skipped?: 'already_sent' | 'no_phone' | 'cancelled_state';
  sms?: ChannelResult;
  whatsapp?: ChannelResult;
  error?: string;
}

interface ChannelResult {
  ok: boolean;
  error?: string;
  providerMessageId?: string;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a notification for a single appointment. Idempotent per trigger:
 * if the relevant `*SentAt` column is already populated, the call short-
 * circuits unless `force: true`.
 */
export async function dispatchNotification(input: DispatchInput): Promise<DispatchResult> {
  const appointment = await prisma.businessAppointment.findUnique({
    where: { id: input.appointmentId },
    include: { domain: { include: { siteConfig: true } } },
  });

  if (!appointment) {
    return { ok: false, appointmentId: input.appointmentId, trigger: input.trigger, error: 'appointment_not_found' };
  }

  // Idempotency guard.
  const stampField = SENT_AT_FIELDS[input.trigger];
  if (stampField && !input.force) {
    const existingStamp = (appointment as unknown as Record<string, Date | null>)[stampField];
    if (existingStamp) {
      return { ok: true, appointmentId: appointment.id, trigger: input.trigger, skipped: 'already_sent' };
    }
  }

  if (!appointment.customerPhone) {
    return { ok: true, appointmentId: appointment.id, trigger: input.trigger, skipped: 'no_phone' };
  }

  const locale = resolveLocale(appointment.customerLocale);
  const businessName = appointment.domain.siteConfig?.businessName ?? 'our business';
  const vars = formatVars(appointment, businessName, locale);

  const keys = TRIGGER_TRANSLATION_KEYS[input.trigger];
  const subject = t(locale, keys.subject, vars);
  const body    = t(locale, keys.body, vars);

  // Default channel selection. CONFIRMED fires both SMS + WhatsApp because
  // it's load-bearing for revenue capture; reminders default to WhatsApp
  // only to keep gateway cost down.
  const channel: Channel = input.channel ?? (input.trigger === 'confirmation' ? 'both' : 'whatsapp');

  const result: DispatchResult = { ok: true, appointmentId: appointment.id, trigger: input.trigger };

  if (channel === 'sms' || channel === 'both') {
    result.sms = await sendSms({
      toPhoneE164: appointment.customerPhone,
      subject,
      body,
      tenantId: appointment.domainId,
    });
  }

  if (channel === 'whatsapp' || channel === 'both') {
    result.whatsapp = await sendWhatsApp({
      toPhoneE164: appointment.customerPhone,
      subject,
      body,
      tenantId: appointment.domainId,
      appointmentId: appointment.id,
    });
  }

  // Stamp idempotency field on success of EITHER channel.
  const anyOk = (result.sms?.ok ?? false) || (result.whatsapp?.ok ?? false);
  if (anyOk && stampField) {
    await prisma.businessAppointment.update({
      where: { id: appointment.id },
      data: { [stampField]: new Date() } as unknown as Prisma.BusinessAppointmentUpdateInput,
    });
  }

  result.ok = anyOk;
  if (!anyOk) {
    result.error = result.sms?.error ?? result.whatsapp?.error ?? 'all_channels_failed';
  }
  return result;
}

// ── Variable formatting ──────────────────────────────────────────────────────

function formatVars(
  a: BusinessAppointment,
  businessName: string,
  locale: Locale,
): Record<string, string> {
  return {
    name:     a.customerName ?? '',
    service:  a.serviceName,
    business: businessName,
    when:     formatWhen(a.startsAt, locale),
    duration: String(a.durationMin),
    amount:   a.upiAmountInr ? formatInr(a.upiAmountInr.toString()) : '',
  };
}

function formatWhen(date: Date, locale: Locale): string {
  // The Intl polyfills understand hi-IN; Hinglish falls back to en-IN format
  // since Devanagari numerals look out of place in Latin-script messages.
  const intlLocale = locale === 'hi-IN' ? 'hi-IN' : 'en-IN';
  try {
    return new Intl.DateTimeFormat(intlLocale, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function formatInr(amountStr: string): string {
  const amt = Number(amountStr);
  if (!Number.isFinite(amt)) return `₹${amountStr}`;
  return `₹${amt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// ── Channel adapters ─────────────────────────────────────────────────────────

interface ChannelDispatch {
  toPhoneE164: string;
  subject: string;
  body: string;
  tenantId: string;
  appointmentId?: string;
}

async function sendSms(input: ChannelDispatch): Promise<ChannelResult> {
  const base = process.env.SMS_GATEWAY_URL;
  const token = process.env.SMS_GATEWAY_TOKEN;
  if (!base || !token) {
    return { ok: false, error: 'sms_gateway_not_configured' };
  }
  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': input.tenantId,
      },
      body: JSON.stringify({
        to: input.toPhoneE164,
        text: `${input.subject}\n\n${input.body}`,
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `sms ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json().catch(() => ({} as { id?: string }));
    return { ok: true, providerMessageId: data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Workforce alerts (operator-facing — no appointment row required)
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkforceDispatchInput {
  trigger: WorkforceTrigger;
  /** Operator's destination phone (the business owner / manager). */
  operatorPhoneE164: string;
  /** Tenant id for the gateway. */
  tenantId: string;
  locale: Locale;
  /** Free-form substitution vars matching the template `{{var}}` placeholders. */
  vars: Record<string, string | number>;
  /** Channel selector. Defaults to 'whatsapp' (cheaper, faster delivery). */
  channel?: Channel;
}

export async function dispatchWorkforceAlert(input: WorkforceDispatchInput): Promise<DispatchResult> {
  const keys = WORKFORCE_TRIGGER_KEYS[input.trigger];
  const subject = t(input.locale, keys.subject, input.vars);
  const body    = t(input.locale, keys.body, input.vars);
  const channel: Channel = input.channel ?? 'whatsapp';

  const result: DispatchResult = {
    ok: true,
    appointmentId: '',
    // Reuse the same DispatchResult shape but signal workforce by the trigger
    // not matching any NotificationTrigger value — callers should branch on
    // their input, not on the result.trigger.
    trigger: 'cancelled',
  };

  if (channel === 'sms' || channel === 'both') {
    result.sms = await sendSms({
      toPhoneE164: input.operatorPhoneE164,
      subject,
      body,
      tenantId: input.tenantId,
    });
  }
  if (channel === 'whatsapp' || channel === 'both') {
    result.whatsapp = await sendWhatsApp({
      toPhoneE164: input.operatorPhoneE164,
      subject,
      body,
      tenantId: input.tenantId,
    });
  }
  const anyOk = (result.sms?.ok ?? false) || (result.whatsapp?.ok ?? false);
  result.ok = anyOk;
  if (!anyOk) {
    result.error = result.sms?.error ?? result.whatsapp?.error ?? 'all_channels_failed';
  }
  return result;
}

async function sendWhatsApp(input: ChannelDispatch): Promise<ChannelResult> {
  const base = process.env.PATAAWAA_BASE_URL;
  const token = process.env.PATAAWAA_GATEWAY_TOKEN;
  if (!base || !token) {
    return { ok: false, error: 'pataawaa_not_configured' };
  }
  try {
    const res = await fetch(`${base}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': input.tenantId,
        'X-Source-Platform': 'connectvision',
      },
      body: JSON.stringify({
        to: input.toPhoneE164,
        text: input.body,
        meta: {
          appointmentId: input.appointmentId ?? null,
          subject: input.subject,
        },
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `pataawaa ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json().catch(() => ({} as { id?: string }));
    return { ok: true, providerMessageId: data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
