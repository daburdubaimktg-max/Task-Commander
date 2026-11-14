import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Check, Mic, Square } from "lucide-react";
import { parseVoice, placeName } from "../lib/voice.js";
import { THEME, themeOf, vars } from "../theme.js";
import { Sheet } from "./ui.jsx";

const Recognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

function describe(a, labels) {
  const where = (k) => placeName(labels, k);
  switch (a.kind) {
    case "add": {
      const pr = [a.urgent && "urgent", a.important && "important"].filter(Boolean).join(" + ");
      return { verb: `Add to ${a.dest ? where(a.dest) : "WIP"}${pr ? ` · ${pr}` : ""}`, tone: a.dest ? themeOf(a.dest) : THEME.wip };
    }
    case "done": return { verb: "Mark done", tone: THEME.personal };
    case "flag": return { verb: `${a.value ? "Make" : "Make not"} ${a.field}`, tone: THEME.seva };
    case "move": return { verb: `Move to ${where(a.dest)}`, tone: themeOf(a.dest) };
    default: return { verb: "Delete", tone: null };
  }
}

// One proposed action. Nothing is applied until the row is ticked and Apply is tapped.
function Row({ a, labels, on, pick, onToggle, onPick, asNew, onAsNew }) {
  const { verb, tone } = describe(a, labels);
  const isAdd = a.kind === "add";
  const none = !isAdd && a.matches.length === 0;
  const many = !isAdd && a.matches.length > 1;
  const target = isAdd ? null : a.matches.length === 1 ? a.matches[0] : a.matches.find((t) => t.id === pick);
  return (
    <div className={`vrow${a.kind === "delete" ? " del" : ""}${none ? " nomatch" : ""}`} style={tone && !none ? vars(tone) : undefined}>
      <button className="hit" role="checkbox" aria-checked={none ? asNew : on} aria-label={none ? "Add as a new task instead" : `${verb}: ${isAdd ? a.text : a.query}`}
        disabled={many && !target} onClick={none ? onAsNew : onToggle}>
        <span className={`box${(none ? asNew : on) ? " on" : ""}`}>{(none ? asNew : on) && <Check size={15} strokeWidth={3} />}</span>
      </button>
      <div className="vbody">
        {none ? (
          <>
            <div className="vverb warn">No task matches “{a.query}”</div>
            <div className="vtext">Tick to add “{a.clause}” to WIP as a new task instead.</div>
          </>
        ) : (
          <>
            <div className="vverb">{verb}{a.kind === "delete" && " — tick to confirm"}</div>
            {isAdd && <div className="vtext">{a.text}</div>}
            {target && !many && <div className="vtext">{target.task} <span className="muted">· {target.place}</span></div>}
            {many && (
              <>
                <div className="muted" style={{ margin: "2px 0 6px" }}>Several tasks match “{a.query}”. Which one?</div>
                {a.matches.map((t) => (
                  <button key={t.id} className={`opt vpick${pick === t.id ? " on" : ""}`} aria-pressed={pick === t.id} onClick={() => onPick(t.id)}>
                    <span>{t.task} <span className="vplace">· {t.place}</span></span>
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Dictate or type; the app shows what it understood; Apply makes the changes.
// The text box is shared with the WIP paste box, so closing the sheet never loses a draft.
const VoiceSheet = forwardRef(function VoiceSheet({ state, text, setText, onApply, onClose }, ref) {
  const actions = useMemo(() => parseVoice(text, state), [text, state]);
  const [off, setOff] = useState({}); // rows the user unticked
  const [yes, setYes] = useState({}); // deletes and "add instead" rows the user ticked
  const [picks, setPicks] = useState({}); // chosen task where several match
  const [help, setHelp] = useState(false);
  const [listening, setListening] = useState(false);
  const [micMsg, setMicMsg] = useState("");
  const rec = useRef(null);
  const key = (a) => `${a.n}|${a.clause}`;

  useEffect(() => () => { try { rec.current?.abort(); } catch { /* already stopped */ } }, []);

  const chosen = [];
  for (const a of actions) {
    const k = key(a);
    if (a.kind === "add") { if (!off[k]) chosen.push(a); continue; }
    if (a.matches.length === 0) {
      if (yes[k]) chosen.push({ kind: "add", text: a.clause, dest: null, urgent: false, important: false });
      continue;
    }
    const target = a.matches.length === 1 ? a.matches[0] : a.matches.find((t) => t.id === picks[k]);
    if (!target) continue;
    const ticked = a.kind === "delete" ? !!yes[k] : !off[k];
    if (ticked) chosen.push({ ...a, target });
  }

  const toggleMic = () => {
    if (listening) { rec.current?.stop(); return; }
    try {
      const r = new Recognition();
      r.continuous = true;
      r.interimResults = false;
      r.lang = navigator.language || "en-GB";
      r.onresult = (e) => {
        let said = "";
        for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) said += e.results[i][0].transcript;
        said = said.trim();
        if (said) setText((t) => (t.trim() ? `${t.trimEnd()}\n${said}` : said));
      };
      r.onerror = (e) => { setMicMsg(e.error === "not-allowed" ? "Microphone access was refused. Use the keyboard's mic key or Wispr Flow instead." : "The built-in microphone did not work here. Use the keyboard's mic key or Wispr Flow instead."); setListening(false); };
      r.onend = () => setListening(false);
      rec.current = r;
      r.start();
      setMicMsg("");
      setListening(true);
    } catch {
      setMicMsg("The built-in microphone is not available here. Use the keyboard's mic key or Wispr Flow instead.");
    }
  };

  const apply = () => {
    onApply(chosen);
    setText("");
    onClose();
  };

  return (
    <Sheet title="Voice — add and update" theme={{ ...vars(THEME.wip), marginTop: 4, marginBottom: "auto" }} onClose={onClose}>
      <textarea ref={ref} className="field" rows={4} value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Dictate or type. For example: Add call the bank to Work, urgent. Mark expense claims done."
        aria-label="Dictate or type" />
      <div className="row" style={{ margin: "8px 0 4px" }}>
        {Recognition && (
          <button className={`opt${listening ? " urgent on" : ""}`} onClick={toggleMic} aria-pressed={listening}>
            {listening ? <><Square size={15} /> Stop listening</> : <><Mic size={15} /> Use built-in mic</>}
          </button>
        )}
        <button className="opt" aria-expanded={help} onClick={() => setHelp((h) => !h)}>{help ? "Hide examples" : "What can I say?"}</button>
      </div>
      {micMsg && <div className="msg err" role="status">{micMsg}</div>}
      {help && (
        <div className="msg preview vhelp">
          <b>Add</b> — just say the task; it goes to WIP. Or: “Add call the bank to Work, urgent”.<br />
          <b>Done</b> — “Mark expense claims done” · “Done with car service”.<br />
          <b>Priority</b> — “Make budget notes urgent” · “Mark team review as not important”.<br />
          <b>Move</b> — “Move car service to Work”.<br />
          <b>Delete</b> — “Delete printer ink” (you tick it to confirm).<br />
          Say several in a row, one sentence each. With Wispr Flow or the keyboard's mic key, tap the box and speak.
        </div>
      )}

      {actions.length > 0 && <div className="label dim" style={{ marginTop: 12 }}>What will happen</div>}
      <div className="vlist">
        {actions.map((a) => {
          const k = key(a);
          return (
            <Row key={k} a={a} labels={state.labels}
              on={a.kind === "delete" ? !!yes[k] : !off[k]} pick={picks[k]} asNew={!!yes[k]}
              onToggle={() => (a.kind === "delete" ? setYes((y) => ({ ...y, [k]: !y[k] })) : setOff((o) => ({ ...o, [k]: !o[k] })))}
              onPick={(id) => setPicks((p) => ({ ...p, [k]: id }))}
              onAsNew={() => setYes((y) => ({ ...y, [k]: !y[k] }))} />
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="primary f2" disabled={chosen.length === 0} onClick={apply}>
          {chosen.length === 0 ? "Nothing to apply" : `✓ Apply ${chosen.length} ${chosen.length === 1 ? "change" : "changes"}`}
        </button>
        <button className="ghost" onClick={onClose}>Close</button>
      </div>
    </Sheet>
  );
});

export default VoiceSheet;
