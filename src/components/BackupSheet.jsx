import { useState } from "react";
import { ClipboardCopy, Download, MessageSquareText, Upload } from "lucide-react";
import { CLAUDE_PROJECT_INSTRUCTIONS, claudeSummary } from "../lib/claude.js";
import { backupFilename, buildBackup, parseBackup, summarize } from "../lib/backup.js";
import { totalTasks } from "../lib/model.js";
import { THEME, vars } from "../theme.js";
import { Sheet } from "./ui.jsx";

function download(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older Safari: fall back to a hidden text box.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export default function BackupSheet({ state, canUndo, importOnly = false, themePref = "auto", onTheme, onBackedUp, onReplace, onAdd, onUndo, onClose }) {
  const [msg, setMsg] = useState(null); // { kind: "ok" | "err", text }
  const [pasted, setPasted] = useState("");
  const [preview, setPreview] = useState(null); // parsed incoming state
  const has = totalTasks(state) > 0;
  const last = state.meta.lastBackupAt ? new Date(state.meta.lastBackupAt) : null;

  const exportBackup = async () => {
    const now = new Date();
    const json = JSON.stringify(buildBackup(state, now), null, 2);
    const name = backupFilename(now);
    setMsg(null);
    for (const type of ["application/json", "text/plain"]) {
      const file = new File([json], name, { type });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: name });
          onBackedUp(now);
          setMsg({ kind: "ok", text: `Backup shared as ${name}. Keep it somewhere safe (Files, mail).` });
        } catch (e) {
          if (e?.name !== "AbortError") setMsg({ kind: "err", text: "Sharing did not work. Use “Copy backup text” instead and paste it into Notes or a mail." });
        }
        return;
      }
    }
    try {
      download(new File([json], name, { type: "application/json" }));
      onBackedUp(now);
      setMsg({ kind: "ok", text: `Backup downloaded as ${name}. If no file appeared, use “Copy backup text”.` });
    } catch {
      setMsg({ kind: "err", text: "Could not create the file. Use “Copy backup text” instead." });
    }
  };

  const copyBackup = async () => {
    const now = new Date();
    const ok = await copyText(JSON.stringify(buildBackup(state, now), null, 2));
    if (ok) {
      onBackedUp(now);
      setMsg({ kind: "ok", text: "Backup text copied. Paste it into Notes or a mail to yourself now — it is only safe once pasted." });
    } else {
      setMsg({ kind: "err", text: "Copy was blocked. Try “Export backup” instead." });
    }
  };

  const copyForClaude = async () => {
    const ok = await copyText(claudeSummary(state));
    setMsg(ok
      ? { kind: "ok", text: "Task summary copied. Paste it into your Claude project chat." }
      : { kind: "err", text: "Copy was blocked. Try again." });
  };
  const copyInstructions = async () => {
    const ok = await copyText(CLAUDE_PROJECT_INSTRUCTIONS);
    setMsg(ok
      ? { kind: "ok", text: "Instructions copied. Paste them once into the Claude project's instructions." }
      : { kind: "err", text: "Copy was blocked. Try again." });
  };

  const check = (text) => {
    try {
      setPreview(parseBackup(text));
      setMsg(null);
    } catch (e) {
      setPreview(null);
      setMsg({ kind: "err", text: e?.message || "This file could not be imported." });
    }
  };

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      check(await file.text());
    } catch {
      setMsg({ kind: "err", text: "That file could not be opened." });
    }
  };

  const apply = (fn, text) => {
    const result = fn(preview);
    setPreview(null);
    setPasted("");
    const counts = result && typeof result.added === "number"
      ? `Imported. ${result.added} added, ${result.skipped} already here and skipped.`
      : text;
    setMsg({ kind: "ok", text: counts });
    if (importOnly) onClose();
  };

  return (
    <Sheet title="Backup & settings" theme={vars(THEME.wip)} onClose={onClose}>
      <p className="note mb">
        Your tasks live only on this phone. Deleting the home-screen icon or clearing Safari data erases them, so keep a backup file.
        {" "}{importOnly ? "" : last ? `Last backup: ${last.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}.` : "No backup yet."}
      </p>

      {msg && <div className={`msg ${msg.kind}`} role="status">{msg.text}</div>}

      {canUndo && !preview && (
        <button className="ghost mb" style={{ width: "100%" }} onClick={() => { onUndo(); setMsg({ kind: "ok", text: "Import undone. Your earlier tasks are back." }); }}>
          ↩ Undo import
        </button>
      )}

      {preview ? (
        <>
          <div className="msg preview">
            <b>This backup contains</b><br />{summarize(preview)}
            {!importOnly && <><br /><span className="muted">On this phone now: {summarize(state)}</span></>}
          </div>
          <button className="primary mb" onClick={() => apply(onReplace, "Imported. Everything was replaced by the backup.")}>
            {importOnly ? "Import this backup" : "Replace everything"}
          </button>
          <div className="row">
            {!importOnly && (
              <button className="ghost" onClick={() => apply(onAdd, "Imported. New tasks were added to what was already here.")}>Add to existing</button>
            )}
            <button className="ghost" onClick={() => setPreview(null)}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          {!importOnly && (
            <>
              <div className="label dim">Save a backup</div>
              <div className="row mb">
                <button className="opt" disabled={!has} onClick={exportBackup}><Download size={15} /> Export backup</button>
                <button className="opt" disabled={!has} onClick={copyBackup}><ClipboardCopy size={15} /> Copy backup text</button>
              </div>
            </>
          )}

          <div className={importOnly ? undefined : "divider"}>
            <div className="label dim">Import a backup</div>
            <label className="opt file-btn mb">
              <Upload size={15} /> Choose backup file
              <input type="file" accept=".json,application/json,.txt,text/plain" onChange={pickFile} aria-label="Choose backup file" />
            </label>
            <textarea className="field" rows={3} value={pasted} onChange={(e) => setPasted(e.target.value)}
              placeholder="…or paste backup text here" aria-label="Paste backup text" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            <button className="ghost" style={{ width: "100%", marginTop: 8 }} disabled={!pasted.trim()} onClick={() => check(pasted)}>
              Check pasted text
            </button>
          </div>

          {!importOnly && (
            <>
              <div className="divider">
                <div className="label dim">Work with Claude</div>
                <p className="note" style={{ marginBottom: 10 }}>
                  Copies your open tasks as text to paste into your Claude project. Nothing is sent anywhere by the app.
                </p>
                <button className="opt mb" style={{ width: "100%" }} disabled={!has} onClick={copyForClaude}>
                  <MessageSquareText size={15} /> Copy tasks for Claude
                </button>
                <button className="ghost" style={{ width: "100%" }} onClick={copyInstructions}>Copy instructions for the Claude project</button>
              </div>

              <div className="divider">
                <div className="label dim">Appearance</div>
                <div className="row">
                  {[["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]].map(([k, name]) => (
                    <button key={k} className={`opt seg${themePref === k ? " on" : ""}`} aria-pressed={themePref === k} onClick={() => onTheme?.(k)}>{name}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
