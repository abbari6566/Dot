import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { Flashcard, FlashcardGroup, FlashcardTopic, ReviewGrade, ReviewStats } from "./types";
import { averageMastery, dueLabel, formatInterval, isDue, previewInterval } from "./srs";

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong.";
const localTime = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hour, minute));
};
const urlBase64ToUint8Array = (value: string) => {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob((value + padding).replace(/-/g, "+").replace(/_/g, "/")), character => character.charCodeAt(0));
};

const GRADES: { grade: ReviewGrade; label: string; key: string; color: string }[] = [
  { grade: "AGAIN", label: "Again", key: "1", color: "var(--danger)" },
  { grade: "HARD", label: "Hard", key: "2", color: "var(--warn)" },
  { grade: "GOOD", label: "Good", key: "3", color: "var(--accent-text)" },
  { grade: "EASY", label: "Easy", key: "4", color: "var(--good)" },
];

function CardEditor({ card, onSave, onCancel }: { card?: Flashcard; onSave: (question: string, answer: string) => Promise<void>; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  return <form className="fc-editor" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); const data = new FormData(event.currentTarget);
    try { await onSave(String(data.get("question")), String(data.get("answer"))); } finally { setBusy(false); }
  }}>
    <div className="fc-editor-grid"><label>Question<textarea name="question" defaultValue={card?.question} required maxLength={2000} autoFocus placeholder="Write the prompt…" /></label><label>Answer<textarea name="answer" defaultValue={card?.answer} required maxLength={5000} placeholder="Write the answer…" /></label></div>
    <div className="fc-form-actions"><button type="button" className="text-button" onClick={onCancel}>Cancel</button><button className="primary" disabled={busy}>{busy ? "Saving…" : card ? "Save changes" : "Add to deck"}</button></div>
  </form>;
}

function Reminder({ group, onChanged, reportError }: { group: FlashcardGroup; onChanged: () => Promise<void>; reportError: (value: string) => void }) {
  const [busy, setBusy] = useState(false);
  const enablePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("This browser does not support Web Push.");
    if (Notification.permission === "denied") throw new Error("Notifications are blocked. Allow them in this site's browser settings, then try again.");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notification permission was not granted.");
    const registration = await navigator.serviceWorker.register("/sw.js");
    const { publicKey } = await api.pushPublicKey();
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    await api.savePushSubscription(subscription.toJSON());
  };
  return <form className="fc-reminder" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); reportError(""); const data = new FormData(event.currentTarget);
    try {
      await enablePush();
      await api.setReminder(group.id, { timeOfDay: String(data.get("time")), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, enabled: true });
      await onChanged();
    } catch (error) { reportError(errorMessage(error)); } finally { setBusy(false); }
  }}>
    <div className="fc-reminder-copy"><span className="eyebrow">Daily review</span><strong>{group.reminder ? `${localTime(group.reminder.timeOfDay)} local time` : "Reminder off"}</strong></div>
    <div className="fc-reminder-controls"><label className="fc-time-field"><span>Reminder time</span><input type="time" name="time" defaultValue={group.reminder?.timeOfDay || "20:00"} aria-label="Daily reminder time" required /></label><button className="fc-reminder-submit" disabled={busy}>{busy ? "Saving…" : group.reminder ? "Update reminder" : "Enable reminder"}</button>{group.reminder && <button type="button" className="text-button" onClick={async () => { await api.deleteReminder(group.id); await onChanged(); }}>Turn off</button>}</div>
  </form>;
}

function CardRow({ card, onEdit, onDelete }: { card: Flashcard; onEdit: () => void; onDelete: () => void }) {
  return <div className="fc-card-row">
    <div className="fc-card-row-text"><span className="fc-card-row-q">{card.question}</span><span className="fc-card-row-a">{card.answer}</span></div>
    <div className="fc-card-row-meta">
      <span className="fc-card-row-due">{isDue(card) ? "Due now" : `Next ${dueLabel([card]).toLowerCase()}`}</span>
      <button type="button" className="text-button" onClick={onEdit}>Edit</button>
      <button type="button" className="text-button danger" onClick={onDelete}>Delete</button>
    </div>
  </div>;
}

