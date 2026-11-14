// REFERENCE ONLY — the Task Command Center as it runs today inside Claude (v6).
// Personal data removed. AI sub-tabs renamed to neutral keys ai1..ai4; in the new app their
// display names come from the backup file's `labels` (see CLAUDE.md §4).
// Known defects listed in CLAUDE.md §6.5 are still present here on purpose — do not port them.

import { useState, useMemo, useEffect } from "react";
import { Check, AlertCircle, Star, Inbox, LayoutGrid, User, Briefcase, Heart, ChevronDown, ChevronUp, Edit2, Trash2, Plus, X, Zap } from "lucide-react";

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INITIAL_TASKS = {
  // Ships EMPTY. Real tasks are loaded on the phone from a private backup file. Never put real tasks here.
  work: [], personal: [], seva: [], wip: [],
  ai: { ai1: [], ai2: [], ai3: [], ai4: [] },
};

const STORAGE_KEY = "tm_v6"; // old prototype key — the new app uses tcc_data_v1

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_TASKS;
    const saved = JSON.parse(raw);
    const savedWipIds = new Set((saved.wip||[]).map(t=>t.id));
    const merged = {
      wip: [
        ...INITIAL_TASKS.wip.filter(t=>!savedWipIds.has(t.id)),
        ...(saved.wip||[])
      ],
      ai: { ai1:[], ai2:[], ai3:[], ai4:[] },
    };
    ["work","personal","seva"].forEach(domain => {
      const savedMap = Object.fromEntries((saved[domain]||[]).map(t=>[t.id,t]));
      merged[domain] = INITIAL_TASKS[domain].map(t => savedMap[t.id] ? {...t,...savedMap[t.id]} : t);
      const initIds = new Set(INITIAL_TASKS[domain].map(t=>t.id));
      (saved[domain]||[]).filter(t=>!initIds.has(t.id)).forEach(t=>merged[domain].push(t));
    });
    // restore ai sub-tabs
    if (saved.ai) {
      ["ai1","ai2","ai3","ai4"].forEach(sub => {
        merged.ai[sub] = saved.ai[sub] || [];
      });
    }
    return merged;
  } catch { return INITIAL_TASKS; }
}

// ─── Theme ────────────────────────────────────────────────────────────────────
const THEME = {
  work:     { bg:"#060e1f", card:"#0b1832", border:"#1a3460", accent:"#1e4d8c", light:"#5ba3f5", label:"Work"        },
  personal: { bg:"#050f08", card:"#091a0d", border:"#1a4025", accent:"#1e5c30", light:"#52c97a", label:"Personal"    },
  seva:     { bg:"#150800", card:"#221000", border:"#4a2000", accent:"#7a3a0a", light:"#e07b35", label:"Seva"        },
  wip:      { bg:"#0d0b18", card:"#16132a", border:"#2e2558", accent:"#3d2f6b", light:"#9b7fe8", label:"WIP"         },
  matrix:   { bg:"#f4f4f4", card:"#ffffff", border:"#e0e0e0", accent:"#ccc",    light:"#222",    label:"Super Matrix" },
};
const DOT = { work:"#5ba3f5", personal:"#52c97a", seva:"#e07b35", ai_ai1:"#f472b6", ai_ai2:"#34d399", ai_ai3:"#a78bfa", ai_ai4:"#fb923c" };

// AI Learning sub-tab themes
const AI_SUB = {
  ai1:      { key:"ai1",      label:"AI 1",    bg:"#1a0a1f", card:"#2a1040", border:"#6b21a8", light:"#f472b6", accent:"#7c3aed", dot:"#f472b6" },
  ai2:      { key:"ai2",      label:"AI 2", bg:"#051a12", card:"#0a2e1e", border:"#065f46", light:"#34d399", accent:"#059669", dot:"#34d399" },
  ai3:      { key:"ai3",      label:"AI 3",  bg:"#0f0a1f", card:"#1a1040", border:"#3730a3", light:"#a78bfa", accent:"#4f46e5", dot:"#a78bfa" },
  ai4:      { key:"ai4",      label:"AI 4",   bg:"#1f0f00", card:"#2e1a00", border:"#92400e", light:"#fb923c", accent:"#c2410c", dot:"#fb923c" },
};
const MATRIX_CFG = [
  { key:"doFirst",   label:"🔥 Do First",  desc:"Urgent + Important",     border:"#dc2626", bg:"#fff5f5", textColor:"#b91c1c" },
  { key:"schedule",  label:"⭐ Schedule",   desc:"Important · Not Urgent", border:"#d97706", bg:"#fffbeb", textColor:"#92400e" },
  { key:"delegate",  label:"📋 Delegate",  desc:"Urgent · Not Important", border:"#ea580c", bg:"#fff7ed", textColor:"#9a3412" },
  { key:"eliminate", label:"🗑️ Eliminate", desc:"Neither",                border:"#6b7280", bg:"#f9fafb", textColor:"#374151" },
];

// FIX 4: Only include incomplete tasks in matrix
function getMatrix(list) {
  const active = list.filter(t=>!t.completed);
  return {
    doFirst:   active.filter(t=> t.important &&  t.urgent),
    schedule:  active.filter(t=> t.important && !t.urgent),
    delegate:  active.filter(t=>!t.important &&  t.urgent),
    eliminate: active.filter(t=>!t.important && !t.urgent),
  };
}

