import { useMemo, useState } from "react";
import { AI_KEYS, newId } from "../lib/model.js";
import { getMatrix } from "../lib/matrix.js";
import { AI_SUB, MATRIX_CFG, vars } from "../theme.js";
import { DeleteConfirm, MatrixCell, PriorityButtons, Progress, Sheet, TaskRow } from "./ui.jsx";

function AiEditSheet({ task, theme, onSave, onDelete, onClose }) {
  const [u, setU] = useState(task.urgent);
  const [i, setI] = useState(task.important);
  const [txt, setTxt] = useState(task.task);
  return (
    <Sheet title="Edit AI Task" theme={theme} onClose={onClose}>
      <div className="label dim">Task Text</div>
      <textarea className="field mb" rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} />
      <div className="label dim">Priority</div>
      <PriorityButtons urgent={u} important={i} onUrgent={() => setU((x) => !x)} onImportant={() => setI((x) => !x)} />
      <div className="row">
        <button className="primary f2" onClick={() => onSave({ task: txt.trim() || task.task, urgent: u, important: i })}>✓ Save Changes</button>
        <button className="ghost" onClick={onClose}>Cancel</button>
      </div>
      <DeleteConfirm onDelete={onDelete} />
    </Sheet>
  );
}

export default function AiTab({ ai, labels, setData }) {
  const [sub, setSub] = useState("ai1");
  const [editingId, setEditingId] = useState(null);
  const [newTxt, setNewTxt] = useState("");
  const [newU, setNewU] = useState(false);
  const [newI, setNewI] = useState(false);
  const S = AI_SUB[sub];
  const tasks = ai[sub];
  const editing = tasks.find((t) => t.id === editingId) || null;
  const matrix = useMemo(() => getMatrix(tasks), [tasks]);

  const setList = (fn) => setData((d) => ({ ...d, ai: { ...d.ai, [sub]: fn(d.ai[sub]) } }));
  const toggle = (id, field) => setList((l) => l.map((t) => (t.id === id ? { ...t, [field]: !t[field] } : t)));
  const saveEdit = (changes) => {
    const id = editingId;
    setList((l) => l.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    setEditingId(null);
  };
  const deleteTask = () => {
    const id = editingId;
    setList((l) => l.filter((t) => t.id !== id));
    setEditingId(null);
  };
  const addTask = () => {
    const text = newTxt.trim();
    if (!text) return;
    const fresh = { id: newId(), task: text, completed: false, urgent: newU, important: newI };
    setList((l) => [...l, fresh]);
    setNewTxt(""); setNewU(false); setNewI(false);
  };

  const p = Progress({ done: tasks.filter((t) => t.completed).length, total: tasks.length });

  return (
    <div style={{ ...vars(S), background: "#080810", minHeight: "100%" }}>
      {editing && (
        <AiEditSheet key={editing.id} task={editing} theme={vars(S)} onSave={saveEdit} onDelete={deleteTask} onClose={() => setEditingId(null)} />
      )}

      <div className="subtabs">
        {AI_KEYS.map((k) => (
          <button key={k} className={`tab${sub === k ? " on" : ""}`} style={{ "--c": AI_SUB[k].light }}
            onClick={() => { setSub(k); setEditingId(null); }}>
            {labels[k]}
          </button>
        ))}
      </div>

      <div className="page" style={{ background: "transparent" }}>
        <div className="page-head">
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 18 }}>{labels.ai} · {labels[sub]}</h2>
            <p className="muted">{p.text}</p>
          </div>
          <div className="right"><div className="bar"><i style={{ width: `${p.pct}%` }} /></div></div>
        </div>

        <div className="section">
          <div className="label">Eisenhower Matrix</div>
          <div className="grid2">
            {MATRIX_CFG.map((cfg) => <MatrixCell key={cfg.key} cfg={cfg} tasks={matrix[cfg.key]} color={S.light} />)}
          </div>
        </div>

        <div className="card pad section">
          <div className="label">+ Add New Task</div>
          <textarea className="field" rows={2} value={newTxt} onChange={(e) => setNewTxt(e.target.value)} placeholder="Type task..."
            style={{ marginBottom: 10 }} />
          <PriorityButtons urgent={newU} important={newI} onUrgent={() => setNewU((x) => !x)} onImportant={() => setNewI((x) => !x)} />
          <button className="primary" disabled={!newTxt.trim()} onClick={addTask}>✓ Add to {labels[sub]}</button>
        </div>

        <div className="label">All Tasks</div>
        {tasks.length === 0 ? (
          <div className="card empty">No tasks yet. Add one above.</div>
        ) : (
          <div className="card">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={(f) => toggle(task.id, f)} onEdit={() => setEditingId(task.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
