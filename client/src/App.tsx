import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "./api";
import type { Countdown, Note, PomodoroCycle, UserProfile } from "./types";
import FlashcardsView from "./Flashcards";
import NotesView from "./Notes";
import StickyNote from "./StickyNote";
import StatsView from "./Stats";
import SettingsView from "./Settings";
import CountdownWidgets, { CountdownView } from "./Countdown";
import Landing from "./Landing";
import TimerWidget from "./TimerWidget";

type View = "timer" | "flashcards" | "notes" | "history" | "stats" | "countdowns" | "settings";

function IconTimer() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M9 2h6" /></svg>;
}

function IconCards() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></svg>;
}

function IconNotes() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16v13H9l-5 4V4Z" /><path d="M8 9.5h8" /><path d="M8 13h5" /></svg>;
}

function IconList() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></svg>;
}

function IconBars() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18" /><path d="M8 17v-6" /><path d="M13 17V7" /><path d="M18 17v-4" /></svg>;
}

function IconCountdown() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}

function IconSettings() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" /></svg>;
}

function IconLogout() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8" /><path d="M16 12h5M18.5 9.5 21 12l-2.5 2.5" /></svg>;
}

function IconPanel() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5v14" /><path d="M20 12H9" /><path d="M13 8l-4 4 4 4" /></svg>;
}

function IconReveal() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5v14" /><path d="M9 12h11" /><path d="M16 8l4 4-4 4" /></svg>;
}

function Avatar({ name }: { name?: string }) {
  const initials = (name || "?")
    .split(/\s+/)
    .map(word => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <span className="avatar">{initials || "?"}</span>;
}

function Auth({ onAuthenticated, initialMode, onBack }: { onAuthenticated: () => void; initialMode: "login" | "register"; onBack: () => void }) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")); const password = String(form.get("password"));
    try {
      if (mode === "register") await api.register({ name: String(form.get("name")), email, password });
      await api.login(email, password); onAuthenticated();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to continue."); }
    finally { setBusy(false); }
  };

  return <motion.main className="auth-page" key="auth" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: "easeOut" }}>
    <section className="auth-intro"><div className="brand"><i />.DOT</div><div><span className="eyebrow mono">Deep work, made visible</span><h1>One task.<br />One timer.<br />One dot at a time.</h1><p>A calm place to protect your attention and keep a record of the work that matters.</p></div><div className="orb" /></section>
    <section className="auth-panel"><form className="auth-card" onSubmit={submit}><span className="eyebrow mono">Welcome {mode === "login" ? "back" : <>to <span className="dot-word">.DOT</span></>}</span><h2>{mode === "login" ? "Sign in to focus" : "Create your space"}</h2>
      <AnimatePresence initial={false}>
        {mode === "register" && <motion.label key="name" style={{ overflow: "hidden" }} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>Name<input name="name" placeholder="Your name" required maxLength={100} /></motion.label>}
      </AnimatePresence>
      <label>Email<input name="email" type="email" placeholder="you@example.com" required /></label>
      <label>Password<input name="password" type="password" placeholder="At least 8 characters" required minLength={8} /></label>
      <AnimatePresence>
        {error && <motion.p key="error" className="error" role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>{error}</motion.p>}
      </AnimatePresence>
      <button className="primary" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      <button type="button" className="text-button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
      <button type="button" className="text-button" onClick={onBack}>← Back to home</button>
    </form></section>
  </motion.main>;
}

const DEFAULT_PRESETS = [
  { label: "DEEP WORK 90 X 2", cmd: "deep work 90 x 2 break 10" },
  { label: "SPRINT 25 X 4", cmd: "sprint 25 x 4 break 5" },
  { label: "REVIEW 15 X 1", cmd: "review 15 x 1 break 0" },
];

function parseCycleCmd(raw: string) {
  const nums = raw.match(/\d+/g) || [];
  const minutes = Math.min(180, Math.max(1, Number(nums[0]) || 45));
  const sessions = Math.min(20, Math.max(1, Number(nums[1]) || 1));
  const brk = nums[2] === undefined ? 5 : Math.min(60, Math.max(0, Number(nums[2])));
  const label = raw.replace(/\d+\s*(x|×)?\s*/gi, "").replace(/break/i, "").trim() || "Untitled focus";
  return { minutes, sessions, brk, label };
}

