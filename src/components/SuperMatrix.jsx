import { AI_KEYS, DOMAINS } from "../lib/model.js";
import { getMatrix, superMatrixTasks } from "../lib/matrix.js";
import { MATRIX_CFG, cellVars, themeOf } from "../theme.js";

export default function SuperMatrix({ state }) {
  const { labels } = state;
  const matrix = getMatrix(superMatrixTasks(state));
  return (
    <div className="page super force-light">
      <h2>Super Matrix</h2>
      <div className="legend">
        <span>All active tasks ·</span>
        {DOMAINS.map((k) => <span key={k}><i style={{ background: themeOf(k).strong }} />{labels[k]}</span>)}
        {AI_KEYS.map((k) => <span key={k}><i style={{ background: themeOf(k).strong }} />AI-{labels[k]}</span>)}
      </div>
      <div className="grid2">
        {MATRIX_CFG.map((cfg) => {
          const tasks = matrix[cfg.key];
          return (
            <div key={cfg.key} className="scell" style={cellVars(cfg)}>
              <div className="scell-head">
                <b>{cfg.label}</b>
                <small>{cfg.desc} · {tasks.length} {tasks.length === 1 ? "task" : "tasks"}</small>
              </div>
              <div className="scell-body">
                {tasks.length === 0
                  ? <p className="none">No tasks</p>
                  : tasks.map((t) => <div key={t.id} className="mitem" style={{ "--ic": themeOf(t.source).strong }}>{t.task}</div>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
