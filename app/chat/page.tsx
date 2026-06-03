// ═════════════════════════════════════════════════════════════════════════════
// /chat — ConnectVision AI web assistant (MODULE 19 / 21)
// ─────────────────────────────────────────────────────────────────────────────
// ChatGPT/Gemini-style web chat with the full capability set:
//   • streaming text answers (Groq llama-3.3-70b)
//   • image UNDERSTANDING — upload a photo → llama-4-scout vision
//   • image GENERATION — "ek logo banao" → Flux (Pollinations, free, no key)
//   • voice input (Web Speech API speech-to-text)
//   • text-to-speech — AI reads answers aloud (speechSynthesis)
//   • VOICE CONVERSATION MODE — hands-free listen→answer→speak→listen loop
// ═════════════════════════════════════════════════════════════════════════════

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  image?: string | null;   // uploaded (user) OR generated (assistant) image
  isGen?: boolean;         // assistant image was AI-generated
}

const EXAMPLES = [
  'GSTIN kya hota hai aur kaise apply karun?',
  'Ek skincare brand ka logo banao 🎨',
  'Write a WhatsApp message for a Diwali sale',
  'UPI vs card — which is cheaper for my shop?',
];

// ── Detect "generate an image" intent ────────────────────────────────────────
function isImageRequest(t: string): boolean {
  const s = t.toLowerCase();
  if (/^\/(image|imagine|img)\b/.test(s)) return true;
  const verb = /(generate|create|draw|make|design|banao|bana\s?do|banaa|बनाओ|बना दो|nikaalo)/;
  const noun = /(image|picture|photo|pic|logo|art|poster|banner|wallpaper|illustration|drawing|tasveer|तस्वीर|इमेज|फोटो|लोगो|chitra)/;
  return verb.test(s) && noun.test(s);
}
function cleanPrompt(t: string): string {
  return t.replace(/^\/(image|imagine|img)\b/i, '').trim() || t.trim();
}
function genImageUrl(prompt: string, seed: number): string {
  const p = encodeURIComponent(prompt.slice(0, 400));
  return `https://image.pollinations.ai/prompt/${p}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`;
}

// Minimal, XSS-safe markdown-lite.
function render(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 rounded px-1 py-0.5 text-[0.85em]">$1</code>')
    .replace(/\n/g, '<br/>');
}

