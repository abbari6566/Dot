import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "./api";
import type { PomodoroCycle, UserProfile } from "./types";

interface Props {
  cycles: PomodoroCycle[];
  profile: UserProfile | null;
  onProfileUpdate: (u: UserProfile) => void;
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function buildDotMap(cycles: PomodoroCycle[]) {
  const map: Record<string, number> = {};
  for (const c of cycles) {
    for (const s of c.sessions) {
      if (s.status !== "COMPLETED") continue;
      const key = dateKey(new Date(s.completedAt ?? s.startedAt));
      map[key] = (map[key] || 0) + 1;
    }
  }
  return map;
}

function calcStreaks(dotMap: Record<string, number>, goal: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let current = 0;
  let d = new Date(today);
  if ((dotMap[dateKey(d)] || 0) < goal) {
    d = shiftDays(d, -1);
  }
  while ((dotMap[dateKey(d)] || 0) >= goal) {
    current++;
    d = shiftDays(d, -1);
  }

  let best = 0;
  const allDates = Object.keys(dotMap).filter(k => dotMap[k] >= goal).sort();
  let run = 0;
  let prev: string | null = null;
  for (const k of allDates) {
    if (prev) {
      const prevDate = new Date(prev);
      const curDate = new Date(k);
      const diff = (curDate.getTime() - prevDate.getTime()) / 86400000;
      if (Math.abs(diff - 1) < 0.01) {
        run++;
      } else {
        run = 1;
      }
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = k;
  }

  return { current, best };
}

function CalendarHeatmap({ dotMap, goal }: { dotMap: Record<string, number>; goal: number }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weeks: { date: Date; count: number }[][] = [];
  const startDate = shiftDays(today, -111);
  const dayOfWeek = startDate.getDay();
  const paddedStart = shiftDays(startDate, -dayOfWeek);

  let currentWeek: { date: Date; count: number }[] = [];
  for (let i = 0; i < dayOfWeek; i++) {
    currentWeek.push({ date: shiftDays(paddedStart, i), count: 0 });
  }

  for (let i = 0; i < 112; i++) {
    const d = shiftDays(paddedStart, dayOfWeek + i);
    const key = dateKey(d);
    const count = dotMap[key] || 0;
    currentWeek.push({ date: d, count });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      const lastDate = currentWeek[currentWeek.length - 1].date;
      currentWeek.push({ date: shiftDays(lastDate, 1), count: 0 });
    }
    weeks.push(currentWeek);
  }

  const months: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    const firstDay = weeks[w][0]?.date;
    if (firstDay) {
      const m = firstDay.getMonth();
      if (m !== lastMonth) {
        months.push({ label: firstDay.toLocaleString("default", { month: "short" }), weekIndex: w });
        lastMonth = m;
      }
    }
  }

  const level = (count: number) => {
    if (count === 0) return 0;
    if (count < goal * 0.5) return 1;
    if (count < goal) return 2;
    if (count < goal * 2) return 3;
    return 4;
  };

  const CELL = 14;
  const GAP = 3;
  const numWeeks = weeks.length;

