import { describe, expect, it } from "vitest";
import { splitTasks } from "../src/lib/splitTasks.js";

describe("splitTasks", () => {
  it("splits an UPDATE with inline numbering", () => {
    expect(splitTasks("UPDATE: 1. Call the bank 2. Book physio 3. Send the deck")).toEqual([
      "Call the bank", "Book physio", "Send the deck",
    ]);
  });
  it("handles 'UPDATE :' and removes trailing commas", () => {
    expect(splitTasks("UPDATE : 1. Replace the card , 2. Check the phone bill")).toEqual([
      "Replace the card", "Check the phone bill",
    ]);
  });
  it("handles 1) style numbering", () => {
    expect(splitTasks("1) Replace the card , 2) Check the phone bill")).toEqual(["Replace the card", "Check the phone bill"]);
  });
  it("strips bullets and drops blank lines", () => {
    expect(splitTasks("- Pay fees\n• Renew licence\n\n  \n* Buy milk")).toEqual(["Pay fees", "Renew licence", "Buy milk"]);
  });
  it("splits on semicolons", () => {
    expect(splitTasks("Pay fees; Renew licence")).toEqual(["Pay fees", "Renew licence"]);
  });
  it("splits a numbered list written on separate lines", () => {
    expect(splitTasks("1. First\n2. Second\n10. Tenth")).toEqual(["First", "Second", "Tenth"]);
  });
  it.each([
    "Physio at 2:30 PM",
    "Culture session V2.5 plan remaining section",
    "Review agency plan, budget and timeline",
    "Close Q1 4mn forecast",
    "Read Canto 3 Book 1",
    "Share the Top 5 list",
    "Finish chapter 2. Then rest",
    "Update the deck for Monday",
  ])("leaves %j as one unchanged item", (t) => {
    expect(splitTasks(t)).toEqual([t]);
  });
  it("is case-insensitive about UPDATE with a colon, and accepts a bare UPDATE", () => {
    expect(splitTasks("update: Buy milk")).toEqual(["Buy milk"]);
    expect(splitTasks("Update: 1. A task 2. B task")).toEqual(["A task", "B task"]);
    expect(splitTasks("UPDATE Buy milk")).toEqual(["Buy milk"]);
    expect(splitTasks("update 1. A task 2. B task")).toEqual(["A task", "B task"]);
  });
  it("keeps numbers inside a numbered item", () => {
    expect(splitTasks("1. Book 2 tickets for 5 Dec 2. Top 5 review V2.5")).toEqual([
      "Book 2 tickets for 5 Dec", "Top 5 review V2.5",
    ]);
  });
  it("returns nothing for empty input", () => {
    expect(splitTasks("")).toEqual([]);
    expect(splitTasks("  \n ; ")).toEqual([]);
    expect(splitTasks("UPDATE:")).toEqual([]);
    expect(splitTasks(null)).toEqual([]);
  });
});
