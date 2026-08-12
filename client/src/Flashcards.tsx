import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { api } from "./api";
import type { Flashcard, FlashcardGroup, FlashcardTopic } from "./types";

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong.";
const localTime = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hour, minute));
};
const urlBase64ToUint8Array = (value: string) => {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob((value + padding).replace(/-/g, "+").replace(/_/g, "/")), character => character.charCodeAt(0));
};

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

function SwipeCard({ card, flipped, onFlip, onSwipe }: { card: Flashcard; flipped: boolean; onFlip: () => void; onSwipe: (direction: number) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  return <motion.button
    key={card.id}
    className="fc-swipe-card"
    style={{ x, rotate }}
    drag="x"
    dragConstraints={{ left: 0, right: 0 }}
    dragElastic={0.65}
    dragMomentum={false}
    onDragEnd={(_event, info) => { if (Math.abs(info.offset.x) > 85) onSwipe(info.offset.x > 0 ? -1 : 1); }}
    onTap={onFlip}
    initial={{ opacity: 0, scale: 0.94 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ type: "spring", stiffness: 320, damping: 30 }}
  >
    <motion.div className="fc-flip" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.45, ease: "easeInOut" }}>
      <div className="fc-face fc-face-front"><span className="eyebrow">Question</span><strong>{card.question}</strong><small>Tap to reveal answer</small></div>
      <div className="fc-face fc-face-back"><span className="eyebrow">Answer</span><strong>{card.answer}</strong><small>Tap to show question</small></div>
    </motion.div>
  </motion.button>;
}

function SwipeDeck({ cards, onEdit, onDelete }: { cards: Flashcard[]; onEdit: (card: Flashcard) => void; onDelete: (card: Flashcard) => Promise<void> }) {
  const [index, setIndex] = useState(0); const [flipped, setFlipped] = useState(false);
  useEffect(() => { if (index >= cards.length) setIndex(Math.max(0, cards.length - 1)); }, [cards.length, index]);
  const card = cards[index];
  const move = (direction: number) => { if (cards.length < 2) return; setIndex(current => (current + direction + cards.length) % cards.length); setFlipped(false); };
  if (!card) return <div className="fc-empty-deck"><div className="fc-empty-icon">+</div><h2>This deck is ready for its first card.</h2><p>Add a question and answer to begin reviewing.</p></div>;
  const next = cards[(index + 1) % cards.length];
  return <div className="fc-study-area"><div className="fc-counter"><span>{index + 1} / {cards.length}</span><span>Swipe or use arrow keys</span></div><div className="fc-stack">
    {cards.length > 1 && <div className="fc-swipe-card fc-card-behind"><span>{next.question}</span></div>}
    <AnimatePresence initial={false} mode="popLayout">
      <SwipeCard key={card.id} card={card} flipped={flipped} onFlip={() => setFlipped(value => !value)} onSwipe={move} />
    </AnimatePresence>
  </div><div className="fc-swipe-actions"><button className="fc-round" onClick={() => move(-1)} aria-label="Previous card">←</button><button className="outline" onClick={() => setFlipped(value => !value)}>{flipped ? "Question" : "Reveal answer"}</button><button className="fc-round" onClick={() => move(1)} aria-label="Next card">→</button></div><div className="fc-card-tools"><button className="text-button" onClick={() => onEdit(card)}>Edit card</button><button className="text-button danger" onClick={() => void onDelete(card)}>Delete card</button></div></div>;
}

function GroupWorkspace({ group, topic, reload, close, reportError }: { group: FlashcardGroup; topic: FlashcardTopic; reload: () => Promise<void>; close: () => void; reportError: (value: string) => void }) {
  const [adding, setAdding] = useState(group.flashcards.length === 0); const [editing, setEditing] = useState<Flashcard | null>(null);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === "Escape") { setAdding(false); setEditing(null); } }; addEventListener("keydown", handler); return () => removeEventListener("keydown", handler); }, []);
  return <section className="fc-workspace"><header className="fc-workspace-header"><button className="fc-back" onClick={close}>← <span>All groups</span></button><div className="fc-workspace-title"><span className="eyebrow">{topic.name}</span><h1>{group.name}</h1><p>{group.description || `${group.flashcards.length} cards in this group`}</p></div><button className="primary" onClick={() => { setAdding(true); setEditing(null); }}>+ Add flashcard</button></header>
    <Reminder group={group} onChanged={reload} reportError={reportError} />
    {(adding || editing) && <CardEditor card={editing || undefined} onCancel={() => { setAdding(false); setEditing(null); }} onSave={async (question, answer) => { try { if (editing) await api.updateCard(editing.id, { question, answer }); else await api.createCard(group.id, { question, answer }); setAdding(false); setEditing(null); await reload(); } catch (error) { reportError(errorMessage(error)); } }} />}
    <SwipeDeck cards={group.flashcards} onEdit={(card) => { setEditing(card); setAdding(false); }} onDelete={async (card) => { if (!confirm("Delete this flashcard?")) return; await api.deleteCard(card.id); await reload(); }} />
  </section>;
}

