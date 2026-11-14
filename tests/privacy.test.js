import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEFAULT_LABELS, countTasks, defaultState } from "../src/lib/model.js";

const SRC = fileURLToPath(new URL("../src", import.meta.url));
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

describe("privacy guard", () => {
  it("the default state has zero tasks and only neutral labels", () => {
    const s = defaultState();
    expect(countTasks(s)).toEqual({ work: 0, personal: 0, seva: 0, ai: 0, wip: 0, groups: 0 });
    expect(s.labels).toEqual({
      work: "Work", personal: "Personal", seva: "Seva", ai: "AI Learning",
      ai1: "AI 1", ai2: "AI 2", ai3: "AI 3", ai4: "AI 4",
    });
    expect(DEFAULT_LABELS).toEqual(s.labels);
    expect(s.meta.lastBackupAt).toBeNull();
  });
  it("no file under src/ contains a seed task", () => {
    const files = walk(SRC);
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      // A hard-coded task looks like { id: "…", task: "…" } with literal strings.
      expect(text, f).not.toMatch(/\btask\s*:\s*["'`]/);
      expect(text, f).not.toMatch(/\bid\s*:\s*["'][^"']+["']\s*,\s*(group|task)\s*:/);
      expect(text, f).not.toMatch(/\b(work|personal|seva|wip|ai[1-4])\s*:\s*\[\s*[{"'`]/);
    }
  });
});