function ReviewSession({ title, cards, onExit, onGraded }: { title: string; cards: Flashcard[]; onExit: () => void; onGraded: () => Promise<void> }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seen, setSeen] = useState(0);
  const [right, setRight] = useState(0);
  const [busy, setBusy] = useState(false);
  const finished = index >= cards.length;
  const card = cards[Math.min(index, Math.max(0, cards.length - 1))];

  const grade = useCallback(async (g: ReviewGrade) => {
    if (finished || busy || !card) return;
    setBusy(true);
    try {
      await api.reviewCard(card.id, g);
      setSeen(s => s + 1);
      if (g !== "AGAIN") setRight(r => r + 1);
      setIndex(i => i + 1);
      setFlipped(false);
    } finally { setBusy(false); }
  }, [busy, card, finished]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (event.key === " ") { event.preventDefault(); if (!finished) setFlipped(v => !v); return; }
      if (flipped && ["1", "2", "3", "4"].includes(event.key)) { void grade(GRADES[Number(event.key) - 1].grade); return; }
      if (event.key === "Escape") { void onGraded(); onExit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, finished, grade, onExit, onGraded]);

  const leave = () => { void onGraded(); onExit(); };

  return <section className="fc-review">
    <div className="fc-review-head">
      <button type="button" className="fc-back" onClick={leave}>← <span>Leave review</span></button>
      <span className="eyebrow mono">{title}</span>
      <span className="fc-review-counter mono">{finished ? "SESSION COMPLETE" : `${Math.min(index + 1, cards.length)} / ${cards.length}`}</span>
    </div>
    <div className="fc-review-progress"><span style={{ width: `${cards.length ? Math.min(100, (index / cards.length) * 100) : 0}%` }} /></div>
    <button type="button" className="fc-flip-card" onClick={() => { if (!finished) setFlipped(v => !v); }}>
      <div className={flipped && !finished ? "fc-flip-inner flipped" : "fc-flip-inner"}>
        <div className="fc-flip-face front">
          <span className="eyebrow mono">Prompt</span>
          <span className="fc-flip-text">{finished ? "Deck finished — nice work." : card?.question}</span>
          <span className="fc-flip-cue"><span className="fc-key mono">SPACE</span>reveal the answer</span>
        </div>
        <div className="fc-flip-face back">
          <span className="eyebrow mono">Answer</span>
          <span className="fc-flip-text">{finished ? "Come back when the next batch is due." : card?.answer}</span>
        </div>
      </div>
    </button>
    {flipped && !finished && card && <div className="fc-grades">
      {GRADES.map(g => <button key={g.grade} type="button" className="fc-grade-btn" style={{ borderColor: g.color }} disabled={busy} onClick={() => void grade(g.grade)}>
        <span className="fc-grade-label" style={{ color: g.color }}>{g.label}</span>
        <span className="fc-grade-when">{formatInterval(previewInterval(card, g.grade))}</span>
        <span className="fc-grade-key mono">{g.key}</span>
      </button>)}
    </div>}
    <div className="fc-review-foot">
      <span className="fc-review-dots">{cards.map((_, i) => <span key={i} className={i < index ? "done" : ""} />)}</span>
      <span className="fc-review-stats">{seen ? `${Math.round((right / seen) * 100)}% recalled · ${seen} graded` : "Space to flip · 1–4 to grade"}</span>
    </div>
  </section>;
}

