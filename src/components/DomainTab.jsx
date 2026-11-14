import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { DOMAINS, canonGroup, newId } from "../lib/model.js";
import { getMatrix } from "../lib/matrix.js";
import { MATRIX_CFG, THEME, vars } from "../theme.js";
import { DeleteConfirm, GroupPicker, MatrixCell, PriorityButtons, Progress, Sheet, TaskRow } from "./ui.jsx";

function EditSheet({ task, domain, labels, groupsByDomain, onSave, onDelete, onClose }) {
  const [d, setD] = useState(domain);
  const [u, setU] = useState(task.urgent);
  const [i, setI] = useState(task.important);
  const [txt, setTxt] = useState(task.task);
  const [grp, setGrp] = useState(task.group);
  return (
    <Sheet title="Edit Task" theme={vars(THEME.wip)} onClose={onClose}>
      <div className="label dim">Task Text</div>
      <textarea className="field mb" rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} aria-label="Task text" />
      <div className="label dim">Domain</div>
      <div className="row mb">
        {DOMAINS.map((opt) => (
          <button key={opt} className={`opt${d === opt ? " on" : ""}`} aria-pressed={d === opt} onClick={() => setD(opt)}
            style={{ "--b": THEME[opt].border, "--on": THEME[opt].light, "--fill": THEME[opt].accent }}>
            {labels[opt]}
          </button>
        ))}
      </div>
      <div className="label dim">Group</div>
      <GroupPicker value={grp} onChange={setGrp} groups={groupsByDomain[d]} />
      <div className="label dim">Priority</div>
      <PriorityButtons urgent={u} important={i} onUrgent={() => setU((x) => !x)} onImportant={() => setI((x) => !x)} />
      <div className="row">
        <button className="primary f2" style={{ "--light": THEME[d].light }}
          onClick={() => onSave(d, { task: txt.trim() || task.task, group: canonGroup(grp, groupsByDomain[d]), urgent: u, important: i })}>
          ✓ Save Changes
        </button>
        <button className="ghost" onClick={onClose}>Cancel</button>
      </div>
      <DeleteConfirm onDelete={onDelete} />
    </Sheet>
  );
}

function NewTaskSheet({ domain, label, groups, onAdd, onClose }) {
  const [txt, setTxt] = useState("");
  const [grp, setGrp] = useState("");
  const [u, setU] = useState(false);
  const [i, setI] = useState(false);
  const ok = txt.trim().length > 0;
  return (
    <Sheet title={`New ${label} Task`} theme={vars(THEME[domain])} onClose={onClose}>
      <div className="label dim">Task</div>
      <textarea className="field mb" rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Describe the task..." aria-label="Task" />
      <div className="label dim">Group / Category</div>
      <GroupPicker value={grp} onChange={setGrp} groups={groups} />
      <div className="label dim">Priority</div>
      <PriorityButtons urgent={u} important={i} onUrgent={() => setU((x) => !x)} onImportant={() => setI((x) => !x)} />
      <button className="primary" disabled={!ok}
        onClick={() => { onAdd({ task: txt.trim(), group: canonGroup(grp, groups), urgent: u, important: i }); onClose(); }}>
        ✓ Add Task
      </button>
    </Sheet>
  );
}

export default function DomainTab({ domain, labels, tasks, groupsByDomain, setData, children }) {
  const T = THEME[domain];
  const [editingId, setEditingId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const editing = tasks.find((t) => t.id === editingId) || null;

  const matrix = useMemo(() => getMatrix(tasks), [tasks]);
  const grouped = useMemo(() => {
    const g = new Map();
    tasks.forEach((t) => g.set(t.group, [...(g.get(t.group) || []), t]));
    return [...g.entries()];
  }, [tasks]);

  const toggle = (id, field) =>
    setData((d) => ({ ...d, [domain]: d[domain].map((t) => (t.id === id ? { ...t, [field]: !t[field] } : t)) }));

  const saveEdit = (newDomain, changes) => {
    const id = editingId;
    setData((d) => {
      const old = d[domain].find((t) => t.id === id);
      if (!old) return d;
      const next = { ...old, ...changes };
      if (newDomain === domain) return { ...d, [domain]: d[domain].map((t) => (t.id === id ? next : t)) };
      return { ...d, [domain]: d[domain].filter((t) => t.id !== id), [newDomain]: [...d[newDomain], next] };
    });
    setEditingId(null);
  };

  const deleteTask = () => {
    const id = editingId;
    setData((d) => ({ ...d, [domain]: d[domain].filter((t) => t.id !== id) }));
    setEditingId(null);
  };

  const addTask = (fields) => {
    const fresh = { id: newId(), group: fields.group, task: fields.task, completed: false, urgent: fields.urgent, important: fields.important };
    setData((d) => ({ ...d, [domain]: [...d[domain], fresh] }));
  };

  const p = Progress({ done: tasks.filter((t) => t.completed).length, total: tasks.length });

  return (
    <div className="page" style={vars(T)}>
      {editing && (
        <EditSheet key={editing.id} task={editing} domain={domain} labels={labels} groupsByDomain={groupsByDomain}
          onSave={saveEdit} onDelete={deleteTask} onClose={() => setEditingId(null)} />
      )}
      {showNew && (
        <NewTaskSheet domain={domain} label={labels[domain]} groups={groupsByDomain[domain]} onAdd={addTask} onClose={() => setShowNew(false)} />
      )}

      {children}

      <div className="page-head">
        <div>
          <h2>{labels[domain]}</h2>
          <p className="muted">{p.text}</p>
        </div>
        <div className="right">
          <div className="bar"><i style={{ width: `${p.pct}%` }} /></div>
          <button className="btn-new" onClick={() => setShowNew(true)}><Plus size={15} /> New Task</button>
        </div>
      </div>

      <div className="section">
        <div className="label">Eisenhower Matrix (Active Tasks Only)</div>
        <div className="grid2">
          {MATRIX_CFG.map((cfg) => <MatrixCell key={cfg.key} cfg={cfg} tasks={matrix[cfg.key]} color={T.light} />)}
        </div>
      </div>

      <div>
        <div className="label">All Tasks</div>
        {grouped.length === 0 && <div className="card empty">No tasks yet. Tap “New Task” to add one.</div>}
        {grouped.map(([group, gtasks]) => (
          <div key={group} className="card" style={{ marginBottom: 12 }}>
            <div className="group-head">
              <span>{group}</span>
              <span className="muted">{gtasks.filter((t) => t.completed).length}/{gtasks.length}</span>
            </div>
            {gtasks.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={(f) => toggle(task.id, f)} onEdit={() => setEditingId(task.id)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
