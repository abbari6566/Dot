import { useEffect, useState } from "react";
import { motion, useDragControls, useMotionValue } from "framer-motion";
import type { PomodoroCycle } from "./types";

const POSITION_KEY = "dot.timer-widget.pos";

function savedPosition() {
  try { return JSON.parse(localStorage.getItem(POSITION_KEY) || "null") as { x: number; y: number } | null; }
  catch { return null; }
}

export default function TimerWidget({ cycle, onClose, onOpen }: { cycle: PomodoroCycle; onClose: () => void; onOpen: () => void }) {
  const active = cycle.sessions.find(session => session.status === "IN_PROGRESS");
  const saved = savedPosition();
  const x = useMotionValue(saved?.x ?? Math.max(16, window.innerWidth - 276));
  const y = useMotionValue(saved?.y ?? 112);
  const controls = useDragControls();
  const [, tick] = useState(0);

  useEffect(() => { const id = window.setInterval(() => tick(value => value + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => {
    const persist = () => { try { localStorage.setItem(POSITION_KEY, JSON.stringify({ x: x.get(), y: y.get() })); } catch { /* unavailable */ } };
    const stopX = x.on("change", persist); const stopY = y.on("change", persist);
    return () => { stopX(); stopY(); };
  }, [x, y]);

  if (!active) return null;
  const total = cycle.duration * 60;
  const elapsed = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000);
  const remaining = Math.max(0, total - elapsed);
  const time = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const completed = active.sessionNumber - 1;

  return <motion.aside className="timer-widget" style={{ x, y }} drag dragListener={false} dragControls={controls} dragMomentum={false} dragElastic={.08} dragConstraints={{ left: -220, right: window.innerWidth - 60, top: 8, bottom: window.innerHeight - 60 }} initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .9 }}>
    <header className="timer-widget-head" onPointerDown={event => controls.start(event)}><span><i />FOCUS CYCLE</span><button className="sticky-close" onClick={onClose} onPointerDown={event => event.stopPropagation()} aria-label="Close floating timer">×</button></header>
    <button className="timer-widget-body" onClick={onOpen} title="Open timer">
      <span className="timer-widget-dot-label">DOT {active.sessionNumber} OF {cycle.totalSessions}</span>
      <strong>{time}</strong>
      <span className="timer-widget-dots">{Array.from({ length: cycle.totalSessions }, (_, index) => <i key={index} className={index < completed ? "done" : index === completed ? "active" : ""} />)}</span>
      <span className="timer-widget-open">Open timer &gt;</span>
    </button>
  </motion.aside>;
}