function GroupWorkspace({ group, topic, reload, close, reportError, onReview }: {
  group: FlashcardGroup; topic: FlashcardTopic; reload: () => Promise<void>; close: () => void;
  reportError: (value: string) => void; onReview: (cards: Flashcard[], title: string) => void;
}) {
  const [adding, setAdding] = useState(group.flashcards.length === 0); const [editing, setEditing] = useState<Flashcard | null>(null);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === "Escape") { setAdding(false); setEditing(null); } }; addEventListener("keydown", handler); return () => removeEventListener("keydown", handler); }, []);
  const due = group.flashcards.filter(isDue);
  return <section className="fc-workspace"><header className="fc-workspace-header"><button className="fc-back" onClick={close}>← <span>All groups</span></button><div className="fc-workspace-title"><span className="eyebrow">{topic.name}</span><h1>{group.name}</h1><p>{group.description || `${group.flashcards.length} cards in this group`}</p></div>
    <div className="fc-workspace-actions">
      {group.flashcards.length > 0 && <button className="outline" onClick={() => onReview(due.length ? due : group.flashcards, group.name.toUpperCase())}>{due.length ? `Review ${due.length} due` : "Practice deck"}</button>}
      <button className="primary" onClick={() => { setAdding(true); setEditing(null); }}>+ Add flashcard</button>
    </div>
  </header>
    <Reminder group={group} onChanged={reload} reportError={reportError} />
    {(adding || editing) && <CardEditor card={editing || undefined} onCancel={() => { setAdding(false); setEditing(null); }} onSave={async (question, answer) => { try { if (editing) await api.updateCard(editing.id, { question, answer }); else await api.createCard(group.id, { question, answer }); setAdding(false); setEditing(null); await reload(); } catch (error) { reportError(errorMessage(error)); } }} />}
    {group.flashcards.length
      ? <div className="fc-card-list">{group.flashcards.map(card => <CardRow key={card.id} card={card} onEdit={() => { setEditing(card); setAdding(false); }} onDelete={async () => { if (!confirm("Delete this flashcard?")) return; await api.deleteCard(card.id); await reload(); }} />)}</div>
      : !adding && <div className="fc-empty-deck"><div className="fc-empty-icon">+</div><h2>This deck is ready for its first card.</h2><p>Add a question and answer to begin reviewing.</p></div>}
  </section>;
}

