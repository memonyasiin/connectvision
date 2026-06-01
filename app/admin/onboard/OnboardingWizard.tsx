'use client';

// ═════════════════════════════════════════════════════════════════════════════
// Sovereign Onboarding Wizard — 3-step zero-friction merchant intake
// ─────────────────────────────────────────────────────────────────────────────
// Steps:
//   1. Identity     — business name + email + subdomain (auto-suggested)
//   2. Sovereign    — GSTIN + Google Maps URL + UPI VPA  (the three new fields)
//   3. Review       — read-only confirm + POST to /api/admin/merchants/onboard
//
// VALIDATION POSTURE
//   Inline per-field via the same `src/lib/sovereignValidators` module the
//   server uses. Client-side validation is suggestion-only — server is the
//   source of truth. A server-side VALIDATION_FAULT response surfaces the
//   field-level error in the same row as the client-side check.
//
// STATE MANAGEMENT
//   Plain `useState` — five string fields + per-field touched/error flags +
//   step index + submit state. No reducer (the form is small enough).
//
// AESTHETIC
//   Matches /admin/matrix — dark slate-950 base, indigo + emerald accents,
//   glass cards. The wizard sits centered in a max-w-2xl container so the
//   form feels intentional rather than crowded.
// ═════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, type ChangeEvent } from 'react';
import {
  validateGstin,
  validateVpa,
  validateMapsUrl,
  validateSubdomain,
  suggestSubdomainFromName,
  isKnownBankHandle,
} from '@/lib/sovereignValidators';

// ─────────────────────────────────────────────────────────────────────────────
// Field shape
// ─────────────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  email: string;
  gstinString: string;
  mapsUrl: string;
  vpaAddress: string;
  subdomain: string;
}

interface FieldFlags {
  touched: boolean;
  /** Inline-computed validity. */
  errorDetail: string | null;
}

type FlagsMap = Record<keyof FormState, FieldFlags>;

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  gstinString: '',
  mapsUrl: '',
  vpaAddress: '',
  subdomain: '',
};

