import { DOMAINS, AI_KEYS } from "./model.js";

// Quadrant is computed, never stored. Completed tasks never appear in any matrix.
export function quadrantOf(t) {
  if (t.important && t.urgent) return "doFirst";
  if (t.important) return "schedule";
  if (t.urgent) return "delegate";
  return "eliminate";
}

export function getMatrix(list) {
  const m = { doFirst: [], schedule: [], delegate: [], eliminate: [] };
  for (const t of list) if (!t.completed) m[quadrantOf(t)].push(t);
  return m;
}

export const aiPrefix = (label) => `AI-${String(label).toUpperCase()} · `;

// Every open task from every tab, tagged with where it came from.
export function superMatrixTasks(state) {
  const { data, labels } = state;
  return [
    ...DOMAINS.flatMap((k) => data[k].filter((t) => !t.completed).map((t) => ({ ...t, source: k }))),
    ...AI_KEYS.flatMap((k) =>
      data.ai[k]
        .filter((t) => !t.completed)
        .map((t) => ({ ...t, task: aiPrefix(labels[k]) + t.task, source: k })),
    ),
  ];
}
