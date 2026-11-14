import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { backupFilename, backupNudge, buildBackup, mergeAdd, parseBackup, summarize } from "../src/lib/backup.js";
import { BackupError, countTasks, defaultState, groupsOf } from "../src/lib/model.js";
import { CORRUPT_KEY, KEY, keepUnreadable, loadState, saveState } from "../src/lib/storage.js";

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
  it("accepts text pasted with code fences or a byte-order mark", () => {
    expect(countTasks(parseBackup("```json\n" + fixtureText + "\n```")).work).toBe(4);
    expect(countTasks(parseBackup("\uFEFF" + fixtureText)).work).toBe(4);
    expect(countTasks(parseBackup(fixtureText + "\n\nSent from my iPhone")).work).toBe(4);
    expect(countTasks(parseBackup(fixtureText.replace(/"/g, (q, i) => (i % 2 ? "\u201D" : "\u201C")))).work).toBe(4);
    expect(countTasks(parseBackup(fixtureText.replace(/\n  /g, "\n\u00A0\u00A0"))).work).toBe(4);
  });
  it("cuts long tab names by whole characters", () => {
    const s = parseBackup(JSON.stringify({ format: "task-command-center/v1", labels: { ai1: "a".repeat(39) + "😀 tail" }, data: {} }));
    expect(s.labels.ai1).toBe("a".repeat(39) + "😀");
  });
  it("keeps a group typed on a WIP item", () => {
    const s = parseBackup(JSON.stringify({ format: "task-command-center/v1", data: { wip: [{ id: "x", task: "T", domain: "work", group: " Keep " }] } }));
    expect(s.data.wip[0].group).toBe("Keep");
  });
  it("rejects a backup from a newer schema", () => {
    expect(() => parseBackup('{"format":"task-command-center/v1","schemaVersion":2,"data":{}}')).toThrow(/newer version/);
    expect(() => parseBackup('{"format":"task-command-center/v1","schemaVersion":"1","data":{}}')).toThrow(/whole number/);
    expect(() => parseBackup('{"format":"task-command-center/v1","schemaVersion":0,"data":{}}')).toThrow(/whole number/);
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
    const { state: merged, added, skipped } = mergeAdd(current, parseBackup(fixtureText));
    expect(merged.data.work.map((t) => t.id)).toEqual(["w1", "mine", "w2", "w3", "w4"]);
    expect(merged.data.wip).toHaveLength(2);
    expect(merged.labels.ai1).toBe("TEAM AI");
    expect([added, skipped]).toEqual([3, 11]);
  });
  it("keeps your tab names when the file does not name them", () => {
    const current = parseBackup(fixtureText);
    const bare = parseBackup('{"format":"task-command-center/v1","data":{}}');
    expect(mergeAdd(current, bare).state.labels).toEqual(current.labels);
  });
  it("adding the same file twice never duplicates, even without ids", () => {
    const file = '{"format":"task-command-center/v1","data":{"work":[{"task":"One"},{"id":"a","task":"Two"},{"id":"a","task":"Three"}]}}';
    let s = mergeAdd(parseBackup(fixtureText), parseBackup(file)).state;
    const again = mergeAdd(s, parseBackup(file));
    expect(again.added).toBe(0);
    expect(again.state.data.work.filter((t) => ["One", "Two", "Three"].includes(t.task))).toHaveLength(3);
  });
  it("a different task that reuses an id from another list is added, not dropped", () => {
    const file = '{"format":"task-command-center/v1","data":{"seva":[{"id":"w1","group":"Other","task":"A different task"}]}}';
    const { state, added } = mergeAdd(parseBackup(fixtureText), parseBackup(file));
    expect(added).toBe(1);
    const t = state.data.seva.find((x) => x.task === "A different task");
    expect(t.id).not.toBe("w1");
    expect(state.data.work[0].id).toBe("w1");
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
  it("is not silenced by a clock that was moved", () => {
    const s = withTasks();
    s.meta.lastBackupAt = "2027-06-01T10:00:00Z";
    expect(backupNudge(s, now)).toBe("Not backed up yet");
    s.meta.lastBackupAt = "2026-11-13T10:00:00.000Z";
    expect(backupNudge(s, now, now + 5 * 60 * 60 * 1000)).toBe("Last backup 9 days ago");
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
    expect(r.blocked).toBeNull();
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
  it("unreadable data blocks saving and is never overwritten on load", () => {
    for (const bad of ["{broken", '{"format":"task-command-center/v1","schemaVersion":2,"data":{}}', '"just text"']) {
      const st = fakeStorage({ [KEY]: bad, other_app_key: "keep me" });
      const r = loadState(st);
      expect(r.blocked?.reason, bad).toBe("damaged");
      expect(r.blocked.raw).toBe(bad);
      expect(r.firstRun).toBe(false);
      expect(st.getItem(KEY)).toBe(bad);
      expect(st.getItem("other_app_key")).toBe("keep me");
    }
  });
  it("a read error blocks saving too", () => {
    const st = fakeStorage({ [KEY]: fixtureText });
    st.getItem = () => { throw new Error("SecurityError"); };
    const r = loadState(st);
    expect(r.blocked).toEqual({ reason: "read", raw: null, detail: "SecurityError" });
  });
  it("one damaged task in saved data is skipped, the rest loads", () => {
    const saved = JSON.parse(fixtureText);
    saved.data.work.push({ id: "bad", task: "" }, 42);
    saved.data.seva = "oops";
    const r = loadState(fakeStorage({ [KEY]: JSON.stringify(saved) }));
    expect(r.blocked).toBeNull();
    expect(r.state.data.work).toHaveLength(4);
    expect(r.state.data.seva).toEqual([]);
    expect(r.state.data.personal).toHaveLength(3);
  });
  it("the spare copy of unreadable data is never overwritten by a later one", () => {
    const st = fakeStorage();
    expect(keepUnreadable("first", st)).toBe(true);
    keepUnreadable("second", st);
    expect(st.getItem(CORRUPT_KEY)).toBe("first");
  });
});
