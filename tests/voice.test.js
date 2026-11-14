import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBackup } from "../src/lib/backup.js";
import { applyVoice, findTasks, parseVoice, splitClauses } from "../src/lib/voice.js";

const state = () => parseBackup(readFileSync(new URL("../fixtures/sample-backup.json", import.meta.url), "utf8"));
const one = (text, s = state()) => parseVoice(text, s)[0];

describe("voice: splitting what was said", () => {
  it("splits sentences, lines and 'next task', but not after a number", () => {
    expect(splitClauses("Mark expense claims done. Add book physio to Personal. Buy milk")).toEqual([
      "Mark expense claims done", "Add book physio to Personal", "Buy milk",
    ]);
    expect(splitClauses("Call the bank next task book physio")).toEqual(["Call the bank", "book physio"]);
    expect(splitClauses("Read chapter 1. Then chapter 2")).toEqual(["Read chapter 1. Then chapter 2"]);
    expect(splitClauses("UPDATE: 1. First 2. Second")).toEqual(["First", "Second"]);
  });
});

describe("voice: adding", () => {
  it("a plain sentence goes to WIP word for word", () => {
    expect(one("Finish the important report for work")).toMatchObject({ kind: "add", text: "Finish the important report for work", dest: null, urgent: false, important: false });
    expect(one("Complete the tax form")).toMatchObject({ kind: "add", dest: null });
  });
  it("'add … to <tab>, urgent' sets the tab and priority", () => {
    expect(one("Add call the bank to Work, urgent")).toMatchObject({ kind: "add", text: "Call the bank", dest: "work", urgent: true, important: false });
    expect(one("add book physio for personal urgent and important")).toMatchObject({ text: "Book physio", dest: "personal", urgent: true, important: true });
    expect(one("New task read 20 pages under seva as important")).toMatchObject({ text: "Read 20 pages", dest: "seva", important: true });
    expect(one("Add try the new model to team ai")).toMatchObject({ text: "Try the new model", dest: "ai1" });
    expect(one("Add buy milk")).toMatchObject({ text: "Buy milk", dest: null });
    expect(one("Add sort the photos to WIP")).toMatchObject({ text: "Sort the photos", dest: null });
  });
});

describe("voice: updating", () => {
  it("marks a task done by a few of its words", () => {
    const a = one("Mark expense claims done");
    expect(a).toMatchObject({ kind: "done" });
    expect(a.matches.map((t) => t.id)).toEqual(["w4"]);
    expect(one("Done with the car service").matches.map((t) => t.id)).toEqual(["p1"]);
    expect(one("Volunteer rota is done").matches.map((t) => t.id)).toEqual(["s1"]);
  });
  it("never offers a completed task for 'done', and offers no match when nothing fits", () => {
    expect(one("Mark agency media plan done").matches).toEqual([]);
    expect(one("Mark the moon landing done").matches).toEqual([]);
  });
  it("sets and clears urgent / important", () => {
    expect(one("Make budget notes urgent")).toMatchObject({ kind: "flag", field: "urgent", value: true });
    expect(one("Make budget notes urgent").matches.map((t) => t.id)).toEqual(["w2"]);
    expect(one("Mark team review as not important")).toMatchObject({ kind: "flag", field: "important", value: false });
    expect(one("Morning walk is urgent")).toMatchObject({ kind: "flag", field: "urgent", value: true });
  });
  it("moves a task, also to an AI sub-tab; 'send … to work' with no match is a new task", () => {
    expect(one("Move car service to Work")).toMatchObject({ kind: "move", dest: "work" });
    expect(one("Move car service to Work").matches.map((t) => t.id)).toEqual(["p1"]);
    expect(one("Move printer ink to community")).toMatchObject({ kind: "move", dest: "ai4" });
    expect(one("Send the deck to work")).toMatchObject({ kind: "add", text: "Send the deck to work", dest: null });
  });
  it("delete finds completed tasks too", () => {
    const a = one("Delete agency media plan");
    expect(a.kind).toBe("delete");
    expect(a.matches.map((t) => t.id)).toEqual(["w3"]);
  });
  it("offers a choice when several tasks fit", () => {
    const s = state();
    s.data.personal.push({ id: "p9", group: "Home", task: "Book car wash", completed: false, urgent: false, important: false });
    expect(findTasks("book car", s).map((t) => t.id).sort()).toEqual(["p1", "p9"]);
    expect(findTasks("book car service", s).map((t) => t.id)).toEqual(["p1"]);
  });
});

describe("voice: applying", () => {
  it("applies a mixed list and leaves everything else alone", () => {
    const s = state();
    const acts = parseVoice("Mark expense claims done. Add call the bank to Work, urgent. Make budget notes urgent. Move car service to Work. Delete printer ink. Remember the milk", s);
    const chosen = acts.map((a) => (a.kind === "add" ? a : { ...a, target: a.matches[0] }));
    const { data, applied } = applyVoice(s.data, chosen);
    expect(applied).toBe(6);
    expect(data.work.find((t) => t.id === "w4").completed).toBe(true);
    expect(data.work.find((t) => t.id === "w2").urgent).toBe(true);
    const bank = data.work.find((t) => t.task === "Call the bank");
    expect(bank).toMatchObject({ group: "Finance", urgent: true, important: false, completed: false });
    expect(data.work.find((t) => t.id === "p1")).toMatchObject({ group: "Home", task: "Book car service" });
    expect(data.personal.map((t) => t.id)).toEqual(["p2"]);
    expect(data.wip.at(-1)).toMatchObject({ task: "Remember the milk", domain: null });
    expect(data.seva).toEqual(s.data.seva);
    expect(s.data.work).toHaveLength(4); // the input was not changed
  });
  it("ignores an action whose task has gone, and moves to and from AI lists", () => {
    const s = state();
    expect(applyVoice(s.data, [{ kind: "done", target: { list: "work", id: "nope" } }]).applied).toBe(0);
    const r = applyVoice(s.data, [{ kind: "move", dest: "personal", target: { list: "ai3", id: "a3" } }]);
    expect(r.data.ai.ai3).toEqual([]);
    expect(r.data.personal.at(-1)).toMatchObject({ id: "a3", group: "Inbox", urgent: true, important: true });
  });
});
