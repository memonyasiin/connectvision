// ═════════════════════════════════════════════════════════════════════════════
// /chat — ConnectVision AI web assistant (MODULE 19)
// ─────────────────────────────────────────────────────────────────────────────
// ChatGPT/Gemini-style web chat: streaming answers, voice input (Web Speech
// API), and image upload (downscaled client-side → Groq vision model). Talks
// to the same-origin /api/ai/chat SSE endpoint. Dark, modern, mobile-friendly.
// ═════════════════════════════════════════════════════════════════════════════

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  image?: string | null;
}

const EXAMPLES = [
  'GSTIN kya hota hai aur kaise apply karun?',
  'Write a WhatsApp message to promote a Diwali sale',
  'UPI vs card — which is cheaper for my shop?',
  'Suggest 5 names for a skincare brand',
];

// Minimal, XSS-safe markdown-lite: escape, then **bold**, `code`, newlines.
function render(text: string): string {
  const esc = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 rounded px-1 py-0.5 text-[0.85em]">$1</code>')
    .replace(/\n/g, '<br/>');
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  // ── Image: downscale to ≤1024px JPEG to keep the POST small ────────────────
  const onPickImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024;
        let { width, height } = img;
        if (width > max || height > max) {
          const r = Math.min(max / width, max / height);
          width = Math.round(width * r); height = Math.round(height * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        setImage(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ── Voice: Web Speech API (Chrome/Edge/Android browsers) ───────────────────
  const toggleMic = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported in this browser. Try Chrome.'); return; }
    if (listening) { recogRef.current?.stop(); return; }
    const r = new SR();
    r.lang = 'en-IN'; r.interimResults = true; r.continuous = false;
    let finalText = input ? input + ' ' : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      setInput((finalText + interim).trimStart());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    r.start();
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !image) || busy) return;
    const userMsg: Msg = { role: 'user', content: text || '(image)', image };
    const next = [...messages, userMsg];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput(''); setBusy(true);
    const sentImage = image; setImage(null);
    if (taRef.current) taRef.current.style.height = 'auto';

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          image: sentImage ?? undefined,
        }),
      });
      if (!res.body) throw new Error('no stream');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl = buf.indexOf('\n\n');
        while (nl !== -1) {
          const raw = buf.slice(0, nl); buf = buf.slice(nl + 2); nl = buf.indexOf('\n\n');
          const line = raw.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const j = JSON.parse(payload);
            if (j.type === 'token' && j.delta) {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last) return prev;
                copy[copy.length - 1] = { ...last, content: last.content + j.delta };
                return copy;
              });
            } else if (j.type === 'error') {
              setMessages((prev) => {
                const copy = [...prev];
                if (copy.length === 0) return prev;
                copy[copy.length - 1] = { role: 'assistant', content: '⚠️ ' + (j.message || 'Something went wrong.') };
                return copy;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: '⚠️ Connection error. Please try again.' };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="shrink-0 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={'/' as Route} className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg grid place-items-center text-xs font-black text-black"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #f4e4a6)' }}>CV</span>
            <span className="font-semibold">ConnectVision AI</span>
          </Link>
          <button onClick={() => setMessages([])} className="text-xs text-zinc-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5">
            New chat
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="mt-10 text-center">
              <div className="h-14 w-14 mx-auto rounded-2xl grid place-items-center text-2xl mb-4"
                style={{ background: 'linear-gradient(135deg, #1c4d2a, #16a34a)' }}>🤖</div>
              <h1 className="text-2xl font-bold mb-1">ConnectVision AI</h1>
              <p className="text-zinc-400 text-sm mb-8">Ask anything · type, speak 🎤, or upload an image 🖼️</p>
              <div className="grid sm:grid-cols-2 gap-2 text-left">
                {EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => setInput(ex)}
                    className="text-sm text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`h-8 w-8 shrink-0 rounded-lg grid place-items-center text-sm ${m.role === 'user' ? 'bg-white/10' : ''}`}
                    style={m.role === 'assistant' ? { background: 'linear-gradient(135deg, #1c4d2a, #16a34a)' } : undefined}>
                    {m.role === 'user' ? '🧑' : '🤖'}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="text-xs text-zinc-500 mb-1">{m.role === 'user' ? 'You' : 'ConnectVision AI'}</div>
                    {m.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.image} alt="upload" className="max-h-48 rounded-lg border border-white/10 mb-2" />
                    )}
                    {m.content
                      ? <div className="text-[15px] leading-relaxed text-zinc-100 break-words" dangerouslySetInnerHTML={{ __html: render(m.content) }} />
                      : <div className="flex gap-1 pt-1"><Dot /><Dot /><Dot /></div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-white/10 bg-zinc-950">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {image && (
            <div className="mb-2 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="preview" className="h-12 w-12 object-cover rounded" />
              <button onClick={() => setImage(null)} className="text-zinc-400 hover:text-white text-sm px-1">✕</button>
            </div>
          )}
          <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-2 py-2 focus-within:border-emerald-500/50">
            <label className="h-9 w-9 shrink-0 grid place-items-center rounded-lg hover:bg-white/10 cursor-pointer text-lg" title="Upload image">
              🖼️
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = ''; }} />
            </label>
            <button onClick={toggleMic} title="Voice input"
              className={`h-9 w-9 shrink-0 grid place-items-center rounded-lg text-lg ${listening ? 'bg-red-500/30 animate-pulse' : 'hover:bg-white/10'}`}>
              🎤
            </button>
            <textarea ref={taRef} value={input} rows={1} onKeyDown={onKey}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
              }}
              placeholder={listening ? 'Listening…' : 'Message ConnectVision AI…'}
              className="flex-1 bg-transparent outline-none resize-none py-1.5 text-[15px] placeholder:text-zinc-500 max-h-40" />
            <button onClick={send} disabled={busy || (!input.trim() && !image)}
              className="h-9 w-9 shrink-0 grid place-items-center rounded-lg text-black disabled:opacity-30 transition"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #f4e4a6)' }} title="Send">
              {busy ? '…' : '➤'}
            </button>
          </div>
          <div className="text-center text-[11px] text-zinc-600 mt-2">
            ConnectVision AI can make mistakes. Powered by Groq · Llama.
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />;
}
