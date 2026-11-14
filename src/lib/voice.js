// Turns dictated or typed text into a list of proposed actions (add / done / urgent /
// important / move / delete). Pure functions: nothing changes until the user confirms the
// preview and applyVoice() is called. No online service is involved — only fixed phrasings.
import { AI_KEYS, DOMAINS, newId } from "./model.js";
import { splitTasks } from "./splitTasks.js";
import { suggestGroup } from "./suggestGroup.js";

const STOP = new Set(["the", "a", "an", "my", "to", "of", "for", "and", "task", "tasks", "please", "that", "this", "one", "is", "as", "on", "in"]);
const tokens = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
const stem = (w) => (w.length > 4 ? w.replace(/(ies|es|s|ing|ed)$/, "") : w);
const keyWords = (s) => tokens(s).filter((w) => !STOP.has(w)).map(stem);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const listOf = (data, key) => (AI_KEYS.includes(key) ? data.ai[key] : data[key]);
const withList = (data, key, list) => (AI_KEYS.includes(key) ? { ...data, ai: { ...data.ai, [key]: list } } : { ...data, [key]: list });
export const placeName = (labels, key) => (key === "wip" ? "WIP" : AI_KEYS.includes(key) ? `AI · ${labels[key]}` : labels[key]);

function everyTask(state) {
  const out = [];
  for (const key of [...DOMAINS, ...AI_KEYS, "wip"]) {
    for (const t of listOf(state.data, key)) {
      out.push({ list: key, id: t.id, task: t.task, completed: t.completed === true, place: placeName(state.labels, key) });
    }
  }
  return out;
}

// Closest tasks to what was said. One result = a clear match; several = the user picks.
export function findTasks(query, state, filter = () => true) {
  const q = keyWords(query);
  if (!q.length) return [];
  const same = (a, b) => a === b || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b));
  const scored = [];
  for (const t of everyTask(state)) {
    if (!filter(t)) continue;
    const w = keyWords(t.task);
    if (!w.length) continue;
    const hits = q.filter((x) => w.some((y) => same(x, y))).length;
    const score = hits / q.length;
    if (score >= 0.6) scored.push({ t, score, cover: hits / w.length });
  }
  if (!scored.length) return [];
  scored.sort((a, b) => b.score - a.score || b.cover - a.cover);
  const best = scored.filter((s) => s.score === scored[0].score);
  const exact = best.filter((s) => keyWords(s.t.task).join(" ") === q.join(" "));
  if (exact.length === 1) return [exact[0].t];
  if (best.length > 1 && best[0].cover - best[1].cover >= 0.34) return [best[0].t];
  return best.slice(0, 5).map((s) => s.t);
}

function destinations(labels) {
  const d = [];
  for (const k of DOMAINS) d.push([k, [k, labels[k].toLowerCase()]]);
  for (const k of AI_KEYS) {
    const name = labels[k].toLowerCase();
    d.push([k, [name, `ai ${name}`, `${labels.ai.toLowerCase()} ${name}`]]);
  }
  return d;
}
function destPattern(dests) {
  const names = dests.flatMap(([, n]) => n).sort((a, b) => b.length - a.length).map(escapeRe);
  return `(${[...new Set(names)].join("|")})`;
}
const destKey = (dests, said) => dests.find(([, n]) => n.includes(said.toLowerCase()))?.[0] ?? null;

// Dictation arrives as sentences, not lines: split on sentence ends too (but not after a digit,
// so "chapter 1. Then…" stays whole), and on the spoken cue "next task".
export function splitClauses(text) {
  return splitTasks(String(text ?? ""))
    .flatMap((p) => p.replace(/\s+(?:next task|next one)[,:]?\s+/gi, "\n").replace(/([^\d\s][.!?])\s+(?=[A-Z])/g, "$1\n").split("\n"))
    .map((c) => c.trim().replace(/[.!?,;:\s]+$/, ""))
    .filter(Boolean);
}

const FLAGS = "not urgent|urgent|not important|important";
const DONE = "done|complete|completed|finished|off";

