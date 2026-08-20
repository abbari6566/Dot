import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useDragControls, useMotionValue } from "framer-motion";
import { api } from "./api";
import type { Countdown } from "./types";

const POS_KEY = "dot.countdown.pos";
const MAX_COUNTDOWNS = 2;

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function diffUntil(target: Date) {
  const now = Date.now();
  const ms = target.getTime() - now;
  if (ms <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, past: true };
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return { total: ms, days, hours: hours % 24, minutes: minutes % 60, seconds: seconds % 60, past: false };
}

const PRESET_COLORS = ["#102338", "#c0392b", "#27ae60", "#8e44ad", "#e67e22", "#2c3e50"];

/* ── Floating countdown widget ── */
function CountdownFloat({ countdown, onRemove }: { countdown: Countdown; onRemove: (id: string) => void }) {
  const saved = readPosition();
  const x = useMotionValue(saved?.x ?? 20);
  const y = useMotionValue(saved?.y ?? 200);
  const controls = useDragControls();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const persist = () => {
      try { localStorage.setItem(POS_KEY, JSON.stringify({ x: x.get(), y: y.get() })); } catch { /* */ }
    };
    const stopX = x.on("change", persist);
    const stopY = y.on("change", persist);
    return () => { stopX(); stopY(); };
  }, [x, y]);

  const target = useMemo(() => new Date(countdown.targetDate), [countdown.targetDate]);
  const diff = useMemo(() => diffUntil(target), [target, tick]);
  const color = countdown.color || "var(--accent)";

  return (
    <motion.aside
      className="cd-widget"
      style={{ x, y, borderColor: color }}
      drag
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      dragElastic={0.08}
      dragConstraints={{ left: -280, right: window.innerWidth - 60, top: 8, bottom: window.innerHeight - 60 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <header className="cd-head" onPointerDown={e => controls.start(e)}>
        <span className="cd-title">{countdown.title}</span>
        <button className="sticky-close" onClick={() => onRemove(countdown.id)} onPointerDown={e => e.stopPropagation()} aria-label="Close">×</button>
      </header>
      <div className="cd-body">
        {diff.past ? (
          <div className="cd-past">Date reached</div>
        ) : (
          <div className="cd-countdown">
            <div className="cd-unit"><strong>{diff.days}</strong><span>days</span></div>
            <div className="cd-sep">:</div>
            <div className="cd-unit"><strong>{String(diff.hours).padStart(2, "0")}</strong><span>hrs</span></div>
            <div className="cd-sep">:</div>
            <div className="cd-unit"><strong>{String(diff.minutes).padStart(2, "0")}</strong><span>min</span></div>
            <div className="cd-sep">:</div>
            <div className="cd-unit"><strong>{String(diff.seconds).padStart(2, "0")}</strong><span>sec</span></div>
          </div>
        )}
        <div className="cd-date">{target.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
      </div>
    </motion.aside>
  );
}

/* ── ICS parser (client-side) ── */
function parseICS(text: string) {
  const events: { title: string; start: string }[] = [];
  const lines = text.replace(/\r\n /g, "").split("\n");
  let inEvent = false;
  let summary = "";
  let dtstart = "";
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { inEvent = true; summary = ""; dtstart = ""; }
    else if (line === "END:VEVENT") {
      inEvent = false;
      if (summary && dtstart) {
        const cleaned = dtstart.replace(/Z$/, "").replace(/T(\d{2})(\d{2})(\d{2})/, "T$1:$2:$3");
        const d = new Date(cleaned);
        if (!Number.isNaN(d.getTime())) {
          events.push({ title: summary, start: d.toISOString() });
        }
      }
    } else if (inEvent) {
      if (line.startsWith("SUMMARY:")) summary = line.slice(8);
      if (line.startsWith("DTSTART")) dtstart = line.includes(":") ? line.split(":").slice(1).join(":") : "";
    }
  }
  return events;
}

/* ── Create / Edit form ── */
function CountdownForm({ existing, initialDate, onSave, onCancel }: {
  existing?: Countdown;
  initialDate?: string;
  onSave: (data: { title: string; targetDate: string; color?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [date, setDate] = useState(() => {
    if (existing) return dateKey(new Date(existing.targetDate));
    if (initialDate) return initialDate;
    const d = new Date(); d.setDate(d.getDate() + 7);
    return dateKey(d);
  });
  const [color, setColor] = useState(existing?.color ?? PRESET_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true); setError("");
    try {
      await onSave({ title: title.trim(), targetDate: new Date(date + "T00:00:00").toISOString(), color });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="cd-form">
      <input
        className="cd-form-title"
        placeholder="Event name"
        value={title}
        onChange={e => setTitle(e.target.value)}
        maxLength={200}
        autoFocus
      />
      <input
        type="date"
        className="cd-form-date"
        value={date}
        onChange={e => setDate(e.target.value)}
      />
      <div className="cd-colors">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            className={`cd-color-btn${c === color ? " active" : ""}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            aria-label={c}
          />
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="cd-form-actions">
        <button className="text-button" onClick={onCancel}>Cancel</button>
        <button className="primary" disabled={busy || !title.trim()} onClick={submit}>
          {busy ? "Saving…" : existing ? "Update" : "Create"}
        </button>
      </div>
    </div>
  );
}

/* ── ICS import modal ── */
function ICSImport({ onImport, onClose }: {
  onImport: (events: { title: string; targetDate: string }[]) => Promise<void>;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [icsText, setIcsText] = useState("");
  const [events, setEvents] = useState<{ title: string; start: string; selected: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"url" | "paste">("url");

  const fetchICS = async () => {
    if (!url.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(url.trim());
      if (!res.ok) throw new Error("Could not fetch calendar");
      const text = await res.text();
      const parsed = parseICS(text);
      const future = parsed
        .filter(e => new Date(e.start).getTime() > Date.now())
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 50)
        .map(e => ({ ...e, selected: false }));
      setEvents(future);
      if (future.length === 0) setError("No upcoming events found");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally { setLoading(false); }
  };

  const parseText = () => {
    if (!icsText.trim()) return;
    const parsed = parseICS(icsText);
    const future = parsed
      .filter(e => new Date(e.start).getTime() > Date.now())
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 50)
      .map(e => ({ ...e, selected: false }));
    setEvents(future);
    if (future.length === 0) setError("No upcoming events found in pasted data");
  };

  const toggle = (i: number) => setEvents(prev => prev.map((e, idx) => idx === i ? { ...e, selected: !e.selected } : e));
  const selected = events.filter(e => e.selected);

  const doImport = async () => {
    if (selected.length === 0) return;
    await onImport(selected.map(e => ({ title: e.title, targetDate: e.start })));
  };

  return (
    <div className="cd-modal-backdrop" onClick={onClose}>
      <motion.div className="cd-modal" onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        <div className="cd-modal-head">
          <h3>Import from Google Calendar</h3>
          <button className="sticky-close" onClick={onClose}>×</button>
        </div>
        <p className="cd-modal-desc">Paste your Google Calendar's public ICS URL, or paste raw ICS data.</p>
        <div className="cd-import-tabs">
          <button className={`chart-tab${mode === "url" ? " active" : ""}`} onClick={() => setMode("url")}>URL</button>
          <button className={`chart-tab${mode === "paste" ? " active" : ""}`} onClick={() => setMode("paste")}>Paste ICS</button>
        </div>
        {mode === "url" ? (
          <div className="cd-import-row">
            <input placeholder="https://calendar.google.com/calendar/ical/..." value={url} onChange={e => setUrl(e.target.value)} />
            <button className="primary" disabled={loading || !url.trim()} onClick={fetchICS}>{loading ? "Fetching…" : "Fetch"}</button>
          </div>
        ) : (
          <div className="cd-import-paste">
            <textarea placeholder={"BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Interview\nDTSTART:20260818T100000\nEND:VEVENT\nEND:VCALENDAR"} value={icsText} onChange={e => setIcsText(e.target.value)} rows={6} />
            <button className="primary" disabled={!icsText.trim()} onClick={parseText}>Parse</button>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        {events.length > 0 && (
          <div className="cd-import-list">
            <span className="eyebrow">{events.length} upcoming event{events.length !== 1 ? "s" : ""}</span>
            <div className="cd-import-items">
              {events.map((e, i) => (
                <label key={i} className={`cd-import-item${e.selected ? " selected" : ""}`}>
                  <input type="checkbox" checked={e.selected} onChange={() => toggle(i)} />
                  <div>
                    <strong>{e.title}</strong>
                    <span>{new Date(e.start).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
        {selected.length > 0 && (
          <button className="primary wide" onClick={doImport}>Import {selected.length} event{selected.length !== 1 ? "s" : ""} as countdown{selected.length !== 1 ? "s" : ""}</button>
        )}
      </motion.div>
    </div>
  );
}

/* ── Big countdown card ── */
function CountdownCard({ countdown }: { countdown: Countdown }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);
  const target = useMemo(() => new Date(countdown.targetDate), [countdown.targetDate]);
  const diff = useMemo(() => diffUntil(target), [target, tick]);
  const color = countdown.color || "var(--accent)";

  return (
    <div className="cd-card" style={{ borderTopColor: color }}>
      <div className="cd-card-head">
        <span className="cd-card-dot" style={{ background: color }} />
        <strong className="cd-card-title">{countdown.title}</strong>
      </div>
      {diff.past ? (
        <div className="cd-card-past">Date reached</div>
      ) : (
        <div className="cd-card-countdown">
          <div className="cd-card-unit"><strong>{diff.days}</strong><span>days</span></div>
          <div className="cd-card-sep">:</div>
          <div className="cd-card-unit"><strong>{String(diff.hours).padStart(2, "0")}</strong><span>hrs</span></div>
          <div className="cd-card-sep">:</div>
          <div className="cd-card-unit"><strong>{String(diff.minutes).padStart(2, "0")}</strong><span>min</span></div>
          <div className="cd-card-sep">:</div>
          <div className="cd-card-unit"><strong>{String(diff.seconds).padStart(2, "0")}</strong><span>sec</span></div>
        </div>
      )}
      <div className="cd-card-date">{target.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
    </div>
  );
}

/* ── Interactive calendar ── */
function CalendarPicker({ targetDates, selectedDate, onSelect }: {
  targetDates: { date: string; color: string; title: string }[];
  selectedDate: string | null;
  onSelect: (dateStr: string) => void;
}) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateMap = useMemo(() => {
    const m: Record<string, typeof targetDates> = {};
    for (const t of targetDates) {
      const key = t.date.slice(0, 10);
      if (!m[key]) m[key] = [];
      m[key].push(t);
    }
    return m;
  }, [targetDates]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="cd-calendar">
      <div className="cd-cal-head">
        <button className="cd-cal-nav" onClick={prev} aria-label="Previous month">‹</button>
        <span className="cd-cal-month">{monthLabel}</span>
        <button className="cd-cal-nav" onClick={next} aria-label="Next month">›</button>
      </div>
      <div className="cd-cal-weekdays">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="cd-cal-grid">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="cd-cal-cell empty" />;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const events = dateMap[key] || [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          return (
            <div
              key={i}
              className={`cd-cal-cell${isToday ? " today" : ""}${isSelected ? " selected" : ""}${events.length > 0 ? " has-event" : ""}`}
              onClick={() => onSelect(key)}
            >
              <span>{day}</span>
              {events.length > 0 && (
                <div className="cd-cal-dots">
                  {events.slice(0, 3).map((e, j) => (
                    <span key={j} className="cd-cal-dot" style={{ background: e.color }} title={e.title} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Full-page countdown view ── */
export function CountdownView({ countdowns, onChange }: { countdowns: Countdown[]; onChange: () => void }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Countdown | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleSave = useCallback(async (data: { title: string; targetDate: string; color?: string }) => {
    if (editing) {
      await api.updateCountdown(editing.id, data);
    } else {
      await api.createCountdown(data);
    }
    setCreating(false); setEditing(null);
    onChange();
  }, [editing, onChange]);

  const handleDelete = useCallback(async (id: string) => {
    await api.deleteCountdown(id);
    onChange();
  }, [onChange]);

  const handleImport = useCallback(async (events: { title: string; targetDate: string }[]) => {
    for (const e of events) {
      await api.createCountdown({ title: e.title, targetDate: e.targetDate });
    }
    setImporting(false);
    onChange();
  }, [onChange]);

  const canAdd = countdowns.length < MAX_COUNTDOWNS;

  const targetDates = useMemo(() =>
    countdowns.map(c => ({ date: c.targetDate, color: c.color || "var(--accent)", title: c.title })),
    [countdowns]
  );

  const handleCalSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    if (canAdd && !creating && !editing) {
      setCreating(true);
    }
  };

  return (
    <>
      <header className="workspace-header">
        <div>
          <span className="eyebrow">Countdowns</span>
          <h1>Time until something matters.</h1>
        </div>
        <div className="cd-view-actions">
          {canAdd && <button className="outline" onClick={() => { setCreating(!creating); setEditing(null); }}>+ New</button>}
          {canAdd && <button className="outline" onClick={() => setImporting(true)}>Import</button>}
        </div>
      </header>

      {countdowns.length > 0 && (
        <div className="cd-cards">
          {countdowns.map(c => (
            <CountdownCard key={c.id} countdown={c} />
          ))}
        </div>
      )}

      {countdowns.length === 0 && !creating && (
        <div className="cd-view-empty">
          <p>No countdowns yet. Create one or import from Google Calendar.</p>
        </div>
      )}

      <AnimatePresence>
        {(creating || editing) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <CountdownForm
              existing={editing ?? undefined}
              initialDate={selectedDate && !editing ? selectedDate : undefined}
              onSave={handleSave}
              onCancel={() => { setCreating(false); setEditing(null); setSelectedDate(null); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="cd-view-bottom">
        <CalendarPicker targetDates={targetDates} selectedDate={selectedDate} onSelect={handleCalSelect} />

        {countdowns.length > 0 && (
          <div className="cd-view-list">
            <span className="eyebrow">All countdowns</span>
            <div className="cd-list">
              {countdowns.map(c => {
                const target = new Date(c.targetDate);
                const diff = diffUntil(target);
                return (
                  <div key={c.id} className="cd-list-item" style={{ borderLeftColor: c.color || "var(--accent)" }}>
                    <div className="cd-list-info">
                      <strong>{c.title}</strong>
                      <span>{diff.past ? "Date reached" : `${diff.days} day${diff.days !== 1 ? "s" : ""} left`} · {target.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <div className="cd-list-actions">
                      <button className="text-button" onClick={() => { setEditing(c); setCreating(false); setSelectedDate(null); }}>Edit</button>
                      <button className="text-button danger" onClick={() => handleDelete(c.id)}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {importing && <ICSImport onImport={handleImport} onClose={() => setImporting(false)} />}
      </AnimatePresence>
    </>
  );
}

/* ── Main manager (panel inside stats or standalone) ── */
export function CountdownManager({ countdowns, onChange }: { countdowns: Countdown[]; onChange: () => void }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Countdown | null>(null);
  const [importing, setImporting] = useState(false);

  const handleSave = useCallback(async (data: { title: string; targetDate: string; color?: string }) => {
    if (editing) {
      await api.updateCountdown(editing.id, data);
    } else {
      await api.createCountdown(data);
    }
    setCreating(false); setEditing(null);
    onChange();
  }, [editing, onChange]);

  const handleDelete = useCallback(async (id: string) => {
    await api.deleteCountdown(id);
    onChange();
  }, [onChange]);

  const handleImport = useCallback(async (events: { title: string; targetDate: string }[]) => {
    for (const e of events) {
      await api.createCountdown({ title: e.title, targetDate: e.targetDate });
    }
    setImporting(false);
    onChange();
  }, [onChange]);

  const canAdd = countdowns.length < MAX_COUNTDOWNS;

  return (
    <div className="cd-manager">
      <div className="cd-manager-head">
        <div>
          <span className="eyebrow">Countdowns</span>
          <p>{countdowns.length}/{MAX_COUNTDOWNS} active</p>
        </div>
        <div className="cd-manager-actions">
          {canAdd && <button className="outline" onClick={() => { setCreating(true); setEditing(null); }}>+ New</button>}
          {canAdd && <button className="outline" onClick={() => setImporting(true)}>Import</button>}
        </div>
      </div>

      {countdowns.length > 0 && (
        <div className="cd-list">
          {countdowns.map(c => {
            const target = new Date(c.targetDate);
            const diff = diffUntil(target);
            return (
              <div key={c.id} className="cd-list-item" style={{ borderLeftColor: c.color || "var(--accent)" }}>
                <div className="cd-list-info">
                  <strong>{c.title}</strong>
                  <span>{diff.past ? "Date reached" : `${diff.days} day${diff.days !== 1 ? "s" : ""} left`} · {target.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div className="cd-list-actions">
                  <button className="text-button" onClick={() => { setEditing(c); setCreating(false); }}>Edit</button>
                  <button className="text-button danger" onClick={() => handleDelete(c.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {countdowns.length === 0 && !creating && (
        <div className="cd-empty">
          <p>No countdowns yet. Create one or import from Google Calendar.</p>
        </div>
      )}

      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <CountdownForm onSave={handleSave} onCancel={() => setCreating(false)} />
          </motion.div>
        )}
        {editing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <CountdownForm existing={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {importing && <ICSImport onImport={handleImport} onClose={() => setImporting(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ── Exported floating widgets ── */
export default function CountdownWidgets({ countdowns, onRemove }: { countdowns: Countdown[]; onRemove: (id: string) => void }) {
  return (
    <AnimatePresence>
      {countdowns.slice(0, MAX_COUNTDOWNS).map(c => (
        <CountdownFloat key={c.id} countdown={c} onRemove={onRemove} />
      ))}
    </AnimatePresence>
  );
}
