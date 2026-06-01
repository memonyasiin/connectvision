'use client';

// ═════════════════════════════════════════════════════════════════════════════
// CustomizeWizard — 4-step personalisation form with live preview (MODULE 7)
// ─────────────────────────────────────────────────────────────────────────────
// Layout:
//   lg:col-span-7  — wizard form (current step + nav controls)
//   lg:col-span-5  — sticky live preview card that re-renders as user types
//
// Steps:
//   1. Identity + Brand  (business name, tagline, about, primary color, logo)
//   2. Services          (up to 6 service cards: name + description + price)
//   3. Contact           (phone, email, address)
//   4. Review + Submit   (read-only summary → POST /api/customize/draft)
//
// VALIDATION
//   Per-field on blur. Submit button disabled until current step is valid.
//   Server returns VALIDATION_FAULT mirroring field errors back into the
//   wizard's flag state — same pattern as MODULE 2 OnboardingWizard.
//
// SUCCESS
//   On 201 → router.push('/checkout?draft=<id>')  (checkout page is the
//   next module — link will 404 until then; this is documented in the
//   acceptance criteria).
// ═════════════════════════════════════════════════════════════════════════════

import { useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';

// ─────────────────────────────────────────────────────────────────────────────
// State + field flag types
// ─────────────────────────────────────────────────────────────────────────────

interface ServiceRow {
  name: string;
  description: string;
  priceInr: string; // string in the form, parsed on submit
}

interface FormState {
  businessName: string;
  tagline: string;
  aboutText: string;
  primaryColor: string;
  logoUrl: string;
  services: ServiceRow[];
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
}

interface FieldFlag {
  touched: boolean;
  error: string | null;
}

type FlagsMap = Record<keyof Omit<FormState, 'services'>, FieldFlag>;

const INITIAL_FLAGS: FlagsMap = {
  businessName:   { touched: false, error: null },
  tagline:        { touched: false, error: null },
  aboutText:      { touched: false, error: null },
  primaryColor:   { touched: false, error: null },
  logoUrl:        { touched: false, error: null },
  contactPhone:   { touched: false, error: null },
  contactEmail:   { touched: false, error: null },
  contactAddress: { touched: false, error: null },
};

const COLOR_PRESETS: { label: string; value: string }[] = [
  { label: 'Forest',  value: '#1c4d2a' },
  { label: 'Crimson', value: '#dc2626' },
  { label: 'Amber',   value: '#b45309' },
  { label: 'Cyan',    value: '#0e7490' },
  { label: 'Indigo',  value: '#4338ca' },
  { label: 'Charcoal', value: '#1f2937' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Field validators — inline, lightweight
// ─────────────────────────────────────────────────────────────────────────────

function validate(field: keyof Omit<FormState, 'services'>, v: string): string | null {
  const trimmed = v.trim();
  switch (field) {
    case 'businessName':
      if (trimmed.length < 2) return 'At least 2 characters.';
      if (trimmed.length > 120) return 'Max 120 characters.';
      return null;
    case 'tagline':
      if (trimmed.length > 200) return 'Max 200 characters.';
      return null;
    case 'aboutText':
      if (trimmed.length > 2000) return 'Max 2000 characters.';
      return null;
    case 'primaryColor':
      if (!/^#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(trimmed)) return 'Hex format like #1c4d2a.';
      return null;
    case 'logoUrl':
      if (trimmed === '') return null;
      try { new URL(trimmed); } catch { return 'Must be a valid URL.'; }
      if (trimmed.length > 500) return 'Max 500 characters.';
      return null;
    case 'contactPhone':
      if (trimmed === '') return null;
      if (trimmed.replace(/\D/g, '').length < 10) return 'At least 10 digits.';
      return null;
    case 'contactEmail':
      if (trimmed === '') return null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Not a valid email.';
      return null;
    case 'contactAddress':
      if (trimmed.length > 500) return 'Max 500 characters.';
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface CustomizeWizardProps {
  themeSlug: string;
  themeName: string;
  themePriceInr: number;
  themeCategoryColor: string;
  themeCategoryGlyph: string;
  themeCategoryLabel: string;
}

export function CustomizeWizard({
  themeSlug,
  themeName,
  themePriceInr,
  themeCategoryColor,
  themeCategoryGlyph,
  themeCategoryLabel,
}: CustomizeWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<FormState>({
    businessName:   '',
    tagline:        '',
    aboutText:      '',
    primaryColor:   themeCategoryColor,
    logoUrl:        '',
    services:       [
      { name: '', description: '', priceInr: '' },
      { name: '', description: '', priceInr: '' },
      { name: '', description: '', priceInr: '' },
    ],
    contactPhone:   '',
    contactEmail:   '',
    contactAddress: '',
  });
  const [flags, setFlags] = useState<FlagsMap>(INITIAL_FLAGS);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function updateField<K extends keyof Omit<FormState, 'services'>>(field: K, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setFlags((fl) => {
      const cur = fl[field];
      if (!cur.touched) return fl;
      return { ...fl, [field]: { touched: true, error: validate(field, value) } };
    });
  }

  function markTouched(field: keyof Omit<FormState, 'services'>) {
    setFlags((fl) => ({
      ...fl,
      [field]: { touched: true, error: validate(field, form[field]) },
    }));
  }

  function updateService(index: number, patch: Partial<ServiceRow>) {
    setForm((f) => ({
      ...f,
      services: f.services.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function addService() {
    if (form.services.length >= 6) return;
    setForm((f) => ({
      ...f,
      services: [...f.services, { name: '', description: '', priceInr: '' }],
    }));
  }

  function removeService(index: number) {
    if (form.services.length <= 1) return;
    setForm((f) => ({
      ...f,
      services: f.services.filter((_, i) => i !== index),
    }));
  }

  function canAdvanceFromStep1(): boolean {
    return (
      validate('businessName', form.businessName) === null &&
      validate('tagline',      form.tagline)      === null &&
      validate('aboutText',    form.aboutText)    === null &&
      validate('primaryColor', form.primaryColor) === null &&
      validate('logoUrl',      form.logoUrl)      === null
    );
  }
  function canAdvanceFromStep2(): boolean {
    // At least one service with a non-empty name.
    return form.services.some((s) => s.name.trim().length > 0);
  }
  function canAdvanceFromStep3(): boolean {
    return (
      validate('contactPhone',   form.contactPhone)   === null &&
      validate('contactEmail',   form.contactEmail)   === null &&
      validate('contactAddress', form.contactAddress) === null
    );
  }

  function attemptAdvance(target: 2 | 3 | 4) {
    const fieldsForStep: (keyof Omit<FormState, 'services'>)[] =
      target === 2 ? ['businessName', 'tagline', 'aboutText', 'primaryColor', 'logoUrl']
      : target === 4 ? ['contactPhone', 'contactEmail', 'contactAddress']
      : []; // step 3 → services has no per-field flag map
    let allOk = true;
    if (fieldsForStep.length > 0) {
      setFlags((fl) => {
        const next = { ...fl };
        for (const f of fieldsForStep) {
          const e = validate(f, form[f]);
          next[f] = { touched: true, error: e };
          if (e !== null) allOk = false;
        }
        return next;
      });
    }
    if (target === 3 && !canAdvanceFromStep2()) {
      setServerError('Add at least one service before continuing.');
      return;
    }
    if (allOk) {
      setServerError(null);
      setStep(target);
    }
  }

  async function submitDraft() {
    setSubmitting(true);
    setServerError(null);
    const payload = {
      themeSlug,
      businessName: form.businessName.trim(),
      ...(form.tagline.trim()   ? { tagline:   form.tagline.trim()   } : {}),
      ...(form.aboutText.trim() ? { aboutText: form.aboutText.trim() } : {}),
      primaryColor: form.primaryColor.trim(),
      ...(form.logoUrl.trim()   ? { logoUrl:   form.logoUrl.trim()   } : {}),
      services: form.services
        .filter((s) => s.name.trim().length > 0)
        .map((s) => ({
          name: s.name.trim(),
          ...(s.description.trim() ? { description: s.description.trim() } : {}),
          ...(s.priceInr.trim() && !Number.isNaN(Number.parseInt(s.priceInr, 10))
            ? { priceInr: Number.parseInt(s.priceInr, 10) }
            : {}),
        })),
      ...(form.contactPhone.trim()   ? { contactPhone:   form.contactPhone.trim()   } : {}),
      ...(form.contactEmail.trim()   ? { contactEmail:   form.contactEmail.trim()   } : {}),
      ...(form.contactAddress.trim() ? { contactAddress: form.contactAddress.trim() } : {}),
    };
    try {
      const res = await fetch('/api/customize/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: unknown = await res.json();
      if (!res.ok || typeof data !== 'object' || data === null || (data as { ok?: unknown }).ok !== true) {
        const d = data as { detail?: string; fieldErrors?: Record<string, string> } | null;
        if (d?.fieldErrors) {
          setFlags((fl) => {
            const next = { ...fl };
            for (const [k, msg] of Object.entries(d.fieldErrors ?? {})) {
              if (k in next) {
                next[k as keyof Omit<FormState, 'services'>] = { touched: true, error: msg };
              }
            }
            return next;
          });
          setStep(1); // bounce to step 1; could be smarter
        }
        setServerError(d?.detail ?? `Save failed (HTTP ${res.status}).`);
        return;
      }
      const ok = data as unknown as { draftId: string; nextStepUrl: string };
      router.push(ok.nextStepUrl as Route);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Network fault.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-start">
      {/* ── Wizard form ────────────────────────────────────────────────── */}
      <div className="lg:col-span-7 space-y-6">
        <ProgressStrip current={step} />

        <div className="rounded-2xl border border-stone-200 bg-white p-6 md:p-8 shadow-sm">
          {step === 1 ? (
            <Step1IdentityBrand form={form} flags={flags} onChange={updateField} onBlur={markTouched} />
          ) : null}
          {step === 2 ? (
            <Step2Services
              services={form.services}
              onChange={updateService}
              onAdd={addService}
              onRemove={removeService}
            />
          ) : null}
          {step === 3 ? (
            <Step3Contact form={form} flags={flags} onChange={updateField} onBlur={markTouched} />
          ) : null}
          {step === 4 ? (
            <Step4Review form={form} themeName={themeName} themePriceInr={themePriceInr} />
          ) : null}
        </div>

        {serverError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {serverError}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1 || submitting}
            onClick={() => setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3 | 4)))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Back
          </button>
          {step === 1 ? (
            <Primary disabled={!canAdvanceFromStep1()} onClick={() => attemptAdvance(2)} label="Continue →" />
          ) : null}
          {step === 2 ? (
            <Primary disabled={!canAdvanceFromStep2()} onClick={() => attemptAdvance(3)} label="Continue →" />
          ) : null}
          {step === 3 ? (
            <Primary disabled={!canAdvanceFromStep3()} onClick={() => attemptAdvance(4)} label="Review →" />
          ) : null}
          {step === 4 ? (
            <Primary
              disabled={submitting}
              onClick={submitDraft}
              label={submitting ? 'Saving…' : `Save & continue · ₹${themePriceInr.toLocaleString('en-IN')}`}
            />
          ) : null}
        </div>
      </div>

      {/* ── Live preview card (sticky) ────────────────────────────────── */}
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-24">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2 px-1">
            Live preview · updates as you type
          </div>
          <LivePreviewCard
            form={form}
            themeName={themeName}
            themeCategoryColor={themeCategoryColor}
            themeCategoryGlyph={themeCategoryGlyph}
            themeCategoryLabel={themeCategoryLabel}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step components
// ─────────────────────────────────────────────────────────────────────────────

interface BaseStepProps {
  form: FormState;
  flags: FlagsMap;
  onChange: <K extends keyof Omit<FormState, 'services'>>(field: K, v: string) => void;
  onBlur: (field: keyof Omit<FormState, 'services'>) => void;
}

function Step1IdentityBrand({ form, flags, onChange, onBlur }: BaseStepProps) {
  return (
    <div className="space-y-5">
      <StepHeader eyebrow="Step 1 of 4" title="Identity + brand" subtitle="Your business name and the colour identity customers will see." />
      <Field label="Business name" value={form.businessName} flag={flags.businessName} onChange={(v) => onChange('businessName', v)} onBlur={() => onBlur('businessName')} placeholder="Memon Beauty Salon" />
      <Field label="Tagline (optional)" value={form.tagline} flag={flags.tagline} onChange={(v) => onChange('tagline', v)} onBlur={() => onBlur('tagline')} placeholder="Where every glow begins" />
      <Field label="About us (optional)" value={form.aboutText} flag={flags.aboutText} onChange={(v) => onChange('aboutText', v)} onBlur={() => onBlur('aboutText')} placeholder="Tell customers a little about your story…" textarea rows={4} />
      <ColorPicker
        value={form.primaryColor}
        onChange={(v) => onChange('primaryColor', v)}
        onBlur={() => onBlur('primaryColor')}
        error={flags.primaryColor.touched ? flags.primaryColor.error : null}
      />
      <Field label="Logo URL (optional)" value={form.logoUrl} flag={flags.logoUrl} onChange={(v) => onChange('logoUrl', v)} onBlur={() => onBlur('logoUrl')} placeholder="https://example.com/logo.png" />
    </div>
  );
}

function Step2Services({
  services,
  onChange,
  onAdd,
  onRemove,
}: {
  services: ServiceRow[];
  onChange: (i: number, patch: Partial<ServiceRow>) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeader eyebrow="Step 2 of 4" title="Services" subtitle="List what you offer. 1–6 entries. Add a price if you want it shown on the site." />
      <div className="space-y-3">
        {services.map((s, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500">
                Service {i + 1}
              </div>
              {services.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="text-xs text-rose-700 hover:text-rose-900 transition-colors"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid sm:grid-cols-[1fr,1fr,120px] gap-3">
              <input
                value={s.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(i, { name: e.target.value })}
                placeholder="Service name"
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
              <input
                value={s.description}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(i, { description: e.target.value })}
                placeholder="Short description"
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
              <input
                value={s.priceInr}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(i, { priceInr: e.target.value.replace(/\D/g, '') })}
                placeholder="₹ price"
                inputMode="numeric"
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>
          </div>
        ))}
      </div>
      {services.length < 6 ? (
        <button
          type="button"
          onClick={onAdd}
          className="text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
        >
          + Add another service
        </button>
      ) : (
        <div className="text-xs text-slate-500">Max 6 services per site.</div>
      )}
    </div>
  );
}

function Step3Contact({ form, flags, onChange, onBlur }: BaseStepProps) {
  return (
    <div className="space-y-5">
      <StepHeader eyebrow="Step 3 of 4" title="Contact" subtitle="How customers reach you. All fields are optional but at least one is recommended." />
      <Field label="Phone (optional)" value={form.contactPhone} flag={flags.contactPhone} onChange={(v) => onChange('contactPhone', v)} onBlur={() => onBlur('contactPhone')} placeholder="+91 98765 43210" inputMode="tel" />
      <Field label="Email (optional)" value={form.contactEmail} flag={flags.contactEmail} onChange={(v) => onChange('contactEmail', v)} onBlur={() => onBlur('contactEmail')} placeholder="hello@example.com" />
      <Field label="Address (optional)" value={form.contactAddress} flag={flags.contactAddress} onChange={(v) => onChange('contactAddress', v)} onBlur={() => onBlur('contactAddress')} placeholder="123, Hill Road, Bandra West, Mumbai 400050" textarea rows={2} />
    </div>
  );
}

function Step4Review({ form, themeName, themePriceInr }: { form: FormState; themeName: string; themePriceInr: number }) {
  const nonEmptyServices = form.services.filter((s) => s.name.trim().length > 0);
  return (
    <div className="space-y-5">
      <StepHeader eyebrow="Step 4 of 4" title="Review and submit" subtitle="Last check. You can edit anything by going back. Saving creates a draft and takes you to checkout." />
      <dl className="rounded-xl border border-stone-200 divide-y divide-stone-200">
        <ReviewRow label="Theme" value={themeName} />
        <ReviewRow label="Business name" value={form.businessName} />
        {form.tagline ? <ReviewRow label="Tagline" value={form.tagline} /> : null}
        {form.aboutText ? <ReviewRow label="About" value={form.aboutText} multiline /> : null}
        <ReviewRow label="Primary color" value={form.primaryColor} mono swatch={form.primaryColor} />
        {form.logoUrl ? <ReviewRow label="Logo" value={form.logoUrl} mono /> : null}
        <ReviewRow label="Services" value={`${nonEmptyServices.length} item${nonEmptyServices.length === 1 ? '' : 's'}`} />
        {form.contactPhone ? <ReviewRow label="Phone" value={form.contactPhone} /> : null}
        {form.contactEmail ? <ReviewRow label="Email" value={form.contactEmail} /> : null}
        {form.contactAddress ? <ReviewRow label="Address" value={form.contactAddress} multiline /> : null}
      </dl>
      <div className="text-xs text-slate-500">
        On save we&apos;ll create a draft + take you to checkout
        (₹{themePriceInr.toLocaleString('en-IN')} lifetime). You can edit your
        draft until checkout completes.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live preview card
// ─────────────────────────────────────────────────────────────────────────────

interface LivePreviewProps {
  form: FormState;
  themeName: string;
  themeCategoryColor: string;
  themeCategoryGlyph: string;
  themeCategoryLabel: string;
}

function LivePreviewCard({ form, themeName, themeCategoryColor, themeCategoryGlyph, themeCategoryLabel }: LivePreviewProps) {
  const primary = form.primaryColor || themeCategoryColor;
  const business = form.businessName || `Your ${themeCategoryLabel.toLowerCase()} business`;
  const tagline = form.tagline || `[Tagline appears here as you type…]`;
  const about = form.aboutText || 'Your "about us" copy will render here. Keep it warm, keep it short.';
  const nonEmptyServices = form.services.filter((s) => s.name.trim().length > 0);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-md">
      {/* Brand stripe */}
      <div className="h-2" style={{ background: primary }} />
      <div className="p-5 md:p-6">
        {/* Logo + name */}
        <div className="flex items-center gap-3 mb-4">
          {form.logoUrl ? (
            <img
              src={form.logoUrl}
              alt={`${business} logo`}
              className="w-10 h-10 rounded-md object-cover bg-stone-100"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold text-base"
              style={{ background: primary }}
            >
              {business.charAt(0).toUpperCase() || '·'}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-base font-semibold tracking-tight text-slate-900 truncate">
              {business}
            </div>
            <div className="text-xs italic text-slate-500 truncate">{tagline}</div>
          </div>
        </div>

        {/* About */}
        <p className="text-xs text-slate-600 leading-relaxed border-t border-stone-100 pt-3 mb-4">
          {about}
        </p>

        {/* Services */}
        <div className="border-t border-stone-100 pt-3 mb-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">
            Services
          </div>
          {nonEmptyServices.length === 0 ? (
            <div className="text-xs italic text-slate-400">
              Add at least one service in Step 2.
            </div>
          ) : (
            <ul className="space-y-2">
              {nonEmptyServices.map((s, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">
                      {s.name}
                    </div>
                    {s.description ? (
                      <div className="text-[11px] text-slate-500 truncate">
                        {s.description}
                      </div>
                    ) : null}
                  </div>
                  {s.priceInr ? (
                    <div
                      className="text-xs font-semibold tabular-nums shrink-0"
                      style={{ color: primary }}
                    >
                      ₹{Number.parseInt(s.priceInr, 10).toLocaleString('en-IN')}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Contact strip */}
        {(form.contactPhone || form.contactEmail || form.contactAddress) ? (
          <div className="border-t border-stone-100 pt-3 space-y-1.5 text-[11px] text-slate-600">
            {form.contactPhone   ? <div>📞 {form.contactPhone}</div>   : null}
            {form.contactEmail   ? <div>✉ {form.contactEmail}</div>   : null}
            {form.contactAddress ? <div>📍 {form.contactAddress}</div> : null}
          </div>
        ) : null}

        {/* Theme attribution */}
        <div
          className="mt-5 pt-3 border-t border-stone-100 text-[10px] font-mono uppercase tracking-wider flex items-center justify-between"
          style={{ color: primary }}
        >
          <span>{themeCategoryGlyph} {themeName}</span>
          <span className="text-slate-400">connectvision.io</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

function ProgressStrip({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-stone-200">
          <div
            className={`h-full transition-all duration-500 ${s <= current ? 'bg-emerald-700' : 'bg-transparent'}`}
          />
        </div>
      ))}
    </div>
  );
}

function StepHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mb-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
        {eyebrow}
      </div>
      <h2 className="mt-1.5 text-xl md:text-2xl font-bold tracking-tight text-emerald-950">
        {title}
      </h2>
      <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  value,
  flag,
  onChange,
  onBlur,
  placeholder,
  textarea = false,
  rows = 3,
  inputMode,
}: {
  label: string;
  value: string;
  flag: FieldFlag;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
  inputMode?: 'text' | 'tel' | 'email';
}) {
  const hasError = flag.touched && flag.error !== null;
  const className = `
    block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400
    transition-colors
    ${hasError ? 'border-rose-400 focus:border-rose-500' : 'border-stone-200 focus:border-emerald-700'}
    focus:outline-none focus:ring-1 ${hasError ? 'focus:ring-rose-500' : 'focus:ring-emerald-700'}
  `;
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1.5">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={rows}
          className={`${className} resize-y`}
        />
      ) : (
        <input
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          inputMode={inputMode}
          className={className}
        />
      )}
      {hasError ? (
        <div className="mt-1.5 text-xs text-rose-600">{flag.error}</div>
      ) : null}
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
  onBlur,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error: string | null;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1.5">
        Primary brand colour
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        {COLOR_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => {
              onChange(p.value);
              onBlur();
            }}
            title={p.label}
            className={`
              w-9 h-9 rounded-md border transition-all
              ${value.toLowerCase() === p.value.toLowerCase() ? 'border-slate-900 ring-2 ring-slate-900/20 scale-110' : 'border-stone-300 hover:scale-105'}
            `}
            style={{ background: p.value }}
          />
        ))}
        <input
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="#1c4d2a"
          className="w-32 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
        />
      </div>
      {error ? <div className="mt-1.5 text-xs text-rose-600">{error}</div> : null}
    </div>
  );
}

function ReviewRow({ label, value, mono = false, multiline = false, swatch }: { label: string; value: string; mono?: boolean; multiline?: boolean; swatch?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-xs font-mono uppercase tracking-wider text-slate-500 shrink-0 pt-0.5">
        {label}
      </dt>
      <dd className={`text-sm text-slate-900 text-right max-w-[60%] ${multiline ? 'whitespace-pre-wrap break-words' : 'truncate'} ${mono ? 'font-mono' : ''} flex items-center gap-2 justify-end`}>
        {swatch ? (
          <span className="inline-block w-4 h-4 rounded border border-stone-300" style={{ background: swatch }} />
        ) : null}
        <span>{value || <span className="text-slate-400 italic">—</span>}</span>
      </dd>
    </div>
  );
}

function Primary({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="
        inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
        bg-emerald-900 text-white hover:bg-emerald-800
        disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed
        transition-colors shadow-sm
      "
    >
      {label}
    </button>
  );
}
