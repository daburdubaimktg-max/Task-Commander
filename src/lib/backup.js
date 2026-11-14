import { AI_KEYS, BackupError, DEFAULT_LABELS, DOMAINS, FORMAT, SCHEMA_VERSION, countTasks, newId, normalizeState, totalTasks } from "./model.js";

export const NUDGE_AFTER_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

export function buildBackup(state, now = new Date()) {
  return {
    format: FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    labels: state.labels,
    meta: { lastBackupAt: now.toISOString() },
    data: state.data,
  };
}

export function backupFilename(now = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `task-command-center-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

// Text of a backup file → clean state. Throws BackupError with a plain message.
export function parseBackup(text) {
  if (typeof text !== "string" || !text.trim()) throw new BackupError("Nothing to import yet. Choose a file or paste the backup text.");
  // Text pasted through Notes, mail or a chat app may arrive with a byte-order mark, inside ``` fences,
  // with a signature line after it, or with "smart" quotes and non-breaking spaces. Take what lies
  // between the first { and the last }, and only if that fails, undo the smart punctuation.
  const first = text.indexOf("{"), last = text.lastIndexOf("}");
  const body = first >= 0 && last > first ? text.slice(first, last + 1) : text.trim();
  let raw;
  try {
    raw = JSON.parse(body);
  } catch {
    try {
      raw = JSON.parse(body.replace(/[\u201C\u201D]/g, '"').replace(/\u00A0/g, " "));
    } catch {
      throw new BackupError("This is not a backup file: the text could not be read. Export a fresh backup and try again, or use the file instead of pasted text.");
    }
  }
  const state = normalizeState(raw);
  // Imported data is as fresh as the moment it was exported.
  if (!state.meta.lastBackupAt && typeof raw.exportedAt === "string" && !Number.isNaN(Date.parse(raw.exportedAt))) {
    state.meta.lastBackupAt = raw.exportedAt;
  }
  return state;
}

export function summarize(state) {
  const c = countTasks(state);
  return `Work ${c.work} · Personal ${c.personal} · Seva ${c.seva} · AI ${c.ai} · WIP ${c.wip} — groups ${c.groups}`;
}

// "Add to existing": keeps everything already here.
// - An incoming task that is already here (same id and text, or the same text in the same list) is skipped.
// - An incoming task whose id is used by a different task here is added under a new id, not dropped.
// - Tab names come from the file only where the file really names them; otherwise yours are kept.
// Returns { state, added, skipped }.
export function mergeAdd(current, incoming) {
  const lists = (st) => [
    ...DOMAINS.map((k) => [k, st.data[k]]),
    ["wip", st.data.wip],
    ...AI_KEYS.map((k) => [k, st.data.ai[k]]),
  ];
  const byId = new Map();
  for (const [, list] of lists(current)) for (const t of list) byId.set(t.id, t);
  const sig = (t) => `${t.group ?? ""}\u0000${t.task}`;
  let added = 0, skipped = 0;
  const add = (mine, theirs) => {
    const here = new Set(mine.map(sig));
    const out = [...mine];
    for (const t of theirs) {
      const same = byId.get(t.id);
      if ((same && same.task === t.task) || here.has(sig(t))) { skipped++; continue; }
      const fresh = same ? { ...t, id: newId() } : t;
      byId.set(fresh.id, fresh);
      here.add(sig(fresh));
      out.push(fresh);
      added++;
    }
    return out;
  };
  const data = { ...current.data, ai: { ...current.data.ai } };
  for (const k of DOMAINS) data[k] = add(current.data[k], incoming.data[k]);
  data.wip = add(current.data.wip, incoming.data.wip);
  for (const k of AI_KEYS) data.ai[k] = add(current.data.ai[k], incoming.data.ai[k]);
  const labels = { ...current.labels };
  for (const k of Object.keys(DEFAULT_LABELS)) {
    if (incoming.labels[k] !== DEFAULT_LABELS[k]) labels[k] = incoming.labels[k];
  }
  const meta = { ...current.meta, lastBackupAt: current.meta.lastBackupAt ?? (totalTasksOf(current) === 0 ? incoming.meta.lastBackupAt : null) };
  return { state: { ...current, labels, meta, data }, added, skipped };
}

const totalTasksOf = (st) => totalTasks(st);

// null = no nudge. Otherwise the text for the amber bar.
export function backupNudge(state, now = Date.now(), dismissedAt = null) {
  if (totalTasks(state) === 0) return null;
  const since = now - Number(dismissedAt);
  if (dismissedAt && since >= 0 && since < DAY) return null; // a dismissal "in the future" (clock change) does not count
  const last = state.meta.lastBackupAt ? Date.parse(state.meta.lastBackupAt) : NaN;
  if (Number.isNaN(last) || last - now > DAY) return "Not backed up yet"; // a backup dated well in the future cannot be trusted
  const days = Math.floor((now - last) / DAY);
  return days >= NUDGE_AFTER_DAYS ? `Last backup ${days} days ago` : null;
}
