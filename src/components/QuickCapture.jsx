import { forwardRef } from "react";
import { splitTasks } from "../lib/splitTasks.js";
import { THEME, vars } from "../theme.js";
import { Sheet } from "./ui.jsx";

// Capture from any tab: opens with the text box focused so the keyboard (typing or dictation)
// comes up in one tap. Items go to WIP. The draft is shared with the WIP paste box, so closing
// the sheet by accident never loses what was typed or dictated.
const QuickCapture = forwardRef(function QuickCapture({ text, setText, onAdd, onClose }, ref) {
  const items = splitTasks(text);
  return (
    // pinned to the top of the screen so the keyboard never covers it
    <Sheet title="Quick add to WIP" theme={{ ...vars(THEME.wip), marginTop: 4, marginBottom: "auto" }} onClose={onClose}>
      <textarea ref={ref} className="field" rows={5} value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Type or dictate tasks — one per line, or a numbered list" aria-label="Quick add tasks" />
      <p className="muted" style={{ margin: "8px 0 12px" }}>
        {items.length === 0 ? "Each line becomes one item in WIP." : `${items.length} ${items.length === 1 ? "task" : "tasks"} will be added to WIP.`}
      </p>
      <div className="row">
        <button className="primary f2" disabled={items.length === 0} onClick={() => { onAdd(items); setText(""); onClose(); }}>
          + Add to WIP{items.length > 1 ? ` (${items.length} tasks)` : ""}
        </button>
        <button className="ghost" onClick={onClose}>Close</button>
      </div>
    </Sheet>
  );
});

export default QuickCapture;