  return (
    <div className="heatmap">
      <div className="heatmap-months" style={{ "--weeks": numWeeks } as React.CSSProperties}>
        {months.map((m, i) => (
          <span key={i} style={{ left: `${(m.weekIndex / numWeeks) * 100}%` }}>{m.label}</span>
        ))}
      </div>
      <div className="heatmap-grid">
        <div className="heatmap-days">
          {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="heatmap-cells" style={{ "--weeks": numWeeks } as React.CSSProperties}>
          {weeks.map((week, wi) => (
            <div key={wi} className="heatmap-week">
              {week.map((day, di) => {
                const lv = level(day.count);
                const isToday = dateKey(day.date) === dateKey(today);
                return (
                  <div
                    key={di}
                    className={`heatmap-cell lv${lv}${isToday ? " today" : ""}`}
                    title={`${day.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${day.count} dot${day.count !== 1 ? "s" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map(l => <div key={l} className={`heatmap-cell lv${l}`} />)}
        <span>More</span>
      </div>
    </div>
  );
}

function WeeklyChart({ dotMap, goal }: { dotMap: Record<string, number>; goal: number }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weeks: { label: string; count: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const weekEnd = shiftDays(today, -w * 7);
    const weekStart = shiftDays(weekEnd, -6);
    let total = 0;
    for (let d = 0; d < 7; d++) {
      const key = dateKey(shiftDays(weekStart, d));
      total += dotMap[key] || 0;
    }
    const shortEnd = weekEnd.toLocaleString("default", { month: "short", day: "numeric" });
    const shortStart = weekStart.toLocaleString("default", { month: "short", day: "numeric" });
    weeks.push({ label: `${shortStart}–${shortEnd}`, count: total });
  }

  const maxCount = Math.max(goal * 7, ...weeks.map(w => w.count), 1);

  return (
    <div className="bar-chart">
      <div className="bar-chart-bars">
        {weeks.map((w, i) => {
          const pct = (w.count / maxCount) * 100;
          const metGoal = w.count >= goal * 7;
          return (
            <div key={i} className="bar-col">
              <div className="bar-value">{w.count || ""}</div>
              <div className="bar-track">
                <div
                  className={`bar-fill${metGoal ? " met" : ""}`}
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
                <div className="bar-goal-line" style={{ bottom: `${(goal * 7 / maxCount) * 100}%` }} />
              </div>
              <div className="bar-label">{w.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyChart({ dotMap, goal }: { dotMap: Record<string, number>; goal: number }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const months: { label: string; count: number }[] = [];
  for (let m = 11; m >= 0; m--) {
    const d = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    let total = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const key = dateKey(new Date(year, month, day));
      total += dotMap[key] || 0;
    }
    months.push({
      label: d.toLocaleString("default", { month: "short" }),
      count: total,
    });
  }

  const maxCount = Math.max(goal * 30, ...months.map(m => m.count), 1);

  return (
    <div className="bar-chart">
      <div className="bar-chart-bars">
        {months.map((m, i) => {
          const pct = (m.count / maxCount) * 100;
          const metGoal = m.count >= goal * 30;
          return (
            <div key={i} className="bar-col">
              <div className="bar-value">{m.count || ""}</div>
              <div className="bar-track">
                <div
                  className={`bar-fill${metGoal ? " met" : ""}`}
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
                <div className="bar-goal-line" style={{ bottom: `${(goal * 30 / maxCount) * 100}%` }} />
              </div>
              <div className="bar-label">{m.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ChartPeriod = "daily" | "weekly" | "monthly";
type TrendPoint = { key: string; shortLabel: string; fullLabel: string; count: number; target: number };

function buildTrend(dotMap: Record<string, number>, goal: number, period: ChartPeriod): TrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (period === "daily") {
    return Array.from({ length: 14 }, (_, index) => {
      const date = shiftDays(today, index - 13);
      return { key: dateKey(date), count: dotMap[dateKey(date)] || 0, target: goal,
        shortLabel: date.toLocaleDateString(undefined, { weekday: "short" }),
        fullLabel: date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) };
    });
  }
  if (period === "weekly") {
    return Array.from({ length: 12 }, (_, index) => {
      const end = shiftDays(today, (index - 11) * 7);
      const start = shiftDays(end, -6);
      let count = 0;
      for (let day = 0; day < 7; day++) count += dotMap[dateKey(shiftDays(start, day))] || 0;
      return { key: dateKey(start), count, target: goal * 7,
        shortLabel: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        fullLabel: `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}` };
    });
  }
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() + index - 11, 1);
    const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    let count = 0;
    for (let day = 1; day <= days; day++) count += dotMap[dateKey(new Date(date.getFullYear(), date.getMonth(), day))] || 0;
    return { key: dateKey(date), count, target: goal * days,
      shortLabel: date.toLocaleDateString(undefined, { month: "short" }),
      fullLabel: date.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
  });
}

function TrendChart({ dotMap, goal, period }: { dotMap: Record<string, number>; goal: number; period: ChartPeriod }) {
  const points = useMemo(() => buildTrend(dotMap, goal, period), [dotMap, goal, period]);
  const [selected, setSelected] = useState(points.length - 1);
  const active = points[Math.min(selected, points.length - 1)];
  const max = Math.max(...points.flatMap(point => [point.count, point.target]), 1) * 1.12;
  const width = 1000; const height = 250; const left = 24; const right = 20; const top = 18; const bottom = 34;
  const x = (index: number) => left + index * ((width - left - right) / (points.length - 1));
  const y = (value: number) => top + (height - top - bottom) * (1 - value / max);
  const line = points.map((point, index) => `${index ? "L" : "M"} ${x(index)} ${y(point.count)}`).join(" ");
  const area = `${line} L ${x(points.length - 1)} ${height - bottom} L ${x(0)} ${height - bottom} Z`;
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const average = total / points.length;
  const best = points.reduce((winner, point) => point.count > winner.count ? point : winner, points[0]);
  const goalLabel = period === "daily" ? "Daily target" : period === "weekly" ? "Weekly target" : "Monthly target";

  return <div className="trend-chart">
    <div className="trend-summary">
      <div><span>Selected</span><strong>{active.count}</strong><small>{active.fullLabel}</small></div>
      <div><span>Average</span><strong>{average.toFixed(1)}</strong><small>dots per {period === "daily" ? "day" : period === "weekly" ? "week" : "month"}</small></div>
      <div><span>Best</span><strong>{best.count}</strong><small>{best.fullLabel}</small></div>
    </div>
    <div className="trend-plot" aria-label={`${period} focus activity chart`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs><linearGradient id={`trend-fill-${period}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".2"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
        {[0, .25, .5, .75, 1].map(level => <line key={level} className="trend-grid-line" x1={left} x2={width - right} y1={top + (height - top - bottom) * level} y2={top + (height - top - bottom) * level} />)}
        <path className="trend-area" d={area} fill={`url(#trend-fill-${period})`} />
        <path className="trend-line" d={line} />
        {points.map((point, index) => <g key={point.key} className={index === selected ? "trend-point active" : "trend-point"} onMouseEnter={() => setSelected(index)}>
          <circle className="trend-hit" cx={x(index)} cy={y(point.count)} r="18" />
          <circle className="trend-dot" cx={x(index)} cy={y(point.count)} r={index === selected ? 6 : 4} />
        </g>)}
      </svg>
      <div className="trend-target" style={{ top: `${(y(active.target) / height) * 100}%` }}><span>{goalLabel} · {active.target}</span></div>
      <div className={`trend-labels ${period}`}>{points.map((point, index) => <button key={point.key} className={index === selected ? "active" : ""} onClick={() => setSelected(index)} aria-label={`${point.fullLabel}: ${point.count} dots`}>{point.shortLabel}</button>)}</div>
    </div>
    <div className="trend-foot"><span><i /> Completed dots</span><span><i className="target" /> Target</span><strong>{total} dots in this view</strong></div>
  </div>;
}

function GoalSetting({ goal, onSave }: { goal: number; onSave: (g: number) => void }) {
  const [val, setVal] = useState(goal);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    if (val === goal || busy) return;
    setBusy(true);
    try {
      const { user } = await api.updateDailyGoal(val);
      onSave(user.dailyGoal);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="goal-setting">
      <div className="goal-setting-head">
        <span className="eyebrow">Daily goal</span>
        <p>Set how many dots you want to complete each day.</p>
      </div>
      <div className="goal-setting-row">
        <div className="goal-stepper">
          <button
            className="goal-step-btn"
            disabled={val <= 1 || busy}
            onClick={() => setVal(v => Math.max(1, v - 1))}
          >−</button>
          <span className="goal-value">{val}</span>
          <button
            className="goal-step-btn"
            disabled={val >= 20 || busy}
            onClick={() => setVal(v => Math.min(20, v + 1))}
          >+</button>
        </div>
        <button className="primary" disabled={val === goal || busy} onClick={submit}>
          {busy ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function StatsView({ cycles, profile, onProfileUpdate }: Props) {
  const dotMap = useMemo(() => buildDotMap(cycles), [cycles]);
  const goal = profile?.dailyGoal ?? 5;

  const todayKey = dateKey(new Date());
  const todayDots = dotMap[todayKey] || 0;
  const totalDots = cycles.flatMap(c => c.sessions).filter(s => s.status === "COMPLETED").length;
  const totalMinutes = cycles.reduce((sum, c) => sum + c.sessions.filter(s => s.status === "COMPLETED").length * c.duration, 0);
  const completedCycles = cycles.filter(c => c.status === "COMPLETED").length;
  const { current: currentStreak, best: bestStreak } = useMemo(() => calcStreaks(dotMap, goal), [dotMap, goal]);

  const goalMetToday = todayDots >= goal;
  const goalPct = Math.min(100, Math.round((todayDots / goal) * 100));

  const [chartTab, setChartTab] = useState<ChartPeriod>("daily");

  const handleGoalUpdate = useCallback((newGoal: number) => {
    if (profile) onProfileUpdate({ ...profile, dailyGoal: newGoal });
  }, [profile, onProfileUpdate]);

  return (
    <>
      <header className="workspace-header">
        <div>
          <span className="eyebrow">Stats</span>
          <h1>Small dots add up.</h1>
        </div>
      </header>

      <div className="stats-grid">
        <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0 }}>
          <span>Total dots</span>
          <strong>{totalDots}</strong>
        </motion.article>
        <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.06 }}>
          <span>Focused minutes</span>
          <strong>{totalMinutes}</strong>
        </motion.article>
        <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.12 }}>
          <span>Completed cycles</span>
          <strong>{completedCycles}</strong>
        </motion.article>
      </div>

      <div className="stats-streak-row">
        <motion.div className="streak-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.18 }}>
          <div className="streak-icon">🔥</div>
          <div className="streak-info">
            <span className="eyebrow">Current streak</span>
            <strong className="streak-num">{currentStreak}</strong>
            <span className="streak-unit">day{currentStreak !== 1 ? "s" : ""}</span>
          </div>
        </motion.div>
        <motion.div className="streak-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.24 }}>
          <div className="streak-icon">⭐</div>
          <div className="streak-info">
            <span className="eyebrow">Best streak</span>
            <strong className="streak-num">{bestStreak}</strong>
            <span className="streak-unit">day{bestStreak !== 1 ? "s" : ""}</span>
          </div>
        </motion.div>
        <motion.div className={`streak-card today-card${goalMetToday ? " met" : ""}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
          <div className="today-dots-wrap">
            <svg className="today-ring" viewBox="0 0 44 44">
              <circle className="today-ring-bg" cx="22" cy="22" r="18" />
              <circle
                className="today-ring-fill"
                cx="22" cy="22" r="18"
                style={{ strokeDasharray: `${goalPct * 1.131} 113.1` }}
              />
            </svg>
            <span className="today-dots-num">{todayDots}</span>
          </div>
          <div className="streak-info">
            <span className="eyebrow">Today</span>
            <strong className="streak-num">{todayDots} / {goal}</strong>
            <span className="streak-unit">{goalMetGoalText(goalMetToday)}</span>
          </div>
        </motion.div>
      </div>

      <motion.div className="stats-chart-section" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.36 }}>
        <div className="chart-tabs">
          {(["daily", "weekly", "monthly"] as const).map(tab => (
            <button key={tab} className={`chart-tab${chartTab === tab ? " active" : ""}`} onClick={() => setChartTab(tab)}>
              {tab === "daily" ? "Daily" : tab === "weekly" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>

        <div className="chart-panel">
          <div className="chart-panel-heading"><div><span className="eyebrow">Focus activity</span><h3>{chartTab === "daily" ? "Last 14 days" : chartTab === "weekly" ? "Last 12 weeks" : "Last 12 months"}</h3></div><p>Hover or select a point to inspect it.</p></div>
          <TrendChart key={chartTab} dotMap={dotMap} goal={goal} period={chartTab} />
        </div>
      </motion.div>

      {profile && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.42 }}>
          <GoalSetting goal={goal} onSave={handleGoalUpdate} />
        </motion.div>
      )}
    </>
  );
}

function goalMetGoalText(met: boolean) {
  return met ? "Goal reached" : "Keep going";
}
