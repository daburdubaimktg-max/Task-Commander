import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Briefcase, Heart, Inbox, LayoutGrid, Plus, Settings, User, X, Zap } from "lucide-react";
import { DOMAINS, defaultState, groupsOf, newId } from "./lib/model.js";
import { backupNudge, mergeAdd } from "./lib/backup.js";
import { NUDGE_KEY, PERSIST_KEY, PREV_KEY, getItem, keepUnreadable, loadState, removeItem, saveState, setItem } from "./lib/storage.js";
import { THEME, vars } from "./theme.js";
import DomainTab from "./components/DomainTab.jsx";
import WipTab from "./components/WipTab.jsx";
import AiTab from "./components/AiTab.jsx";
import SuperMatrix from "./components/SuperMatrix.jsx";
import BackupSheet from "./components/BackupSheet.jsx";
import Recovery from "./components/Recovery.jsx";
import QuickCapture from "./components/QuickCapture.jsx";

function boot() {
  removeItem(PREV_KEY); // "Undo import" lasts only until the app is closed
  return loadState();
}

export default function App() {
  const [initial] = useState(boot);
  const [store, setStore] = useState(initial.state);
  const [welcome, setWelcome] = useState(initial.firstRun);
  // Set when saved data exists but could not be read. Nothing is saved while this is set.
  const [blocked, setBlocked] = useState(initial.blocked);
  const [tab, setTab] = useState("work");
  const [wipDraft, setWipDraft] = useState("");
  const [aiSub, setAiSub] = useState("ai1");
  const [now, setNow] = useState(() => Date.now());
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const captureRef = useRef(null);
  const [undo, setUndo] = useState(null);
  const [nudgeDismissedAt, setNudgeDismissedAt] = useState(() => getItem(NUDGE_KEY));
  const lastSaved = useRef(store);
  const tabRefs = useRef({});

  // Save on every change. "✓ Saved" shows only after a confirmed write; a failure stays visible.
  useEffect(() => {
    if (blocked || store === lastSaved.current) return;
    lastSaved.current = store;
    const r = saveState(store);
    if (!r.ok) {
      setSaveError(r.error);
      setSaved(false);
      return;
    }
    setSaveError(null);
    setWelcome(false);
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1200);
    return () => clearTimeout(t);
  }, [store, blocked]);

  // When the app comes back to the front: refresh the clock (so the backup nudge is current)
  // and, if the last save failed, try it again.
  const storeRef = useRef(store);
  storeRef.current = store;
  const saveErrorRef = useRef(saveError);
  saveErrorRef.current = saveError;
  useEffect(() => {
    const wake = () => {
      if (document.visibilityState === "hidden") return;
      setNow(Date.now());
      if (saveErrorRef.current && saveState(storeRef.current).ok) setSaveError(null);
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("pageshow", wake);
    const timer = setInterval(wake, 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("pageshow", wake);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    tabRefs.current[tab]?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [tab]);

  // Any edit ends the chance to undo an import: undoing later would throw the edit away.
  const dropUndo = () => {
    if (!undo) return;
    setUndo(null);
    removeItem(PREV_KEY);
  };
  const setData = (fn) => {
    dropUndo();
    setStore((s) => ({ ...s, data: fn(s.data) }));
  };
  const { data, labels } = store;

  // iOS only raises the keyboard when focus happens inside the tap itself, so the sheet is
  // rendered synchronously and its text box focused before the handler returns.
  const openCapture = () => {
    flushSync(() => setCaptureOpen(true));
    captureRef.current?.focus();
  };
  const addToWip = (texts) => {
    const fresh = texts.map((task) => ({ id: newId(), task, domain: null, urgent: false, important: false }));
    setData((d) => ({ ...d, wip: [...d.wip, ...fresh] }));
  };

  const groupsByDomain = useMemo(
    () => Object.fromEntries(DOMAINS.map((d) => [d, groupsOf(store, d)])),
    [store],
  );

  const all = [...data.work, ...data.personal, ...data.seva];
  const done = all.filter((t) => t.completed).length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const nudge = backupNudge(store, now, nudgeDismissedAt);

  const startEmpty = () => {
    const r = saveState(store);
    if (r.ok) setWelcome(false);
    else setSaveError(r.error);
  };

  const afterImport = () => {
    if (blocked) {
      keepUnreadable(blocked.raw);
      setBlocked(null);
    }
    setTab("work");
    if (!getItem(PERSIST_KEY)) {
      setItem(PERSIST_KEY, "1");
      try { navigator.storage?.persist?.()?.catch?.(() => {}); } catch { /* unsupported: harmless */ }
    }
  };
  const importReplace = (incoming) => {
    if (!blocked) {
      setItem(PREV_KEY, JSON.stringify(store));
      setUndo(store);
    }
    setStore(incoming);
    afterImport();
  };
  const importAdd = (incoming) => {
    const merged = mergeAdd(store, incoming);
    setItem(PREV_KEY, JSON.stringify(store));
    setUndo(store);
    setStore(merged.state);
    afterImport();
    return merged;
  };
  const startFresh = () => {
    keepUnreadable(blocked?.raw);
    const fresh = defaultState();
    const r = saveState(fresh);
    setBlocked(null);
    lastSaved.current = fresh;
    setStore(fresh);
    setWelcome(true);
    if (!r.ok) setSaveError(r.error);
  };
  const undoImport = () => {
    if (!undo) return;
    setStore(undo);
    setUndo(null);
    removeItem(PREV_KEY);
  };
  const markBackedUp = (when) =>
    setStore((s) => ({ ...s, meta: { ...s.meta, lastBackupAt: when.toISOString() } }));
  const dismissNudge = () => {
    const at = String(Date.now());
    setItem(NUDGE_KEY, at);
    setNudgeDismissedAt(at);
    setNow(Date.now());
  };

  const TABS = [
    { key: "wip", Icon: Inbox, label: "WIP", color: THEME.wip.light, badge: data.wip.length },
    { key: "work", Icon: Briefcase, label: labels.work, color: THEME.work.light },
    { key: "personal", Icon: User, label: labels.personal, color: THEME.personal.light },
    { key: "seva", Icon: Heart, label: labels.seva, color: THEME.seva.light },
    { key: "ai", Icon: Zap, label: labels.ai, color: "#a78bfa" },
    { key: "matrix", Icon: LayoutGrid, label: "Super Matrix", color: "#c9ced8" },
  ];

  const welcomeCard = welcome && (
    <div className="card pad welcome" style={vars(THEME.wip)}>
      <h3>Welcome</h3>
      <p className="note mb">
        This app keeps your tasks on this phone only. If you have a backup file, import it now. Otherwise start with an empty list.
      </p>
      <div className="row">
        <button className="primary" onClick={() => setBackupOpen(true)}>Import your backup</button>
        <button className="ghost" onClick={startEmpty}>Start empty</button>
      </div>
    </div>
  );

  if (blocked) {
    return (
      <div className="app">
        <Recovery blocked={blocked} onImport={() => setBackupOpen(true)} onStartFresh={startFresh} />
        {backupOpen && (
          <BackupSheet state={store} canUndo={false} importOnly onBackedUp={() => {}} onReplace={importReplace} onAdd={importReplace}
            onUndo={() => {}} onClose={() => setBackupOpen(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-top">
          <div className="title-wrap">
            <div className="title">
              <span className="logo" aria-hidden="true">
                <i style={{ background: "#5ba3f5" }} /><i style={{ background: "#52c97a" }} />
                <i style={{ background: "#e07b35" }} /><i style={{ background: "#9b7fe8" }} />
              </span>
              <span>Task Command Center</span>
            </div>
            <div className="subtitle">Offline · saved on this phone</div>
          </div>
          <div className="progress-wrap">
            <div className={`saved${saved ? " on" : ""}`} aria-live="polite">{saved ? "✓ Saved" : ""}</div>
            <div className={`progress-text${saved ? " hide" : ""}`}>{done}/{all.length} · {pct}%</div>
            <div className="bar global"><i style={{ width: `${pct}%` }} /></div>
          </div>
          <button className="icon-btn add" aria-label="Quick add to WIP" onClick={openCapture}><Plus size={22} strokeWidth={2.6} /></button>
          <button className="icon-btn" aria-label="Backup" onClick={() => setBackupOpen(true)}><Settings size={20} /></button>
        </div>

        <div className="tabs" role="tablist">
          {TABS.map(({ key, Icon, label, color, badge }) => (
            <button key={key} ref={(el) => { tabRefs.current[key] = el; }} role="tab" aria-selected={tab === key}
              className={`tab${tab === key ? " on" : ""}`} style={{ "--c": color }} onClick={() => setTab(key)}>
              <Icon size={15} />{label}
              {badge > 0 && <span className="badge">{badge}</span>}
            </button>
          ))}
        </div>

        {saveError && (
          <div className="banner red" role="alert">
            <button className="grow" onClick={() => setBackupOpen(true)}>Not saved — <u>export a backup now</u></button>
          </div>
        )}
        {nudge && !saveError && (
          <div className="banner amber">
            <button className="grow" onClick={() => setBackupOpen(true)}>{nudge} · <u>Back up now</u></button>
            <button className="x" aria-label="Dismiss for a day" onClick={dismissNudge}><X size={18} /></button>
          </div>
        )}
      </div>

      <div className="content" key={tab}>
        {tab === "wip" && (
          <WipTab items={data.wip} labels={labels} groupsByDomain={groupsByDomain} setData={setData} draft={wipDraft} setDraft={setWipDraft} />
        )}
        {DOMAINS.includes(tab) && (
          <DomainTab key={tab} domain={tab} labels={labels} tasks={data[tab]} groupsByDomain={groupsByDomain} setData={setData}>
            {tab === "work" && welcomeCard}
          </DomainTab>
        )}
        {tab === "ai" && <AiTab ai={data.ai} labels={labels} setData={setData} sub={aiSub} setSub={setAiSub} />}
        {tab === "matrix" && <SuperMatrix state={store} />}
      </div>

      {captureOpen && (
        <QuickCapture ref={captureRef} text={wipDraft} setText={setWipDraft} onAdd={addToWip} onClose={() => setCaptureOpen(false)} />
      )}
      {backupOpen && (
        <BackupSheet state={store} canUndo={!!undo} onBackedUp={markBackedUp} onReplace={importReplace} onAdd={importAdd}
          onUndo={undoImport} onClose={() => setBackupOpen(false)} />
      )}
    </div>
  );
}
