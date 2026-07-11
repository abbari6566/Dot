import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { PomodoroCycle, PomodoroSession } from "./types";

type View = "timer" | "history" | "stats";

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

  return <main className="auth-page">
    <section className="auth-intro"><div className="brand"><i />.DOT</div><div><span className="eyebrow">Deep work, made visible</span><h1>One task.<br />One timer.<br />One dot at a time.</h1><p>A calm place to protect your attention and keep a record of the work that matters.</p></div><div className="orb" /></section>
    <section className="auth-panel"><form className="auth-card" onSubmit={submit}><span className="eyebrow">Welcome {mode === "login" ? "back" : "to .DOT"}</span><h2>{mode === "login" ? "Sign in to focus" : "Create your space"}</h2>
      {mode === "register" && <label>Name<input name="name" placeholder="Your name" required maxLength={100} /></label>}
      <label>Email<input name="email" type="email" placeholder="you@example.com" required /></label>
      <label>Password<input name="password" type="password" placeholder="At least 8 characters" required minLength={8} /></label>
      {error && <p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      <button type="button" className="text-button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
    </form></section>
  </main>;
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
  const time = `${String(Math.floor(remaining / 60)).padStart(2,"0")}:${String(remaining % 60).padStart(2,"0")}`;
  return <><header className="workspace-header"><div><span className="eyebrow">Session {active.sessionNumber} of {cycle.totalSessions}</span><h1>Protecting your attention</h1></div><button className="outline" onClick={() => document.documentElement.requestFullscreen?.()}>Lock screen</button></header><div className="timer-layout"><section className="timer-card"><span className="eyebrow">Focus time</span><div className="time">{time}</div><div className="progress"><i style={{ width: `${100 - remaining / totalSeconds * 100}%` }} /></div><button className="primary" onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}</button><button className="text-button danger" disabled={busy} onClick={interrupt}>End cycle</button></section><section className="session-card"><span className="eyebrow">Cycle</span><h2>{cycle.sessions.filter(s => s.status === "COMPLETED").length} dots finished</h2><div className="dots">{Array.from({ length: cycle.totalSessions }, (_, i) => <i key={i} className={i < active.sessionNumber ? "filled" : ""} />)}</div><p>{remaining === 0 ? "Time is up. Mark this session complete when you’re ready." : "Stay with the task. The rest can wait."}</p><button className="outline wide" disabled={busy} onClick={finish}>{active.sessionNumber === cycle.totalSessions ? "Complete cycle" : "Complete session"}</button></section></div></>;
}

function History({ cycles }: { cycles: PomodoroCycle[] }) {
  return <><header className="workspace-header"><div><span className="eyebrow">Work log</span><h1>Your focus, recorded.</h1></div></header><section className="history-list">{cycles.length === 0 ? <p>No completed cycles yet.</p> : cycles.map(c => <article key={c.id}><div className={`status-dot ${c.status.toLowerCase()}`} /><div><strong>{c.sessions.filter(s => s.status === "COMPLETED").length} of {c.totalSessions} dots</strong><span>{c.duration} minute sessions · {c.status.toLowerCase()}</span></div><time>{new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></article>)}</section></>;
}

function Stats({ cycles }: { cycles: PomodoroCycle[] }) {
  const complete = cycles.flatMap(c => c.sessions).filter(s => s.status === "COMPLETED"); const minutes = cycles.reduce((sum,c) => sum + c.sessions.filter(s => s.status === "COMPLETED").length * c.duration, 0);
  return <><header className="workspace-header"><div><span className="eyebrow">Stats</span><h1>Small dots add up.</h1></div></header><div className="stats-grid"><article><span>Total dots</span><strong>{complete.length}</strong></article><article><span>Focused minutes</span><strong>{minutes}</strong></article><article><span>Completed cycles</span><strong>{cycles.filter(c => c.status === "COMPLETED").length}</strong></article></div></>;
}

function App() {
  const [authenticated, setAuthenticated] = useState(api.hasToken()); const [cycle, setCycle] = useState<PomodoroCycle | null>(null); const [history, setHistory] = useState<PomodoroCycle[]>([]); const [view, setView] = useState<View>("timer"); const [loading, setLoading] = useState(authenticated); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const [a,h] = await Promise.all([api.active(), api.history()]); setCycle(a.cycle); setHistory(h.cycles); setAuthenticated(true); } catch (err) { setError(err instanceof Error ? err.message : "Could not reach the server."); if (!api.hasToken()) setAuthenticated(false); } finally { setLoading(false); } }, []);
  useEffect(() => { if (authenticated) load(); }, [authenticated, load]);
  const todayDots = useMemo(() => history.filter(c => new Date(c.createdAt).toDateString() === new Date().toDateString()).flatMap(c => c.sessions).filter(s => s.status === "COMPLETED").length, [history]);
  if (!authenticated) return <Auth onAuthenticated={() => setAuthenticated(true)} />;
  return <div className="app-shell"><aside><button className="brand plain" onClick={() => setView("timer")}><i />.DOT</button><nav><button className={view === "timer" ? "active" : ""} onClick={() => setView("timer")}>Timer</button><button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>Work log</button><button className={view === "stats" ? "active" : ""} onClick={() => setView("stats")}>Stats</button></nav><div className="aside-bottom"><span className="eyebrow">Today</span><strong>{todayDots} {todayDots === 1 ? "dot" : "dots"}</strong><button className="logout" onClick={async () => { await api.logout(); setAuthenticated(false); }}>Sign out</button></div></aside><main className="workspace">{error && <p className="error banner">{error}</p>}{loading ? <div className="loader"><i /></div> : view === "timer" ? cycle ? <Timer cycle={cycle} onRefresh={load} /> : <Setup onStart={async (m,s) => { const data = await api.start(m,s); setCycle(data.cycle); await load(); }} /> : view === "history" ? <History cycles={history} /> : <Stats cycles={history} />}</main></div>;
}

export default App;
