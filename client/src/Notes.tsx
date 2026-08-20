import { FormEvent, useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import { motion } from "framer-motion";
import { api } from "./api";
import type { Note, NoteFolder, NoteTask } from "./types";

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong.";

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const formatWhen = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const compressImage = (dataUrl: string, maxDim: number, quality: number) => new Promise<string>((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(image, 0, 0, width, height);
    resolve(canvas.toDataURL(dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg", quality));
  };
  image.onerror = reject;
  image.src = dataUrl;
});

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

function RichEditor({ value, onChange, reportError }: { value: string; onChange: (html: string) => void; reportError: (message: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [drawing, setDrawing] = useState(false);
  const penDown = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    document.execCommand("styleWithCSS", false, "true");
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value]);

  const emit = () => { if (editorRef.current) onChange(editorRef.current.innerHTML); };

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    emit();
  };

  const insertImage = async (file: File) => {
    try {
      const small = await compressImage(await fileToDataUrl(file), 1400, 0.82);
      editorRef.current?.focus();
      document.execCommand("insertHTML", false, `<img class="nt-inline-image" src="${small}" alt="" />`);
      emit();
    } catch (error) {
      reportError(errorMessage(error));
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) void insertImage(file);
        return;
      }
    }
  };

  const enableDrawing = () => {
    setDrawing(true);
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const editor = editorRef.current;
      if (canvas && editor) {
        canvas.width = editor.offsetWidth;
        canvas.height = editor.offsetHeight;
      }
    });
  };

  const insertDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, `<img class="nt-inline-image" src="${dataUrl}" alt="Drawing" />`);
    emit();
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setDrawing(false);
  };

  const stroke = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = { x: clientX - rect.left, y: clientY - rect.top };
    const context = canvas.getContext("2d")!;
    if (lastPoint.current) {
      context.strokeStyle = "#2f5f86";
      context.lineWidth = 3;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      context.moveTo(lastPoint.current.x, lastPoint.current.y);
      context.lineTo(point.x, point.y);
      context.stroke();
    }
    lastPoint.current = point;
  };

  return <div className={`nt-editor-wrap${drawing ? " is-drawing" : ""}`}>
    <div className="nt-toolbar" onMouseDown={event => event.preventDefault()}>
      {[
        { cmd: "bold", title: "Bold", label: "B" },
        { cmd: "italic", title: "Italic", label: "I" },
        { cmd: "underline", title: "Underline", label: "U" },
        { cmd: "strikeThrough", title: "Strikethrough", label: "S" },
      ].map(tool => <button key={tool.cmd} className="nt-tool" type="button" title={tool.title} onClick={() => exec(tool.cmd)}><b>{tool.label}</b></button>)}
      <button className="nt-tool" type="button" title="Highlight" onClick={() => exec("hiliteColor", "#ffe066")}><span className="nt-tool-highlight">Highlight</span></button>
      <button className="nt-tool" type="button" title="Bullet list" onClick={() => exec("insertUnorderedList")}>•</button>
      <button className="nt-tool" type="button" title="Numbered list" onClick={() => exec("insertOrderedList")}>1.</button>
      <button className="nt-tool" type="button" title="Heading" onClick={() => exec("formatBlock", "<h2>")}>H2</button>
      <button className="nt-tool" type="button" title="Subheading" onClick={() => exec("formatBlock", "<h3>")}>H3</button>
      <button className="nt-tool" type="button" title="Quote" onClick={() => exec("formatBlock", "<blockquote>")}>Quote</button>
      <button className="nt-tool" type="button" title="Link" onClick={() => { const url = window.prompt("Link URL"); if (url) exec("createLink", url); }}>Link</button>
      <button className="nt-tool" type="button" title="Clear formatting" onClick={() => exec("removeFormat")}>Clear</button>
      <span className="nt-toolbar-sep" />
      <button className="nt-tool" type="button" title="Add image" onClick={() => fileRef.current?.click()}>Image</button>
      {drawing
        ? <>
            <button className="nt-tool active" type="button" title="Drawing mode" onClick={() => setDrawing(false)}>Draw on</button>
            <button className="nt-tool" type="button" title="Insert drawing into note" onClick={insertDrawing}>Insert drawing</button>
            <button className="nt-tool" type="button" title="Clear drawing" onClick={() => { const canvas = canvasRef.current; canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height); }}>Clear</button>
          </>
        : <button className="nt-tool" type="button" title="Draw on the note" onClick={enableDrawing}>Draw</button>}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={event => { const file = event.target.files?.[0]; if (file) void insertImage(file); event.target.value = ""; }} />
    </div>
    <div className="nt-editor-wrap-inner">
      <div
        ref={editorRef}
        className="nt-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onPaste={onPaste}
        data-placeholder="Write your note… type, paste text or images, highlight, draw."
      />
      {drawing && <canvas ref={canvasRef} className="nt-draw-canvas" onPointerDown={event => { penDown.current = true; lastPoint.current = null; event.currentTarget.setPointerCapture(event.pointerId); stroke(event.clientX, event.clientY); }} onPointerMove={event => { if (penDown.current) stroke(event.clientX, event.clientY); }} onPointerUp={() => { penDown.current = false; lastPoint.current = null; }} />}
    </div>
  </div>;
}