function parseClause(clause, state, dests) {
  const DEST = destPattern(dests);
  const open = (t) => !t.completed;
  let m;

  // delete …            (needs its own confirmation in the preview)
  if ((m = /^(?:delete|(?:remove|discard)\s+(?:the\s+)?task)\s+(?:the\s+)?(?:task\s+)?(.+)$/i.exec(clause))) {
    return { kind: "delete", query: m[1], matches: findTasks(m[1], state) };
  }
  // move … to <tab>
  if ((m = new RegExp(`^(move|shift|send)\\s+(.+?)\\s+(?:to|into)\\s+(?:the\\s+)?${DEST}(?:\\s+(?:tab|list))?$`, "i").exec(clause))) {
    const dest = destKey(dests, m[3]);
    const matches = findTasks(m[2], state, (t) => open(t) && t.list !== dest);
    // "Send the deck to work" is more likely a new task than a command when nothing matches.
    if (matches.length || m[1].toLowerCase() !== "send") return { kind: "move", query: m[2], dest, matches };
  }
  // mark … done / tick … / … is done / done with …
  if ((m = new RegExp(`^(?:mark|tick|check|set)\\s+(.+?)\\s+(?:as\\s+)?(?:${DONE})$`, "i").exec(clause))
    || (m = /^(?:tick off|tick|check off)\s+(.+)$/i.exec(clause))
    || (m = /^(?:done with|done|completed|finished)[:,]?\s+(.+)$/i.exec(clause))) {
    return { kind: "done", query: m[1], matches: findTasks(m[1], state, (t) => open(t) && t.list !== "wip") };
  }
  if ((m = new RegExp(`^(.+?)\\s+is\\s+(?:${DONE})$`, "i").exec(clause))) {
    const matches = findTasks(m[1], state, (t) => open(t) && t.list !== "wip");
    if (matches.length) return { kind: "done", query: m[1], matches };
  }
  // make … urgent / important / not urgent / not important
  if ((m = new RegExp(`^(?:make|mark|set|flag)\\s+(.+?)\\s+(?:as\\s+)?(${FLAGS})$`, "i").exec(clause))) {
    const said = m[2].toLowerCase();
    return { kind: "flag", field: said.includes("urgent") ? "urgent" : "important", value: !said.startsWith("not"), query: m[1], matches: findTasks(m[1], state, open) };
  }
  if ((m = new RegExp(`^(.+?)\\s+is\\s+(${FLAGS})$`, "i").exec(clause))) {
    const said = m[2].toLowerCase();
    const matches = findTasks(m[1], state, open);
    if (matches.length) return { kind: "flag", field: said.includes("urgent") ? "urgent" : "important", value: !said.startsWith("not"), query: m[1], matches };
  }
  // add … [to <tab>] [urgent] [important]   — the tab and priority are only read after "add"
  if ((m = /^(?:add task|add|new task|create task|create|remind me to|note)[:,]?\s+(.+)$/i.exec(clause))) {
    let text = m[1], dest = null, urgent = false, important = false, changed = true;
    const flagRe = /[,\s]+(?:and\s+)?(?:as\s+|marked?\s+(?:as\s+)?)?(urgent|important)$/i;
    const destRe = new RegExp(`[,\\s]+(?:to|for|in|into|under)\\s+(?:the\\s+)?${DEST}(?:\\s+(?:tab|list))?$`, "i");
    const wipRe = /[,\s]+(?:to|in|into)\s+(?:the\s+)?(?:wip|inbox)$/i;
    while (changed) {
      changed = false;
      let x;
      if ((x = flagRe.exec(text))) { if (x[1].toLowerCase() === "urgent") urgent = true; else important = true; text = text.slice(0, x.index); changed = true; }
      else if (!dest && (x = destRe.exec(text))) { dest = destKey(dests, x[1]); text = text.slice(0, x.index); changed = true; }
      else if ((x = wipRe.exec(text))) { text = text.slice(0, x.index); changed = true; }
    }
    text = text.trim().replace(/[,;:\s]+$/, "");
    if (text) return { kind: "add", text: text[0].toUpperCase() + text.slice(1), dest, urgent, important };
  }
  // anything else is a new task for WIP, word for word
  return { kind: "add", text: clause, dest: null, urgent: false, important: false };
}

export function parseVoice(text, state) {
  const dests = destinations(state.labels);
  return splitClauses(text).map((clause, i) => ({ n: i, clause, ...parseClause(clause, state, dests) }));
}

// chosen: [{ kind, text?, dest?, urgent?, important?, field?, value?, target?: { list, id } }]
export function applyVoice(data, chosen) {
  let d = data;
  let applied = 0;
  const groups = (key) => [...new Set(d[key].map((t) => t.group))];
  for (const a of chosen) {
    if (a.kind === "add") {
      const base = { id: newId(), task: a.text };
      if (!a.dest) d = withList(d, "wip", [...d.wip, { ...base, domain: null, urgent: !!a.urgent, important: !!a.important }]);
      else if (DOMAINS.includes(a.dest)) {
        d = withList(d, a.dest, [...d[a.dest], { id: base.id, group: suggestGroup(a.text, groups(a.dest)), task: a.text, completed: false, urgent: !!a.urgent, important: !!a.important }]);
      } else d = withList(d, a.dest, [...d.ai[a.dest], { ...base, completed: false, urgent: !!a.urgent, important: !!a.important }]);
      applied++;
      continue;
    }
    const src = a.target && listOf(d, a.target.list)?.find((t) => t.id === a.target.id);
    if (!src) continue;
    const patch = (fn) => { d = withList(d, a.target.list, listOf(d, a.target.list).map((t) => (t.id === src.id ? fn(t) : t))); };
    if (a.kind === "done") patch((t) => ({ ...t, completed: true }));
    else if (a.kind === "flag") patch((t) => ({ ...t, [a.field]: a.value }));
    else if (a.kind === "delete") d = withList(d, a.target.list, listOf(d, a.target.list).filter((t) => t.id !== src.id));
    else if (a.kind === "move" && a.dest && a.dest !== a.target.list) {
      const core = { id: src.id, task: src.task, completed: src.completed === true, urgent: !!src.urgent, important: !!src.important };
      const moved = DOMAINS.includes(a.dest)
        ? { id: core.id, group: src.group || suggestGroup(src.task, groups(a.dest)), task: core.task, completed: core.completed, urgent: core.urgent, important: core.important }
        : core;
      d = withList(d, a.target.list, listOf(d, a.target.list).filter((t) => t.id !== src.id));
      d = withList(d, a.dest, [...listOf(d, a.dest), moved]);
    } else continue;
    applied++;
  }
  return { data: d, applied };
}