// Pick a TTS language from the text (Devanagari → Hindi, else English-India).
function ttsLang(text: string): string {
  return /[ऀ-ॿ]/.test(text) ? 'hi-IN' : 'en-IN';
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [genMode, setGenMode] = useState(false);       // 🎨 force image-generation
  const [voiceMode, setVoiceMode] = useState(false);   // 🎧 hands-free conversation
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);
  const voiceModeRef = useRef(false);
  const inputRef = useRef('');

  useEffect(() => { inputRef.current = input; }, [input]);
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  // ── Image upload (vision) — downscale to ≤1024px JPEG ──────────────────────
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
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        c.getContext('2d')?.drawImage(img, 0, 0, width, height);
        setImage(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ── Text-to-speech ─────────────────────────────────────────────────────────
  const stopSpeak = () => { try { window.speechSynthesis?.cancel(); } catch { /* */ } setSpeakingIdx(null); };
  const speak = (text: string, idx: number | null, onDone?: () => void) => {
    const synth = window.speechSynthesis;
    if (!synth || !text.trim()) { onDone?.(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*`#_>]/g, ''));
    u.lang = ttsLang(text);
    u.rate = 1.02; u.pitch = 1;
    const voices = synth.getVoices();
    const v = voices.find((x) => x.lang === u.lang) || voices.find((x) => x.lang.startsWith(u.lang.slice(0, 2)));
    if (v) u.voice = v;
    u.onstart = () => setSpeakingIdx(idx);
    u.onend = () => { setSpeakingIdx(null); onDone?.(); };
    u.onerror = () => { setSpeakingIdx(null); onDone?.(); };
    synth.speak(u);
  };

  // ── Speech-to-text (single dictation) ──────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeRecognizer = (onFinal: (t: string) => void, onInterim?: (t: string) => void): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.lang = 'en-IN'; r.interimResults = true; r.continuous = false;
    let finalText = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      onInterim?.(interim);
      if (finalText) onFinal(finalText);
    };
    return r;
  };

  const toggleMic = () => {
    if (listening) { recogRef.current?.stop(); setListening(false); return; }
    const base = inputRef.current ? inputRef.current + ' ' : '';
    const r = makeRecognizer(
      (f) => setInput((base + f).trimStart()),
      (i) => setInput((base + i).trimStart()),
    );
    if (!r) { alert('Voice input is not supported here. Try Chrome.'); return; }
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    r.start();
  };

  // ── Core send (text / vision / image-gen). Returns final assistant text. ───
  const runSend = async (rawText: string, opts?: { forceGen?: boolean }): Promise<string> => {
    const text = rawText.trim();
    if (!text && !image) return '';
    const sentImage = image; setImage(null);

    // Image GENERATION path (no uploaded image; gen mode or detected intent).
    if (!sentImage && (opts?.forceGen || genMode || isImageRequest(text))) {
      const prompt = cleanPrompt(text);
      const seed = Math.floor(Math.random() * 1_000_000_000);
      setMessages((p) => [
        ...p,
        { role: 'user', content: text },
        { role: 'assistant', content: `🎨 Generating "${prompt}"…`, image: genImageUrl(prompt, seed), isGen: true },
      ]);
      setGenMode(false);
      return `Maine "${prompt}" ki image bana di hai.`;
    }

    // Chat / vision path.
    const userMsg: Msg = { role: 'user', content: text || '(image)', image: sentImage };
    let history: Msg[] = [];
    setMessages((p) => { history = [...p, userMsg]; return [...history, { role: 'assistant', content: '' }]; });

    let finalText = '';
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
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
              finalText += j.delta;
              setMessages((prev) => {
                const c = [...prev]; const last = c[c.length - 1];
                if (!last) return prev;
                c[c.length - 1] = { ...last, content: last.content + j.delta };
                return c;
              });
            } else if (j.type === 'error') {
              finalText = '⚠️ ' + (j.message || 'Something went wrong.');
              setMessages((prev) => {
                const c = [...prev]; if (!c.length) return prev;
                c[c.length - 1] = { role: 'assistant', content: finalText };
                return c;
              });
            }
          } catch { /* */ }
        }
      }
    } catch {
      finalText = '⚠️ Connection error. Please try again.';
      setMessages((prev) => {
        const c = [...prev]; if (!c.length) return prev;
        c[c.length - 1] = { role: 'assistant', content: finalText };
        return c;
      });
    }
    return finalText;
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !image) || busy) return;
    setInput(''); setBusy(true);
    if (taRef.current) taRef.current.style.height = 'auto';
    await runSend(text);
    setBusy(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ── Voice conversation mode — hands-free loop ──────────────────────────────
  const voiceListenOnce = () => {
    if (!voiceModeRef.current) return;
    setVoiceStatus('listening');
    const r = makeRecognizer((finalText) => {
      const said = finalText.trim();
      r.stop();
      if (!said) { if (voiceModeRef.current) voiceListenOnce(); return; }
      setVoiceStatus('thinking');
      void (async () => {
        const answer = await runSend(said);
        if (!voiceModeRef.current) return;
        setVoiceStatus('speaking');
        speak(answer, null, () => { if (voiceModeRef.current) voiceListenOnce(); });
      })();
    });
    if (!r) { alert('Voice mode needs Chrome / a browser with speech support.'); exitVoiceMode(); return; }
    r.onend = () => { /* result handler drives the loop */ };
    r.onerror = () => { if (voiceModeRef.current) setTimeout(voiceListenOnce, 600); };
    recogRef.current = r;
    try { r.start(); } catch { /* already started */ }
  };
  const enterVoiceMode = () => {
    if (busy) return;
    setVoiceMode(true); voiceModeRef.current = true; setVoiceStatus('listening');
    setTimeout(voiceListenOnce, 200);
  };
  const exitVoiceMode = () => {
    setVoiceMode(false); voiceModeRef.current = false; setVoiceStatus('idle');
    try { recogRef.current?.stop(); } catch { /* */ }
    stopSpeak();
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
          <button onClick={() => { stopSpeak(); setMessages([]); }} className="text-xs text-zinc-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5">
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
              <p className="text-zinc-400 text-sm mb-8">Type · speak 🎤 · generate images 🎨 · or talk hands-free 🎧</p>
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
                    <div className="text-xs text-zinc-500 mb-1 flex items-center gap-2">
                      {m.role === 'user' ? 'You' : 'ConnectVision AI'}
                      {m.role === 'assistant' && m.content && !m.isGen && (
                        <button
                          onClick={() => (speakingIdx === i ? stopSpeak() : speak(m.content, i))}
                          className="text-zinc-500 hover:text-white" title="Read aloud">
                          {speakingIdx === i ? '⏹' : '🔊'}
                        </button>
                      )}
                    </div>
                    {m.image && (
                      <div className="mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.image} alt={m.isGen ? 'generated' : 'upload'}
                          className="max-h-72 rounded-xl border border-white/10"
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          onError={(e) => { (e.target as any).style.display = 'none'; }} />
                        {m.isGen && (
                          <a href={m.image} target="_blank" rel="noopener noreferrer"
                            className="inline-block mt-1 text-xs text-emerald-400 hover:text-emerald-300">⬇ Open / save image</a>
                        )}
                      </div>
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
          {genMode && (
            <div className="mb-2 text-xs text-amber-300 flex items-center gap-2">
              🎨 Image-generation mode — type what to draw. <button onClick={() => setGenMode(false)} className="underline">cancel</button>
            </div>
          )}
          <div className="flex items-end gap-1.5 bg-white/5 border border-white/10 rounded-2xl px-2 py-2 focus-within:border-emerald-500/50">
            <label className="h-9 w-9 shrink-0 grid place-items-center rounded-lg hover:bg-white/10 cursor-pointer text-lg" title="Upload image (vision)">
              🖼️
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = ''; }} />
            </label>
            <button onClick={() => setGenMode((v) => !v)} title="Generate an image"
              className={`h-9 w-9 shrink-0 grid place-items-center rounded-lg text-lg ${genMode ? 'bg-amber-400/30' : 'hover:bg-white/10'}`}>🎨</button>
            <button onClick={toggleMic} title="Voice input"
              className={`h-9 w-9 shrink-0 grid place-items-center rounded-lg text-lg ${listening ? 'bg-red-500/30 animate-pulse' : 'hover:bg-white/10'}`}>🎤</button>
            <button onClick={enterVoiceMode} title="Voice conversation (hands-free)"
              className="h-9 w-9 shrink-0 grid place-items-center rounded-lg text-lg hover:bg-white/10">🎧</button>
            <textarea ref={taRef} value={input} rows={1} onKeyDown={onKey}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
              }}
              placeholder={listening ? 'Listening…' : genMode ? 'Describe the image…' : 'Message ConnectVision AI…'}
              className="flex-1 bg-transparent outline-none resize-none py-1.5 text-[15px] placeholder:text-zinc-500 max-h-40" />
            <button onClick={send} disabled={busy || (!input.trim() && !image)}
              className="h-9 w-9 shrink-0 grid place-items-center rounded-lg text-black disabled:opacity-30 transition"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #f4e4a6)' }} title="Send">
              {busy ? '…' : '➤'}
            </button>
          </div>
          <div className="text-center text-[11px] text-zinc-600 mt-2">
            ConnectVision AI · text, vision, image-gen &amp; voice · Powered by Groq + Flux.
          </div>
        </div>
      </div>

      {/* Voice conversation overlay */}
      {voiceMode && (
        <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur flex flex-col items-center justify-center px-6">
          <div className={`h-40 w-40 rounded-full grid place-items-center text-6xl mb-8 transition-transform ${
            voiceStatus === 'listening' ? 'animate-pulse scale-105' : voiceStatus === 'speaking' ? 'scale-110' : ''}`}
            style={{ background: 'radial-gradient(circle at 50% 40%, #16a34a, #0a2417)' }}>
            {voiceStatus === 'speaking' ? '🔊' : voiceStatus === 'thinking' ? '💭' : '🎧'}
          </div>
          <div className="text-xl font-semibold mb-1 capitalize">{voiceStatus}…</div>
          <div className="text-sm text-zinc-400 mb-10 text-center max-w-xs">
            {voiceStatus === 'listening' ? 'Bolo — main sun raha hoon' :
             voiceStatus === 'thinking' ? 'Soch raha hoon…' :
             voiceStatus === 'speaking' ? 'Tap stop to interrupt' : 'Hands-free conversation'}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={stopSpeak} className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-sm">⏹ Stop talking</button>
            <button onClick={exitVoiceMode} className="px-6 py-3 rounded-full bg-red-500/80 hover:bg-red-500 text-sm font-semibold">✕ End voice</button>
          </div>
          <Link href={'/' as Route} className="mt-10 text-xs text-zinc-600 hover:text-zinc-400">connectvision.us</Link>
        </div>
      )}
    </div>
  );
}

function Dot() {
  return <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />;
}
