import { DEFAULT_GROUP } from "./model.js";

// Small keyword map (CLAUDE.md §6.3). Order matters: the first match wins.
// Whole words only, with their everyday endings — "payment" yes, "payroll" or a name starting with "Pay" no.
const KEYWORDS = [
  ["Finance", ["bank", "banks", "banking", "transfer", "transfers", "transferred", "transferring",
    "pay", "pays", "paid", "paying", "payment", "payments", "invoice", "invoices", "invoiced", "invoicing"]],
  ["Shopping", ["buy", "buys", "buying", "bought", "shop", "shops", "shopping"]],
  ["Health", ["doctor", "doctors", "physio", "physiotherapy", "physiotherapist", "claim", "claims"]],
  [DEFAULT_GROUP, ["call", "meet", "review"]],
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (text, word) => new RegExp(`(^|[^a-z0-9])${escapeRe(word)}($|[^a-z0-9])`).test(text);

// 1) an existing group of that tab whose name appears in the task, 2) the keyword map,
// 3) "Inbox". The user can always change it.
export function suggestGroup(text, existingGroups = []) {
  const t = String(text || "").toLowerCase();
  const groups = (Array.isArray(existingGroups) ? existingGroups : []).filter((g) => typeof g === "string" && g);
  const named = groups
    .filter((g) => g.toLowerCase() !== DEFAULT_GROUP.toLowerCase())
    .filter((g) => hasWord(t, g.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];
  if (named) return named;
  for (const [group, words] of KEYWORDS) {
    if (words.some((w) => hasWord(t, w))) {
      return groups.find((g) => g.toLowerCase() === group.toLowerCase()) || group;
    }
  }
  return DEFAULT_GROUP;
}
