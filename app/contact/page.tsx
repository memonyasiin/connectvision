// ═════════════════════════════════════════════════════════════════════════════
// /contact — Contact ConnectVision (MODULE 18)
// ─────────────────────────────────────────────────────────────────────────────
// Public "Contact Us" page. Client component for the form (POSTs to
// /api/contact, which emails support@connectvision.us via Resend when
// configured, else logs). Light emerald + gold chrome.
// ═════════════════════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending'); setErrMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setState('sent'); setName(''); setEmail(''); setMessage('');
      } else {
        setState('error'); setErrMsg(data.detail || 'Could not send. Please email us directly.');
      }
    } catch {
      setState('error'); setErrMsg('Network error. Please email us directly.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/85 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={'/' as Route} className="flex items-center gap-2">
            <span className="inline-block w-7 h-7 rounded-md"
              style={{ background: 'linear-gradient(135deg, #1c4d2a 0%, #2a5f3a 50%, #D4AF37 100%)' }} />
            <span className="text-lg font-bold text-emerald-900">ConnectVision</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-700">
            <Link href={'/themes' as Route} className="hover:text-emerald-700">Themes</Link>
            <Link href={'/app' as Route} className="hover:text-emerald-700">Mobile app</Link>
            <Link href={'/about' as Route} className="hover:text-emerald-700">About</Link>
            <Link href={'/contact' as Route} className="text-emerald-700 font-medium">Contact</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-14 grid lg:grid-cols-2 gap-12">
        {/* Left: details */}
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-emerald-950 mb-4">Get in touch</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Questions about a theme, your licence, the mobile app, or a custom
            storefront? We usually reply within one business day.
          </p>

          <div className="space-y-5 text-sm">
            <div>
              <div className="text-slate-500 mb-0.5">Email</div>
              <a href="mailto:support@connectvision.us" className="text-emerald-700 hover:text-emerald-900 font-medium">support@connectvision.us</a>
            </div>
            <div>
              <div className="text-slate-500 mb-0.5">Registered office</div>
              <div className="text-slate-700">
                PATAA INTERNATIONAL AUSHADHALAAY<br />
                Ramchandra Ln, Malad (Kanchpada), Malad West,<br />
                Mumbai, Maharashtra 400064
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-0.5">GSTIN</div>
              <div className="font-mono text-slate-700">27DNUPM2901Q1Z6</div>
            </div>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link href={'/themes' as Route} className="text-emerald-700 hover:text-emerald-900">Browse themes →</Link>
              <Link href={'/app' as Route} className="text-emerald-700 hover:text-emerald-900">Get the app →</Link>
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
          {state === 'sent' ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-emerald-950 mb-2">Message sent</h2>
              <p className="text-slate-600 text-sm">Thanks for reaching out — we&apos;ll get back to you soon.</p>
              <button onClick={() => setState('idle')} className="mt-6 text-sm text-emerald-700 hover:text-emerald-900">Send another →</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h2 className="text-xl font-bold text-emerald-950 mb-2">Send us a message</h2>
              <div>
                <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Your name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm outline-none focus:border-emerald-500" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm outline-none focus:border-emerald-500" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Message</label>
                <textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm outline-none focus:border-emerald-500 resize-none" placeholder="How can we help?" />
              </div>
              {state === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{errMsg}</div>
              )}
              <button type="submit" disabled={state === 'sending'}
                className="w-full text-white font-semibold py-3 rounded-lg disabled:opacity-50 transition"
                style={{ background: 'linear-gradient(135deg, #1c4d2a, #16a34a)' }}>
                {state === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
          <div>© ConnectVision · PATAA INTERNATIONAL AUSHADHALAAY</div>
          <div className="flex gap-4">
            <Link href={'/' as Route} className="hover:text-emerald-700">Home</Link>
            <Link href={'/themes' as Route} className="hover:text-emerald-700">Marketplace</Link>
            <Link href={'/app' as Route} className="hover:text-emerald-700">Mobile app</Link>
            <Link href={'/about' as Route} className="hover:text-emerald-700">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
