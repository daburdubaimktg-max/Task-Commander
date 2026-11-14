import { defaultState, normalizeState } from "./model.js";

// Every key starts with tcc_. Other apps may share this origin: never touch their keys,
// never call localStorage.clear().
export const KEY = "tcc_data_v1"; // permanent — never rename
export const PREV_KEY = "tcc_data_v1_prev";
export const CORRUPT_KEY = "tcc_data_v1_corrupt";
export const NUDGE_KEY = "tcc_nudge_dismissed_at";
export const PERSIST_KEY = "tcc_persist_requested";

const store = (s) => s || globalThis.localStorage;

// No merging with a seed: what was saved is what loads.
export function loadState(storage) {
  let raw = null;
  try {
    raw = store(storage).getItem(KEY);
  } catch (e) {
    return { state: defaultState(), firstRun: true, error: `Could not read saved data (${e.message}).` };
  }
  if (raw === null) return { state: defaultState(), firstRun: true, error: null };
  try {
    return { state: normalizeState(JSON.parse(raw)), firstRun: false, error: null };
  } catch (e) {
    // Keep the unreadable copy so it is not lost when the next save happens.
    try { store(storage).setItem(CORRUPT_KEY, raw); } catch { /* nothing more we can do */ }
    return { state: defaultState(), firstRun: true, error: "Saved data could not be read. Import your last backup." };
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
