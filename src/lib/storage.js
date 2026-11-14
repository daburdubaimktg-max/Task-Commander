import { defaultState, normalizeState } from "./model.js";

// Every key starts with tcc_. Other apps may share this origin: never touch their keys,
// never call localStorage.clear().
export const KEY = "tcc_data_v1"; // permanent — never rename
export const PREV_KEY = "tcc_data_v1_prev";
export const CORRUPT_KEY = "tcc_data_v1_corrupt";
export const NUDGE_KEY = "tcc_nudge_dismissed_at";
export const PERSIST_KEY = "tcc_persist_requested";
export const THEME_KEY = "tcc_theme"; // "auto" | "light" | "dark"

const store = (s) => s || globalThis.localStorage;

// No merging with a seed: what was saved is what loads.
// If the saved data cannot be read, `blocked` is set and the caller must NOT save until the
// user decides what to do — otherwise the first edit would overwrite the old tasks.
export function loadState(storage) {
  let raw = null;
  try {
    raw = store(storage).getItem(KEY);
  } catch (e) {
    return { state: defaultState(), firstRun: false, blocked: { reason: "read", raw: null, detail: e?.message || "" } };
  }
  if (raw === null) return { state: defaultState(), firstRun: true, blocked: null };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: defaultState(), firstRun: false, blocked: { reason: "damaged", raw, detail: "" } };
  }
  try {
    return { state: normalizeState(parsed, { lenient: true }), firstRun: false, blocked: null };
  } catch (e) {
    return { state: defaultState(), firstRun: false, blocked: { reason: "damaged", raw, detail: e?.message || "" } };
  }
}

// Best-effort spare copy of unreadable data, written only when the user chooses to move on.
// An earlier spare copy is never overwritten.
export function keepUnreadable(raw, storage) {
  if (typeof raw !== "string") return false;
  try {
    const s = store(storage);
    if (s.getItem(CORRUPT_KEY) === null) s.setItem(CORRUPT_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

// Returns { ok } only after the write is confirmed by reading it back.
export function saveState(state, storage) {
  try {
    const json = JSON.stringify(state);
    store(storage).setItem(KEY, json);
    if (store(storage).getItem(KEY) !== json) throw new Error("write was not kept");
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}

export function getItem(key, storage) {
  try { return store(storage).getItem(key); } catch { return null; }
}
export function setItem(key, value, storage) {
  try { store(storage).setItem(key, value); return true; } catch { return false; }
}
export function removeItem(key, storage) {
  try { store(storage).removeItem(key); } catch { /* ignore */ }
}
