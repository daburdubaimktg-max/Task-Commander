import { useRef } from "react";
import { Inbox } from "lucide-react";
import { AI_KEYS, DEFAULT_GROUP, DOMAINS, canonGroup, newId } from "../lib/model.js";
import { splitTasks } from "../lib/splitTasks.js";
import { suggestGroup } from "../lib/suggestGroup.js";
import { THEME, themeOf, vars } from "../theme.js";
import { GroupPicker, PriorityButtons } from "./ui.jsx";

function PasteBox({ text, setText, onAdd }) {
  const items = splitTasks(text);
  return (
    <div className="card pad section">
      <div className="label">Add tasks</div>
      <textarea className="field" rows={3} value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Paste or type tasks — one per line, or a numbered list" aria-label="Paste or type tasks" />
      <button className="primary" style={{ marginTop: 10 }} disabled={items.length === 0}
        onClick={() => { onAdd(items); setText(""); }}>
        + Add to WIP{items.length > 1 ? ` (${items.length} tasks)` : ""}
      </button>
    </div>
  );
}

function WipCard({ item, labels, groupsByDomain, onChange, onSend, onDiscard }) {
  const dest = item.domain;
  const isDomain = DOMAINS.includes(dest);
  // A group the user typed is kept on the item (so it survives a tab switch or reload);
  // until then the field shows the suggestion.
  const group = item.group ?? (isDomain ? suggestGroup(item.task, groupsByDomain[dest]) : "");
  const setGroup = (g) => onChange({ group: g });
  const destLabel = !dest ? "" : isDomain ? labels[dest] : `AI · ${labels[dest]}`;
  const pick = (opt) => onChange({ domain: opt });
  const destButton = (opt) => {
    const t = themeOf(opt);
    return (
      <button key={opt} className={`opt dest${dest === opt ? " on" : ""}`} aria-pressed={dest === opt} onClick={() => pick(opt)} style={vars(t)}>
        {labels[opt]}
      </button>
    );
  };
  return (
    <div className="card pad" style={{ marginBottom: 14 }}>
      <p className="wip-text">{item.task}</p>

      <div className="label dim">Step 1 — Domain</div>
      <div className="row" style={{ marginBottom: 8 }}>{DOMAINS.map(destButton)}</div>
      <div className="grid2 mb">{AI_KEYS.map(destButton)}</div>

      {isDomain && (
        <>
          <div className="label dim">Group</div>
          <GroupPicker value={group} onChange={setGroup} groups={groupsByDomain[dest]} placeholder={DEFAULT_GROUP} />
        </>
      )}

      <div className="label dim">Step 2 — Priority</div>
      <PriorityButtons urgent={item.urgent} important={item.important}
        onUrgent={() => onChange({ urgent: !item.urgent })} onImportant={() => onChange({ important: !item.important })} />

      <div className="row">
        <button className="primary f2" disabled={!dest} style={dest ? vars(themeOf(dest)) : undefined}
          onClick={() => onSend(isDomain ? canonGroup(group, groupsByDomain[dest]) : "")}>
          {dest ? `✓ Send to ${destLabel}` : "Select a domain first"}
        </button>
        <button className="ghost" onClick={onDiscard}>✕ Discard</button>
      </div>
    </div>
  );
}

export default function WipTab({ items, labels, groupsByDomain, setData, draft, setDraft }) {
  const T = THEME.wip;
  const lastSend = useRef(0);

  const addItems = (texts) => {
    const fresh = texts.map((task) => ({ id: newId(), task, domain: null, urgent: false, important: false }));
    setData((d) => ({ ...d, wip: [...d.wip, ...fresh] }));
  };
  const change = (id, patch) => setData((d) => ({ ...d, wip: d.wip.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const discard = (id) => setData((d) => ({ ...d, wip: d.wip.filter((p) => p.id !== id) }));

  // The item leaves WIP and lands in its list (and so in the matrices) in one step.
  const send = (item, group) => {
    const dest = item.domain;
    if (!dest) return;
    // After a Send the next card slides up under the same finger: ignore a second tap that follows at once.
    if (Date.now() - lastSend.current < 500) return;
    lastSend.current = Date.now();
    const base = { id: newId(), task: item.task, completed: false, urgent: item.urgent, important: item.important };
    setData((d) => {
      if (!d.wip.some((p) => p.id === item.id)) return d;
      const wip = d.wip.filter((p) => p.id !== item.id);
      if (DOMAINS.includes(dest)) {
        const { id, ...rest } = base;
        return { ...d, wip, [dest]: [...d[dest], { id, group, ...rest }] };
      }
      return { ...d, wip, ai: { ...d.ai, [dest]: [...d.ai[dest], base] } };
    });
  };

  return (
    <div className="page" style={vars(T)}>
      <h2 className="page-title">WIP</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Assign domain + priority, then Send. Task disappears from here and goes live instantly.
      </p>

      <PasteBox text={draft} setText={setDraft} onAdd={addItems} />

      {items.length === 0 ? (
        <div className="card empty">
          <Inbox size={30} style={{ marginBottom: 8 }} />
          <p>No tasks waiting</p>
          <p className="muted" style={{ marginTop: 6 }}>Paste a list above — “UPDATE: 1. … 2. …” works too</p>
        </div>
      ) : (
        items.map((item) => (
          <WipCard key={item.id} item={item} labels={labels} groupsByDomain={groupsByDomain}
            onChange={(patch) => change(item.id, patch)} onSend={(group) => send(item, group)} onDiscard={() => discard(item.id)} />
        ))
      )}
    </div>
  );
}