export default function FlashcardsView() {
  const params = new URLSearchParams(location.search);
  const [topics, setTopics] = useState<FlashcardTopic[]>([]); const [topicId, setTopicId] = useState(params.get("topic") || ""); const [groupId, setGroupId] = useState(params.get("group") || "");
  const [creatingTopic, setCreatingTopic] = useState(false); const [creatingGroup, setCreatingGroup] = useState(false); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReviewStats>({ retention30d: 0, reviewStreak: 0 });
  const [review, setReview] = useState<{ title: string; cards: Flashcard[] } | null>(null);

  const load = async () => {
    try {
      const [data, reviewStats] = await Promise.all([api.topics(), api.reviewStats()]);
      setTopics(data.topics); setStats(reviewStats);
      setTopicId(current => current && data.topics.some(topic => topic.id === current) ? current : data.topics[0]?.id || "");
    } catch (error) { setError(errorMessage(error)); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const topic = useMemo(() => topics.find(item => item.id === topicId), [topics, topicId]); const group = useMemo(() => topic?.groups.find(item => item.id === groupId), [topic, groupId]);
  useEffect(() => { if (groupId && !topics.some(item => item.groups.some(group => group.id === groupId)) && topics.length) setGroupId(""); }, [groupId, topics]);

  const allCards = useMemo(() => topics.flatMap(t => t.groups.flatMap(g => g.flashcards)), [topics]);
  const dueCards = useMemo(() => allCards.filter(isDue), [allCards]);
  const newCount = useMemo(() => allCards.filter(c => c.reps === 0).length, [allCards]);

  const startReview = (cards: Flashcard[], title: string) => { if (cards.length) setReview({ title, cards }); };

  if (loading) return <div className="loader"><i /></div>;
  if (review) return <ReviewSession title={review.title} cards={review.cards} onExit={() => setReview(null)} onGraded={load} />;
  if (group && topic) return <>{error && <p className="error banner fc-floating-error">{error}</p>}<GroupWorkspace group={group} topic={topic} reload={load} close={() => setGroupId("")} reportError={setError} onReview={startReview} /></>;

  return <section className="fc-library"><header className="workspace-header"><div><span className="eyebrow mono">Recall library</span><h1>Flashcards</h1><p>Organize subjects into focused review groups.</p></div><div className="fc-library-actions"><button className="outline" onClick={() => setCreatingTopic(true)}>+ New topic</button><button className="primary" disabled={!dueCards.length} onClick={() => startReview(dueCards, "ALL DUE CARDS")}>Review {dueCards.length} due</button></div></header>{error && <p className="error banner">{error}</p>}
    <div className="fc-stats-grid">
      <div className="fc-stat-tile"><span className="mono">Due today</span><strong>{dueCards.length}</strong><span>cards</span></div>
      <div className="fc-stat-tile"><span className="mono">New</span><strong>{newCount}</strong><span>unseen</span></div>
      <div className="fc-stat-tile"><span className="mono">Retention</span><strong>{stats.retention30d}%</strong><span>last 30d</span></div>
      <div className="fc-stat-tile"><span className="mono">Review streak</span><strong>{stats.reviewStreak}</strong><span>days</span></div>
    </div>
    {creatingTopic && <form className="fc-inline-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { const result = await api.createTopic({ name: String(data.get("name")), description: String(data.get("description")) }); setCreatingTopic(false); await load(); setTopicId(result.topic.id); } catch (error) { setError(errorMessage(error)); } }}><input name="name" required maxLength={100} placeholder="Topic name" autoFocus /><input name="description" maxLength={500} placeholder="Optional description" /><button className="primary">Create</button><button type="button" className="text-button" onClick={() => setCreatingTopic(false)}>Cancel</button></form>}
    <div className="fc-library-layout"><aside className="fc-topics" aria-label="Flashcard topics">{topics.map(item => {
      const cards = item.groups.flatMap(g => g.flashcards);
      const due = cards.filter(isDue).length;
      return <button key={item.id} className={item.id === topicId ? "active" : ""} onClick={() => { setTopicId(item.id); setGroupId(""); }}>
        <span className="fc-topic-row"><strong>{item.name}</strong>{due > 0 && <span className="fc-due-badge">{due}</span>}</span>
        <span className="fc-topic-meta mono">{item._count.groups} {item._count.groups === 1 ? "group" : "groups"} · {averageMastery(cards)}% mastered</span>
        <span className="fc-mastery-bar"><span style={{ width: `${averageMastery(cards)}%` }} /></span>
      </button>;
    })}{!topics.length && <p>No topics yet.</p>}</aside>
      <main className="fc-groups">{topic ? <><div className="fc-topic-heading"><div><span className="eyebrow">Topic</span><h2>{topic.name}</h2><p>{topic.description || "Create groups for different chapters, levels, or review schedules."}</p></div><div><button className="outline" onClick={() => setCreatingGroup(true)}>+ New group</button><button className="text-button danger" onClick={async () => { if (!confirm(`Delete “${topic.name}” and all its groups?`)) return; await api.deleteTopic(topic.id); await load(); }}>Delete topic</button></div></div>
        {creatingGroup && <form className="fc-inline-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { const result = await api.createGroup(topic.id, { name: String(data.get("name")), description: String(data.get("description")) }); setCreatingGroup(false); await load(); setGroupId(result.group.id); } catch (error) { setError(errorMessage(error)); } }}><input name="name" required maxLength={100} placeholder="Group name, e.g. Arrays" autoFocus /><input name="description" maxLength={500} placeholder="Optional description" /><button className="primary">Create & open</button><button type="button" className="text-button" onClick={() => setCreatingGroup(false)}>Cancel</button></form>}
        <div className="fc-group-grid">{topic.groups.map(item => {
          const due = item.flashcards.filter(isDue);
          const mastery = averageMastery(item.flashcards);
          const cta = item.flashcards.length === 0 ? "Add flashcards" : due.length ? `Review ${due.length} due` : "Practice deck";
          return <article key={item.id} className="fc-group-card">
            <div className="fc-group-meta"><span>{item._count.flashcards} cards</span>{item.reminder && <span>{localTime(item.reminder.timeOfDay)} daily</span>}</div>
            <h3>{item.name}</h3><p>{item.description || "A focused collection of cards."}</p>
            <div className="fc-group-stats mono"><span>Mastery {mastery}%</span><span>{dueLabel(item.flashcards)}</span></div>
            <span className="fc-mastery-bar"><span style={{ width: `${mastery}%` }} /></span>
            <button className="fc-open-group" onClick={() => item.flashcards.length === 0 ? setGroupId(item.id) : startReview(due.length ? due : item.flashcards, item.name.toUpperCase())}><span>{cta}</span><b>→</b></button>
            <button className="text-button fc-manage-link" onClick={() => setGroupId(item.id)}>Manage cards</button>
          </article>;
        })}{!topic.groups.length && <button className="fc-new-group-card" onClick={() => setCreatingGroup(true)}><span>+</span><strong>Create your first group</strong><small>Each group can have its own reminder.</small></button>}</div>
      </> : <div className="fc-empty-deck"><h2>Create a topic to begin.</h2></div>}</main></div>
  </section>;
}