function TaskList({ tasks, onToggle, onDelete, onAdd }: { tasks: NoteTask[]; onToggle: (task: NoteTask) => void; onDelete: (task: NoteTask) => void; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };
  return <div className="nt-tasks">
    <span className="eyebrow">Tasks</span>
    <form className="nt-task-form" onSubmit={submit}><input value={text} onChange={event => setText(event.target.value)} placeholder="Add a task for this note…" maxLength={2000} /><button className="primary" type="submit">Add</button></form>
    {tasks.length === 0 && <p className="nt-tasks-empty">No tasks yet.</p>}
    <ul>{tasks.map(task => <li key={task.id} className={task.done ? "done" : ""}><label><input type="checkbox" checked={task.done} onChange={() => onToggle(task)} /><span>{task.text}</span></label><button type="button" className="nt-task-delete" onClick={() => onDelete(task)} aria-label="Delete task">×</button></li>)}</ul>
  </div>;
}

function NoteEditor({ note, reload, close, pinned, onPin, onUnpin, reportError }: { note: Note; reload: () => Promise<void>; close: () => void; pinned: boolean; onPin: (note: Note) => void; onUnpin: () => void; reportError: (message: string) => void }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tasks, setTasks] = useState<NoteTask[]>(note.tasks);
  const [remindAt, setRemindAt] = useState(note.remindAt);
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(note.title);
  const contentRef = useRef(note.content);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    titleRef.current = title;
    contentRef.current = content;
  }, [title, content]);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const persist = () => {
    setSaved(false);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await api.updateNote(note.id, { title: titleRef.current, content: contentRef.current });
        setSaved(true);
        void reload();
      } catch (error) {
        reportError(errorMessage(error));
      }
    }, 600);
  };

  const deleteNote = async () => {
    if (!confirm("Delete this note and all its tasks?")) return;
    setSaving(true);
    try {
      await api.deleteNote(note.id);
      if (pinned) onUnpin();
      await reload();
      close();
    } catch (error) {
      reportError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const setReminder = async (value: string) => {
    const next = value ? new Date(value).toISOString() : null;
    try {
      await api.updateNote(note.id, { remindAt: next });
      setRemindAt(next);
      await reload();
    } catch (error) {
      reportError(errorMessage(error));
    }
  };

  return <section className="nt-workspace">
    <header className="nt-workspace-header">
      <button className="fc-back" onClick={close}>{"<"} <span>All notes</span></button>
      <button className={pinned ? "nt-sticky-toggle active" : "nt-sticky-toggle"} onClick={() => pinned ? onUnpin() : onPin(note)} title={pinned ? "Sticky note is floating — click to remove" : "Pin as a floating sticky note"}><span>{pinned ? "Sticky on" : "Pin sticky"}</span></button>
    </header>
    {pinned && <div className="nt-sticky-hint">This note is pinned as a floating window. Drag it anywhere from its header; close it from the sticky itself.</div>}
    <div className="nt-title-row">
      <input className="nt-title-input" value={title} onChange={event => { setTitle(event.target.value); persist(); }} placeholder="Untitled" maxLength={300} />
      <span className={`nt-save-state${saved ? "" : " unsaved"}`}>{saving ? "Working…" : saved ? "Saved" : "Saving…"}</span>
    </div>
    <RichEditor value={content} onChange={html => { setContent(html); persist(); }} reportError={reportError} />
    <div className="nt-panels">
      <TaskList tasks={tasks} onToggle={async task => { try { const result = await api.toggleTask(task.id, !task.done); setTasks(current => current.map(item => item.id === task.id ? result.task : item)); } catch (error) { reportError(errorMessage(error)); } }} onDelete={async task => { try { await api.deleteTask(task.id); setTasks(current => current.filter(item => item.id !== task.id)); } catch (error) { reportError(errorMessage(error)); } }} onAdd={async text => { try { const result = await api.createTask(note.id, text); setTasks(current => [...current, result.task]); } catch (error) { reportError(errorMessage(error)); } }} />
      <div className="nt-reminder">
        <span className="eyebrow">Reminder</span>
        <p>Get a notification for this note at a chosen time.</p>
        <input type="datetime-local" value={remindAt ? toLocalInput(remindAt) : ""} onChange={event => void setReminder(event.target.value)} />
        {remindAt && <div className="nt-reminder-status">{note.remindedAt ? <>Reminder delivered on {formatWhen(note.remindedAt)}</> : new Date(remindAt) < new Date() ? "This reminder time has already passed." : <>Will notify {formatWhen(remindAt)}</>}</div>}
        {remindAt && <button type="button" className="text-button danger" onClick={() => void setReminder("")}>Remove reminder</button>}
      </div>
    </div>
    <div className="nt-delete-row"><button type="button" className="text-button danger" disabled={saving} onClick={() => void deleteNote()}>Delete note</button></div>
  </section>;
}

function NoteCard({ note, onOpen, onPin, onDelete, pinned }: { note: Note; onOpen: () => void; onPin: () => void; onDelete: () => void; pinned: boolean }) {
  const done = note.tasks.filter(task => task.done).length;
  const progress = note.tasks.length ? Math.round((done / note.tasks.length) * 100) : 0;
  const snippet = stripHtml(note.content);
  return <motion.article className="nt-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
    <div className="nt-card-top">
      <span className="nt-card-date">{new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      <button className={pinned ? "nt-card-pin on" : "nt-card-pin"} onClick={onPin} title={pinned ? "Sticky is on — click to remove" : "Pin as floating sticky"} aria-label="Pin note">{pinned ? "Pinned" : "Pin"}</button>
    </div>
    <h3>{note.title || "Untitled"}</h3>
    <p className="nt-card-snippet">{snippet ? snippet.slice(0, 120) + (snippet.length > 120 ? "…" : "") : "No content yet."}</p>
    <div className="nt-card-meta">
      {note.tasks.length > 0 && <span>{done}/{note.tasks.length} tasks</span>}
      {note.remindAt && !note.remindedAt && <span>Reminder {formatWhen(note.remindAt)}</span>}
      {note.remindedAt && <span>Reminded</span>}
    </div>
    {note.tasks.length > 0 && <span className="nt-card-progress"><span style={{ width: `${progress}%` }} /></span>}
    <div className="nt-card-actions">
      <button className="nt-card-open" onClick={onOpen}>Open note &gt;</button>
      <button className="text-button danger" onClick={onDelete}>Delete</button>
    </div>
  </motion.article>;
}

export default function NotesView({ pinnedNoteId, onPin, onUnpin }: { pinnedNoteId: string | null; onPin: (note: Note) => void; onUnpin: () => void }) {
  const params = new URLSearchParams(location.search);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [folderId, setFolderId] = useState(params.get("folder") || "");
  const [noteId, setNoteId] = useState(params.get("note") || "");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingNote, setCreatingNote] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.notes();
      setFolders(data.folders);
      const targetNote = params.get("note");
      const targetFolder = targetNote ? data.folders.find(folder => folder.notes.some(note => note.id === targetNote)) : undefined;
      setFolderId(current => {
        if (targetFolder) return targetFolder.id;
        const initialFolder = params.get("folder");
        if (initialFolder && data.folders.some(folder => folder.id === initialFolder)) return initialFolder;
        if (current && data.folders.some(folder => folder.id === current)) return current;
        return data.folders[0]?.id || "";
      });
      if (targetNote) setNoteId(targetNote);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const folder = useMemo(() => folders.find(item => item.id === folderId), [folders, folderId]);
  const notes = folder?.notes ?? [];
  const note = useMemo(() => notes.find(item => item.id === noteId), [notes, noteId]);

  useEffect(() => {
    if (noteId && !notes.some(item => item.id === noteId) && notes.length) setNoteId("");
  }, [noteId, notes]);

  const deleteFolder = async (target: NoteFolder) => {
    if (!confirm(`Delete folder “${target.name}” and all its notes?`)) return;
    try {
      await api.deleteFolder(target.id);
      if (folderId === target.id) setFolderId("");
      await load();
    } catch (error) {
      setError(errorMessage(error));
    }
  };

  if (loading) return <div className="loader"><i /></div>;

  if (note) return <>{error && <p className="error banner fc-floating-error">{error}</p>}<NoteEditor key={note.id} note={note} reload={load} close={() => setNoteId("")} pinned={note.id === pinnedNoteId} onPin={onPin} onUnpin={onUnpin} reportError={setError} /></>;

  return <section className="nt-library">
    <header className="workspace-header"><div><span className="eyebrow">Thoughts, captured</span><h1>Notes</h1><p>Organize notes into folders. Pin any note as a floating sticky while you work.</p></div><button className="primary" onClick={() => setCreatingNote(true)} disabled={!folder}>+ New note</button></header>
    {error && <p className="error banner">{error}</p>}
    {creatingFolder && <form className="nt-inline-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { const result = await api.createFolder(String(data.get("name"))); setCreatingFolder(false); await load(); setFolderId(result.folder.id); } catch (error) { setError(errorMessage(error)); } }}><input name="name" required maxLength={100} placeholder="Folder name, e.g. Work" autoFocus /><button className="primary">Create folder</button><button type="button" className="text-button" onClick={() => setCreatingFolder(false)}>Cancel</button></form>}
    {creatingNote && folder && <form className="nt-inline-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { const result = await api.createNote(folder.id, String(data.get("title")) || "Untitled"); setCreatingNote(false); await load(); setNoteId(result.note.id); } catch (error) { setError(errorMessage(error)); } }}><input name="title" maxLength={300} placeholder="Note title (optional)" autoFocus /><button className="primary">Create note</button><button type="button" className="text-button" onClick={() => setCreatingNote(false)}>Cancel</button></form>}
    <div className="nt-layout">
      <aside className="nt-folders">
        {folders.map(item => {
          const totalTasks = item.notes.reduce((sum, note) => sum + note.tasks.length, 0);
          const doneTasks = item.notes.reduce((sum, note) => sum + note.tasks.filter(task => task.done).length, 0);
          const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
          return <div key={item.id} className="nt-folder-row">
            <button className={item.id === folderId ? "active" : ""} onClick={() => { setFolderId(item.id); setNoteId(""); }}>
              <strong>{item.name}</strong><span>{item.notes.length} {item.notes.length === 1 ? "note" : "notes"}</span>
              <span className="nt-folder-progress"><span style={{ width: `${progress}%` }} /></span>
            </button>
          </div>;
        })}
        <button className="nt-new-folder" onClick={() => { setCreatingFolder(true); setRenaming(false); }}>+ New folder</button>
        {!folders.length && <p className="nt-folders-empty">Folders keep your notes organized. Create your first one.</p>}
      </aside>
      <main className="nt-notes">
        {folder ? <><div className="nt-heading-row"><div><span className="eyebrow">Folder</span><h2>{folder.name}</h2></div><div className="nt-folder-actions"><button className="nt-folder-action rename" onClick={() => setRenaming(value => !value)}>Rename</button><button className="nt-folder-action delete" onClick={() => void deleteFolder(folder)}>Delete</button></div></div>
          {renaming && <form className="nt-inline-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { await api.renameFolder(folder.id, String(data.get("name"))); setRenaming(false); await load(); } catch (error) { setError(errorMessage(error)); } }}><input name="name" required maxLength={100} defaultValue={folder.name} autoFocus /><button className="primary">Rename</button><button type="button" className="text-button" onClick={() => setRenaming(false)}>Cancel</button></form>}
          {notes.length ? <div className="nt-cards">{notes.map(item => <NoteCard key={item.id} note={item} pinned={item.id === pinnedNoteId} onOpen={() => setNoteId(item.id)} onPin={() => item.id === pinnedNoteId ? onUnpin() : onPin(item)} onDelete={async () => { if (!confirm(`Delete note “${item.title || "Untitled"}”?`)) return; try { if (item.id === pinnedNoteId) onUnpin(); await api.deleteNote(item.id); await load(); } catch (error) { setError(errorMessage(error)); } }} />)}</div>
            : <div className="nt-empty"><h2>This folder is empty.</h2><p>Create a note to start capturing ideas.</p></div>}
        </> : <div className="nt-empty"><h2>Create a folder to begin.</h2><p>Notes live inside folders, each with its own cards.</p></div>}
      </main>
    </div>
  </section>;
}
