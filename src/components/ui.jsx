import { useEffect, useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronUp, Edit2, Star, Trash2, X } from "lucide-react";

export function Sheet({ title, theme, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={theme} role="dialog" aria-modal="true" aria-label={title}>
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
      <button className={`opt${urgent ? " on" : ""}`} aria-pressed={urgent} onClick={onUrgent}
        style={{ "--on": "#ef4444", "--fill": "rgba(239,68,68,0.15)", "--txt": "#f87171" }}>
        <AlertCircle size={15} /> Urgent
      </button>
      <button className={`opt${important ? " on" : ""}`} aria-pressed={important} onClick={onImportant}
        style={{ "--on": "#f59e0b", "--fill": "rgba(245,158,11,0.15)", "--txt": "#fcd34d" }}>
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
            <button key={g} className={`chip${same(g) ? " on" : ""}`} onClick={() => onChange(g)}>{g}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DeleteConfirm({ onDelete }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="divider">
      {!confirm ? (
        <button className="danger" onClick={() => setConfirm(true)}><Trash2 size={15} /> Delete Task</button>
      ) : (
        <div className="row">
          <button className="danger solid" onClick={onDelete}>Yes, Delete</button>
          <button className="ghost" onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// Collapsible Eisenhower cell, dark worlds.
export function MatrixCell({ cfg, tasks, color }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mcell" style={{ "--mb": `${cfg.border}99`, "--mc": cfg.onDark, "--ic": color }}>
      <button className="mcell-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>
          <span className="mcell-title">{cfg.label}</span>
          <span className="mcell-desc">{cfg.desc}</span>
        </span>
        <span className="mcell-count">
          {tasks.length}
          {open ? <ChevronUp size={15} color="#9aa3b5" /> : <ChevronDown size={15} color="#9aa3b5" />}
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