// ─── Collapsible Matrix Cell ──────────────────────────────────────────────────
function MCell({ cfg, tasks, dotColor, isSuper }) {
  const [open, setOpen] = useState(true);
  const bc = isSuper ? cfg.border : cfg.border+"99";
  const bg = isSuper ? cfg.bg : "rgba(255,255,255,0.03)";
  const lc = isSuper ? cfg.textColor : cfg.border;
  const tc = isSuper ? cfg.textColor : (dotColor||cfg.border);
  return (
    <div style={{ border:`1.5px solid ${bc}`, borderRadius:10, background:bg, overflow:"hidden" }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 13px", cursor:"pointer" }}>
        <div>
          <span style={{ fontSize:12, fontWeight:700, color:lc }}>{cfg.label}</span>
          <span style={{ fontSize:9, color:"#aaa", marginLeft:7 }}>{cfg.desc}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ fontSize:11, fontWeight:700, color:lc }}>{tasks.length}</span>
          {open ? <ChevronUp size={12} color="#aaa"/> : <ChevronDown size={12} color="#aaa"/>}
        </div>
      </div>
      {open && (
        <div style={{ padding:"6px 12px 10px", display:"flex", flexDirection:"column", gap:4, maxHeight:200, overflowY:"auto" }}>
          {tasks.length===0
            ? <p style={{ fontSize:10, color:"#bbb", fontStyle:"italic", margin:0 }}>No tasks</p>
            : tasks.map(t=>(
              <div key={t.id} style={{ fontSize:11, padding:"5px 8px", borderRadius:6, background:isSuper?"rgba(0,0,0,0.03)":"rgba(255,255,255,0.04)", borderLeft:`3px solid ${isSuper?(DOT[t._domain]||dotColor||cfg.border):(dotColor||cfg.border)}`, color:isSuper?(DOT[t._domain]||tc):tc, lineHeight:1.45 }}>
                {t.task}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ─── Edit/Reassign Modal (FIX 3: text editing + delete) ──────────────────────
function EditModal({ task, domain, onSave, onDelete, onClose }) {
  const [d,setD]     = useState(domain);
  const [u,setU]     = useState(task.urgent);
  const [i,setI]     = useState(task.important);
  const [txt,setTxt] = useState(task.task);
  const [confirmDel, setConfirmDel] = useState(false);

  const btn = (active, col, fn, children) => (
    <button onClick={fn} style={{ flex:1, padding:"8px 0", borderRadius:7, border:`1.5px solid ${active?col:"#333"}`, background:active?col+"26":"transparent", color:active?col:"#666", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
      {children}
    </button>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:16 }}>
      <div style={{ background:"#16132a", border:"1px solid #3d2f6b", borderRadius:14, width:"100%", maxWidth:420, padding:22 }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#9b7fe8" }}>Edit Task</span>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#666", cursor:"pointer" }}><X size={16}/></button>
        </div>

        {/* Text edit */}
        <div style={{ fontSize:9, color:"#666", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Task Text</div>
        <textarea
          value={txt}
          onChange={e=>setTxt(e.target.value)}
          rows={3}
          style={{ width:"100%", boxSizing:"border-box", background:"#0d0b18", border:"1px solid #3d2f6b", borderRadius:7, color:"#d4c8ff", fontSize:12, padding:"9px 10px", resize:"vertical", marginBottom:14, lineHeight:1.5, fontFamily:"inherit" }}
        />

        {/* Domain */}
        <div style={{ fontSize:9, color:"#666", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Domain</div>
        <div style={{ display:"flex", gap:7, marginBottom:14 }}>
          {["work","personal","seva"].map(opt=>(
            <button key={opt} onClick={()=>setD(opt)} style={{ flex:1, padding:"8px 0", borderRadius:7, border:`1.5px solid ${d===opt?THEME[opt].light:THEME[opt].border}`, background:d===opt?THEME[opt].accent:"transparent", color:d===opt?"#fff":"#666", fontSize:11, fontWeight:700, cursor:"pointer", textTransform:"capitalize" }}>
              {opt}
            </button>
          ))}
        </div>

        {/* Priority */}
        <div style={{ fontSize:9, color:"#666", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Priority</div>
        <div style={{ display:"flex", gap:7, marginBottom:18 }}>
          {btn(u,"#ef4444",()=>setU(x=>!x),<><AlertCircle size={12}/> Urgent</>)}
          {btn(i,"#f59e0b",()=>setI(x=>!x),<><Star size={12}/> Important</>)}
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:7 }}>
          <button onClick={()=>onSave(d,u,i,txt.trim()||task.task)} style={{ flex:2, padding:"10px 0", borderRadius:7, background:THEME[d]?.light||"#9b7fe8", border:"none", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>✓ Save Changes</button>
          <button onClick={onClose} style={{ flex:1, padding:"10px 0", borderRadius:7, background:"transparent", border:"1px solid #333", color:"#666", fontSize:11, cursor:"pointer" }}>Cancel</button>
        </div>

        {/* Delete */}
        <div style={{ marginTop:12, borderTop:"1px solid #2e2558", paddingTop:12 }}>
          {!confirmDel
            ? <button onClick={()=>setConfirmDel(true)} style={{ width:"100%", padding:"8px 0", borderRadius:7, background:"transparent", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                <Trash2 size={12}/> Delete Task
              </button>
            : <div style={{ display:"flex", gap:7 }}>
                <button onClick={onDelete} style={{ flex:1, padding:"8px 0", borderRadius:7, background:"rgba(239,68,68,0.2)", border:"1px solid #ef4444", color:"#f87171", fontSize:11, fontWeight:700, cursor:"pointer" }}>Yes, Delete</button>
                <button onClick={()=>setConfirmDel(false)} style={{ flex:1, padding:"8px 0", borderRadius:7, background:"transparent", border:"1px solid #333", color:"#666", fontSize:11, cursor:"pointer" }}>Cancel</button>
              </div>
          }
        </div>
      </div>
    </div>
  );
}

// ─── New Task Modal (FIX 5) ───────────────────────────────────────────────────
function NewTaskModal({ domain, onAdd, onClose }) {
  const T = THEME[domain];
  const [txt,setTxt]   = useState("");
  const [grp,setGrp]   = useState("");
  const [u,setU]       = useState(false);
  const [i,setI]       = useState(false);

  const btn = (active, col, fn, children) => (
    <button onClick={fn} style={{ flex:1, padding:"9px 0", borderRadius:7, border:`1.5px solid ${active?col:"#333"}`, background:active?col+"26":"transparent", color:active?col:"#666", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
      {children}
    </button>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:16 }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, width:"100%", maxWidth:400, padding:22 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <span style={{ fontSize:13, fontWeight:700, color:T.light }}>New {T.label} Task</span>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#666", cursor:"pointer" }}><X size={16}/></button>
        </div>

        <div style={{ fontSize:9, color:"#666", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Task</div>
        <textarea value={txt} onChange={e=>setTxt(e.target.value)} rows={3} placeholder="Describe the task..."
          style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, borderRadius:7, color:"#e2e8f0", fontSize:12, padding:"9px 10px", resize:"vertical", marginBottom:14, lineHeight:1.5, fontFamily:"inherit" }}/>

        <div style={{ fontSize:9, color:"#666", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Group / Category</div>
        <input value={grp} onChange={e=>setGrp(e.target.value)} placeholder="e.g. Finance, Marketing, Health..."
          style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, borderRadius:7, color:"#e2e8f0", fontSize:12, padding:"9px 10px", marginBottom:14, fontFamily:"inherit" }}/>

        <div style={{ fontSize:9, color:"#666", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Priority</div>
        <div style={{ display:"flex", gap:7, marginBottom:18 }}>
          {btn(u,"#ef4444",()=>setU(x=>!x),<><AlertCircle size={12}/> Urgent</>)}
          {btn(i,"#f59e0b",()=>setI(x=>!x),<><Star size={12}/> Important</>)}
        </div>

        <button
          onClick={()=>{ if(txt.trim()) { onAdd(txt.trim(), grp.trim()||"Inbox", u, i); onClose(); }}}
          disabled={!txt.trim()}
          style={{ width:"100%", padding:"11px 0", borderRadius:7, background:txt.trim()?T.light:"#2a2a3a", border:"none", color:txt.trim()?"#fff":"#555", fontWeight:700, fontSize:13, cursor:txt.trim()?"pointer":"not-allowed" }}>
          ✓ Add Task
        </button>
      </div>
    </div>
  );
}

// ─── Domain Tab ───────────────────────────────────────────────────────────────
function DomainTab({ domain, tasks, setTasks }) {
  const T = THEME[domain];
  const [editing,   setEditing]   = useState(null);
  const [showNew,   setShowNew]   = useState(false);

  // FIX 4: matrix only shows incomplete tasks
  const matrix  = useMemo(()=>getMatrix(tasks),[tasks]);

  const grouped = useMemo(()=>{
    const g={};
    tasks.forEach(t=>{ if(!g[t.group]) g[t.group]=[]; g[t.group].push(t); });
    return g;
  },[tasks]);

  const toggle = (id,field) =>
    setTasks(prev=>({...prev,[domain]:prev[domain].map(t=>t.id===id?{...t,[field]:!t[field]}:t)}));

  // FIX 3: save with text update + domain change support
  const saveEdit = (newDomain, urgent, important, newText) => {
    if (newDomain===domain) {
      setTasks(prev=>({...prev,[domain]:prev[domain].map(t=>t.id===editing.id?{...t,task:newText,urgent,important}:t)}));
    } else {
      setTasks(prev=>{
        const task = prev[domain].find(t=>t.id===editing.id);
        return {
          ...prev,
          [domain]: prev[domain].filter(t=>t.id!==editing.id),
          [newDomain]: [...prev[newDomain], {...task,task:newText,urgent,important}],
        };
      });
    }
    setEditing(null);
  };

  const deleteTask = () => {
    setTasks(prev=>({...prev,[domain]:prev[domain].filter(t=>t.id!==editing.id)}));
    setEditing(null);
  };

  // FIX 5: add new task directly from domain tab
  const addTask = (text, group, urgent, important) => {
    const newTask = { id:`dyn_${Date.now()}`, group, task:text, completed:false, urgent, important };
    setTasks(prev=>({...prev,[domain]:[...prev[domain],newTask]}));
  };

  const stats = { total:tasks.length, done:tasks.filter(t=>t.completed).length };
  const pct   = stats.total ? Math.round(stats.done/stats.total*100) : 0;

  return (
    <div style={{ background:T.bg, minHeight:"100%", padding:"20px 18px 48px" }}>
      {editing  && <EditModal task={editing} domain={domain} onSave={saveEdit} onDelete={deleteTask} onClose={()=>setEditing(null)}/>}
      {showNew  && <NewTaskModal domain={domain} onAdd={addTask} onClose={()=>setShowNew(false)}/>}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:T.light }}>{T.label}</h2>
          <p style={{ margin:"2px 0 0", fontSize:10, color:"#555" }}>{stats.done} of {stats.total} done · {pct}%</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:80 }}>
            <div style={{ height:4, background:T.border, borderRadius:99, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:T.light, borderRadius:99, transition:"width 0.4s" }}/>
            </div>
          </div>
          {/* FIX 5: New Task button */}
          <button onClick={()=>setShowNew(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 13px", borderRadius:8, background:T.accent, border:`1px solid ${T.light}`, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
            <Plus size={13}/> New Task
          </button>
        </div>
      </div>

      {/* Eisenhower Matrix — only active tasks */}
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:9, color:T.light, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>Eisenhower Matrix (Active Tasks Only)</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {MATRIX_CFG.map(cfg=><MCell key={cfg.key} cfg={cfg} tasks={matrix[cfg.key]} dotColor={T.light} isSuper={false}/>)}
        </div>
      </div>

      {/* All Tasks list */}
      <div>
        <div style={{ fontSize:9, color:T.light, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:10 }}>All Tasks</div>
        {Object.entries(grouped).map(([group,gtasks])=>(
          <div key={group} style={{ marginBottom:12, background:T.card, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"9px 13px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:9, fontWeight:700, color:T.light, textTransform:"uppercase", letterSpacing:1 }}>{group}</span>
              <span style={{ fontSize:9, color:"#555" }}>{gtasks.filter(t=>t.completed).length}/{gtasks.length}</span>
            </div>
            <div>
              {gtasks.map(task=>(
                <div key={task.id} style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"9px 13px", borderBottom:`1px solid ${T.border}22`, opacity:task.completed?0.45:1, transition:"opacity 0.2s" }}>
                  <button onClick={()=>toggle(task.id,"completed")} style={{ flexShrink:0, width:17, height:17, borderRadius:4, border:`2px solid ${task.completed?T.light:T.border}`, background:task.completed?T.light:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", marginTop:2 }}>
                    {task.completed && <Check size={10} color="#fff"/>}
                  </button>
                  <span style={{ flex:1, fontSize:12, color:task.completed?"#444":"#ccc", textDecoration:task.completed?"line-through":"none", lineHeight:1.5 }}>{task.task}</span>
                  <div style={{ display:"flex", gap:3, flexShrink:0 }}>
                    <button onClick={()=>toggle(task.id,"urgent")} title="Urgent" style={{ padding:"3px 5px", borderRadius:5, border:`1px solid ${task.urgent?"#ef4444":"transparent"}`, background:task.urgent?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.03)", color:task.urgent?"#f87171":"#444", cursor:"pointer" }}>
                      <AlertCircle size={11}/>
                    </button>
                    <button onClick={()=>toggle(task.id,"important")} title="Important" style={{ padding:"3px 5px", borderRadius:5, border:`1px solid ${task.important?"#f59e0b":"transparent"}`, background:task.important?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.03)", color:task.important?"#fcd34d":"#444", cursor:"pointer" }}>
                      <Star size={11}/>
                    </button>
                    {/* FIX 3: Edit button opens full edit modal */}
                    <button onClick={()=>setEditing(task)} title="Edit / Delete" style={{ padding:"3px 5px", borderRadius:5, border:"1px solid transparent", background:"rgba(255,255,255,0.03)", color:"#555", cursor:"pointer" }}>
                      <Edit2 size={11}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── WIP Tab ──────────────────────────────────────────────────────────────────
function WIPTab({ pending, setPending, setTasks }) {
  const T = THEME.wip;
  const upd = (id,f,v) => setPending(prev=>prev.map(p=>p.id===id?{...p,[f]:v}:p));

  // FIX 2: task disappears from WIP immediately on Send
  const classify = (p) => {
    if (!p.domain) return;
    const newTask = { id:`dyn_${Date.now()}`, group:"Inbox", task:p.task, completed:false, urgent:p.urgent, important:p.important };
    setTasks(prev=>({...prev,[p.domain]:[...prev[p.domain],newTask]}));
    setPending(prev=>prev.filter(x=>x.id!==p.id));
  };

  const discard = (id) => setPending(prev=>prev.filter(x=>x.id!==id));

  return (
    <div style={{ background:T.bg, minHeight:"100%", padding:"20px 18px 48px" }}>
      <h2 style={{ margin:"0 0 2px", fontSize:18, fontWeight:800, color:T.light }}>WIP</h2>
      <p style={{ margin:"0 0 20px", fontSize:10, color:"#555" }}>Assign domain + priority, then Send. Task disappears from here and goes live instantly.</p>

      {pending.length===0 ? (
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:"40px 20px", textAlign:"center" }}>
          <Inbox size={30} color="#333" style={{ marginBottom:10 }}/>
          <p style={{ color:"#555", fontSize:13, margin:0 }}>No tasks waiting</p>
          <p style={{ color:"#3a3a3a", fontSize:10, marginTop:6 }}>Type "UPDATE: task" in chat to add tasks here</p>
        </div>
      ) : pending.map(p=>(
        <div key={p.id} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:16, marginBottom:14 }}>
          <p style={{ fontSize:12, color:"#d4c8ff", lineHeight:1.6, margin:"0 0 14px" }}>{p.task}</p>

          <div style={{ fontSize:9, color:"#666", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Step 1 — Domain</div>
          <div style={{ display:"flex", gap:7, marginBottom:14 }}>
            {["work","personal","seva"].map(opt=>(
              <button key={opt} onClick={()=>upd(p.id,"domain",opt)}
                style={{ flex:1, padding:"9px 0", borderRadius:7, border:`1.5px solid ${p.domain===opt?THEME[opt].light:THEME[opt].border}`, background:p.domain===opt?THEME[opt].accent:"transparent", color:p.domain===opt?"#fff":"#666", fontSize:11, fontWeight:700, cursor:"pointer", textTransform:"capitalize", transition:"all 0.15s" }}>
                {opt}
              </button>
            ))}
          </div>

          <div style={{ fontSize:9, color:"#666", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Step 2 — Priority</div>
          <div style={{ display:"flex", gap:7, marginBottom:14 }}>
            <button onClick={()=>upd(p.id,"urgent",!p.urgent)}
              style={{ flex:1, padding:"9px 0", borderRadius:7, border:`1.5px solid ${p.urgent?"#ef4444":"#333"}`, background:p.urgent?"rgba(239,68,68,0.15)":"transparent", color:p.urgent?"#f87171":"#666", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
              <AlertCircle size={12}/> Urgent
            </button>
            <button onClick={()=>upd(p.id,"important",!p.important)}
              style={{ flex:1, padding:"9px 0", borderRadius:7, border:`1.5px solid ${p.important?"#f59e0b":"#333"}`, background:p.important?"rgba(245,158,11,0.15)":"transparent", color:p.important?"#fcd34d":"#666", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
              <Star size={12}/> Important
            </button>
          </div>

          <div style={{ display:"flex", gap:7 }}>
            <button onClick={()=>classify(p)} disabled={!p.domain}
              style={{ flex:2, padding:"10px 0", borderRadius:7, background:p.domain?THEME[p.domain].light:"#2a2a3a", border:"none", color:p.domain?"#fff":"#555", fontWeight:700, fontSize:12, cursor:p.domain?"pointer":"not-allowed", transition:"all 0.2s" }}>
              {p.domain ? `✓ Send to ${p.domain.charAt(0).toUpperCase()+p.domain.slice(1)}` : "Select a domain first"}
            </button>
            <button onClick={()=>discard(p.id)}
              style={{ flex:1, padding:"10px 0", borderRadius:7, background:"transparent", border:"1px solid #2e2558", color:"#666", fontSize:11, cursor:"pointer" }}>
              ✕ Discard
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AI Learning Tab ──────────────────────────────────────────────────────────
function AILearningTab({ tasks, setTasks }) {
  const [activeSub, setActiveSub] = useState("ai1");
  const [editing,   setEditing]   = useState(null);
  const [showNew,   setShowNew]   = useState(false);
  const S = AI_SUB[activeSub];
  const subTasks = tasks.ai[activeSub] || [];

  const matrix = useMemo(()=>getMatrix(subTasks),[subTasks]);

  const toggle = (id, field) =>
    setTasks(prev=>({ ...prev, ai:{ ...prev.ai, [activeSub]: prev.ai[activeSub].map(t=>t.id===id?{...t,[field]:!t[field]}:t) } }));

  const saveEdit = (_, urgent, important, newText) => {
    setTasks(prev=>({ ...prev, ai:{ ...prev.ai, [activeSub]: prev.ai[activeSub].map(t=>t.id===editing.id?{...t,task:newText,urgent,important}:t) } }));
    setEditing(null);
  };

  const deleteTask = () => {
    setTasks(prev=>({ ...prev, ai:{ ...prev.ai, [activeSub]: prev.ai[activeSub].filter(t=>t.id!==editing.id) } }));
    setEditing(null);
  };

  const addTask = (text, urgent, important) => {
    const newTask = { id:`ai_${activeSub}_${Date.now()}`, task:text, completed:false, urgent, important, _aiSub:activeSub };
    setTasks(prev=>({ ...prev, ai:{ ...prev.ai, [activeSub]: [...prev.ai[activeSub], newTask] } }));
  };

  const stats = { total:subTasks.length, done:subTasks.filter(t=>t.completed).length };
  const pct   = stats.total ? Math.round(stats.done/stats.total*100) : 0;

  // inline new task form
  const [newTxt,setNewTxt] = useState("");
  const [newU,setNewU]     = useState(false);
  const [newI,setNewI]     = useState(false);

  return (
    <div style={{ background:"#080810", minHeight:"100%", padding:"0 0 48px" }}>
      {/* Edit modal reuses same pattern but no domain selector */}
      {editing && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:16 }}>
          <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, width:"100%", maxWidth:420, padding:22 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <span style={{ fontSize:13, fontWeight:700, color:S.light }}>Edit AI Task</span>
              <button onClick={()=>setEditing(null)} style={{ background:"transparent", border:"none", color:"#666", cursor:"pointer" }}><X size={16}/></button>
            </div>
            <AIEditForm task={editing} accent={S.light} border={S.border} bg={S.bg}
              onSave={saveEdit} onDelete={deleteTask} onClose={()=>setEditing(null)}/>
          </div>
        </div>
      )}

      {/* Sub-tab bar */}
      <div style={{ background:"#0d0b18", borderBottom:"1px solid #1e1e2e", padding:"0 18px", display:"flex", gap:0 }}>
        {Object.values(AI_SUB).map(sub=>{
          const active = activeSub===sub.key;
          return (
            <button key={sub.key} onClick={()=>setActiveSub(sub.key)}
              style={{ padding:"10px 16px", background:"transparent", border:"none", borderBottom:`2.5px solid ${active?sub.light:"transparent"}`, color:active?sub.light:"#555", fontSize:11, fontWeight:active?700:500, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.2s" }}>
              {sub.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding:"18px 18px 0" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:S.light }}>AI Learning · {S.label}</h2>
            <p style={{ margin:"2px 0 0", fontSize:10, color:"#555" }}>{stats.done} of {stats.total} done · {pct}%</p>
          </div>
          <div style={{ width:80 }}>
            <div style={{ height:4, background:S.border, borderRadius:99, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:S.light, borderRadius:99, transition:"width 0.4s" }}/>
            </div>
          </div>
        </div>

        {/* Matrix */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:9, color:S.light, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>Eisenhower Matrix</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {MATRIX_CFG.map(cfg=><MCell key={cfg.key} cfg={cfg} tasks={matrix[cfg.key]} dotColor={S.light} isSuper={false}/>)}
          </div>
        </div>

        {/* Inline Add New Task */}
        <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:10, padding:14, marginBottom:18 }}>
          <div style={{ fontSize:9, color:S.light, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:10 }}>+ Add New Task</div>
          <textarea value={newTxt} onChange={e=>setNewTxt(e.target.value)} rows={2} placeholder="Type task..."
            style={{ width:"100%", boxSizing:"border-box", background:S.bg, border:`1px solid ${S.border}`, borderRadius:7, color:"#e2e8f0", fontSize:12, padding:"8px 10px", resize:"none", marginBottom:10, fontFamily:"inherit", lineHeight:1.5 }}/>
          <div style={{ display:"flex", gap:7, marginBottom:10 }}>
            <button onClick={()=>setNewU(x=>!x)} style={{ flex:1, padding:"7px 0", borderRadius:7, border:`1.5px solid ${newU?"#ef4444":"#333"}`, background:newU?"rgba(239,68,68,0.15)":"transparent", color:newU?"#f87171":"#666", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
              <AlertCircle size={12}/> Urgent
            </button>
            <button onClick={()=>setNewI(x=>!x)} style={{ flex:1, padding:"7px 0", borderRadius:7, border:`1.5px solid ${newI?"#f59e0b":"#333"}`, background:newI?"rgba(245,158,11,0.15)":"transparent", color:newI?"#fcd34d":"#666", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
              <Star size={12}/> Important
            </button>
          </div>
          <button onClick={()=>{ if(newTxt.trim()){ addTask(newTxt.trim(),newU,newI); setNewTxt(""); setNewU(false); setNewI(false); }}}
            disabled={!newTxt.trim()}
            style={{ width:"100%", padding:"9px 0", borderRadius:7, background:newTxt.trim()?S.light:"#2a2a3a", border:"none", color:newTxt.trim()?"#fff":"#555", fontWeight:700, fontSize:12, cursor:newTxt.trim()?"pointer":"not-allowed" }}>
            ✓ Add to {S.label}
          </button>
        </div>

        {/* Task list */}
        <div style={{ fontSize:9, color:S.light, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:10 }}>All Tasks</div>
        {subTasks.length===0
          ? <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:10, padding:30, textAlign:"center", color:"#555", fontSize:12 }}>No tasks yet. Add one above.</div>
          : (
            <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:10, overflow:"hidden" }}>
              {subTasks.map(task=>(
                <div key={task.id} style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"10px 13px", borderBottom:`1px solid ${S.border}33`, opacity:task.completed?0.45:1 }}>
                  <button onClick={()=>toggle(task.id,"completed")} style={{ flexShrink:0, width:17, height:17, borderRadius:4, border:`2px solid ${task.completed?S.light:S.border}`, background:task.completed?S.light:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", marginTop:2 }}>
                    {task.completed && <Check size={10} color="#fff"/>}
                  </button>
                  <span style={{ flex:1, fontSize:12, color:task.completed?"#444":"#ccc", textDecoration:task.completed?"line-through":"none", lineHeight:1.5 }}>{task.task}</span>
                  <div style={{ display:"flex", gap:3, flexShrink:0 }}>
                    <button onClick={()=>toggle(task.id,"urgent")} style={{ padding:"3px 5px", borderRadius:5, border:`1px solid ${task.urgent?"#ef4444":"transparent"}`, background:task.urgent?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.03)", color:task.urgent?"#f87171":"#444", cursor:"pointer" }}>
                      <AlertCircle size={11}/>
                    </button>
                    <button onClick={()=>toggle(task.id,"important")} style={{ padding:"3px 5px", borderRadius:5, border:`1px solid ${task.important?"#f59e0b":"transparent"}`, background:task.important?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.03)", color:task.important?"#fcd34d":"#444", cursor:"pointer" }}>
                      <Star size={11}/>
                    </button>
                    <button onClick={()=>setEditing(task)} style={{ padding:"3px 5px", borderRadius:5, border:"1px solid transparent", background:"rgba(255,255,255,0.03)", color:"#555", cursor:"pointer" }}>
                      <Edit2 size={11}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}

// Shared edit form for AI tasks (no domain selector)
function AIEditForm({ task, accent, border, bg, onSave, onDelete, onClose }) {
  const [u,setU]     = useState(task.urgent);
  const [i,setI]     = useState(task.important);
  const [txt,setTxt] = useState(task.task);
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <>
      <div style={{ fontSize:9, color:"#666", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Task Text</div>
      <textarea value={txt} onChange={e=>setTxt(e.target.value)} rows={3}
        style={{ width:"100%", boxSizing:"border-box", background:bg, border:`1px solid ${border}`, borderRadius:7, color:"#e2e8f0", fontSize:12, padding:"9px 10px", resize:"vertical", marginBottom:14, lineHeight:1.5, fontFamily:"inherit" }}/>
      <div style={{ fontSize:9, color:"#666", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Priority</div>
      <div style={{ display:"flex", gap:7, marginBottom:18 }}>
        <button onClick={()=>setU(x=>!x)} style={{ flex:1, padding:"8px 0", borderRadius:7, border:`1.5px solid ${u?"#ef4444":"#333"}`, background:u?"rgba(239,68,68,0.15)":"transparent", color:u?"#f87171":"#666", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
          <AlertCircle size={12}/> Urgent
        </button>
        <button onClick={()=>setI(x=>!x)} style={{ flex:1, padding:"8px 0", borderRadius:7, border:`1.5px solid ${i?"#f59e0b":"#333"}`, background:i?"rgba(245,158,11,0.15)":"transparent", color:i?"#fcd34d":"#666", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
          <Star size={12}/> Important
        </button>
      </div>
      <div style={{ display:"flex", gap:7 }}>
        <button onClick={()=>onSave(null,u,i,txt.trim()||task.task)} style={{ flex:2, padding:"10px 0", borderRadius:7, background:accent, border:"none", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>✓ Save Changes</button>
        <button onClick={onClose} style={{ flex:1, padding:"10px 0", borderRadius:7, background:"transparent", border:"1px solid #333", color:"#666", fontSize:11, cursor:"pointer" }}>Cancel</button>
      </div>
      <div style={{ marginTop:12, borderTop:`1px solid ${border}`, paddingTop:12 }}>
        {!confirmDel
          ? <button onClick={()=>setConfirmDel(true)} style={{ width:"100%", padding:"8px 0", borderRadius:7, background:"transparent", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
              <Trash2 size={12}/> Delete Task
            </button>
          : <div style={{ display:"flex", gap:7 }}>
              <button onClick={onDelete} style={{ flex:1, padding:"8px 0", borderRadius:7, background:"rgba(239,68,68,0.2)", border:"1px solid #ef4444", color:"#f87171", fontSize:11, fontWeight:700, cursor:"pointer" }}>Yes, Delete</button>
              <button onClick={()=>setConfirmDel(false)} style={{ flex:1, padding:"8px 0", borderRadius:7, background:"transparent", border:"1px solid #333", color:"#666", fontSize:11, cursor:"pointer" }}>Cancel</button>
            </div>
        }
      </div>
    </>
  );
}


function SuperMatrix({ tasks }) {
  const taggedAll = [
    ...tasks.work.filter(t=>!t.completed).map(t=>({...t,_domain:"work"})),
    ...tasks.personal.filter(t=>!t.completed).map(t=>({...t,_domain:"personal"})),
    ...tasks.seva.filter(t=>!t.completed).map(t=>({...t,_domain:"seva"})),
    ...["ai1","ai2","ai3","ai4"].flatMap(sub=>
      ((tasks.ai||{})[sub]||[]).filter(t=>!t.completed).map(t=>({
        ...t, task:`AI-${sub.toUpperCase()} · ${t.task}`, _domain:`ai_${sub}`,
      }))
    ),
  ];
  const matrix = getMatrix(taggedAll);
  const colorOf = t => DOT[t._domain] || "#888";

  return (
    <div style={{ background:THEME.matrix.bg, minHeight:"100%", padding:"20px 18px 48px" }}>
      <h2 style={{ margin:"0 0 4px", fontSize:18, fontWeight:800, color:"#111" }}>Super Matrix</h2>
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:18, flexWrap:"wrap" }}>
        <p style={{ margin:0, fontSize:10, color:"#999" }}>All active tasks ·</p>
        {[["work","Work"],["personal","Personal"],["seva","Seva"]].map(([k,l])=>(
          <span key={k} style={{ display:"flex", alignItems:"center", gap:3, fontSize:9, color:"#666" }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:DOT[k], display:"inline-block" }}/>{l}
          </span>
        ))}
        {Object.values(AI_SUB).map(s=>(
          <span key={s.key} style={{ display:"flex", alignItems:"center", gap:3, fontSize:9, color:"#666" }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:s.dot, display:"inline-block" }}/>AI-{s.label}
          </span>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {MATRIX_CFG.map(cfg=>{
          const cellTasks = matrix[cfg.key];
          return (
            <div key={cfg.key} style={{ border:`1.5px solid ${cfg.border}`, borderRadius:12, background:cfg.bg, overflow:"hidden" }}>
              <div style={{ padding:"11px 14px", borderBottom:`1px solid ${cfg.border}33` }}>
                <div style={{ fontSize:13, fontWeight:800, color:cfg.textColor }}>{cfg.label}</div>
                <div style={{ fontSize:9, color:"#aaa", marginTop:1 }}>{cfg.desc} · {cellTasks.length} tasks</div>
              </div>
              <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:5, maxHeight:300, overflowY:"auto" }}>
                {cellTasks.length===0
                  ? <p style={{ fontSize:10, color:"#bbb", fontStyle:"italic", margin:0 }}>No tasks</p>
                  : cellTasks.map(t=>(
                    <div key={t.id} style={{ fontSize:11, padding:"5px 8px", borderRadius:6, background:"rgba(0,0,0,0.03)", borderLeft:`3px solid ${colorOf(t)}`, color:colorOf(t), lineHeight:1.45, fontWeight:500 }}>
                      {t.task}
                    </div>
                  ))
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function TaskManager() {
  const [tasks,   setTasks]   = useState(loadState);
  const [pending, setPending] = useState(()=>loadState().wip||[]);
  const [activeTab, setTab]   = useState("work");
  const [saved,   setSaved]   = useState(false);

  useEffect(()=>{
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({...tasks,wip:pending})); } catch {}
    setSaved(true);
    const t = setTimeout(()=>setSaved(false),1200);
    return ()=>clearTimeout(t);
  },[tasks,pending]);

  useEffect(()=>{
    const id = setInterval(()=>{
      if (window.__taskUpdate && Array.isArray(window.__taskUpdate.tasks)) {
        const items = window.__taskUpdate.tasks.map((task,i)=>({
          id:`wip_${Date.now()}_${i}`, task, domain:null, urgent:false, important:false
        }));
        setPending(prev=>[...prev,...items]);
        setTab("wip");
        delete window.__taskUpdate;
      }
    },500);
    return ()=>clearInterval(id);
  },[]);

  const allList = [...tasks.work,...tasks.personal,...tasks.seva];
  const allDone = allList.filter(t=>t.completed).length;
  const pct     = allList.length ? Math.round(allDone/allList.length*100) : 0;

  const TABS = [
    { key:"wip",     Icon:Inbox,      label:"WIP",          badge:pending.length },
    { key:"work",    Icon:Briefcase,  label:"Work"          },
    { key:"personal",Icon:User,       label:"Personal"      },
    { key:"seva",    Icon:Heart,      label:"Seva"          },
    { key:"ai",      Icon:Zap,        label:"AI Learning"   },
    { key:"matrix",  Icon:LayoutGrid, label:"Super Matrix"  },
  ];
  const tabAccent = k => k==="matrix"?"#888" : k==="wip"?THEME.wip.light : k==="ai"?"#a78bfa" : THEME[k]?.light||"#888";

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", fontFamily:"'DM Sans','Segoe UI',sans-serif", overflow:"hidden", background:"#060e1f" }}>

      {/* ── STICKY HEADER ── */}
      <div style={{ flexShrink:0, background:"#080810", borderBottom:"1px solid #16162a", zIndex:100 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 18px 6px" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:"#e2e8f0", letterSpacing:"-0.3px" }}>Task Command Center</div>
            <div style={{ fontSize:9, color:"#444", marginTop:1 }}>Personal · offline · saved on this phone</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:9, color:"#444" }}>{allDone}/{allList.length} · {pct}%</div>
              <div style={{ height:3, width:80, background:"#1e1e2e", borderRadius:99, marginTop:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#10b981,#5ba3f5)", borderRadius:99, transition:"width 0.4s" }}/>
              </div>
            </div>
            <div style={{ fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:20, background:saved?"rgba(16,185,129,0.15)":"transparent", color:saved?"#10b981":"transparent", border:`1px solid ${saved?"rgba(16,185,129,0.3)":"transparent"}`, transition:"all 0.3s" }}>✓ Saved</div>
          </div>
        </div>
        <div style={{ display:"flex", padding:"0 14px", overflowX:"auto" }}>
          {TABS.map(({key,Icon,label,badge})=>{
            const active = activeTab===key;
            const color  = tabAccent(key);
            return (
              <button key={key} onClick={()=>setTab(key)}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"9px 13px", background:"transparent", border:"none", borderBottom:`2.5px solid ${active?color:"transparent"}`, color:active?color:"#444", fontSize:11, fontWeight:active?700:500, cursor:"pointer", transition:"all 0.2s", whiteSpace:"nowrap" }}>
                <Icon size={12}/>{label}
                {badge>0 && <span style={{ background:"#9b7fe8", color:"#fff", fontSize:8, fontWeight:700, borderRadius:99, padding:"1px 5px", minWidth:14, textAlign:"center" }}>{badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {activeTab==="wip"      && <WIPTab pending={pending} setPending={setPending} setTasks={setTasks}/>}
        {activeTab==="work"     && <DomainTab domain="work"     tasks={tasks.work}     setTasks={setTasks}/>}
        {activeTab==="personal" && <DomainTab domain="personal" tasks={tasks.personal} setTasks={setTasks}/>}
        {activeTab==="seva"     && <DomainTab domain="seva"     tasks={tasks.seva}     setTasks={setTasks}/>}
        {activeTab==="ai"       && <AILearningTab tasks={tasks} setTasks={setTasks}/>}
        {activeTab==="matrix"   && <SuperMatrix tasks={tasks}/>}
      </div>
    </div>
  );
}

