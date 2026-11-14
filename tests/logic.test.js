import { describe, expect, it } from "vitest";
import { suggestGroup } from "../src/lib/suggestGroup.js";
import { getMatrix, quadrantOf, superMatrixTasks } from "../src/lib/matrix.js";
import { canonGroup, defaultState } from "../src/lib/model.js";

describe("suggestGroup", () => {
  it("prefers an existing group named in the task", () => {
    expect(suggestGroup("Send marketing deck to the bank", ["Planning", "Marketing"])).toBe("Marketing");
  });
  it("uses the keyword map", () => {
    expect(suggestGroup("Call the bank about the transfer")).toBe("Finance");
    expect(suggestGroup("Pay the invoice")).toBe("Finance");
    expect(suggestGroup("Buy printer ink")).toBe("Shopping");
    expect(suggestGroup("Book physio")).toBe("Health");
    expect(suggestGroup("File the claim")).toBe("Health");
  });
  it("leaves call / meet / review tasks in Inbox", () => {
    expect(suggestGroup("Call the plumber")).toBe("Inbox");
    expect(suggestGroup("Review agency plan")).toBe("Inbox");
  });
  it("falls back to Inbox", () => {
    expect(suggestGroup("Something else entirely", ["Planning"])).toBe("Inbox");
    expect(suggestGroup("")).toBe("Inbox");
  });
  it("matches whole words only and reuses the existing spelling", () => {
    expect(suggestGroup("Unpaid leave form")).toBe("Inbox");
    expect(suggestGroup("Pay school fees", ["FINANCE"])).toBe("FINANCE");
    expect(suggestGroup("Plan the homework rota", ["Home"])).toBe("Inbox");
    for (const t of ["Payroll query", "Bankrupt supplier list", "Doctoral thesis notes", "Buyer feedback", "Visit shopkeeper", "Transferable skills"]) {
      expect(suggestGroup(t), t).toBe("Inbox");
    }
    for (const t of ["Make the payment", "Paid invoices check", "Banking forms", "Transferred funds"]) {
      expect(suggestGroup(t), t).toBe("Finance");
    }
    expect(suggestGroup("Go shopping")).toBe("Shopping");
    expect(suggestGroup("Book physiotherapy")).toBe("Health");
  });
  it("copes with odd group lists", () => {
    expect(suggestGroup("Pay fees", null)).toBe("Finance");
    expect(suggestGroup("Ship R&D (EU) sample", ["R&D (EU)", 7, ""])).toBe("R&D (EU)");
  });
});

describe("canonGroup", () => {
  it("reuses the existing spelling and falls back to Inbox", () => {
    expect(canonGroup("planning ", ["Planning", "Admin"])).toBe("Planning");
    expect(canonGroup("New one", ["Planning"])).toBe("New one");
    expect(canonGroup("   ", ["Planning"])).toBe("Inbox");
  });
});

describe("quadrants", () => {
  const t = (urgent, important, completed = false) => ({ id: `${urgent}${important}${completed}`, task: "x", urgent, important, completed });
  it("buckets by urgent / important", () => {
    expect(quadrantOf(t(true, true))).toBe("doFirst");
    expect(quadrantOf(t(false, true))).toBe("schedule");
    expect(quadrantOf(t(true, false))).toBe("delegate");
    expect(quadrantOf(t(false, false))).toBe("eliminate");
  });
  it("never shows completed tasks", () => {
    const m = getMatrix([t(true, true), t(true, true, true), t(false, false, true), t(false, true)]);
    expect(m.doFirst).toHaveLength(1);
    expect(m.schedule).toHaveLength(1);
    expect(m.delegate).toHaveLength(0);
    expect(m.eliminate).toHaveLength(0);
  });
  it("super matrix gathers open tasks from every tab and prefixes AI tasks", () => {
    const s = defaultState();
    s.labels.ai2 = "Lab";
    s.data.work.push(t(true, true), t(true, true, true));
    s.data.seva.push({ ...t(false, true), id: "s" });
    s.data.ai.ai2.push({ ...t(true, false), id: "a", task: "Try it" });
    s.data.ai.ai2.push({ ...t(true, false, true), id: "b" });
    s.data.wip.push({ id: "w", task: "not yet triaged", domain: null, urgent: true, important: true });
    const all = superMatrixTasks(s);
    expect(all.map((x) => x.source)).toEqual(["work", "seva", "ai2"]);
    expect(all[2].task).toBe("AI-LAB · Try it");
  });
});