const INITIAL_FLAGS: FlagsMap = {
  name:        { touched: false, errorDetail: null },
  email:       { touched: false, errorDetail: null },
  gstinString: { touched: false, errorDetail: null },
  mapsUrl:     { touched: false, errorDetail: null },
  vpaAddress:  { touched: false, errorDetail: null },
  subdomain:   { touched: false, errorDetail: null },
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-field validation — runs on blur + before step transition
// ─────────────────────────────────────────────────────────────────────────────

function validateField(field: keyof FormState, value: string): string | null {
  const v = value.trim();
  switch (field) {
    case 'name':
      if (v.length < 2 || v.length > 120) return 'Must be 2–120 characters.';
      return null;
    case 'email':
      if (v.length === 0) return 'Email required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Format not valid.';
      return null;
    case 'gstinString': {
      const r = validateGstin(v);
      return r.ok ? null : r.detail;
    }
    case 'mapsUrl': {
      const r = validateMapsUrl(v);
      return r.ok ? null : r.detail;
    }
    case 'vpaAddress': {
      const r = validateVpa(v);
      return r.ok ? null : r.detail;
    }
    case 'subdomain': {
      const r = validateSubdomain(v);
      return r.ok ? null : r.detail;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Wizard
// ─────────────────────────────────────────────────────────────────────────────

interface OnboardSuccess {
  merchant: {
    id: string;
    name: string;
    email: string;
    complianceRating: number;
  };
  domain: { id: string; subdomain: string };
  complianceSnapshot: {
    score: number;
    components: ReadonlyArray<{ component: string; points: number; maxPoints?: number }>;
  };
}

export function OnboardingWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [flags, setFlags] = useState<FlagsMap>(INITIAL_FLAGS);

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<OnboardSuccess | null>(null);

  // ── Auto-suggest subdomain when name changes (and subdomain is untouched)
  useEffect(() => {
    if (!flags.subdomain.touched && form.name.trim().length >= 2) {
      const suggested = suggestSubdomainFromName(form.name);
      if (suggested && suggested !== form.subdomain) {
        setForm((f) => ({ ...f, subdomain: suggested }));
      }
    }
  }, [form.name, flags.subdomain.touched, form.subdomain]);

  function update<K extends keyof FormState>(field: K, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    // Live-revalidate ONLY if already touched (so users don't see errors
    // for fields they haven't engaged with yet).
    setFlags((fl) => {
      const cur = fl[field];
      if (!cur.touched) return fl;
      return { ...fl, [field]: { touched: true, errorDetail: validateField(field, value) } };
    });
  }

  function markTouched<K extends keyof FormState>(field: K) {
    setFlags((fl) => ({
      ...fl,
      [field]: { touched: true, errorDetail: validateField(field, form[field]) },
    }));
  }

  function canAdvanceFromStep1(): boolean {
    return (
      validateField('name', form.name) === null &&
      validateField('email', form.email) === null &&
      validateField('subdomain', form.subdomain) === null
    );
  }
  function canAdvanceFromStep2(): boolean {
    return (
      validateField('gstinString', form.gstinString) === null &&
      validateField('mapsUrl', form.mapsUrl) === null &&
      validateField('vpaAddress', form.vpaAddress) === null
    );
  }

  function attemptAdvance(target: 2 | 3) {
    // Force-touch every relevant field so inline errors render if they
    // haven't already (and to short-circuit the canAdvance call).
    const fieldsForStep: (keyof FormState)[] =
      target === 2
        ? ['name', 'email', 'subdomain']
        : ['gstinString', 'mapsUrl', 'vpaAddress'];
    let allOk = true;
    setFlags((fl) => {
      const next = { ...fl };
      for (const f of fieldsForStep) {
        const err = validateField(f, form[f]);
        next[f] = { touched: true, errorDetail: err };
        if (err !== null) allOk = false;
      }
      return next;
    });
    if (allOk) setStep(target);
  }

  async function submitOnboarding() {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch('/api/admin/merchants/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as
        | (OnboardSuccess & { ok: true; status: 201 })
        | {
            ok: false;
            status: number;
            error: string;
            detail?: string;
            fieldErrors?: Record<string, { code: string; detail: string }>;
            field?: string;
          };
      if (!res.ok || !('ok' in data) || data.ok !== true) {
        if (!('ok' in data) || data.ok !== false) {
          setServerError('Server returned an unexpected response.');
          return;
        }
        if (data.error === 'VALIDATION_FAULT' && data.fieldErrors) {
          // Mirror server-side field errors back into local flag state.
          setFlags((fl) => {
            const next = { ...fl };
            for (const [k, v] of Object.entries(data.fieldErrors ?? {})) {
              if (k in next) {
                next[k as keyof FormState] = { touched: true, errorDetail: v.detail };
              }
            }
            return next;
          });
          setStep(1); // bounce to step 1 — could be smarter but unambiguous
          setServerError('Some fields need attention. Check the highlighted rows.');
        } else if (data.error === 'UNIQUE_CONSTRAINT') {
          const field = data.field ?? 'value';
          setServerError(
            `Conflict: that ${field} is already registered to another merchant.`,
          );
        } else {
          setServerError(data.detail ?? `Onboarding failed (${data.error}).`);
        }
        return;
      }
      setSuccess(data);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Network fault.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) return <SuccessPanel data={success} />;

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-0">
      {/* ── Progress strip ─────────────────────────────────────────────── */}
      <ProgressStrip currentStep={step} />

      {/* ── Step card ──────────────────────────────────────────────────── */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 md:p-8">
        {step === 1 ? (
          <Step1Identity
            form={form}
            flags={flags}
            onChange={update}
            onBlur={markTouched}
          />
        ) : null}
        {step === 2 ? (
          <Step2Sovereign
            form={form}
            flags={flags}
            onChange={update}
            onBlur={markTouched}
          />
        ) : null}
        {step === 3 ? (
          <Step3Review form={form} serverError={serverError} submitting={submitting} />
        ) : null}
      </div>

      {/* ── Step controls ──────────────────────────────────────────────── */}
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          disabled={step === 1 || submitting}
          onClick={() => setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)))}
          className="
            inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors
          "
        >
          ← Back
        </button>
        {step === 1 ? (
          <PrimaryButton
            onClick={() => attemptAdvance(2)}
            disabled={!canAdvanceFromStep1()}
            label="Continue →"
          />
        ) : null}
        {step === 2 ? (
          <PrimaryButton
            onClick={() => attemptAdvance(3)}
            disabled={!canAdvanceFromStep2()}
            label="Review →"
          />
        ) : null}
        {step === 3 ? (
          <PrimaryButton
            onClick={submitOnboarding}
            disabled={submitting}
            label={submitting ? 'Submitting…' : 'Confirm & onboard'}
          />
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step components
// ─────────────────────────────────────────────────────────────────────────────

interface StepProps {
  form: FormState;
  flags: FlagsMap;
  onChange: <K extends keyof FormState>(field: K, value: string) => void;
  onBlur: <K extends keyof FormState>(field: K) => void;
}

function Step1Identity({ form, flags, onChange, onBlur }: StepProps) {
  return (
    <div className="space-y-5">
      <StepHeader
        eyebrow="Step 1 of 3"
        title="Tell us who you are"
        subtitle="Your business identity + the subdomain customers will use to find you."
      />
      <Field
        label="Business name"
        name="name"
        value={form.name}
        flag={flags.name}
        onChange={(v) => onChange('name', v)}
        onBlur={() => onBlur('name')}
        placeholder="Memon Beauty Salon"
      />
      <Field
        label="Owner email"
        name="email"
        value={form.email}
        flag={flags.email}
        onChange={(v) => onChange('email', v)}
        onBlur={() => onBlur('email')}
        placeholder="owner@example.com"
        type="email"
      />
      <Field
        label="Subdomain"
        name="subdomain"
        value={form.subdomain}
        flag={flags.subdomain}
        onChange={(v) => onChange('subdomain', v)}
        onBlur={() => onBlur('subdomain')}
        placeholder="memon-beauty"
        suffix=".connectvision.io"
        hint={
          !flags.subdomain.touched
            ? 'Auto-suggested from your business name. Edit if you want a custom slug.'
            : undefined
        }
      />
    </div>
  );
}

function Step2Sovereign({ form, flags, onChange, onBlur }: StepProps) {
  const vpaParsed = form.vpaAddress.includes('@')
    ? form.vpaAddress.split('@')[1] ?? ''
    : '';
  const vpaBankKnown = vpaParsed.length > 0 && isKnownBankHandle(vpaParsed);

  return (
    <div className="space-y-5">
      <StepHeader
        eyebrow="Step 2 of 3"
        title="Sovereign onboarding"
        subtitle="Three identifiers that unlock GSTIN compliance, Maps presence, and direct-to-bank UPI settlement."
      />
      <Field
        label="GSTIN"
        name="gstinString"
        value={form.gstinString}
        flag={flags.gstinString}
        onChange={(v) => onChange('gstinString', v.toUpperCase())}
        onBlur={() => onBlur('gstinString')}
        placeholder="27ABCDE1234F1Z5"
        mono
        hint="15-char Indian GST Identification Number. Checksum is verified locally before we send it to the server."
      />
      <Field
        label="Google Maps listing URL"
        name="mapsUrl"
        value={form.mapsUrl}
        flag={flags.mapsUrl}
        onChange={(v) => onChange('mapsUrl', v)}
        onBlur={() => onBlur('mapsUrl')}
        placeholder="https://maps.google.com/?cid=..."
        hint="Pasted from Google Maps' share dialog. Background job scrapes opening hours + reviews from this."
      />
      <Field
        label="UPI VPA (Virtual Payment Address)"
        name="vpaAddress"
        value={form.vpaAddress}
        flag={flags.vpaAddress}
        onChange={(v) => onChange('vpaAddress', v.toLowerCase())}
        onBlur={() => onBlur('vpaAddress')}
        placeholder="merchant@hdfcbank"
        mono
        hint={
          vpaParsed && !vpaBankKnown
            ? `Bank handle "${vpaParsed}" is not in our recognised list — still accepted, but double-check.`
            : 'Direct-to-bank UPI settlement target. Every transaction settles to this VPA.'
        }
      />
    </div>
  );
}

function Step3Review({
  form,
  serverError,
  submitting,
}: {
  form: FormState;
  serverError: string | null;
  submitting: boolean;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        eyebrow="Step 3 of 3"
        title="Review and confirm"
        subtitle="Double-check the values below — the onboarding API call is a single atomic write."
      />
      <dl className="rounded-xl border border-white/5 divide-y divide-white/5">
        <ReviewRow label="Business name" value={form.name} />
        <ReviewRow label="Owner email" value={form.email} />
        <ReviewRow label="Subdomain" value={`${form.subdomain}.connectvision.io`} mono />
        <ReviewRow label="GSTIN" value={form.gstinString} mono />
        <ReviewRow label="Maps URL" value={form.mapsUrl} />
        <ReviewRow label="UPI VPA" value={form.vpaAddress} mono />
      </dl>
      {serverError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {serverError}
        </div>
      ) : null}
      {submitting ? (
        <div className="text-xs text-slate-400">
          Writing Merchant + TenantDomain in a single $transaction…
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

function ProgressStrip({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className="flex-1 h-1 rounded-full overflow-hidden bg-white/10"
        >
          <div
            className={`h-full transition-all duration-500 ${
              s <= currentStep ? 'bg-indigo-400' : 'bg-transparent'
            }`}
          />
        </div>
      ))}
    </div>
  );
}

function StepHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
        {eyebrow}
      </div>
      <h2 className="mt-1.5 text-xl md:text-2xl font-bold tracking-tight text-white">
        {title}
      </h2>
      <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  flag,
  onChange,
  onBlur,
  placeholder,
  suffix,
  hint,
  type = 'text',
  mono = false,
}: {
  label: string;
  name: string;
  value: string;
  flag: FieldFlags;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
  suffix?: string;
  hint?: string;
  type?: 'text' | 'email';
  mono?: boolean;
}) {
  const hasError = flag.touched && flag.errorDetail !== null;
  return (
    <div>
      <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor={name}>
        {label}
      </label>
      <div
        className={`
          flex items-stretch rounded-lg border transition-colors
          ${
            hasError
              ? 'border-rose-500/60 bg-rose-500/5'
              : 'border-white/10 bg-white/[0.03] focus-within:border-indigo-400/50'
          }
        `}
      >
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`
            flex-1 bg-transparent px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500
            outline-none ${mono ? 'font-mono' : ''}
          `}
        />
        {suffix ? (
          <span className="self-center pr-3.5 text-xs font-mono text-slate-500">
            {suffix}
          </span>
        ) : null}
      </div>
      {hasError ? (
        <div className="mt-1.5 text-xs text-rose-300">{flag.errorDetail}</div>
      ) : hint ? (
        <div className="mt-1.5 text-xs text-slate-500">{hint}</div>
      ) : null}
    </div>
  );
}

function ReviewRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-xs font-mono uppercase tracking-wider text-slate-500 shrink-0">
        {label}
      </dt>
      <dd
        className={`text-sm text-slate-100 text-right truncate ${mono ? 'font-mono' : ''}`}
        title={value}
      >
        {value || <span className="text-slate-600 italic">—</span>}
      </dd>
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="
        inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
        bg-indigo-500 text-white hover:bg-indigo-400
        disabled:bg-white/5 disabled:text-slate-500 disabled:cursor-not-allowed
        transition-colors shadow-lg shadow-indigo-500/20
        disabled:shadow-none
      "
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Success panel — renders after the API call lands a 201
// ─────────────────────────────────────────────────────────────────────────────

function SuccessPanel({ data }: { data: OnboardSuccess }) {
  return (
    <div className="max-w-2xl mx-auto px-5 md:px-0">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-md p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 mb-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          {data.merchant.name} is live on ConnectVision
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Initial compliance score{' '}
          <b className="text-white">{data.complianceSnapshot.score}/100</b>.
          Background jobs will top up the remaining 40 points over the next
          7 days from tax-filing freshness + dispute-ratio signals.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 font-mono text-xs text-emerald-300">
          {data.domain.subdomain}.connectvision.io
        </div>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a
            href="/admin/matrix"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-slate-900 hover:bg-slate-100 transition-colors"
          >
            View matrix
          </a>
          <a
            href="/admin/onboard"
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Onboard another
          </a>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
          Compliance snapshot
        </div>
        <ul className="space-y-2 text-xs">
          {data.complianceSnapshot.components.map((c) => (
            <li
              key={c.component}
              className="flex items-center justify-between text-slate-400"
            >
              <span>{c.component}</span>
              <span className="font-mono">
                {c.points}
                {c.maxPoints ? ` / ${c.maxPoints}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
