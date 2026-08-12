import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "./api";
import type { PomodoroCycle, PomodoroSession } from "./types";
import FlashcardsView from "./Flashcards";

type View = "timer" | "flashcards" | "history" | "stats";

function Auth({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
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
    <section className="auth-intro"><div className="brand"><i />.DOT</div><div><span className="eyebrow">Deep work, made visible</span><h1>One task.<br />One timer.<br />One dot at a time.</h1><p>A calm place to protect your attention and keep a record of the work that matters.</p></div><div className="orb" /></section>
    <section className="auth-panel"><form className="auth-card" onSubmit={submit}><span className="eyebrow">Welcome {mode === "login" ? "back" : <>to <span className="dot-word">.DOT</span></>}</span><h2>{mode === "login" ? "Sign in to focus" : "Create your space"}</h2>
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
    </form></section>
  </motion.main>;
}

function Setup({ onStart }: { onStart: (minutes: number, sessions: number) => Promise<void> }) {
  const [minutes, setMinutes] = useState(45); const [sessions, setSessions] = useState(4); const [busy, setBusy] = useState(false);
  return <section className="empty-state"><span className="eyebrow">Ready when you are</span><h1>What are you<br />working on?</h1><p>Choose a focus length and the number of dots you want to complete.</p><div className="setup-grid"><label>Minutes<input type="number" min="1" max="180" value={minutes} onChange={e => setMinutes(Number(e.target.value))} /></label><label>Sessions<input type="number" min="1" max="20" value={sessions} onChange={e => setSessions(Number(e.target.value))} /></label></div><button className="primary" disabled={busy} onClick={async () => { setBusy(true); await onStart(minutes, sessions).finally(() => setBusy(false)); }}>{busy ? "Starting…" : "Start focus cycle →"}</button></section>;
}

function Timer({ cycle, onRefresh }: { cycle: PomodoroCycle; onRefresh: () => Promise<void> }) {
  const active = cycle.sessions.find(s => s.status === "IN_PROGRESS")!;
  const totalSeconds = cycle.duration * 60;
  const initial = Math.max(0, totalSeconds - Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000));
  const [remaining, setRemaining] = useState(initial); const [paused, setPaused] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { setRemaining(initial); setPaused(false); }, [active.id]);
  useEffect(() => { if (paused || remaining <= 0) return; const id = window.setInterval(() => setRemaining(v => Math.max(0, v - 1)), 1000); return () => clearInterval(id); }, [paused, remaining]);
  const finish = async () => { setBusy(true); try { await api.complete(active.id); await onRefresh(); } finally { setBusy(false); } };
  const interrupt = async () => { if (!confirm("End this entire focus cycle?")) return; setBusy(true); try { await api.interrupt(active.id); await onRefresh(); } finally { setBusy(false); } };
  const time = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const running = !paused && remaining > 0;
  return <><header className="workspace-header"><div><span className="eyebrow">Session {active.sessionNumber} of {cycle.totalSessions}</span><h1>Protecting your attention</h1></div><button className="outline" onClick={() => document.documentElement.requestFullscreen?.()}>Lock screen</button></header><div className="timer-layout"><section className="timer-card"><span className="eyebrow">Focus time</span><div className={`time${running ? " is-running" : ""}`}>{time}</div><div className="progress"><i style={{ width: `${100 - remaining / totalSeconds * 100}%` }} /></div><button className="primary" onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}</button><button className="text-button danger" disabled={busy} onClick={interrupt}>End cycle</button></section><section className="session-card"><span className="eyebrow">Cycle</span><h2>{cycle.sessions.filter(s => s.status === "COMPLETED").length} dots finished</h2><div className="dots">{Array.from({ length: cycle.totalSessions }, (_, i) => <i key={i} className={i < active.sessionNumber ? "filled" : ""} />)}</div><p>{remaining === 0 ? "Time is up. Mark this session complete when you're ready." : "Stay with the task. The rest can wait."}</p><button className="outline wide" disabled={busy} onClick={finish}>{active.sessionNumber === cycle.totalSessions ? "Complete cycle" : "Complete session"}</button></section></div></>;
}

