// Colour worlds, taken from the reference. Dark greys are lifted so text stays readable on a phone.
export const THEME = {
  work:     { bg: "#060e1f", card: "#0b1832", border: "#1a3460", accent: "#1e4d8c", light: "#5ba3f5" },
  personal: { bg: "#050f08", card: "#091a0d", border: "#1a4025", accent: "#1e5c30", light: "#52c97a" },
  seva:     { bg: "#150800", card: "#221000", border: "#4a2000", accent: "#7a3a0a", light: "#e07b35" },
  wip:      { bg: "#0d0b18", card: "#16132a", border: "#2e2558", accent: "#3d2f6b", light: "#9b7fe8" },
  matrix:   { bg: "#f4f4f4", card: "#ffffff", border: "#e0e0e0", accent: "#ccc",    light: "#222" },
};

// AI sub-tab colours are fixed by position; names come from the user's labels.
export const AI_SUB = {
  ai1: { bg: "#1a0a1f", card: "#2a1040", border: "#6b21a8", light: "#f472b6", accent: "#7c3aed" },
  ai2: { bg: "#051a12", card: "#0a2e1e", border: "#065f46", light: "#34d399", accent: "#059669" },
  ai3: { bg: "#0f0a1f", card: "#1a1040", border: "#3730a3", light: "#a78bfa", accent: "#4f46e5" },
  ai4: { bg: "#1f0f00", card: "#2e1a00", border: "#92400e", light: "#fb923c", accent: "#c2410c" },
};

export const DOT = {
  work: THEME.work.light, personal: THEME.personal.light, seva: THEME.seva.light,
  ai1: AI_SUB.ai1.light, ai2: AI_SUB.ai2.light, ai3: AI_SUB.ai3.light, ai4: AI_SUB.ai4.light,
};

// Darker versions of the same hues, for text on the white Super Matrix.
export const DOT_ON_WHITE = {
  work: "#1d6fd6", personal: "#177a3d", seva: "#b4440c",
  ai1: "#c72c80", ai2: "#087a55", ai3: "#6d4fd6", ai4: "#b36b00",
};

export const themeOf = (key) => THEME[key] || AI_SUB[key];

export const vars = (t) => ({
  "--bg": t.bg, "--card": t.card, "--border": t.border, "--accent": t.accent, "--light": t.light,
});

export const MATRIX_CFG = [
  { key: "doFirst",   label: "🔥 Do First",  desc: "Urgent + Important",     border: "#dc2626", bg: "#fff5f5", textColor: "#b91c1c", onDark: "#f87171" },
  { key: "schedule",  label: "⭐ Schedule",   desc: "Important · Not Urgent", border: "#d97706", bg: "#fffbeb", textColor: "#92400e", onDark: "#fbbf24" },
  { key: "delegate",  label: "📋 Delegate",  desc: "Urgent · Not Important", border: "#ea580c", bg: "#fff7ed", textColor: "#9a3412", onDark: "#fb923c" },
  { key: "eliminate", label: "🗑️ Eliminate", desc: "Neither",                border: "#6b7280", bg: "#f9fafb", textColor: "#374151", onDark: "#aab1bd" },
];
