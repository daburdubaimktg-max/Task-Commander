import { useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, Heart, Inbox, LayoutGrid, Settings, User, X, Zap } from "lucide-react";
import { DOMAINS, groupsOf } from "./lib/model.js";
import { backupNudge, mergeAdd } from "./lib/backup.js";
import { NUDGE_KEY, PERSIST_KEY, PREV_KEY, getItem, loadState, removeItem, saveState, setItem } from "./lib/storage.js";
import { THEME, vars } from "./theme.js";
import DomainTab from "./components/DomainTab.jsx";
import WipTab from "./components/WipTab.jsx";
import AiTab from "./components/AiTab.jsx";
import SuperMatrix from "./components/SuperMatrix.jsx";
import BackupSheet from "./components/BackupSheet.jsx";

function boot() {
  removeItem(PREV_KEY); // "Undo import" lasts only until the app is closed
  return loadState();
}

export default function App() {
  const [initial] = useState(boot);
  const [store, setStore] = useState(initial.state);
  const [welcome, setWelcome] = useState(initial.firstRun);
  const [loadError, setLoadError] = useState(initial.error);
  const [tab, setTab] = useState("work");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [undo, setUndo] = useState(null);
  const [nudgeDismissedAt, setNudgeDismissedAt] = useState(() => getItem(NUDGE_KEY));
  const lastSaved = useRef(store);
  const tabRefs = useRef({});

  // Save on every change. "✓ Saved" shows only after a confirmed write; a failure stays visible.
  useEffect(() => {
    if (store === lastSaved.current) return;
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
  }, [store]);

  useEffect(() => {
    tabRefs.current[tab]?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [tab]);

  const setData = (fn) => setStore((s) => ({ ...s, data: fn(s.data) }));
  const { data, labels } = store;

  const groupsByDomain = useMemo(
    () => Object.fromEntries(DOMAINS.map((d) => [d, groupsOf(store, d)])),
    [store],
  );

  const all = [...data.work, ...data.personal, ...data.seva];
  const done = all.filter((t) => t.completed).length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const nudge = backupNudge(store, Date.now(), nudgeDismissedAt);

  const startEmpty = () => {
    const r = saveState(store);
    if (r.ok) setWelcome(false);
    else setSaveError(r.error);
  };

  const afterImport = () => {
    setLoadError(null);
    setTab("work");
    if (!getItem(PERSIST_KEY)) {
      setItem(PERSIST_KEY, "1");
      try { navigator.storage?.persist?.()?.catch?.(() => {}); } catch { /* unsupported: harmless */ }
    }
  };
  const importReplace = (incoming) => {
    setItem(PREV_KEY, JSON.stringify(store));
    setUndo(store);
    setStore(incoming);
    afterImport();
  };
  const importAdd = (incoming) => {
    setItem(PREV_KEY, JSON.stringify(store));
    setUndo(store);
    setStore((s) => mergeAdd(s, incoming));
    afterImport();
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
    const now = String(Date.now());
    setItem(NUDGE_KEY, now);
    setNudgeDismissedAt(now);
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
        {loadError && !saveError && (
          <div className="banner red" role="alert">
            <button className="grow" onClick={() => setBackupOpen(true)}>{loadError}</button>
            <button className="x" aria-label="Dismiss" onClick={() => setLoadError(null)}><X size={18} /></button>
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
        {tab === "wip" && <WipTab items={data.wip} labels={labels} groupsByDomain={groupsByDomain} setData={setData} />}
        {DOMAINS.includes(tab) && (
          <DomainTab key={tab} domain={tab} labels={labels} tasks={data[tab]} groupsByDomain={groupsByDomain} setData={setData}>
            {tab === "work" && welcomeCard}
          </DomainTab>
        )}
        {tab === "ai" && <AiTab ai={data.ai} labels={labels} setData={setData} />}
        {tab === "matrix" && <SuperMatrix state={store} />}
      </div>

      {backupOpen && (
        <BackupSheet state={store} canUndo={!!undo} onBackedUp={markBackedUp} onReplace={importReplace} onAdd={importAdd}
          onUndo={undoImport} onClose={() => setBackupOpen(false)} />
      )}
    </div>
  );
}