export default function FlashcardsView() {
  const params = new URLSearchParams(location.search);
  const [topics, setTopics] = useState<FlashcardTopic[]>([]); const [topicId, setTopicId] = useState(params.get("topic") || ""); const [groupId, setGroupId] = useState(params.get("group") || "");
  const [creatingTopic, setCreatingTopic] = useState(false); const [creatingGroup, setCreatingGroup] = useState(false); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = async () => { try { const data = await api.topics(); setTopics(data.topics); setTopicId(current => current && data.topics.some(topic => topic.id === current) ? current : data.topics[0]?.id || ""); } catch (error) { setError(errorMessage(error)); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const topic = useMemo(() => topics.find(item => item.id === topicId), [topics, topicId]); const group = useMemo(() => topic?.groups.find(item => item.id === groupId), [topic, groupId]);
  useEffect(() => { if (groupId && !topics.some(item => item.groups.some(group => group.id === groupId)) && topics.length) setGroupId(""); }, [groupId, topics]);
  if (loading) return <div className="loader"><i /></div>;
  if (group && topic) return <>{error && <p className="error banner fc-floating-error">{error}</p>}<GroupWorkspace group={group} topic={topic} reload={load} close={() => setGroupId("")} reportError={setError} /></>;
  return <section className="fc-library"><header className="workspace-header"><div><span className="eyebrow">Recall library</span><h1>Flashcards</h1><p>Organize subjects into focused review groups.</p></div><button className="primary" onClick={() => setCreatingTopic(true)}>+ New topic</button></header>{error && <p className="error banner">{error}</p>}
    {creatingTopic && <form className="fc-inline-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { const result = await api.createTopic({ name: String(data.get("name")), description: String(data.get("description")) }); setCreatingTopic(false); await load(); setTopicId(result.topic.id); } catch (error) { setError(errorMessage(error)); } }}><input name="name" required maxLength={100} placeholder="Topic name" autoFocus /><input name="description" maxLength={500} placeholder="Optional description" /><button className="primary">Create</button><button type="button" className="text-button" onClick={() => setCreatingTopic(false)}>Cancel</button></form>}
    <div className="fc-library-layout"><aside className="fc-topics" aria-label="Flashcard topics">{topics.map(item => <button key={item.id} className={item.id === topicId ? "active" : ""} onClick={() => { setTopicId(item.id); setGroupId(""); }}><strong>{item.name}</strong><span>{item._count.groups} {item._count.groups === 1 ? "group" : "groups"}</span></button>)}{!topics.length && <p>No topics yet.</p>}</aside>
      <main className="fc-groups">{topic ? <><div className="fc-topic-heading"><div><span className="eyebrow">Topic</span><h2>{topic.name}</h2><p>{topic.description || "Create groups for different chapters, levels, or review schedules."}</p></div><div><button className="outline" onClick={() => setCreatingGroup(true)}>+ New group</button><button className="text-button danger" onClick={async () => { if (!confirm(`Delete “${topic.name}” and all its groups?`)) return; await api.deleteTopic(topic.id); await load(); }}>Delete topic</button></div></div>
        {creatingGroup && <form className="fc-inline-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { const result = await api.createGroup(topic.id, { name: String(data.get("name")), description: String(data.get("description")) }); setCreatingGroup(false); await load(); setGroupId(result.group.id); } catch (error) { setError(errorMessage(error)); } }}><input name="name" required maxLength={100} placeholder="Group name, e.g. Arrays" autoFocus /><input name="description" maxLength={500} placeholder="Optional description" /><button className="primary">Create & open</button><button type="button" className="text-button" onClick={() => setCreatingGroup(false)}>Cancel</button></form>}
        <div className="fc-group-grid">{topic.groups.map(item => <article key={item.id} className="fc-group-card"><div className="fc-group-meta"><span>{item._count.flashcards} cards</span>{item.reminder && <span>{localTime(item.reminder.timeOfDay)} daily</span>}</div><h3>{item.name}</h3><p>{item.description || "A focused collection of cards."}</p><button className="fc-open-group" onClick={() => setGroupId(item.id)}><span>{item.flashcards.length ? "Review flashcards" : "Add flashcards"}</span><b>→</b></button></article>)}{!topic.groups.length && <button className="fc-new-group-card" onClick={() => setCreatingGroup(true)}><span>+</span><strong>Create your first group</strong><small>Each group can have its own reminder.</small></button>}</div>
      </> : <div className="fc-empty-deck"><h2>Create a topic to begin.</h2></div>}</main></div>
  </section>;
}
