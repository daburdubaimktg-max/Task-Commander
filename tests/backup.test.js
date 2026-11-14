import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { backupFilename, backupNudge, buildBackup, mergeAdd, parseBackup, summarize } from "../src/lib/backup.js";
import { BackupError, countTasks, defaultState, groupsOf } from "../src/lib/model.js";
import { CORRUPT_KEY, KEY, loadState, saveState } from "../src/lib/storage.js";

const fixtureText = readFileSync(new URL("../fixtures/sample-backup.json", import.meta.url), "utf8");

function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    keys: () => [...m.keys()],
  };
}

describe("import", () => {
  it("reads the sample backup with the right counts, groups and labels", () => {
    const s = parseBackup(fixtureText);
    expect(countTasks(s)).toEqual({ work: 4, personal: 3, seva: 2, ai: 3, wip: 2, groups: 8 });
    expect(summarize(s)).toBe("Work 4 · Personal 3 · Seva 2 · AI 3 · WIP 2 — groups 8");
    expect(groupsOf(s, "work")).toEqual(["Planning", "Marketing", "Admin"]);
    expect(s.labels.ai1).toBe("TEAM AI");
    expect(s.labels.ai4).toBe("COMMUNITY");
    expect(s.data.work[0].id).toBe("w1"); // imported ids are kept
    expect(s.meta.lastBackupAt).toBe("2026-11-13T10:00:00.000Z");
  });
  it("rejects a wrong format with a readable message", () => {
    expect(() => parseBackup('{"format":"something-else/v9","data":{}}')).toThrow(BackupError);
    expect(() => parseBackup('{"format":"something-else/v9","data":{}}')).toThrow(/not a Task Command Center backup/);
    expect(() => parseBackup("[1,2,3]")).toThrow(/not a Task Command Center backup/);
  });
  it("rejects text that is not JSON", () => {
    expect(() => parseBackup("hello there")).toThrow(/could not be read/);
    expect(() => parseBackup("   ")).toThrow(/Nothing to import/);
  });
  it("rejects malformed arrays with a readable message", () => {
    const bad = (data) => () => parseBackup(JSON.stringify({ format: "task-command-center/v1", data }));
    expect(bad({ work: "nope" })).toThrow(/"work" should be a list/);
    expect(bad({ work: [{ id: "1" }] })).toThrow(/item 1 in "work" is not a task/);
    expect(bad({ work: [], wip: [42] })).toThrow(/item 1 in "wip" is not a task/);
    expect(bad({ ai: [] })).toThrow(/"ai" should hold/);
    expect(bad({ ai: { ai1: {} } })).toThrow(/"ai.ai1" should be a list/);
    expect(() => parseBackup('{"format":"task-command-center/v1"}')).toThrow(/"data" section is missing/);
  });
  it("rejects a backup from a newer schema", () => {
    expect(() => parseBackup('{"format":"task-command-center/v1","schemaVersion":2,"data":{}}')).toThrow(/newer version/);
  });
  it("fills missing lists with empties and gives duplicate ids a new id", () => {
    const s = parseBackup(JSON.stringify({
      format: "task-command-center/v1",
      data: { work: [{ id: "a", task: "One" }, { id: "a", task: "Two" }] },
    }));
    expect(s.data.personal).toEqual([]);
    expect(s.data.ai.ai3).toEqual([]);
    expect(s.data.work[0]).toEqual({ id: "a", group: "Inbox", task: "One", completed: false, urgent: false, important: false });
    expect(s.data.work[1].id).not.toBe("a");
  });
});

describe("export → import round trip", () => {
  it("reproduces the same counts, groups, labels and tasks", () => {
    const before = parseBackup(fixtureText);
    const text = JSON.stringify(buildBackup(before, new Date("2026-11-20T08:00:00Z")));
    const after = parseBackup(text);
    expect(countTasks(after)).toEqual(countTasks(before));
    expect(after.labels).toEqual(before.labels);
    expect(after.data).toEqual(before.data);
    for (const d of ["work", "personal", "seva"]) expect(groupsOf(after, d)).toEqual(groupsOf(before, d));
    expect(JSON.parse(text).exportedAt).toBe("2026-11-20T08:00:00.000Z");
    expect(after.meta.lastBackupAt).toBe("2026-11-20T08:00:00.000Z");
  });
  it("names the file by date", () => {
    expect(backupFilename(new Date(2026, 10, 3))).toBe("task-command-center-2026-11-03.json");
  });
});

describe("add to existing", () => {
  it("skips tasks whose id already exists and applies labels", () => {
    const current = parseBackup(fixtureText);
    current.data.work = current.data.work.slice(0, 1);
    current.data.work.push({ id: "mine", group: "Inbox", task: "Mine", completed: false, urgent: false, important: false });
    current.labels.ai1 = "AI 1";
    const merged = mergeAdd(current, parseBackup(fixtureText));
    expect(merged.data.work.map((t) => t.id)).toEqual(["w1", "mine", "w2", "w3", "w4"]);
    expect(merged.data.wip).toHaveLength(2);
    expect(merged.labels.ai1).toBe("TEAM AI");
  });
});

describe("backup nudge", () => {
  const now = Date.parse("2026-11-22T10:00:00Z");
  const withTasks = () => parseBackup(fixtureText);
  it("stays quiet when there are no tasks", () => {
    expect(backupNudge(defaultState(), now)).toBeNull();
  });
  it("nudges when never backed up or older than 7 days", () => {
    const s = withTasks();
    expect(backupNudge(s, now)).toBe("Last backup 9 days ago");
    s.meta.lastBackupAt = null;
    expect(backupNudge(s, now)).toBe("Not backed up yet");
    s.meta.lastBackupAt = "2026-11-20T10:00:00Z";
    expect(backupNudge(s, now)).toBeNull();
  });
  it("can be dismissed for 24 hours", () => {
    const s = withTasks();
    expect(backupNudge(s, now, now - 60 * 60 * 1000)).toBeNull();
    expect(backupNudge(s, now, now - 25 * 60 * 60 * 1000)).toBe("Last backup 9 days ago");
  });
});

describe("storage", () => {
  it("first launch is empty, with no seed", () => {
    const r = loadState(fakeStorage());
    expect(r.firstRun).toBe(true);
    expect(r.state).toEqual(defaultState());
  });
  it("saves and loads exactly what was saved — deleted tasks stay deleted", () => {
    const st = fakeStorage();
    const s = parseBackup(fixtureText);
    s.data.work = s.data.work.filter((t) => t.id !== "w2");
    expect(saveState(s, st)).toEqual({ ok: true, error: null });
    expect(st.keys()).toEqual([KEY]);
    const r = loadState(st);
    expect(r.firstRun).toBe(false);
    expect(r.state).toEqual(s);
    expect(r.state.data.work.map((t) => t.id)).toEqual(["w1", "w3", "w4"]);
  });
  it("reports a failed save instead of hiding it", () => {
    const st = fakeStorage();
    st.setItem = () => { throw new Error("QuotaExceededError"); };
    expect(saveState(defaultState(), st)).toEqual({ ok: false, error: "QuotaExceededError" });
  });
  it("keeps a copy of unreadable data and never touches other apps' keys", () => {
    const st = fakeStorage({ [KEY]: "{broken", other_app_key: "keep me" });
    const r = loadState(st);
    expect(r.error).toMatch(/could not be read/);
    expect(st.getItem(CORRUPT_KEY)).toBe("{broken");
    expect(st.getItem("other_app_key")).toBe("keep me");
  });
});
