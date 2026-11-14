import { AI_KEYS, DOMAINS } from "./model.js";
import { getMatrix } from "./matrix.js";

const QUADRANTS = [["doFirst", "Do First"], ["schedule", "Schedule"], ["delegate", "Delegate"], ["eliminate", "Eliminate"]];

function section(lines, heading, list, withGroup) {
  const open = list.filter((t) => !t.completed).length;
  const done = list.length - open;
  lines.push("", `${heading} — ${open} open, ${done} done`);
  if (open === 0) return;
  const m = getMatrix(list);
  for (const [key, name] of QUADRANTS) {
    if (!m[key].length) continue;
    lines.push(`${name}:`);
    for (const t of m[key]) lines.push(`- ${withGroup ? `[${t.group}] ` : ""}${t.task}`);
  }
}

// A plain-text picture of the open tasks, for pasting into a Claude chat. It leaves the phone
// only through the clipboard, when the user taps the button.
export function claudeSummary(state, now = new Date()) {
  const { data, labels } = state;
  const date = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const lines = [
    `TASK COMMAND CENTER — my current tasks (${date})`,
    "Quadrants: Do First = urgent + important · Schedule = important only · Delegate = urgent only · Eliminate = neither.",
    "Completed tasks are counted but not listed.",
  ];
  for (const k of DOMAINS) section(lines, `## ${labels[k]}`, data[k], true);
  lines.push("", `## ${labels.ai}`);
  for (const k of AI_KEYS) section(lines, `### ${labels[k]}`, data.ai[k], false);
  lines.push("", `## WIP — ${data.wip.length} not sorted yet`);
  for (const t of data.wip) lines.push(`- ${t.task}`);
  lines.push("", "When you give me new tasks to add, reply with one line I can paste into the app:", "UPDATE: 1. first task 2. second task");
  return lines.join("\n");
}

// Paste this once into the Claude project's instructions.
export const CLAUDE_PROJECT_INSTRUCTIONS = [
  "You help me run my week from my Task Command Center, a task app on my iPhone.",
  "",
  "How the app is organised",
  "- Tabs: Work, Personal, Seva, AI Learning (four sub-tabs) and WIP (an inbox of tasks not sorted yet).",
  "- Every task sits in an Eisenhower quadrant: Do First (urgent + important), Schedule (important only), Delegate (urgent only), Eliminate (neither).",
  "- Work, Personal and Seva tasks also have a group, shown in square brackets.",
  "",
  "What I will paste to you",
  "- A block that starts with TASK COMMAND CENTER and lists my open tasks by tab and quadrant. Treat the newest block as the truth and forget older ones. You cannot see the app; you only know what I paste.",
  "",
  "What I want back",
  "- When I ask for new tasks, or when your advice produces tasks, end your reply with one line in exactly this form, so I can paste it into the app's Voice box (the mic button):",
  "  UPDATE: 1. first task 2. second task 3. third task",
  "- Keep each task short, start it with a verb, and do not put numbers followed by a full stop inside a task.",
  "- After each task you may add where it should go, in brackets at the end, for example (Work, urgent). I sort tasks myself in the app.",
  "- You cannot tick, edit or delete tasks in the app. If something should be ticked off or removed, tell me in plain words and I will do it.",
].join("\n");
