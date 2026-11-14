import { AI_KEYS, BackupError, DOMAINS, FORMAT, SCHEMA_VERSION, countTasks, normalizeState, totalTasks } from "./model.js";

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
  let raw;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    throw new BackupError("This is not a backup file: the text could not be read. Paste the whole backup, from the first { to the last }.");
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

// "Add to existing": keeps everything already here and skips incoming tasks whose id exists.
export function mergeAdd(current, incoming) {
  const seen = new Set([
    ...DOMAINS.flatMap((k) => current.data[k]),
    ...current.data.wip,
    ...AI_KEYS.flatMap((k) => current.data.ai[k]),
  ].map((t) => t.id));
  const add = (mine, theirs) => [...mine, ...theirs.filter((t) => !seen.has(t.id))];
  const data = { ...current.data, ai: { ...current.data.ai } };
  for (const k of DOMAINS) data[k] = add(current.data[k], incoming.data[k]);
  data.wip = add(current.data.wip, incoming.data.wip);
  for (const k of AI_KEYS) data.ai[k] = add(current.data.ai[k], incoming.data.ai[k]);
  return { ...current, labels: { ...incoming.labels }, data };
}

// null = no nudge. Otherwise the text for the amber bar.
export function backupNudge(state, now = Date.now(), dismissedAt = null) {
  if (totalTasks(state) === 0) return null;
  if (dismissedAt && now - Number(dismissedAt) < DAY) return null;
  const last = state.meta.lastBackupAt ? Date.parse(state.meta.lastBackupAt) : NaN;
  if (Number.isNaN(last)) return "Not backed up yet";
  const days = Math.floor((now - last) / DAY);
  return days >= NUDGE_AFTER_DAYS ? `Last backup ${days} days ago` : null;
}
