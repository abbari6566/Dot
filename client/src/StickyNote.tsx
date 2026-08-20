import { useEffect } from "react";
import { motion, useDragControls, useMotionValue } from "framer-motion";
import type { Note } from "./types";

const POSITION_KEY = "dot.sticky.pos";

const readPosition = (): { x: number; y: number } | null => {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (raw) return JSON.parse(raw) as { x: number; y: number };
  } catch {
    // ignore corrupted position
  }
  return null;
};

export default function StickyNote({ note, onClose }: { note: Note; onClose: () => void }) {
  const saved = readPosition();
  const defaultX = Math.max(0, window.innerWidth - 336 - 16);
  const x = useMotionValue(saved?.x ?? defaultX);
  const y = useMotionValue(saved?.y ?? 88);
  const controls = useDragControls();

  useEffect(() => {
    const persist = () => {
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify({ x: x.get(), y: y.get() }));
      } catch {
        // storage unavailable
      }
    };
    const stopX = x.on("change", persist);
    const stopY = y.on("change", persist);
    return () => { stopX(); stopY(); };
  }, [x, y]);

  const pending = note.tasks.filter(task => !task.done).length;

  return <motion.aside
    className="sticky-note"
    style={{ x, y }}
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
    <header className="sticky-head" onPointerDown={event => controls.start(event)}>
      <span className="sticky-title">{note.title || "Untitled"}</span>
      <div className="sticky-head-actions">
        {pending > 0 && <span className="sticky-badge" title={`${pending} open task${pending === 1 ? "" : "s"}`}>{pending}</span>}
        <button className="sticky-close" onClick={onClose} onPointerDown={event => event.stopPropagation()} aria-label="Close sticky note">×</button>
      </div>
    </header>
    <div className="sticky-body" dangerouslySetInnerHTML={{ __html: note.content || "<p>Empty note</p>" }} />
    <footer className="sticky-foot">
      {note.remindAt && !note.remindedAt && <span className="sticky-reminder">Reminder {new Date(note.remindAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
    </footer>
  </motion.aside>;
}
