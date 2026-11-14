// Data model: one shape for both the stored value and the backup file (CLAUDE.md §4).

export const FORMAT = "task-command-center/v1";
export const SCHEMA_VERSION = 1;
export const DOMAINS = ["work", "personal", "seva"];
export const AI_KEYS = ["ai1", "ai2", "ai3", "ai4"];
export const DESTINATIONS = [...DOMAINS, ...AI_KEYS];
export const DEFAULT_GROUP = "Inbox";

// Neutral on purpose. Real names arrive only through the owner's backup file.
export const DEFAULT_LABELS = Object.freeze({
  work: "Work", personal: "Personal", seva: "Seva", ai: "AI Learning",
  ai1: "AI 1", ai2: "AI 2", ai3: "AI 3", ai4: "AI 4",
});

export class BackupError extends Error {}

export function emptyData() {
  return { work: [], personal: [], seva: [], wip: [], ai: { ai1: [], ai2: [], ai3: [], ai4: [] } };
}

export function defaultState() {
  return {
    format: FORMAT,
    schemaVersion: SCHEMA_VERSION,
    labels: { ...DEFAULT_LABELS },
    meta: { lastBackupAt: null },
    data: emptyData(),
  };
}

export function newId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function readList(value, name, seen, shape) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new BackupError(`This backup is damaged: "${name}" should be a list of tasks.`);
  return value.map((t, i) => {
    if (!isObject(t) || typeof t.task !== "string" || !t.task.trim()) {
      throw new BackupError(`This backup is damaged: item ${i + 1} in "${name}" is not a task.`);
    }
    let id = typeof t.id === "string" || typeof t.id === "number" ? String(t.id) : "";
    if (!id || seen.has(id)) id = newId();
    seen.add(id);
    const out = { id };
    if (shape === "domain") out.group = typeof t.group === "string" && t.group.trim() ? t.group.trim() : DEFAULT_GROUP;
    out.task = t.task.trim();
    if (shape === "wip") out.domain = DESTINATIONS.includes(t.domain) ? t.domain : null;
    else out.completed = t.completed === true;
    out.urgent = t.urgent === true;
    out.important = t.important === true;
    return out;
  });
}

// Validates anything that claims to be our data and returns a clean, complete state.
// Missing lists become empty lists. Throws BackupError with a plain message otherwise.
export function normalizeState(raw) {
  if (!isObject(raw)) throw new BackupError("This is not a Task Command Center backup.");
  if (raw.format !== FORMAT) {
    throw new BackupError(`This is not a Task Command Center backup (expected format "${FORMAT}").`);
  }
  const version = raw.schemaVersion ?? 1;
  if (typeof version !== "number" || version > SCHEMA_VERSION) {
    throw new BackupError("This backup was made by a newer version of the app. Update the app, then import again.");
  }
  // Future schema upgrades run here, one tested step per version.
  if (!isObject(raw.data)) throw new BackupError('This backup is damaged: the "data" section is missing.');
  const d = raw.data;
  if (d.ai !== undefined && d.ai !== null && !isObject(d.ai)) {
    throw new BackupError('This backup is damaged: "ai" should hold the four AI lists.');
  }
  const seen = new Set();
  const data = emptyData();
  for (const k of DOMAINS) data[k] = readList(d[k], k, seen, "domain");
  data.wip = readList(d.wip, "wip", seen, "wip");
  for (const k of AI_KEYS) data.ai[k] = readList(d.ai?.[k], `ai.${k}`, seen, "ai");

  const labels = { ...DEFAULT_LABELS };
  if (isObject(raw.labels)) {
    for (const k of Object.keys(DEFAULT_LABELS)) {
      const v = raw.labels[k];
      if (typeof v === "string" && v.trim()) labels[k] = v.trim().slice(0, 40);
    }
  }
  const last = isObject(raw.meta) ? raw.meta.lastBackupAt : null;
  const lastBackupAt = typeof last === "string" && !Number.isNaN(Date.parse(last)) ? last : null;
  return { format: FORMAT, schemaVersion: SCHEMA_VERSION, labels, meta: { lastBackupAt }, data };
}

export function countTasks(state) {
  const d = state.data;
  const groups = DOMAINS.reduce((n, k) => n + new Set(d[k].map((t) => t.group)).size, 0);
  return {
    work: d.work.length,
    personal: d.personal.length,
    seva: d.seva.length,
    ai: AI_KEYS.reduce((n, k) => n + d.ai[k].length, 0),
    wip: d.wip.length,
    groups,
  };
}

export function totalTasks(state) {
  const c = countTasks(state);
  return c.work + c.personal + c.seva + c.ai + c.wip;
}

export function groupsOf(state, domain) {
  return [...new Set((state.data[domain] || []).map((t) => t.group))];
}
