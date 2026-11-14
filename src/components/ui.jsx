import { useEffect, useRef, useState } from "react";
import { cellVars } from "../theme.js";
import { AlertCircle, Check, ChevronDown, ChevronUp, Edit2, Star, Trash2, X } from "lucide-react";

export function Sheet({ title, theme, onClose, children }) {
  const panel = useRef(null);
  const openedAt = useRef(Date.now());
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    // Move focus into the sheet, and give it back to where it was on close.
    const before = document.activeElement;
    panel.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      before?.focus?.({ preventScroll: true });
    };
  }, []);
  // A double tap on the button that opened the sheet must not close it again.
  const onBackdrop = (e) => e.target === e.currentTarget && Date.now() - openedAt.current > 400 && onClose();
  return (
    <div className="sheet-backdrop" onClick={onBackdrop}>
      <div className="sheet" ref={panel} tabIndex={-1} style={theme} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <span>{title}</span>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PriorityButtons({ urgent, important, onUrgent, onImportant }) {
  return (
    <div className="row mb">
      <button className={`opt urgent${urgent ? " on" : ""}`} aria-pressed={urgent} onClick={onUrgent}>
        <AlertCircle size={15} /> Urgent
      </button>
      <button className={`opt important${important ? " on" : ""}`} aria-pressed={important} onClick={onImportant}>
        <Star size={15} /> Important
      </button>
    </div>
  );
}

export function GroupPicker({ value, onChange, groups, placeholder = "e.g. Finance, Marketing, Health..." }) {
  const same = (g) => g.toLowerCase() === value.trim().toLowerCase();
  return (
    <div className="mb">
      <input className="field" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        aria-label="Group" autoCapitalize="words" enterKeyHint="done" />
      {groups.length > 0 && (
        <div className="chips">
          {groups.map((g) => (
            <button key={g} className={`chip${same(g) ? " on" : ""}`} aria-pressed={same(g)} onClick={() => onChange(g)}>{g}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DeleteConfirm({ onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const shownAt = useRef(0);
  // The confirm button appears under the same finger, so a double tap must not count as "yes".
  const yes = () => Date.now() - shownAt.current > 500 && onDelete();
  return (
    <div className="divider">
      {!confirm ? (
        <button className="danger" onClick={() => { shownAt.current = Date.now(); setConfirm(true); }}><Trash2 size={15} /> Delete Task</button>
      ) : (
        <div className="row">
          <button className="danger solid" onClick={yes}>Yes, Delete</button>
          <button className="ghost" onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// Collapsible Eisenhower cell, dark worlds.
export function MatrixCell({ cfg, tasks }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mcell" style={cellVars(cfg)}>
      <button className="mcell-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>
          <span className="mcell-title">{cfg.label}</span>
          <span className="mcell-desc">{cfg.desc}</span>
        </span>
        <span className="mcell-count">
          {tasks.length}
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>
      {open && (
        <div className="mcell-body">
          {tasks.length === 0
            ? <p className="none">No tasks</p>
            : tasks.map((t) => <div key={t.id} className="mitem">{t.task}</div>)}
        </div>
      )}
    </div>
  );
}

export function TaskRow({ task, onToggle, onEdit }) {
  return (
    <div className={`task-row${task.completed ? " done" : ""}`}>
      <button className="hit" aria-label={task.completed ? "Mark not done" : "Mark done"} aria-pressed={task.completed}
        onClick={() => onToggle("completed")}>
        <span className={`box${task.completed ? " on" : ""}`}>{task.completed && <Check size={14} strokeWidth={3} />}</span>
      </button>
      <span className="task-text">{task.task}</span>
      <div className="row-actions">
        <button className="hit" aria-label="Urgent" aria-pressed={task.urgent} onClick={() => onToggle("urgent")}>
          <span className={`pill${task.urgent ? " urgent" : ""}`}><AlertCircle size={16} /></span>
        </button>
        <button className="hit" aria-label="Important" aria-pressed={task.important} onClick={() => onToggle("important")}>
          <span className={`pill${task.important ? " important" : ""}`}><Star size={16} /></span>
        </button>
        <button className="hit" aria-label="Edit or delete" onClick={onEdit}>
          <span className="pill"><Edit2 size={16} /></span>
        </button>
      </div>
    </div>
  );
}

export function Progress({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { pct, text: `${done} of ${total} done · ${pct}%` };
}
