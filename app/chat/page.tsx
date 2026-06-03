// ═════════════════════════════════════════════════════════════════════════════
// /chat — ConnectVision AI web assistant (MODULE 19 / 21 / 22)
// ─────────────────────────────────────────────────────────────────────────────
// ChatGPT/Gemini-grade web chat:
//   • streaming text (Groq llama-3.3-70b) · image understanding (llama-4-scout)
//   • image GENERATION (FLUX via /api/ai/image) · voice input · text-to-speech
//   • VOICE CONVERSATION mode (hands-free) · SIDEBAR + saved chat history
// All conversations persist to localStorage (cv_chat_convos).
// ═════════════════════════════════════════════════════════════════════════════

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  image?: string | null;
  isGen?: boolean;
}
interface Convo {
  id: string;
  title: string;
  messages: Msg[];
  updatedAt: number;
}

const LS_KEY = 'cv_chat_convos';

function newId(): string { return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function titleFrom(msgs: Msg[]): string {
  const first = msgs.find((m) => m.role === 'user');
  const t = (first?.content || 'New chat').replace(/\s+/g, ' ').trim();
  return t.length > 38 ? t.slice(0, 38) + '…' : t;
}

function isImageRequest(t: string): boolean {
  const s = t.toLowerCase();
  if (/^\/(image|imagine|img)\b/.test(s)) return true;
  const verb = /(generate|create|draw|make|design|banao|bana\s?do|banaa|बनाओ|बना दो)/;
  const noun = /(image|picture|photo|pic|logo|art|poster|banner|wallpaper|illustration|drawing|tasveer|तस्वीर|इमेज|फोटो|लोगो)/;
  return verb.test(s) && noun.test(s);
}
function cleanPrompt(t: string): string { return t.replace(/^\/(image|imagine|img)\b/i, '').trim() || t.trim(); }
function genImageUrl(prompt: string, seed: number): string {
  return `/api/ai/image?prompt=${encodeURIComponent(prompt.slice(0, 480))}&seed=${seed}`;
}
function render(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 rounded px-1 py-0.5 text-[0.85em]">$1</code>')
    .replace(/\n/g, '<br/>');
}
function ttsLang(text: string): string { return /[ऀ-ॿ]/.test(text) ? 'hi-IN' : 'en-IN'; }

export default function ChatPage() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [genMode, setGenMode] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);
  const voiceModeRef = useRef(false);
  const inputRef = useRef('');
  const activeIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Msg[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { inputRef.current = input; }, [input]);

  // Warm the TTS voice list — speechSynthesis.getVoices() is async and returns
  // [] until the 'voiceschanged' event, which is why the FIRST utterance used
  // the robotic default voice. Pre-load + cache so we always pick a good one.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const voicesRef = useRef<any[]>([]);
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => { voicesRef.current = synth.getVoices(); };
    load();
    synth.addEventListener?.('voiceschanged', load);
    return () => synth.removeEventListener?.('voiceschanged', load);
  }, []);
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy]);

  // ── Load saved conversations on mount ──────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const list = (JSON.parse(raw) as Convo[]).sort((a, b) => b.updatedAt - a.updatedAt);
        setConvos(list);
        if (list[0]) { setActiveId(list[0].id); setMessages(list[0].messages); }
      }
    } catch { /* */ }
  }, []);

  // ── Persist active conversation whenever messages change ───────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    setConvos((prev) => {
      let id = activeIdRef.current;
      let next: Convo[];
      const stamp = Date.now();
      if (!id || !prev.some((c) => c.id === id)) {
        id = newId(); activeIdRef.current = id; setActiveId(id);
        next = [{ id, title: titleFrom(messages), messages, updatedAt: stamp }, ...prev];
      } else {
        next = prev.map((c) => (c.id === id ? { ...c, title: c.title === 'New chat' ? titleFrom(messages) : (titleFrom(messages)), messages, updatedAt: stamp } : c));
      }
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }, [messages]);

  const newChat = () => { stopSpeak(); setMessages([]); setActiveId(null); activeIdRef.current = null; setSidebarOpen(false); };
  const switchChat = (id: string) => {
    stopSpeak();
    const c = convos.find((x) => x.id === id);
    if (c) { setActiveId(id); activeIdRef.current = id; setMessages(c.messages); }
    setSidebarOpen(false);
  };
  const deleteChat = (id: string) => {
    setConvos((prev) => {
      const next = prev.filter((c) => c.id !== id);
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* */ }
      if (id === activeIdRef.current) {
        if (next[0]) { setActiveId(next[0].id); activeIdRef.current = next[0].id; setMessages(next[0].messages); }
        else { setActiveId(null); activeIdRef.current = null; setMessages([]); }
      }
      return next;
    });
  };

  // ── Image upload (vision) ──────────────────────────────────────────────────
  const onPickImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024; let { width, height } = img;
        if (width > max || height > max) { const r = Math.min(max / width, max / height); width = Math.round(width * r); height = Math.round(height * r); }
        const c = document.createElement('canvas'); c.width = width; c.height = height;
        c.getContext('2d')?.drawImage(img, 0, 0, width, height);
        setImage(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ── TTS ────────────────────────────────────────────────────────────────────
  // ONE persistent <audio> element, unlocked on a user gesture. Mobile browsers
  // block audio.play() unless a play() was first invoked inside a user gesture;
  // since our Sarvam audio arrives AFTER an async fetch (gesture already gone),
  // we prime this element on tap (unlockAudio) and then just swap its src.
  const audioUnlockedRef = useRef(false);
  const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  const getAudio = (): HTMLAudioElement => { if (!audioRef.current) audioRef.current = new Audio(); return audioRef.current; };
  const unlockAudio = () => {
    if (audioUnlockedRef.current) return;
    const a = getAudio();
    try { a.src = SILENT_WAV; a.play().then(() => { audioUnlockedRef.current = true; }).catch(() => { /* */ }); } catch { /* */ }
  };

  const stopSpeak = () => {
    try { window.speechSynthesis?.cancel(); } catch { /* */ }
    if (audioRef.current) {
      audioRef.current.onended = null; audioRef.current.onerror = null; // drop stale handlers
      try { audioRef.current.pause(); } catch { /* */ }
    }
    setSpeakingIdx(null);
  };

  // Natural neural voice via Sarvam (/api/ai/tts). Falls back to the browser's
  // speechSynthesis if Sarvam errors / playback is blocked / not configured.
  const speak = async (text: string, idx: number | null, onDone?: () => void): Promise<void> => {
    if (!text.trim()) { onDone?.(); return; }
    stopSpeak();
    setSpeakingIdx(idx);
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: ttsLang(text) }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = getAudio();
        a.onended = () => { URL.revokeObjectURL(url); setSpeakingIdx(null); onDone?.(); };
        a.onerror = () => { URL.revokeObjectURL(url); browserSpeak(text, idx, onDone); };
        a.src = url;
        try { await a.play(); return; }
        catch (e) {
          // AbortError = playback got interrupted by a newer speak() — NOT a real
          // failure, so don't drop to the robotic browser voice for it.
          if ((e as { name?: string })?.name === 'AbortError') { URL.revokeObjectURL(url); return; }
          URL.revokeObjectURL(url); browserSpeak(text, idx, onDone); return;
        }
      }
    } catch { /* fall through to browser TTS */ }
    browserSpeak(text, idx, onDone);
  };

  // Fallback: browser speechSynthesis (robotic-ish, but always available).
  const browserSpeak = (text: string, idx: number | null, onDone?: () => void) => {
    const synth = window.speechSynthesis;
    if (!synth || !text.trim()) { setSpeakingIdx(null); onDone?.(); return; }
    synth.cancel();
    const lang = ttsLang(text);
    const u = new SpeechSynthesisUtterance(text.replace(/[*`#_>]/g, ''));
    u.lang = lang; u.rate = 1.0; u.pitch = 1.0;
    // Pick the most natural voice: prefer Google/Natural/Neural neural voices
    // for the language, then any matching-language voice, then nothing (default).
    const voices = voicesRef.current.length ? voicesRef.current : synth.getVoices();
    const two = lang.slice(0, 2);
    const byLang = voices.filter((v) => v.lang === lang || v.lang.replace('_', '-').startsWith(two));
    const best =
      byLang.find((v) => /google|natural|neural|wavenet/i.test(v.name)) ||
      byLang.find((v) => v.localService === false) ||
      byLang[0];
    if (best) u.voice = best;
    u.onstart = () => setSpeakingIdx(idx);
    u.onend = () => { setSpeakingIdx(null); onDone?.(); };
    u.onerror = () => { setSpeakingIdx(null); onDone?.(); };
    synth.speak(u);
  };

  // ── STT ────────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeRecognizer = (onFinal: (t: string) => void, onInterim?: (t: string) => void, continuous = false): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR(); r.lang = 'en-IN'; r.interimResults = true; r.continuous = continuous;
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
  const micActiveRef = useRef(false);
  const toggleMic = () => {
    if (listening) { micActiveRef.current = false; recogRef.current?.stop(); setListening(false); return; }
    const base = inputRef.current ? inputRef.current + ' ' : '';
    // continuous = true so brief pauses don't auto-stop dictation; it keeps
    // listening until the user taps the mic again.
    const r = makeRecognizer((f) => setInput((base + f).trimStart()), (i) => setInput((base + i).trimStart()), true);
    if (!r) { alert('Voice input is not supported here. Try Chrome.'); return; }
    micActiveRef.current = true;
    r.onend = () => { if (micActiveRef.current) { try { r.start(); } catch { setListening(false); } } else setListening(false); };
    r.onerror = () => { micActiveRef.current = false; setListening(false); };
    recogRef.current = r; setListening(true); r.start();
  };

  // ── Core send ──────────────────────────────────────────────────────────────
  const runSend = async (rawText: string, opts?: { forceGen?: boolean }): Promise<string> => {
    const text = rawText.trim();
    if (!text && !image) return '';
    const sentImage = image; setImage(null);

    if (!sentImage && (opts?.forceGen || genMode || isImageRequest(text))) {
      const prompt = cleanPrompt(text);
      const seed = Math.floor(Math.random() * 1_000_000_000);
      setMessages((p) => [...p, { role: 'user', content: text }, { role: 'assistant', content: `🎨 Generating "${prompt}"…`, image: genImageUrl(prompt, seed), isGen: true }]);
      setGenMode(false);
      return `Maine "${prompt}" ki image bana di hai.`;
    }

    const userMsg: Msg = { role: 'user', content: text || '(image)', image: sentImage };
    // Build the request history from the LATEST messages (ref), not from inside
    // a setState updater — the updater runs async, so `history` would be stale/
    // empty when the fetch fires, which made the backend 400 and no reply ever
    // streamed (the "stuck on … dots" bug).
    const history: Msg[] = [
      ...messagesRef.current.filter((m) => m.content.trim() || m.image),
      userMsg,
    ];
    setMessages((p) => [...p, userMsg, { role: 'assistant', content: '' }]);

    let finalText = '';
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })), image: sentImage ?? undefined }),
      });
      if (!res.body) throw new Error('no stream');
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
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
              setMessages((prev) => { const c = [...prev]; const last = c[c.length - 1]; if (!last) return prev; c[c.length - 1] = { ...last, content: last.content + j.delta }; return c; });
            } else if (j.type === 'error') {
              finalText = '⚠️ ' + (j.message || 'Something went wrong.');
              setMessages((prev) => { const c = [...prev]; if (!c.length) return prev; c[c.length - 1] = { role: 'assistant', content: finalText }; return c; });
            }
          } catch { /* */ }
        }
      }
    } catch {
      finalText = '⚠️ Connection error. Please try again.';
      setMessages((prev) => { const c = [...prev]; if (!c.length) return prev; c[c.length - 1] = { role: 'assistant', content: finalText }; return c; });
    }
    return finalText;
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !image) || busy) return;
    unlockAudio();
    setInput(''); setBusy(true);
    if (taRef.current) taRef.current.style.height = 'auto';
    await runSend(text); setBusy(false);
  };
  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  // ── Voice conversation loop ────────────────────────────────────────────────
  const voiceListenOnce = () => {
    if (!voiceModeRef.current) return;
    setVoiceStatus('listening');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice mode needs Chrome / a browser with speech support.'); exitVoiceMode(); return; }
    const r = new SR();
    r.lang = 'en-IN'; r.continuous = true; r.interimResults = true;
    let finalText = '';
    let silence: ReturnType<typeof setTimeout> | null = null;
    let submitted = false;
    const doSubmit = () => {
      if (submitted) return; submitted = true;
      if (silence) clearTimeout(silence);
      try { r.stop(); } catch { /* */ }
      const said = finalText.trim();
      if (!said) { if (voiceModeRef.current) voiceListenOnce(); return; }
      setVoiceStatus('thinking');
      void (async () => {
        const answer = await runSend(said);
        if (!voiceModeRef.current) return;
        setVoiceStatus('speaking');
        speak(answer, null, () => { if (voiceModeRef.current) voiceListenOnce(); });
      })();
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + ' '; else interim += t;
      }
      // Wait ~1.8s of SILENCE after speech before submitting — lets the user
      // finish their sentence with natural pauses (like ChatGPT/Gemini), instead
      // of cutting off at the first short pause.
      if (silence) clearTimeout(silence);
      if (finalText.trim() || interim.trim()) silence = setTimeout(doSubmit, 1800);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onerror = (e: any) => {
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        alert('Microphone permission chahiye voice mode ke liye. Mic access allow karo.');
        exitVoiceMode();
      }
      // no-speech / network / aborted → onend restarts the mic
    };
    r.onend = () => {
      if (submitted) return;
      if (finalText.trim()) { doSubmit(); return; }
      // The browser's speech API auto-stops after a few seconds of silence — this
      // was the "mic band ho jaata hai" bug. Restart with a FRESH recognizer so
      // the mic stays live until the user actually speaks (or ends voice mode).
      if (voiceModeRef.current) setTimeout(() => voiceListenOnce(), 250);
    };
    recogRef.current = r;
    try { r.start(); } catch { setTimeout(voiceListenOnce, 400); }
  };
  const enterVoiceMode = () => { if (busy) return; unlockAudio(); setVoiceMode(true); voiceModeRef.current = true; setVoiceStatus('listening'); setTimeout(voiceListenOnce, 200); };
  const exitVoiceMode = () => { setVoiceMode(false); voiceModeRef.current = false; setVoiceStatus('idle'); try { recogRef.current?.stop(); } catch { /* */ } stopSpeak(); };

  // ── Shared composer pill (centered in empty state, docked at bottom in chat) ─
  const composer = (
    <div className="w-full">
      {image && (
        <div className="mb-2 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="preview" className="h-12 w-12 object-cover rounded-lg" />
          <button onClick={() => setImage(null)} className="text-zinc-400 hover:text-white text-sm px-1">✕</button>
        </div>
      )}
      {genMode && <div className="mb-2 text-xs text-amber-300 text-center">🎨 Image mode — describe what to draw · <button onClick={() => setGenMode(false)} className="underline">cancel</button></div>}
      <div className="flex items-center gap-1 bg-zinc-800/70 border border-white/10 rounded-[26px] px-1.5 py-1.5 shadow-2xl shadow-black/50 focus-within:border-white/25 transition-colors">
        <label className="h-9 w-9 shrink-0 grid place-items-center rounded-full hover:bg-white/10 cursor-pointer text-zinc-300 text-lg" title="Attach image">🖼️
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = ''; }} />
        </label>
        <button onClick={() => setGenMode((v) => !v)} title="Generate image" className={`h-9 w-9 shrink-0 grid place-items-center rounded-full text-lg ${genMode ? 'bg-amber-400/30 text-amber-200' : 'hover:bg-white/10 text-zinc-300'}`}>🎨</button>
        <textarea ref={taRef} value={input} rows={1} onKeyDown={onKey}
          onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; }}
          placeholder={listening ? 'Listening…' : genMode ? 'Describe the image…' : 'Ask anything…'}
          className="flex-1 bg-transparent outline-none resize-none py-1.5 px-1 text-[15px] placeholder:text-zinc-500 max-h-36" />
        <button onClick={toggleMic} title="Voice input" className={`h-9 w-9 shrink-0 grid place-items-center rounded-full text-lg ${listening ? 'bg-red-500/30 animate-pulse text-red-200' : 'hover:bg-white/10 text-zinc-300'}`}>🎤</button>
        {(input.trim() || image)
          ? <button onClick={send} disabled={busy} className="h-9 w-9 shrink-0 grid place-items-center rounded-full text-black text-lg font-bold disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#D4AF37,#f4e4a6)' }} title="Send">{busy ? '…' : '↑'}</button>
          : <button onClick={enterVoiceMode} title="Voice conversation" className="h-9 w-9 shrink-0 grid place-items-center rounded-full bg-white text-black text-base hover:opacity-90">🎧</button>}
      </div>
    </div>
  );
  const CHIPS: { icon: string; label: string; act: () => void }[] = [
    { icon: '🎨', label: 'Create an image', act: () => { setGenMode(true); taRef.current?.focus(); } },
    { icon: '🧾', label: 'GSTIN help', act: () => setInput('GSTIN kaise apply karun? short steps') },
    { icon: '✍️', label: 'Write a message', act: () => setInput('Diwali sale ke liye ek WhatsApp message likho') },
    { icon: '🎧', label: 'Talk to me', act: enterVoiceMode },
  ];

  return (
    <div className="flex h-[100dvh] bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed md:static z-40 h-full w-72 shrink-0 bg-zinc-900 border-r border-white/10 flex flex-col transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-3">
          <button onClick={newChat} className="w-full flex items-center gap-2 justify-center text-sm font-semibold text-black rounded-xl py-2.5"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#f4e4a6)' }}>＋ New chat</button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
          {convos.length === 0 ? (
            <div className="text-xs text-zinc-600 px-3 py-4 text-center">No conversations yet</div>
          ) : convos.map((c) => (
            <div key={c.id}
              className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer ${c.id === activeId ? 'bg-white/10' : 'hover:bg-white/5'}`}
              onClick={() => switchChat(c.id)}>
              <span className="shrink-0">💬</span>
              <span className="flex-1 truncate text-zinc-200">{c.title}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 shrink-0" title="Delete">🗑</button>
            </div>
          ))}
        </div>
        <Link href={'/' as Route} className="p-3 text-xs text-zinc-500 hover:text-zinc-300 border-t border-white/10">← connectvision.us</Link>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="relative flex flex-col flex-1 min-w-0">
        {/* ambient glow (Gemini-style) */}
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 45% at 50% -8%, rgba(22,163,74,0.16), transparent 70%)' }} />

        <header className="relative shrink-0">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden h-8 w-8 grid place-items-center rounded-lg hover:bg-white/10 text-lg">☰</button>
              <span className="h-7 w-7 rounded-lg grid place-items-center text-xs font-black text-black" style={{ background: 'linear-gradient(135deg,#D4AF37,#f4e4a6)' }}>CV</span>
              <span className="font-semibold">ConnectVision AI</span>
            </div>
            <button onClick={newChat} className="text-xs text-zinc-300 hover:text-white border border-white/10 rounded-full px-3 py-1.5">＋ New</button>
          </div>
        </header>

        {messages.length === 0 ? (
          /* ── Empty hero — centered (ChatGPT/Gemini-style) ── */
          <div className="relative flex-1 flex flex-col items-center justify-center px-4 pb-16">
            <div className="w-full max-w-2xl text-center">
              <h1 className="text-3xl md:text-[2.6rem] font-semibold tracking-tight mb-9">
                Namaste 👋{' '}
                <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-emerald-300 bg-clip-text text-transparent">kya poochein?</span>
              </h1>
              {composer}
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {CHIPS.map((c) => (
                  <button key={c.label} onClick={c.act}
                    className="inline-flex items-center gap-2 text-sm text-zinc-300 bg-white/[0.04] hover:bg-white/10 border border-white/10 rounded-full px-4 py-2 transition-colors">
                    <span>{c.icon}</span>{c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Active chat ── */
          <>
            <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {messages.map((m, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`h-8 w-8 shrink-0 rounded-lg grid place-items-center text-sm ${m.role === 'user' ? 'bg-white/10' : ''}`}
                      style={m.role === 'assistant' ? { background: 'linear-gradient(135deg,#1c4d2a,#16a34a)' } : undefined}>{m.role === 'user' ? '🧑' : '🤖'}</div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-xs text-zinc-500 mb-1 flex items-center gap-2">
                        {m.role === 'user' ? 'You' : 'ConnectVision AI'}
                        {m.role === 'assistant' && m.content && !m.isGen && (
                          <button onClick={() => { unlockAudio(); if (speakingIdx === i) stopSpeak(); else void speak(m.content, i); }} className="text-zinc-500 hover:text-white" title="Read aloud">{speakingIdx === i ? '⏹' : '🔊'}</button>
                        )}
                      </div>
                      {m.image && (
                        <div className="mb-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.image} alt={m.isGen ? 'generated' : 'upload'} className="max-h-72 rounded-xl border border-white/10"
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onError={(e) => { (e.target as any).style.display = 'none'; }} />
                          {m.isGen && <a href={m.image} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-xs text-emerald-400 hover:text-emerald-300">⬇ Open / save image</a>}
                        </div>
                      )}
                      {m.content
                        ? <div className="text-[15px] leading-relaxed text-zinc-100 break-words" dangerouslySetInnerHTML={{ __html: render(m.content) }} />
                        : <div className="flex gap-1 pt-1"><Dot /><Dot /><Dot /></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative shrink-0 px-4 pb-4 pt-1">
              <div className="max-w-3xl mx-auto">{composer}</div>
              <div className="text-center text-[11px] text-zinc-600 mt-2">ConnectVision AI · Groq · FLUX · Sarvam voice</div>
            </div>
          </>
        )}
      </div>

      {/* Voice overlay */}
      {voiceMode && (
        <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur flex flex-col items-center justify-center px-6">
          <div className={`h-40 w-40 rounded-full grid place-items-center text-6xl mb-8 transition-transform ${voiceStatus === 'listening' ? 'animate-pulse scale-105' : voiceStatus === 'speaking' ? 'scale-110' : ''}`}
            style={{ background: 'radial-gradient(circle at 50% 40%, #16a34a, #0a2417)' }}>{voiceStatus === 'speaking' ? '🔊' : voiceStatus === 'thinking' ? '💭' : '🎧'}</div>
          <div className="text-xl font-semibold mb-1 capitalize">{voiceStatus}…</div>
          <div className="text-sm text-zinc-400 mb-10 text-center max-w-xs">
            {voiceStatus === 'listening' ? 'Bolo — main sun raha hoon' : voiceStatus === 'thinking' ? 'Soch raha hoon…' : voiceStatus === 'speaking' ? 'Tap stop to interrupt' : 'Hands-free conversation'}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={stopSpeak} className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-sm">⏹ Stop talking</button>
            <button onClick={exitVoiceMode} className="px-6 py-3 rounded-full bg-red-500/80 hover:bg-red-500 text-sm font-semibold">✕ End voice</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Dot() { return <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />; }
