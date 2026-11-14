import { DEFAULT_GROUP } from "./model.js";

// Small keyword map (CLAUDE.md §6.3). Order matters: the first match wins.
const KEYWORDS = [
  ["Finance", ["bank", "transfer", "pay", "invoice"]],
  ["Shopping", ["buy", "shop"]],
  ["Health", ["doctor", "physio", "claim"]],
  [DEFAULT_GROUP, ["call", "meet", "review"]],
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 1) an existing group of that tab whose name appears in the task, 2) the keyword map,
// 3) "Inbox". The user can always change it.
export function suggestGroup(text, existingGroups = []) {
  const t = String(text || "").toLowerCase();
  const named = existingGroups
    .filter((g) => g && g.toLowerCase() !== DEFAULT_GROUP.toLowerCase())
    .filter((g) => new RegExp(`(^|[^a-z0-9])${escapeRe(g.toLowerCase())}($|[^a-z0-9])`).test(t))
    .sort((a, b) => b.length - a.length)[0];
  if (named) return named;
  for (const [group, words] of KEYWORDS) {
    if (words.some((w) => new RegExp(`(^|[^a-z0-9])${w}`).test(t))) {
      return existingGroups.find((g) => g.toLowerCase() === group.toLowerCase()) || group;
    }
  }
  return DEFAULT_GROUP;
}
