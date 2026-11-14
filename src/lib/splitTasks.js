// Turns pasted text into separate task strings (CLAUDE.md §6.2).

const MARKER = /(^|[\s,])(\d{1,2})[.)]\s+(?!\d)/g; // "2. 30 PM" or "2. 5 kg" is not a list marker
const BULLET = /^[-•*–—·▪]\s+/;

function stripUpdatePrefix(text) {
  // "UPDATE:" in any case. Without the colon it is only the command when it stands in front of a
  // list, or is written in capitals before normal text — so "Update the deck" and
  // "UPDATE THE REPORT" keep their first word.
  const withColon = text.replace(/^\s*update\s*:\s*/i, "");
  if (withColon !== text) return withColon;
  const beforeList = text.replace(/^\s*update\s*(?=\n|\d{1,2}[.)]\s|[-•*–—·▪]\s)/i, "");
  if (beforeList !== text) return beforeList;
  const m = /^\s*UPDATE(\s+|$)/.exec(text);
  if (!m) return text;
  const rest = text.slice(m[0].length);
  const firstLine = rest.split("\n")[0];
  const shouting = /[A-Z]/.test(firstLine) && firstLine === firstLine.toUpperCase();
  return shouting ? text : rest;
}

// Splits "1. a 2. b" style numbering inside one line. A line is only treated as a list when it
// starts with a number (or with a short intro ending in ":"), and only numbers that continue the
// sequence split it — so "Step 1. … Step 2. …", "Top 5", "V2.5" or "Canto 3 Book 1" are left alone.
function splitNumbered(line) {
  const marks = [];
  for (const m of line.matchAll(MARKER)) {
    marks.push({ start: m.index + m[1].length, end: m.index + m[0].length, n: Number(m[2]) });
  }
  if (!marks.length) return [line];
  const intro = line.slice(0, marks[0].start).trim();
  if (intro !== "" && !(intro.endsWith(":") && marks[0].n === 1)) return [line];
  const chosen = [marks[0]];
  let expect = marks[0].n + 1;
  for (const m of marks.slice(1)) if (m.n === expect) { chosen.push(m); expect++; }
  if (intro !== "" && chosen.length < 2) return [line];
  return chosen.map((m, i) => line.slice(m.end, i + 1 < chosen.length ? chosen[i + 1].start : line.length));
}

// Trim spaces and commas at both ends without a slow regular expression.
function trimEdges(s) {
  let a = 0, b = s.length;
  const junk = (c) => c === "," || c === " " || c === "\t" || c === "\u00a0";
  while (a < b && junk(s[a])) a++;
  while (b > a && junk(s[b - 1])) b--;
  return s.slice(a, b);
}

function clean(item) {
  return trimEdges(trimEdges(item).replace(BULLET, "").replace(/^\d{1,2}[.)](\s+|$)/, ""));
}

export function splitTasks(text) {
  if (typeof text !== "string") return [];
  return stripUpdatePrefix(text)
    .split(/[\n\r]+/)
    .flatMap((line) => splitNumbered(line.trim().replace(BULLET, "")))
    .flatMap((part) => part.split(/;(?=\s|$)/)) // ";" inside a web address is left alone
    .map(clean)
    .filter(Boolean);
}
