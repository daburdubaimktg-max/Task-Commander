// Turns pasted text into separate task strings (CLAUDE.md §6.2).

const MARKER = /(^|[\s,])(\d{1,2})[.)]\s+/g;

function stripUpdatePrefix(text) {
  // "UPDATE:" in any case. A bare "update" is only a command when it is in capitals or
  // sits in front of a list, so a task like "Update the deck" keeps its first word.
  const withColon = text.replace(/^\s*update\s*:\s*/i, "");
  if (withColon !== text) return withColon;
  if (/^\s*UPDATE(\s|$)/.test(text)) return text.replace(/^\s*UPDATE\s*/, "");
  return text.replace(/^\s*update\s*(?=\n|\d{1,2}[.)]\s|[-•*]\s)/i, "");
}

// Splits "1. a 2. b" style numbering inside one line. Only numbers that continue a
// sequence count, so "V2.5", "Top 5" or "Canto 3 Book 1" are left alone.
function splitNumbered(line) {
  const marks = [];
  for (const m of line.matchAll(MARKER)) {
    marks.push({ start: m.index + m[1].length, end: m.index + m[0].length, n: Number(m[2]), atStart: m.index === 0 && m[1] === "" });
  }
  if (!marks.length) return [line];
  const leading = marks[0].atStart || line.slice(0, marks[0].start).trim() === "" ? marks[0] : null;
  let chosen = [];
  if (leading) {
    chosen = [leading];
    let expect = leading.n + 1;
    for (const m of marks.slice(1)) if (m.n === expect) { chosen.push(m); expect++; }
  } else {
    let expect = 1;
    for (const m of marks) if (m.n === expect) { chosen.push(m); expect++; }
    if (chosen.length < 2) return [line];
  }
  const parts = [];
  if (!leading) parts.push(line.slice(0, chosen[0].start));
  chosen.forEach((m, i) => parts.push(line.slice(m.end, i + 1 < chosen.length ? chosen[i + 1].start : line.length)));
  return parts;
}

function clean(item) {
  return item
    .trim()
    .replace(/^[-•*]\s+/, "")
    .replace(/^\d{1,2}[.)]\s+/, "")
    .replace(/^[,\s]+|[,\s]+$/g, "");
}

export function splitTasks(text) {
  if (typeof text !== "string") return [];
  return stripUpdatePrefix(text)
    .split(/[\n\r;]+/)
    .flatMap((line) => splitNumbered(line.trim().replace(/^[-•*]\s+/, "")))
    .map(clean)
    .filter(Boolean);
}
