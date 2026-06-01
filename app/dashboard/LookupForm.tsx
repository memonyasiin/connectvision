'use client';

// ═════════════════════════════════════════════════════════════════════════════
// LookupForm — single email input that navigates to /dashboard?email=<email>
// ─────────────────────────────────────────────────────────────────────────────
// Trivial client island (the dashboard page itself is server-rendered).
// useTransition keeps the submit button responsive across navigation.
// ═════════════════════════════════════════════════════════════════════════════

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';

interface LookupFormProps {
  initialEmail?: string;
}

export function LookupForm({ initialEmail = '' }: LookupFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    startTransition(() => {
      router.push(`/dashboard?email=${encodeURIComponent(trimmed)}` as Route);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex items-stretch gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          className="
            flex-1 rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-slate-900
            placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700
            transition-colors
          "
        />
        <button
          type="submit"
          disabled={pending || email.trim().length === 0}
          className="
            inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
            bg-emerald-900 text-white hover:bg-emerald-800
            disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed
            transition-colors shadow-sm
          "
        >
          {pending ? 'Looking up…' : 'Find purchases'}
        </button>
      </div>
      {error ? (
        <div className="text-xs text-rose-600">{error}</div>
      ) : (
        <div className="text-[11px] text-slate-500">
          We&apos;ll match against the email used in your checkout details.
        </div>
      )}
    </form>
  );
}
