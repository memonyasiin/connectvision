'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/chat';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) router.push(next as Route);
      else setErr(data.error || 'Sign up failed.');
    } catch { setErr('Network error. Please try again.'); }
    setBusy(false);
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-5 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(22,163,74,0.18), transparent 70%)' }} />
      <Link href={'/' as Route} className="relative flex items-center gap-2 mb-8">
        <span className="h-8 w-8 rounded-lg grid place-items-center text-sm font-black text-black" style={{ background: 'linear-gradient(135deg,#D4AF37,#f4e4a6)' }}>CV</span>
        <span className="font-bold text-lg">ConnectVision</span>
      </Link>
      <div className="relative w-full max-w-sm bg-zinc-900/70 border border-white/10 rounded-2xl p-7 shadow-2xl">
        <h1 className="text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-zinc-400 text-sm mb-6">Free — join ConnectVision AI</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500/60" placeholder="Your name" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500/60" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500/60" placeholder="At least 6 characters" />
          </div>
          {err && <div className="bg-red-500/15 border border-red-500/30 text-red-300 text-sm rounded-lg p-2.5">{err}</div>}
          <button type="submit" disabled={busy}
            className="w-full text-black font-semibold py-2.5 rounded-xl disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#f4e4a6)' }}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <div className="mt-5 text-center text-sm text-zinc-400">
          Already have an account? <Link href={'/login' as Route} className="text-emerald-400 hover:text-emerald-300 font-medium">Sign in</Link>
        </div>
      </div>
      <Link href={'/chat' as Route} className="relative mt-6 text-xs text-zinc-600 hover:text-zinc-400">Continue without account →</Link>
    </div>
  );
}

export default function SignupPage() {
  return <Suspense><SignupInner /></Suspense>;
}
