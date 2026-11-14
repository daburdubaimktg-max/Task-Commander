import { useState } from "react";
import { THEME, vars } from "../theme.js";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Shown instead of the app when saved data exists but cannot be read. Nothing is saved or
// overwritten until the user picks one of these options.
export default function Recovery({ blocked, onImport, onStartFresh }) {
  const [confirm, setConfirm] = useState(false);
  const [shownAt, setShownAt] = useState(0);
  const [msg, setMsg] = useState("");
  const raw = blocked.raw;

  const share = async () => {
    const file = new File([raw], "task-command-center-unreadable.txt", { type: "text/plain" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
    }
    setMsg((await copyText(raw)) ? "Copied. Paste it into Notes or a mail to keep it." : "Could not copy. Select the text below and copy it by hand.");
  };

  return (
    <div className="content">
      <div className="page" style={{ ...vars(THEME.wip), paddingTop: "calc(24px + env(safe-area-inset-top))" }}>
        <div className="card pad">
          <h2 className="danger-title">Your saved tasks could not be read</h2>
          {raw === null ? (
            <p className="note mb">
              The phone did not let the app read its saved data just now. Nothing has been changed or deleted.
              Close the app completely and open it again. If this keeps happening, import your last backup.
            </p>
          ) : (
            <p className="note mb">
              The saved data on this phone is damaged. Nothing has been deleted and nothing will be saved over it
              until you choose what to do. First keep a copy of the damaged data, then import your last backup.
            </p>
          )}
          {msg && <div className="msg ok" role="status">{msg}</div>}
          {raw !== null && (
            <button className="ghost mb" style={{ width: "100%" }} onClick={share}>Keep a copy of the damaged data</button>
          )}
          <button className="primary mb" onClick={onImport}>Import your backup</button>
          {raw === null ? (
            <button className="ghost" style={{ width: "100%" }} onClick={() => window.location.reload()}>Try again</button>
          ) : !confirm ? (
            <button className="danger" onClick={() => { setConfirm(true); setShownAt(Date.now()); }}>Start with an empty list</button>
          ) : (
            <div className="row">
              <button className="ghost" onClick={() => setConfirm(false)}>Cancel</button>
              <button className="danger solid" onClick={() => Date.now() - shownAt > 500 && onStartFresh()}>Yes, start empty</button>
            </div>
          )}
          {raw !== null && (
            <>
              <div className="label dim" style={{ marginTop: 16 }}>Damaged data (read-only)</div>
              <textarea className="field" rows={5} readOnly value={raw} aria-label="Damaged data" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