function readCustomPresets(): { label: string; cmd: string }[] {
  try {
    const saved = JSON.parse(localStorage.getItem("dot-presets") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}

function TimerSetup({ onStart }: { onStart: (minutes: number, sessions: number, breakMinutes: number) => Promise<void> }) {
  const [cmd, setCmd] = useState("deep work 45 x 4 break 5");
  const [busy, setBusy] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [custom, setCustom] = useState(readCustomPresets);
  const [newName, setNewName] = useState("");
  const [newMin, setNewMin] = useState(50);
  const [newDots, setNewDots] = useState(3);
  const [newBreak, setNewBreak] = useState(8);

  const parsed = useMemo(() => parseCycleCmd(cmd), [cmd]);
  const seq = useMemo(() => {
    const blocks: { kind: "focus" | "break"; min: number }[] = [];
    for (let i = 0; i < parsed.sessions; i++) {
      blocks.push({ kind: "focus", min: parsed.minutes });
      if (i < parsed.sessions - 1 && parsed.brk > 0) blocks.push({ kind: "break", min: parsed.brk });
    }
    return blocks;
  }, [parsed]);
  const planTotal = seq.reduce((a, b) => a + b.min, 0);
  const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const now = Date.now();

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try { await onStart(parsed.minutes, parsed.sessions, parsed.brk); }
    finally { setBusy(false); }
  };

  const savePreset = () => {
    const name = (newName || "My session").trim();
    const m = Math.min(180, Math.max(1, Number(newMin) || 50));
    const d = Math.min(20, Math.max(1, Number(newDots) || 1));
    const b = Math.min(60, Math.max(0, Number(newBreak) || 0));
    const item = { label: `${name} ${m} X ${d}`.toUpperCase(), cmd: `${name.toLowerCase()} ${m} x ${d} break ${b}` };
    const next = [...custom, item];
    try { localStorage.setItem("dot-presets", JSON.stringify(next)); } catch { /* storage unavailable */ }
    setCustom(next); setPresetOpen(false); setNewName(""); setCmd(item.cmd);
  };

  const removePreset = (index: number) => {
    const next = custom.filter((_, i) => i !== index);
    try { localStorage.setItem("dot-presets", JSON.stringify(next)); } catch { /* storage unavailable */ }
    setCustom(next);
  };

  return <section className="tm-setup">
    <span className="eyebrow mono">Type your cycle</span>
    <div className="tm-setup-tag">One more .DOT towards your goal.</div>
    <h1>Plan it in one line.</h1>
    <form className="tm-cmd" onSubmit={event => { event.preventDefault(); void start(); }}>
      <span className="tm-cmd-caret">›</span>
      <input type="text" value={cmd} onChange={event => setCmd(event.target.value)} placeholder="deep work 45 x 4 break 5" autoFocus />
      <span className="tm-cmd-hint">⏎ start</span>
    </form>
    <div className="tm-parsed">
      <div><span>Intent</span><strong>{parsed.label}</strong></div>
      <div><span>Length</span><strong>{parsed.minutes}m</strong></div>
      <div><span>Dots</span><strong>{parsed.sessions}</strong></div>
      <div><span>Breaks</span><strong>{parsed.brk}m</strong></div>
    </div>
    <div className="tm-chips">
      {DEFAULT_PRESETS.map(p => <span key={p.cmd} className={`tm-chip${cmd === p.cmd ? " active" : ""}`}>
        <button type="button" onClick={() => setCmd(p.cmd)}>{p.label}</button>
      </span>)}
      {custom.map((p, i) => <span key={p.cmd + i} className={`tm-chip${cmd === p.cmd ? " active" : ""}`}>
        <button type="button" onClick={() => setCmd(p.cmd)}>{p.label}</button>
        <button type="button" className="tm-chip-remove" onClick={() => removePreset(i)} aria-label="Remove preset">×</button>
      </span>)}
      <button type="button" className="tm-chip-add" onClick={() => setPresetOpen(v => !v)} aria-label="New preset">+</button>
    </div>
    <AnimatePresence>
      {presetOpen && <motion.div className="tm-preset-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
        <span className="eyebrow mono">New preset</span>
        <div className="tm-preset-grid">
          <label><span>Name</span><input value={newName} onChange={event => setNewName(event.target.value)} placeholder="Thesis writing" /></label>
          <label><span>Minutes</span><input type="number" value={newMin} onChange={event => setNewMin(Number(event.target.value))} /></label>
          <label><span>Dots</span><input type="number" value={newDots} onChange={event => setNewDots(Number(event.target.value))} /></label>
          <label><span>Break</span><input type="number" value={newBreak} onChange={event => setNewBreak(Number(event.target.value))} /></label>
        </div>
        <div className="tm-preset-actions">
          <button type="button" className="primary" onClick={savePreset}>Save preset</button>
          <button type="button" className="text-button" onClick={() => setPresetOpen(false)}>Cancel</button>
          <span className="tm-preset-note">Saved presets stay on this device.</span>
        </div>
      </motion.div>}
    </AnimatePresence>
    <div className="tm-plan-preview">
      <span className="eyebrow mono">Today's plan · preview</span>
      <div className="tm-plan-blocks">
        {seq.map((b, i) => <span key={i} className={`tm-plan-block ${b.kind}`} style={{ flex: b.min }}>{b.kind === "focus" ? `${b.min}M` : b.min}</span>)}
      </div>
      <div className="tm-plan-times"><span>starts {fmtTime(new Date(now))}</span><span>ends {fmtTime(new Date(now + planTotal * 60000))} · {Math.round(planTotal / 6) / 10}h</span></div>
    </div>
    <button type="button" className="primary tm-start" disabled={busy} onClick={start}>{busy ? "Starting…" : "Start focus cycle →"}</button>
    <div className="tm-shortcuts"><span>⏎ start</span><span>space pause</span><span>esc end</span></div>
  </section>;
}

function Timer({ cycle, onRefresh, breakMinutes, onFloat }: { cycle: PomodoroCycle; onRefresh: () => Promise<void>; breakMinutes: number; onFloat: () => void }) {
  const active = cycle.sessions.find(s => s.status === "IN_PROGRESS")!;
  const totalSeconds = cycle.duration * 60;
  const initial = Math.max(0, totalSeconds - Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000));
  const [remaining, setRemaining] = useState(initial);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [breakRemaining, setBreakRemaining] = useState(0);
  const [breakNextId, setBreakNextId] = useState<string | null>(null);

  useEffect(() => { setRemaining(initial); setPaused(false); setPhase("focus"); setBreakNextId(null); }, [active.id]);
  useEffect(() => { if (phase !== "focus" || paused || remaining <= 0) return; const id = window.setInterval(() => setRemaining(v => Math.max(0, v - 1)), 1000); return () => clearInterval(id); }, [phase, paused, remaining]);

  const endBreak = useCallback(async () => { await onRefresh(); setPhase("focus"); setBreakNextId(null); }, [onRefresh]);
  useEffect(() => {
    if (phase !== "break") return;
    if (breakRemaining <= 0) { void endBreak(); return; }
    const id = window.setInterval(() => setBreakRemaining(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [phase, breakRemaining, endBreak]);

  const finish = async () => {
    setBusy(true);
    try {
      const result = await api.complete(active.id);
      const isLast = active.sessionNumber >= cycle.totalSessions;
      if (!isLast && breakMinutes > 0 && result.nextSession) {
        setBreakNextId(result.nextSession.id);
        setBreakRemaining(breakMinutes * 60);
        setPhase("break");
      } else {
        await onRefresh();
      }
    } finally { setBusy(false); }
  };
  const interrupt = async () => {
    if (!confirm("End this entire focus cycle?")) return;
    setBusy(true);
    try { await api.interrupt(active.id); await onRefresh(); } finally { setBusy(false); }
  };
  const interruptBreak = async () => {
    if (!breakNextId || !confirm("End this entire focus cycle?")) return;
    setBusy(true);
    try { await api.interrupt(breakNextId); await onRefresh(); setPhase("focus"); setBreakNextId(null); } finally { setBusy(false); }
  };

  const completedDots = phase === "break" ? active.sessionNumber : active.sessionNumber - 1;
  const trackBlocks = useMemo(() => {
    const blocks: { kind: "focus" | "break"; min: number; index: number }[] = [];
    for (let i = 0; i < cycle.totalSessions; i++) {
      blocks.push({ kind: "focus", min: cycle.duration, index: i });
      if (i < cycle.totalSessions - 1 && breakMinutes > 0) blocks.push({ kind: "break", min: breakMinutes, index: i });
    }
    return blocks;
  }, [cycle.totalSessions, cycle.duration, breakMinutes]);
  const trackFill = (block: { kind: "focus" | "break"; index: number }) => {
    if (block.index < completedDots) return 100;
    if (block.index > completedDots) return 0;
    if (block.kind === "focus") return phase === "focus" ? Math.max(0, (1 - remaining / totalSeconds) * 100) : 100;
    return phase === "break" ? Math.max(0, (1 - breakRemaining / (breakMinutes * 60)) * 100) : 0;
  };

  const time = phase === "break"
    ? `${String(Math.floor(breakRemaining / 60)).padStart(2, "0")}:${String(breakRemaining % 60).padStart(2, "0")}`
    : `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const running = phase === "focus" && !paused && remaining > 0;
  const upNext = phase === "break"
    ? `Break — dot ${active.sessionNumber + 1} starts after`
    : active.sessionNumber >= cycle.totalSessions ? "Cycle complete — log it" : `Next: dot ${active.sessionNumber + 1} of ${cycle.totalSessions}`;
  const dotsLabel = `DOT ${Math.min(completedDots + 1, cycle.totalSessions)} OF ${cycle.totalSessions}${phase === "break" ? " · BREAK" : paused ? " · PAUSED" : " · IN PROGRESS"}`;

  return <>
    <div className="tm-run-head">
      <span className="tm-run-dot" />
      <span className="eyebrow mono">{dotsLabel}</span>
      <button className="outline" onClick={() => document.documentElement.requestFullscreen?.()}>Lock screen</button>
    </div>
    <div className="tm-run-grid">
      <section className="timer-card">
        <div className="timer-card-head">
          <span className="eyebrow">{phase === "break" ? "Break" : "Focus time"}</span>
          <button className="outline" onClick={onFloat}>Float timer</button>
        </div>
        <div className={`time${running ? " is-running" : ""}${phase === "break" ? " is-break" : ""}`}>{time}</div>
        <div className="progress"><i style={{ width: `${phase === "break" ? (breakRemaining / (breakMinutes * 60)) * 100 : 100 - (remaining / totalSeconds) * 100}%` }} /></div>
        {phase === "break"
          ? <div className="tm-run-actions">
            <button className="primary" onClick={() => setBreakRemaining(0)}>Skip break</button>
            <button className="text-button danger" disabled={busy} onClick={interruptBreak}>End cycle</button>
          </div>
          : <div className="tm-run-actions">
            <button className="primary" onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}</button>
            <button className="outline" disabled={busy} onClick={finish}>Finish dot</button>
            <button className="text-button danger" disabled={busy} onClick={interrupt}>End</button>
          </div>}
      </section>
      <section className="session-card">
        <span className="eyebrow">Up next</span>
        <h2>{upNext}</h2>
        <div className="dots">{Array.from({ length: cycle.totalSessions }, (_, i) => <i key={i} className={i < completedDots ? "filled" : ""} />)}</div>
      </section>
    </div>
    <div className="tm-track">
      <span className="eyebrow mono">Cycle track</span>
      <div className="tm-track-blocks">
        {trackBlocks.map((b, i) => <span key={i} className={`tm-track-block ${b.kind}`} style={{ flex: b.min }}>
          <span className="tm-track-fill" style={{ width: `${trackFill(b)}%` }} />
          <span className="tm-track-label">{b.kind === "focus" ? `${b.min}M` : b.min}</span>
        </span>)}
      </div>
    </div>
  </>;
}

function History({ cycles }: { cycles: PomodoroCycle[] }) {
  return <><header className="workspace-header"><div><span className="eyebrow mono">Work log</span><h1>Your focus, recorded.</h1></div></header><section className="history-list">{cycles.length === 0 ? <p>No completed cycles yet.</p> : cycles.map((c, i) => <motion.article key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}><div className={`status-dot ${c.status.toLowerCase()}`} /><div><strong>{c.sessions.filter(s => s.status === "COMPLETED").length} of {c.totalSessions} dots</strong><span>{c.duration} minute sessions · {c.status.toLowerCase()}</span></div><time>{new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></motion.article>)}</section></>;
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button className={active ? "sidebar-nav-btn active" : "sidebar-nav-btn"} onClick={onClick} aria-current={active ? "page" : undefined}>
    {active && <motion.i className="nav-active-bar" layoutId="nav-indicator" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
    <span className="nav-icon">{icon}</span>
    <span className="nav-label">{label}</span>
  </button>;
}

function Sidebar({ view, onView, profile, onSignOut, open, onToggle, onOpenSettings }: {
  view: View; onView: (view: View) => void; profile: UserProfile | null;
  onSignOut: () => Promise<void>; open: boolean; onToggle: () => void; onOpenSettings: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => { if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setMenuOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [menuOpen]);
  const items: { id: View; label: string; icon: ReactNode }[] = [
    { id: "timer", label: "Timer", icon: <IconTimer /> },
    { id: "flashcards", label: "Flashcards", icon: <IconCards /> },
    { id: "notes", label: "Notes", icon: <IconNotes /> },
    { id: "countdowns", label: "Countdowns", icon: <IconCountdown /> },
    { id: "history", label: "Work log", icon: <IconList /> },
    { id: "stats", label: "Stats", icon: <IconBars /> },
  ];
  return <aside className={open ? "sidebar" : "sidebar collapsed"}>
    <div className="sidebar-inner">
      <div className="sidebar-top">
        <button className="brand" onClick={() => onView("timer")}><i /><span>.DOT</span></button>
        <button className="sidebar-toggle" onClick={onToggle} title="Hide sidebar" aria-label="Hide sidebar"><IconPanel /></button>
      </div>
      <nav className="sidebar-nav" aria-label="Primary">
        {items.map(item => <NavButton key={item.id} active={view === item.id} onClick={() => { onView(item.id); setMenuOpen(false); }} icon={item.icon} label={item.label} />)}
      </nav>
      <div className="sidebar-foot" ref={wrapRef}>
        <AnimatePresence>
          {menuOpen && <motion.div className="sidebar-menu" role="menu" initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.97 }} transition={{ duration: 0.16, ease: "easeOut" }}>
            <button role="menuitem" onClick={() => { setMenuOpen(false); onOpenSettings(); }}><IconSettings />Settings</button>
            <button role="menuitem" className="danger" disabled={busy} onClick={async () => { setBusy(true); try { await onSignOut(); } finally { setBusy(false); setMenuOpen(false); } }}><IconLogout />{busy ? "Signing out…" : "Log out"}</button>
          </motion.div>}
        </AnimatePresence>
        <button className={menuOpen ? "profile-btn open" : "profile-btn"} onClick={() => setMenuOpen(v => !v)} aria-label="Account menu" aria-expanded={menuOpen}>
          <Avatar name={profile?.name} />
          <span className="profile-btn-meta"><strong>{profile?.name || "…"}</strong><span>{profile?.email || ""}</span></span>
          <span className="profile-btn-caret">{menuOpen ? "▾" : "▴"}</span>
        </button>
      </div>
    </div>
  </aside>;
}

function App() {
  const [publicPage, setPublicPage] = useState<"landing" | "login" | "register">("landing");
  const [authenticated, setAuthenticated] = useState(api.hasToken()); const [cycle, setCycle] = useState<PomodoroCycle | null>(null); const [history, setHistory] = useState<PomodoroCycle[]>([]); const [profile, setProfile] = useState<UserProfile | null>(null); const [pinnedNote, setPinnedNote] = useState<Note | null>(null); const [countdowns, setCountdowns] = useState<Countdown[]>([]); const [view, setView] = useState<View>(() => new URLSearchParams(location.search).get("view") === "flashcards" ? "flashcards" : new URLSearchParams(location.search).get("view") === "notes" ? "notes" : "timer"); const [loading, setLoading] = useState(authenticated); const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timerFloating, setTimerFloating] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState(5);
  useEffect(() => { if (!cycle) setTimerFloating(false); }, [cycle]);
  const load = useCallback(async () => { setLoading(true); setError(""); try { const [a, h, p, cd] = await Promise.all([api.active(), api.history(), api.me(), api.countdowns()]); setCycle(a.cycle); setHistory(h.cycles); setProfile(p.user); setCountdowns(cd.countdowns); setAuthenticated(true); } catch (err) { setError(err instanceof Error ? err.message : "Could not reach the server."); if (!api.hasToken()) setAuthenticated(false); } finally { setLoading(false); } }, []);
  const reloadCountdowns = useCallback(async () => { try { const cd = await api.countdowns(); setCountdowns(cd.countdowns); } catch { /* */ } }, []);
  useEffect(() => { if (authenticated) load(); }, [authenticated, load]);
  const signOut = async () => { await api.logout(); setProfile(null); setCycle(null); setHistory([]); setPinnedNote(null); setCountdowns([]); setAuthenticated(false); };
  return <>
    <AnimatePresence mode="wait">
      {!authenticated ? publicPage === "landing" ? <Landing key="landing" onLogin={() => setPublicPage("login")} onSignup={() => setPublicPage("register")} /> : <Auth key={publicPage} initialMode={publicPage} onBack={() => setPublicPage("landing")} onAuthenticated={() => setAuthenticated(true)} /> : <motion.div key="app-shell" className={sidebarOpen ? "app-shell" : "app-shell collapsed"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <Sidebar view={view} onView={setView} profile={profile} onSignOut={signOut} open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} onOpenSettings={() => setView("settings")} />
      {!sidebarOpen && <button type="button" className="sidebar-reveal" onClick={() => setSidebarOpen(true)} title="Show sidebar" aria-label="Show sidebar"><IconReveal /><span className="sidebar-reveal-dot" /></button>}
      <main className="workspace">
        <AnimatePresence>{error && <motion.p key="error" className="error banner" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>{error}</motion.p>}</AnimatePresence>
        {loading ? <div className="loader"><i /></div> : <AnimatePresence mode="wait">
          <motion.div key={`${view}-${view === "timer" ? (cycle ? "active" : "setup") : ""}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease: "easeOut" }}>
            {view === "timer" ? cycle ? <Timer cycle={cycle} onRefresh={load} breakMinutes={breakMinutes} onFloat={() => setTimerFloating(true)} /> : <TimerSetup onStart={async (m, s, brk) => { setBreakMinutes(brk); const data = await api.start(m, s); setCycle(data.cycle); await load(); }} />
              : view === "flashcards" ? <FlashcardsView />
              : view === "notes" ? <NotesView pinnedNoteId={pinnedNote?.id ?? null} onPin={setPinnedNote} onUnpin={() => setPinnedNote(null)} />
              : view === "countdowns" ? <CountdownView countdowns={countdowns} onChange={reloadCountdowns} />
              : view === "history" ? <History cycles={history} />
              : view === "settings" ? <SettingsView profile={profile} onProfileUpdate={setProfile} onBack={() => setView("timer")} onSignOut={signOut} />
              : <StatsView cycles={history} profile={profile} onProfileUpdate={setProfile} />}
          </motion.div>
        </AnimatePresence>}
      </main>
    </motion.div>}
    </AnimatePresence>
    <AnimatePresence>{pinnedNote && <StickyNote key={pinnedNote.id} note={pinnedNote} onClose={() => setPinnedNote(null)} />}</AnimatePresence>
    <AnimatePresence>{timerFloating && cycle && <TimerWidget key={cycle.id} cycle={cycle} onClose={() => setTimerFloating(false)} onOpen={() => setView("timer")} />}</AnimatePresence>
    <CountdownWidgets countdowns={countdowns} onRemove={async (id) => { await api.deleteCountdown(id); reloadCountdowns(); }} />
  </>;
}

export default App;
