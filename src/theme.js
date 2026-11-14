// One calm, neutral scheme (light or dark, set in styles.css). Each tab keeps its own colour
// only as an accent: `bright` is used for text on dark surfaces, `strong` for text on light
// surfaces and for filled buttons (white text on `strong` is always readable).
export const THEME = {
  work:     { bright: "#5ba3f5", strong: "#1a63c4" },
  personal: { bright: "#52c97a", strong: "#177a3d" },
  seva:     { bright: "#e07b35", strong: "#b4440c" },
  wip:      { bright: "#9b7fe8", strong: "#6447c4" },
  ai:       { bright: "#a78bfa", strong: "#6d4fd6" },
  matrix:   { bright: "#c9ced8", strong: "#374151" },
};

// AI sub-tab colours are fixed by position; names come from the user's labels.
export const AI_SUB = {
  ai1: { bright: "#f472b6", strong: "#c72c80" },
  ai2: { bright: "#34d399", strong: "#087a55" },
  ai3: { bright: "#a78bfa", strong: "#6d4fd6" },
  ai4: { bright: "#fb923c", strong: "#a05f00" },
};

export const themeOf = (key) => THEME[key] || AI_SUB[key];

// Sets the accent for an element and everything inside it (see `[style*="--bright"]` in styles.css).
export const vars = (t) => ({ "--bright": t.bright, "--strong": t.strong });

export const MATRIX_CFG = [
  { key: "doFirst",   label: "🔥 Do First",  desc: "Urgent + Important",     onLight: "#b91c1c", onDark: "#f87171" },
  { key: "schedule",  label: "⭐ Schedule",   desc: "Important · Not Urgent", onLight: "#92400e", onDark: "#fbbf24" },
  { key: "delegate",  label: "📋 Delegate",  desc: "Urgent · Not Important", onLight: "#9a3412", onDark: "#fb923c" },
  { key: "eliminate", label: "🗑️ Eliminate", desc: "Neither",                onLight: "#374151", onDark: "#aab1bd" },
];
export const cellVars = (cfg) => ({ "--mc-l": cfg.onLight, "--mc-d": cfg.onDark });