function History({ cycles }: { cycles: PomodoroCycle[] }) {
  return <><header className="workspace-header"><div><span className="eyebrow">Work log</span><h1>Your focus, recorded.</h1></div></header><section className="history-list">{cycles.length === 0 ? <p>No completed cycles yet.</p> : cycles.map((c, i) => <motion.article key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}><div className={`status-dot ${c.status.toLowerCase()}`} /><div><strong>{c.sessions.filter(s => s.status === "COMPLETED").length} of {c.totalSessions} dots</strong><span>{c.duration} minute sessions · {c.status.toLowerCase()}</span></div><time>{new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></motion.article>)}</section></>;
}

function Stats({ cycles }: { cycles: PomodoroCycle[] }) {
  const complete = cycles.flatMap(c => c.sessions).filter(s => s.status === "COMPLETED"); const minutes = cycles.reduce((sum, c) => sum + c.sessions.filter(s => s.status === "COMPLETED").length * c.duration, 0);
  const stats = [
    { label: "Total dots", value: complete.length },
    { label: "Focused minutes", value: minutes },
    { label: "Completed cycles", value: cycles.filter(c => c.status === "COMPLETED").length },
  ];
  return <><header className="workspace-header"><div><span className="eyebrow">Stats</span><h1>Small dots add up.</h1></div></header><div className="stats-grid">{stats.map((stat, i) => <motion.article key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.06 }}><span>{stat.label}</span><strong>{stat.value}</strong></motion.article>)}</div></>;
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button className={active ? "active" : ""} onClick={onClick}>
    {active && <motion.i className="nav-active-bar" layoutId="nav-indicator" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
    {children}
  </button>;
}

function App() {
  const [authenticated, setAuthenticated] = useState(api.hasToken()); const [cycle, setCycle] = useState<PomodoroCycle | null>(null); const [history, setHistory] = useState<PomodoroCycle[]>([]); const [view, setView] = useState<View>(() => new URLSearchParams(location.search).get("view") === "flashcards" ? "flashcards" : "timer"); const [loading, setLoading] = useState(authenticated); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const [a, h] = await Promise.all([api.active(), api.history()]); setCycle(a.cycle); setHistory(h.cycles); setAuthenticated(true); } catch (err) { setError(err instanceof Error ? err.message : "Could not reach the server."); if (!api.hasToken()) setAuthenticated(false); } finally { setLoading(false); } }, []);
  useEffect(() => { if (authenticated) load(); }, [authenticated, load]);
  const todayDots = useMemo(() => history.filter(c => new Date(c.createdAt).toDateString() === new Date().toDateString()).flatMap(c => c.sessions).filter(s => s.status === "COMPLETED").length, [history]);
  return <AnimatePresence mode="wait">
    {!authenticated ? <Auth key="auth" onAuthenticated={() => setAuthenticated(true)} /> : <motion.div key="app-shell" className="app-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <aside><button className="brand plain" onClick={() => setView("timer")}><i />.DOT</button><nav><NavButton active={view === "timer"} onClick={() => setView("timer")}>Timer</NavButton><NavButton active={view === "flashcards"} onClick={() => setView("flashcards")}>Flashcards</NavButton><NavButton active={view === "history"} onClick={() => setView("history")}>Work log</NavButton><NavButton active={view === "stats"} onClick={() => setView("stats")}>Stats</NavButton></nav><div className="aside-bottom"><span className="eyebrow">Today</span><strong>{todayDots} {todayDots === 1 ? "dot" : "dots"}</strong><button className="logout" onClick={async () => { await api.logout(); setAuthenticated(false); }}>Sign out</button></div></aside>
      <main className="workspace">
        <AnimatePresence>{error && <motion.p key="error" className="error banner" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>{error}</motion.p>}</AnimatePresence>
        {loading ? <div className="loader"><i /></div> : <AnimatePresence mode="wait">
          <motion.div key={`${view}-${view === "timer" ? (cycle ? "active" : "setup") : ""}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease: "easeOut" }}>
            {view === "timer" ? cycle ? <Timer cycle={cycle} onRefresh={load} /> : <Setup onStart={async (m, s) => { const data = await api.start(m, s); setCycle(data.cycle); await load(); }} /> : view === "flashcards" ? <FlashcardsView /> : view === "history" ? <History cycles={history} /> : <Stats cycles={history} />}
          </motion.div>
        </AnimatePresence>}
      </main>
    </motion.div>}
  </AnimatePresence>;
}

export default App;
