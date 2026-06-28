import { useState, useEffect, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PLAN_CATEGORIES = ["Kids Activities", "Family Outings", "Errands", "Erik & Mary"];
const CAT_ICONS = { "Kids Activities": "👧", "Family Outings": "🏕️", "Errands": "📋", "Erik & Mary": "✦" };

const LIFE_AREAS = [
  { value: "health",    label: "Health",    icon: "❤️" },
  { value: "social",    label: "Social",    icon: "🤝" },
  { value: "academic",  label: "Academic",  icon: "📖" },
  { value: "faith",     label: "Faith",     icon: "🙏" },
  { value: "marriage",  label: "Marriage",  icon: "💍" },
  { value: "community", label: "Community", icon: "🌳" },
];

const IMPORTANCE_TIERS = [
  { value: "not",     label: "Not important", color: "#9baab8", bg: "#e8f0f7", symbol: "–"  },
  { value: "nice",    label: "Nice to have",  color: "#3baa7a", bg: "#e0f5ec", symbol: "○"  },
  { value: "matters", label: "Really matters",color: "#e07a30", bg: "#fff0e5", symbol: "◑"  },
  { value: "nonneg",  label: "Non-negotiable",color: "#e03060", bg: "#fde8ee", symbol: "●"  },
];

function getTier(value) { return IMPORTANCE_TIERS.find(t => t.value === value) || null; }

function alignmentStatus(mVal, eVal) {
  if (!mVal || !eVal) return null;
  if (mVal === eVal) return "aligned";
  const mi = IMPORTANCE_TIERS.findIndex(t => t.value === mVal);
  const ei = IMPORTANCE_TIERS.findIndex(t => t.value === eVal);
  return Math.abs(mi - ei) === 1 ? "close" : "gap";
}

function getNextWeekday(dow, hour = 20) {
  const now = new Date(), today = now.getDay();
  let diff = dow - today;
  if (diff <= 0) diff += 7;
  const t = new Date(now);
  t.setDate(now.getDate() + diff);
  t.setHours(hour, 0, 0, 0);
  return t;
}
function getDefaultDeadlines() { return { nudge: getNextWeekday(3, 19), hard: getNextWeekday(4, 20) }; }
function fmt(d) { return new Date(d).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }); }
function timeLeft(dl) {
  const diff = dl - Date.now();
  if (diff <= 0) return "TIME'S UP";
  const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

function requestNotif(cb) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") { cb&&cb(); return; }
  Notification.requestPermission().then(p => { if (p==="granted"&&cb) cb(); });
}
function scheduleNotif(title, body, atMs) {
  const d = atMs - Date.now();
  if (d <= 0) return;
  setTimeout(() => { if (Notification.permission==="granted") new Notification(title, { body }); }, d);
}

const STORE_KEY = "weekend_decider_v3";
function loadState() { try { return JSON.parse(localStorage.getItem(STORE_KEY))||{}; } catch { return {}; } }
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {} }

// ─── SHARED: IMPORTANCE PICKER ───────────────────────────────────────────────
function ImportancePicker({ value, onChange, label }) {
  return (
    <div style={{ marginTop: "10px" }}>
      <div style={{ fontSize: "11px", color: "#7c6f5e", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>{label||"Emotional importance"}</div>
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        {IMPORTANCE_TIERS.map(t => (
          <button key={t.value} onClick={() => onChange(value===t.value ? "" : t.value)} style={{
            flex: "1 1 0", minWidth: "60px", padding: "7px 4px",
            background: value===t.value ? t.bg : "transparent",
            border: `1px solid ${value===t.value ? t.color : "#c8e6f0"}`,
            borderRadius: "8px", color: value===t.value ? t.color : "#7aaabb",
            fontSize: "10px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s", textAlign: "center", lineHeight: "1.4",
          }}>
            <div style={{ fontSize: "13px" }}>{t.symbol}</div>
            <div>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SHARED: LIFE AREA PICKER (multi-select) ──────────────────────────────────
function LifeAreaPicker({ value = [], onChange }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter(x=>x!==v) : [...value, v]);
  return (
    <div style={{ marginTop: "10px" }}>
      <div style={{ fontSize: "11px", color: "#7c6f5e", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Life areas (select all that apply)</div>
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        {LIFE_AREAS.map(a => {
          const on = value.includes(a.value);
          return (
            <button key={a.value} onClick={() => toggle(a.value)} style={{
              padding: "6px 10px", borderRadius: "20px", border: `1px solid ${on?"#f0a040":"#c8e6f0"}`,
              background: on ? "#fff5e5" : "transparent",
              color: on ? "#c07820" : "#7aaabb",
              fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: "4px",
            }}>
              <span>{a.icon}</span><span>{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SHARED: ALIGNMENT BADGE ─────────────────────────────────────────────────
function AlignmentBadge({ mVal, eVal }) {
  const s = alignmentStatus(mVal, eVal);
  if (!s) return null;
  const mt = getTier(mVal), et = getTier(eVal);
  const c = { aligned:{bg:"#e4f8ee",border:"#3ab878",color:"#2a8a58",icon:"✦",text:"Aligned"}, close:{bg:"#fff5e5",border:"#f0a040",color:"#c07820",icon:"~",text:"Close"}, gap:{bg:"#fde8ee",border:"#e05070",color:"#c02040",icon:"!",text:"Mismatch"} }[s];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"8px", padding:"7px 10px", background:c.bg, border:`1px solid ${c.border}`, borderRadius:"8px" }}>
      <span style={{ color:c.color, fontWeight:"800", fontSize:"12px" }}>{c.icon} {c.text}</span>
      <span style={{ color:"#5a8090", fontSize:"11px" }}>Mary: <span style={{ color:mt?.color }}>{mt?.label||"—"}</span> · Erik: <span style={{ color:et?.color }}>{et?.label||"—"}</span></span>
    </div>
  );
}

// ─── SHARED: LIFE AREA CHIPS ─────────────────────────────────────────────────
function LifeChips({ areas = [] }) {
  if (!areas.length) return null;
  return (
    <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginTop:"4px" }}>
      {areas.map(v => { const a = LIFE_AREAS.find(x=>x.value===v); return a ? <span key={v} style={{ fontSize:"10px", padding:"2px 7px", borderRadius:"20px", background:"#f0f9ff", border:"1px solid #b8dded", color:"#5a90a8" }}>{a.icon} {a.label}</span> : null; })}
    </div>
  );
}

// ─── SHARED: PROPOSAL FORM ───────────────────────────────────────────────────
function ProposalForm({ onAdd, who }) {
  const [item, setItem] = useState({ category: PLAN_CATEGORIES[0], text:"", note:"", date:"", time:"", importance:"", lifeAreas:[] });
  const add = () => {
    if (!item.text.trim()) return;
    onAdd({ ...item, id: Date.now(), proposedBy: who });
    setItem(p => ({ ...p, text:"", note:"", date:"", time:"", importance:"", lifeAreas:[] }));
  };
  return (
    <div style={styles.addForm}>
      <div style={styles.formRow}>
        <select value={item.category} onChange={e=>setItem(p=>({...p,category:e.target.value}))} style={styles.select}>
          {PLAN_CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={styles.formRow}>
        <input placeholder="What's the plan?" value={item.text} onChange={e=>setItem(p=>({...p,text:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&add()} style={styles.input} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"10px" }}>
        <input type="date" value={item.date} onChange={e=>setItem(p=>({...p,date:e.target.value}))} style={{...styles.input,fontSize:"13px"}} />
        <input type="time" value={item.time} onChange={e=>setItem(p=>({...p,time:e.target.value}))} style={{...styles.input,fontSize:"13px"}} />
      </div>
      <div style={styles.formRow}>
        <input placeholder={`Notes for ${who==="mary"?"Erik":"Mary"} (optional)`} value={item.note} onChange={e=>setItem(p=>({...p,note:e.target.value}))} style={{...styles.input,fontSize:"13px"}} />
      </div>
      <LifeAreaPicker value={item.lifeAreas} onChange={v=>setItem(p=>({...p,lifeAreas:v}))} />
      <ImportancePicker value={item.importance} onChange={v=>setItem(p=>({...p,importance:v}))} label={`How much does this matter to you, ${who==="mary"?"Mary":"Erik"}?`} />
      <button onClick={add} style={{...styles.addBtn, marginTop:"12px"}}>+ Add</button>
    </div>
  );
}

// ─── SHARED: PROPOSAL ROW ────────────────────────────────────────────────────
function ProposalRow({ p, onRemove, erikImportance, submitted, showAlignment }) {
  const mt = p.importance ? getTier(p.importance) : null;
  const eImp = erikImportance?.[p.id];
  const proposerLabel = p.proposedBy === "erik" ? "Erik's proposal" : null;
  return (
    <div style={styles.proposalRow}>
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:"8px" }}>
          <div style={{ flex:1 }}>
            {proposerLabel && <div style={{ fontSize:"10px", color:"#f07820", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"2px" }}>👨 {proposerLabel}</div>}
            <div style={styles.proposalText}>{p.text}</div>
            {(p.date||p.time) && <div style={{ fontSize:"12px", color:"#c9a96e", marginTop:"2px" }}>📅 {p.date} {p.time}</div>}
            {p.note && <div style={styles.proposalNote}>{p.note}</div>}
            <LifeChips areas={p.lifeAreas} />
          </div>
          {mt && <div style={{ fontSize:"10px", color:mt.color, background:mt.bg, border:`1px solid ${mt.color}`, borderRadius:"6px", padding:"3px 7px", whiteSpace:"nowrap", flexShrink:0 }}>{mt.symbol} {mt.label}</div>}
        </div>
        {showAlignment && submitted && eImp && <AlignmentBadge mVal={p.importance} eVal={eImp} />}
      </div>
      {onRemove && <button onClick={()=>onRemove(p.id)} style={styles.removeBtn}>✕</button>}
    </div>
  );
}

// ─── MINI CALENDAR ────────────────────────────────────────────────────────────
function MiniCalendar({ events }) {
  const [month, setMonth] = useState(()=>{ const d=new Date(); d.setDate(1); return d; });
  const year=month.getFullYear(), mon=month.getMonth();
  const firstDay=new Date(year,mon,1).getDay(), daysInMonth=new Date(year,mon+1,0).getDate();
  const today=new Date();
  const cells=[]; for(let i=0;i<firstDay;i++) cells.push(null); for(let d=1;d<=daysInMonth;d++) cells.push(d);
  const evByDay={};
  events.forEach(ev=>{ if(!ev.date) return; const d=new Date(ev.date); if(d.getFullYear()===year&&d.getMonth()===mon){ const day=d.getDate(); if(!evByDay[day]) evByDay[day]=[]; evByDay[day].push(ev); } });
  return (
    <div style={{ background:"#1e1b17", borderRadius:"14px", padding:"20px", border:"1px solid #2a2520" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
        <button onClick={()=>setMonth(m=>{ const n=new Date(m); n.setMonth(n.getMonth()-1); return n; })} style={calBtn}>‹</button>
        <span style={{ color:"#1a3040", fontWeight:"600", fontSize:"15px" }}>{month.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</span>
        <button onClick={()=>setMonth(m=>{ const n=new Date(m); n.setMonth(n.getMonth()+1); return n; })} style={calBtn}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"2px", marginBottom:"4px" }}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{ textAlign:"center", fontSize:"11px", color:"#a0c8d8", padding:"4px 0", fontWeight:"700" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"2px" }}>
        {cells.map((d,i)=>{
          const isToday=d&&today.getDate()===d&&today.getMonth()===mon&&today.getFullYear()===year;
          const evs=d?(evByDay[d]||[]):[];
          return (
            <div key={i} style={{ minHeight:"44px", borderRadius:"8px", padding:"4px", background:isToday?"#fff3e0":evs.length?"#e8f5fb":"transparent", border:isToday?"1px solid #f0a040":"1px solid transparent" }}>
              {d&&<div style={{ fontSize:"12px", color:isToday?"#e07820":"#7aaabb", textAlign:"right", marginBottom:"2px" }}>{d}</div>}
              {evs.map((ev,ei)=><div key={ei} title={ev.title} style={{ fontSize:"9px", color:"#fff", background:ev.color||"#4caf7d", borderRadius:"3px", padding:"1px 3px", marginBottom:"1px", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{ev.emoji} {ev.title}</div>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
const calBtn={ background:"none", border:"none", color:"#38a8d0", fontSize:"20px", cursor:"pointer", padding:"4px 10px" };

// ─── MARY VIEW ────────────────────────────────────────────────────────────────
function MaryView({ state, setState, setView }) {
  const { proposals=[], submitted, calendarEvents=[], maryReviewQueue=[], erikImportance={} } = state;
  const [customNudge,setCustomNudge]=useState(false), [customHard,setCustomHard]=useState(false);
  const defaults=getDefaultDeadlines();

  const addProposal = (item) => setState(s=>({...s, proposals:[...(s.proposals||[]), item]}));
  const remove = (id) => setState(s=>({...s, proposals:s.proposals.filter(p=>p.id!==id)}));

  const handleSubmit = () => {
    const nd=customNudge?new Date(state.nudgeDeadline).getTime():defaults.nudge.getTime();
    const hd=customHard?new Date(state.hardDeadline).getTime():defaults.hard.getTime();
    requestNotif(()=>{ scheduleNotif("📋 Weekend Nudge","Erik, decide before Thursday!",nd); scheduleNotif("⚠️ FINAL DEADLINE","Erik! Decide NOW.",hd); });
    setState(s=>({...s, submitted:true, nudgeDeadline:nd, hardDeadline:hd}));
  };

  const pendingReview=maryReviewQueue.filter(r=>r.status==="pending");
  const respondToMod=(id,resp,counter)=>setState(s=>({...s, maryReviewQueue:(s.maryReviewQueue||[]).map(r=>r.id===id?{...r,status:resp,maryCounter:counter||null}:r)}));
  const grouped=PLAN_CATEGORIES.reduce((acc,cat)=>{ acc[cat]=proposals.filter(p=>p.category===cat); return acc; },{});

  return (
    <div style={styles.panel}>
      <div style={{ marginBottom:"28px" }}>
        <span style={styles.roleTag}>Mary</span>
        <h2 style={styles.panelTitle}>This Weekend</h2>
        <p style={styles.panelSub}>Propose plans, rate importance, tag life areas.</p>
      </div>

      {pendingReview.length>0&&(
        <div style={{ marginBottom:"28px" }}>
          <div style={{ fontSize:"11px", color:"#e07820", letterSpacing:"3px", textTransform:"uppercase", fontWeight:"700", marginBottom:"12px" }}>⟳ Erik Modified — Respond</div>
          {pendingReview.map(r=><ModReview key={r.id} review={r} onRespond={respondToMod}/>)}
        </div>
      )}

      {!submitted&&<ProposalForm onAdd={addProposal} who="mary"/>}

      {PLAN_CATEGORIES.map(cat=>grouped[cat].length>0&&(
        <div key={cat} style={styles.group}>
          <div style={styles.groupHeader}><span>{CAT_ICONS[cat]}</span><span style={styles.groupLabel}>{cat}</span><span style={styles.groupCount}>{grouped[cat].length}</span></div>
          {grouped[cat].map(p=><ProposalRow key={p.id} p={p} onRemove={!submitted?remove:null} erikImportance={erikImportance} submitted={submitted} showAlignment />)}
        </div>
      ))}

      {proposals.length>0&&!submitted&&(
        <div>
          <div style={{ background:"#f0f9ff", borderRadius:"12px", padding:"16px", border:"1px solid #b8dded", marginBottom:"16px" }}>
            <div style={{ fontSize:"11px", color:"#5a9ab0", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Decision Deadlines</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
              <span style={{ color:"#2a6080", fontSize:"14px" }}>💬 Nudge (Wed)</span>
              {!customNudge?<span style={{ color:"#38a8d0", fontSize:"13px", cursor:"pointer", textDecoration:"underline" }} onClick={()=>setCustomNudge(true)}>{fmt(defaults.nudge)}</span>
                :<input type="datetime-local" style={{...styles.input,width:"auto",fontSize:"12px",padding:"6px 8px"}} onChange={e=>setState(s=>({...s,nudgeDeadline:e.target.value}))}/>}
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ color:"#2a6080", fontSize:"14px" }}>🔒 Hard (Thu)</span>
              {!customHard?<span style={{ color:"#9a8e7e", fontSize:"13px", cursor:"pointer", textDecoration:"underline" }} onClick={()=>setCustomHard(true)}>{fmt(defaults.hard)}</span>
                :<input type="datetime-local" style={{...styles.input,width:"auto",fontSize:"12px",padding:"6px 8px"}} onChange={e=>setState(s=>({...s,hardDeadline:e.target.value}))}/>}
            </div>
            <div style={{ fontSize:"11px", color:"#8ab8c8", marginTop:"8px", fontStyle:"italic" }}>Tap to override</div>
          </div>
          <button onClick={handleSubmit} style={styles.submitBtn}>Send to Erik →</button>
        </div>
      )}
      {submitted&&<div style={styles.sentBadge}>✓ Sent — nudge Wed · hard deadline Thu</div>}
      {calendarEvents.length>0&&<div style={{ marginTop:"32px" }}><div style={{ fontSize:"11px", color:"#9a8e7e", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Family Calendar</div><MiniCalendar events={calendarEvents}/></div>}
      <div style={styles.switchRow}><button onClick={()=>setView("choose")} style={styles.switchBtn}>← Home</button></div>
    </div>
  );
}

// ─── MOD REVIEW ──────────────────────────────────────────────────────────────
function ModReview({ review, onRespond }) {
  const [counter,setCounter]=useState(""), [mode,setMode]=useState(null);
  return (
    <div style={{ background:"#fff8f0", border:"1px solid #f0c898", borderRadius:"12px", padding:"16px", marginBottom:"12px" }}>
      <div style={{ color:"#f0ece4", fontSize:"15px", fontWeight:"600", marginBottom:"4px" }}>{review.originalText}</div>
      <div style={{ color:"#c07020", fontSize:"13px", marginBottom:"12px", fontStyle:"italic" }}>Erik's mod: "{review.modification}"</div>
      {!mode&&<div style={{ display:"flex", gap:"8px" }}>
        <button onClick={()=>{setMode("accept");onRespond(review.id,"accepted");}} style={{...styles.smallBtn,background:"#e4f8ee",borderColor:"#3ab878",color:"#2a8a58"}}>✓ Accept</button>
        <button onClick={()=>setMode("counter")} style={{...styles.smallBtn,background:"#fff5e5",borderColor:"#f0a040",color:"#c07820"}}>↺ Counter</button>
        <button onClick={()=>{setMode("reject");onRespond(review.id,"rejected");}} style={{...styles.smallBtn,background:"#fde8ee",borderColor:"#e08090",color:"#c04060"}}>✕ Drop</button>
      </div>}
      {mode==="counter"&&<div>
        <input placeholder="Your counter..." value={counter} onChange={e=>setCounter(e.target.value)} style={{...styles.input,marginBottom:"8px",fontSize:"14px"}}/>
        <button onClick={()=>{if(counter.trim()){onRespond(review.id,"countered",counter);setMode("countered");}}} style={{...styles.smallBtn,background:"#e8f5fb",borderColor:"#38a8d0",color:"#1880a0"}}>Send →</button>
      </div>}
      {(mode==="accept"||mode==="reject"||mode==="countered")&&<div style={{ color:"#4caf7d", fontSize:"13px", fontStyle:"italic" }}>{mode==="accept"?"✓ Accepted":mode==="reject"?"✕ Dropped":`↺ Counter sent: "${counter}"`}</div>}
    </div>
  );
}

// ─── ERIK VIEW ────────────────────────────────────────────────────────────────
function ErikView({ state, setState, setView }) {
  const { proposals=[], submitted, hardDeadline, nudgeDeadline, decisions={}, modifyTexts={}, erikImportance={}, maryReviewQueue=[], locked:stateLocked } = state;
  const [tl,setTl]=useState(""), [urgent,setUrgent]=useState(false), [locked,setLocked]=useState(stateLocked||false);
  const pendingCounters=maryReviewQueue.filter(r=>r.status==="countered"&&!r.erikFinalVerdict);

  useEffect(()=>{
    if(!hardDeadline) return;
    const tick=()=>{ const diff=hardDeadline-Date.now(); setTl(diff<=0?"TIME'S UP":timeLeft(hardDeadline)); setUrgent(diff<3600000); };
    tick(); const id=setInterval(tick,1000); return ()=>clearInterval(id);
  },[hardDeadline]);

  const addErikProposal=(item)=>setState(s=>({...s, proposals:[...(s.proposals||[]), item]}));
  const decide=(id,val)=>setState(s=>({...s, decisions:{...(s.decisions||{}),[id]:val}}));
  const setMod=(id,text)=>setState(s=>({...s, modifyTexts:{...(s.modifyTexts||{}),[id]:text}}));
  const setImp=(id,val)=>setState(s=>({...s, erikImportance:{...(s.erikImportance||{}),[id]:val}}));

  const allDecided=proposals.length>0&&proposals.every(p=>{
    const d=decisions[p.id];
    if(!d) return false;
    if(d==="modify") return (modifyTexts[p.id]||"").trim().length>0;
    return true;
  });

  const addToCalendar=(p)=>{
    if(!p.date) return;
    const ev={ id:p.id+"_manual", title:p.text, date:p.date, time:p.time, category:p.category, emoji:CAT_ICONS[p.category], color:p.category==="Erik & Mary"?"#9333ea":p.category==="Kids Activities"?"#e0a040":"#4caf7d" };
    setState(s=>({ ...s, calendarEvents:[...(s.calendarEvents||[]).filter(e=>e.id!==ev.id), ev] }));
  };

  const lockIn=()=>{
    const newEvents=proposals.filter(p=>decisions[p.id]==="yes"&&p.date).map(p=>({ id:p.id, title:p.text, date:p.date, time:p.time, category:p.category, emoji:CAT_ICONS[p.category], color:p.category==="Erik & Mary"?"#9333ea":p.category==="Kids Activities"?"#e0a040":"#4caf7d" }));
    // Also add Erik's own proposals that have dates
    const erikOwnEvents=proposals.filter(p=>p.proposedBy==="erik"&&p.date&&!newEvents.find(e=>e.id===p.id)).map(p=>({ id:p.id+"_erik", title:p.text, date:p.date, time:p.time, category:p.category, emoji:CAT_ICONS[p.category], color:"#c9a96e" }));
    const modQueue=proposals.filter(p=>decisions[p.id]==="modify").map(p=>({ id:p.id, originalText:p.text, modification:modifyTexts[p.id], status:"pending", category:p.category, date:p.date, time:p.time }));
    setState(s=>({ ...s, locked:true, calendarEvents:[...(s.calendarEvents||[]), ...newEvents, ...erikOwnEvents], maryReviewQueue:[...(s.maryReviewQueue||[]), ...modQueue] }));
    setLocked(true);
  };

  const acceptCounter=(r,verdict)=>{
    setState(s=>{
      const queue=(s.maryReviewQueue||[]).map(item=>item.id===r.id?{...item,erikFinalVerdict:verdict}:item);
      let evs=s.calendarEvents||[];
      if(verdict==="yes"&&r.date) evs=[...evs,{id:r.id+"_counter",title:r.maryCounter,date:r.date,time:r.time,category:r.category,emoji:CAT_ICONS[r.category],color:"#c9a96e"}];
      return {...s,maryReviewQueue:queue,calendarEvents:evs};
    });
  };

  const grouped=PLAN_CATEGORIES.reduce((acc,cat)=>{ acc[cat]=proposals.filter(p=>p.category===cat); return acc; },{});
  const calEvents=state.calendarEvents||[];

  return (
    <div style={styles.panel}>
      <div style={{ marginBottom:"24px" }}>
        <span style={{...styles.roleTag, background:"#e8f5e0", color:"#3a7a40"}}>Erik</span>
        <h2 style={styles.panelTitle}>Your Call.</h2>
        <p style={styles.panelSub}>Propose, decide, rank, and add to calendar.</p>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.65}}`}</style>

      {/* Erik can propose too */}
      {!locked&&(
        <div style={{ marginBottom:"28px" }}>
          <div style={{ fontSize:"11px", color:"#3ab878", letterSpacing:"3px", textTransform:"uppercase", fontWeight:"700", marginBottom:"10px" }}>👨 Add Your Own Plans</div>
          <ProposalForm onAdd={addErikProposal} who="erik"/>
        </div>
      )}

      {!locked&&hardDeadline&&(
        <div style={{...styles.countdown, background:urgent?"#fff0f0":"#e8f5fb", borderColor:urgent?"#e05050":"#38a8d0", animation:urgent?"pulse 1s infinite":"none"}}>
          <div style={{ display:"flex", gap:"24px", textAlign:"center" }}>
            <div>
              <div style={{ fontSize:"10px", letterSpacing:"2px", color:"#2090b8", textTransform:"uppercase" }}>Nudge</div>
              <div style={{ fontSize:"13px", color:"#5a9ab0" }}>{nudgeDeadline?fmt(new Date(nudgeDeadline)):"Wed 7pm"}</div>
            </div>
            <div style={{ width:"1px", background:"#2a2a3e" }}/>
            <div>
              <div style={{ fontSize:"10px", letterSpacing:"2px", color:urgent?"#e05050":"#2090b8", textTransform:"uppercase" }}>{urgent?"⚠ NOW":"Hard deadline"}</div>
              <div style={{ fontSize:"26px", fontWeight:"800", color:urgent?"#e03030":"#1a3040", fontVariantNumeric:"tabular-nums", letterSpacing:"-1px" }}>{tl}</div>
            </div>
          </div>
        </div>
      )}

      {!submitted&&proposals.filter(p=>p.proposedBy!=="erik").length===0&&(
        <div style={{ color:"#9ab8c8", textAlign:"center", padding:"20px", fontStyle:"italic" }}>Mary hasn't submitted proposals yet — but you can add yours above.</div>
      )}

      {pendingCounters.length>0&&(
        <div style={{ marginBottom:"24px" }}>
          <div style={{ fontSize:"11px", color:"#c9a96e", letterSpacing:"3px", textTransform:"uppercase", fontWeight:"700", marginBottom:"12px" }}>↺ Mary Countered — Final Call</div>
          {pendingCounters.map(r=>(
            <div key={r.id} style={{ background:"#f0f8ff", border:"1px solid #f0c898", borderRadius:"12px", padding:"16px", marginBottom:"10px" }}>
              <div style={{ color:"#9a8e7e", fontSize:"12px", textDecoration:"line-through", marginBottom:"4px" }}>{r.originalText} → {r.modification}</div>
              <div style={{ color:"#f0ece4", fontSize:"15px", fontWeight:"600", marginBottom:"12px" }}>Mary's counter: "{r.maryCounter}"</div>
              <div style={{ display:"flex", gap:"8px" }}>
                <button onClick={()=>acceptCounter(r,"yes")} style={{...styles.smallBtn,background:"#e4f8ee",borderColor:"#3ab878",color:"#2a8a58"}}>✓ Do it</button>
                <button onClick={()=>acceptCounter(r,"no")} style={{...styles.smallBtn,background:"#2a1010",borderColor:"#666",color:"#888"}}>✕ Drop</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!locked&&PLAN_CATEGORIES.map(cat=>grouped[cat].length>0&&(
        <div key={cat} style={styles.group}>
          <div style={styles.groupHeader}><span>{CAT_ICONS[cat]}</span><span style={styles.groupLabel}>{cat}</span></div>
          {grouped[cat].map(p=>{
            const verdict=decisions[p.id];
            const mt=p.importance?getTier(p.importance):null;
            const isErikOwn=p.proposedBy==="erik";
            return (
              <div key={p.id} style={{...styles.decisionCard, borderColor:verdict==="yes"?"#4caf7d":verdict==="no"?"#444":verdict==="modify"?"#e0a040":isErikOwn?"#f0a040":"#c8e6f0"}}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:"8px", marginBottom:"10px" }}>
                  <div style={{ flex:1 }}>
                    {isErikOwn&&<div style={{ fontSize:"10px", color:"#f07820", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"2px" }}>Your proposal</div>}
                    <div style={{...styles.proposalText,color:"#f0ece4"}}>{p.text}</div>
                    {(p.date||p.time)&&<div style={{ fontSize:"12px", color:"#c9a96e", marginTop:"2px" }}>📅 {p.date} {p.time}</div>}
                    {p.note&&<div style={{...styles.proposalNote,color:"#7a7060"}}>{p.note}</div>}
                    <LifeChips areas={p.lifeAreas}/>
                  </div>
                  {mt&&<div style={{ fontSize:"10px", color:mt.color, background:mt.bg, border:`1px solid ${mt.color}`, borderRadius:"6px", padding:"3px 7px", whiteSpace:"nowrap", flexShrink:0 }}>{!isErikOwn?"Mary:":""} {mt.symbol} {mt.label}</div>}
                </div>

                <ImportancePicker value={erikImportance[p.id]} onChange={v=>setImp(p.id,v)} label="Your importance, Erik"/>
                {p.importance&&erikImportance[p.id]&&<AlignmentBadge mVal={p.importance} eVal={erikImportance[p.id]}/>}

                {/* Add to calendar button (for Erik's own proposals or if no date yet) */}
                {isErikOwn&&p.date&&(
                  <button onClick={()=>addToCalendar(p)} style={{...styles.smallBtn, marginTop:"10px", background:calEvents.find(e=>e.id===p.id+"_manual")?"#1a2e1a":"transparent", borderColor:calEvents.find(e=>e.id===p.id+"_manual")?"#4caf7d":"#2a2a3e", color:calEvents.find(e=>e.id===p.id+"_manual")?"#4caf7d":"#8ab0c0", fontSize:"12px"}}>
                    {calEvents.find(e=>e.id===p.id+"_manual")?"✓ On calendar":"📅 Add to calendar"}
                  </button>
                )}

                {!isErikOwn&&(
                  <div style={{...styles.decisionBtns, marginTop:"12px"}}>
                    {[{val:"yes",label:"✓ Doing it",color:"#4caf7d"},{val:"modify",label:"~ Modify",color:"#e0a040"},{val:"no",label:"✕ Skip",color:"#666"}].map(btn=>(
                      <button key={btn.val} onClick={()=>decide(p.id,btn.val)} style={{ flex:1, padding:"10px 6px", background:verdict===btn.val?btn.color:"transparent", border:`1px solid ${verdict===btn.val?btn.color:"#2a2a3e"}`, borderRadius:"6px", color:verdict===btn.val?"#fff":"#5a5a6a", fontSize:"12px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>{btn.label}</button>
                    ))}
                  </div>
                )}
                {verdict==="modify"&&(
                  <div style={{ marginTop:"12px" }}>
                    <input autoFocus placeholder="How are you changing it? (required)" value={modifyTexts[p.id]||""} onChange={e=>setMod(p.id,e.target.value)} style={{...styles.input,background:"#f0f7fa",border:`1px solid ${(modifyTexts[p.id]||"").trim()?"#f07040":"#b8dded"}`,color:"#1a3040",fontSize:"14px"}}/>
                    {!(modifyTexts[p.id]||"").trim()&&<p style={{ color:"#e07040", fontSize:"11px", margin:"5px 0 0", fontStyle:"italic" }}>Required — Mary will review.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {!locked&&proposals.filter(p=>p.proposedBy!=="erik").length>0&&(
        <button onClick={lockIn} disabled={!allDecided} style={{...styles.submitBtn, marginTop:"8px", background:allDecided?"linear-gradient(135deg,#f07040,#e05030)":"#e0eef4", color:allDecided?"#ffffff":"#9ab8c8", cursor:allDecided?"pointer":"not-allowed"}}>
          {allDecided?"Lock it in ✓":`Decide all of Mary's items (${Object.keys(decisions).filter(id=>decisions[id]!=="modify"||(modifyTexts[id]||"").trim()).length}/${proposals.filter(p=>p.proposedBy!=="erik").length})`}
        </button>
      )}
      {locked&&<div style={{...styles.sentBadge,marginTop:"8px"}}>✓ Locked — calendar updated · Mary notified</div>}
      <div style={styles.switchRow}><button onClick={()=>setView("choose")} style={styles.switchBtn}>← Home</button></div>
    </div>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────
function CalendarView({ state, setView }) {
  const events=state.calendarEvents||[];
  const upcoming=[...events].sort((a,b)=>new Date(a.date)-new Date(b.date));
  return (
    <div style={styles.panel}>
      <div style={{ marginBottom:"28px" }}>
        <span style={{...styles.roleTag,background:"#e4f8ee",color:"#2a8a58"}}>Family Calendar</span>
        <h2 style={styles.panelTitle}>Upcoming</h2>
        <p style={styles.panelSub}>Confirmed by Erik ✓</p>
      </div>
      <MiniCalendar events={events}/>
      <div style={{ marginTop:"24px" }}>
        {upcoming.length===0&&<p style={{ color:"#a0c8d8", textAlign:"center", fontStyle:"italic" }}>No events yet.</p>}
        {upcoming.map(ev=>(
          <div key={ev.id} style={{...styles.proposalRow, borderLeft:`3px solid ${ev.color||"#4caf7d"}`, marginBottom:"8px"}}>
            <div>
              <div style={styles.proposalText}>{ev.emoji} {ev.title}</div>
              <div style={{ fontSize:"12px", color:"#f07040" }}>📅 {ev.date} {ev.time}</div>
              <div style={{ fontSize:"11px", color:"#7aaabb", letterSpacing:"1px" }}>{ev.category}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={styles.switchRow}><button onClick={()=>setView("choose")} style={styles.switchBtn}>← Home</button></div>
    </div>
  );
}

// ─── ALIGNMENT VIEW ───────────────────────────────────────────────────────────
function AlignmentView({ state, setView }) {
  const { proposals=[], erikImportance={} } = state;
  const ranked=proposals.filter(p=>p.importance&&erikImportance[p.id]);
  const mismatches=ranked.filter(p=>alignmentStatus(p.importance,erikImportance[p.id])==="gap");
  const close=ranked.filter(p=>alignmentStatus(p.importance,erikImportance[p.id])==="close");
  const aligned=ranked.filter(p=>alignmentStatus(p.importance,erikImportance[p.id])==="aligned");
  const unranked=proposals.filter(p=>!p.importance||!erikImportance[p.id]);

  const Section=({title,color,items})=>items.length===0?null:(
    <div style={{ marginBottom:"28px" }}>
      <div style={{ fontSize:"11px", color, letterSpacing:"3px", textTransform:"uppercase", fontWeight:"700", marginBottom:"10px" }}>{title}</div>
      {items.map(p=>(
        <div key={p.id} style={{...styles.proposalRow, borderLeft:`3px solid ${color}`}}>
          <div style={{ flex:1 }}>
            <div style={styles.proposalText}>{p.text}</div>
            <LifeChips areas={p.lifeAreas}/>
            <AlignmentBadge mVal={p.importance} eVal={erikImportance[p.id]}/>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={styles.panel}>
      <div style={{ marginBottom:"28px" }}>
        <span style={{...styles.roleTag,background:"#fff5e5",color:"#c07820"}}>Alignment</span>
        <h2 style={styles.panelTitle}>Where You Stand</h2>
        <p style={styles.panelSub}>How your emotional rankings compare.</p>
      </div>
      <Section title="! Mismatches — worth a conversation" color="#e03060" items={mismatches}/>
      <Section title="~ Close" color="#e07820" items={close}/>
      <Section title="✦ Fully Aligned" color="#2a8a58" items={aligned}/>
      {unranked.length>0&&<div>
        <div style={{ fontSize:"11px", color:"#9ab8c8", letterSpacing:"3px", textTransform:"uppercase", fontWeight:"700", marginBottom:"10px" }}>○ Not yet ranked by both</div>
        {unranked.map(p=><div key={p.id} style={{...styles.proposalRow,opacity:0.5}}><div style={styles.proposalText}>{p.text}</div></div>)}
      </div>}
      <div style={styles.switchRow}><button onClick={()=>setView("choose")} style={styles.switchBtn}>← Home</button></div>
    </div>
  );
}


// ─── CREDENTIALS ─────────────────────────────────────────────────────────────
const USERS = {
  "883488":    { name: "mary", label: "Mary" },
  "Bogurt250!": { name: "erik", label: "Erik" },
};

const SESSION_KEY = "wd_session";

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const attempt = () => {
    const user = USERS[pwd];
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      onLogin(user);
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setTimeout(() => setError(false), 2000);
      setPwd("");
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#e8f5fb 0%,#f0f9f4 50%,#fff5f0 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 16px", fontFamily:"'Palatino Linotype','Book Antiqua',Georgia,serif" }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
      <div style={{ fontSize:"56px", marginBottom:"16px" }}>🏡</div>
      <h1 style={{ fontSize:"32px", fontWeight:"700", color:"#1a3040", margin:"0 0 6px", letterSpacing:"-0.5px" }}>Erik & Mary</h1>
      <p style={{ color:"#5a8090", fontSize:"15px", margin:"0 0 40px" }}>Family weekend planner</p>

      <div style={{ width:"100%", maxWidth:"320px", animation: shake?"shake 0.5s ease":undefined }}>
        <input
          type="password"
          placeholder="Enter your password"
          value={pwd}
          onChange={e => { setPwd(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          autoFocus
          style={{
            width:"100%", padding:"16px", fontSize:"18px", textAlign:"center",
            background:"#ffffff", border:`2px solid ${error?"#e03060":"#b8dded"}`,
            borderRadius:"14px", color:"#1a3040", fontFamily:"inherit",
            boxSizing:"border-box", marginBottom:"12px",
            boxShadow:"0 2px 12px rgba(56,160,200,0.08)",
            outline:"none", letterSpacing:"2px",
          }}
        />
        {error && <p style={{ color:"#e03060", textAlign:"center", fontSize:"14px", margin:"0 0 12px", fontStyle:"italic" }}>Wrong password — try again</p>}
        <button
          onClick={attempt}
          style={{
            width:"100%", padding:"16px",
            background:"linear-gradient(135deg,#f07040,#e05030)",
            border:"none", borderRadius:"14px", color:"#fff",
            fontSize:"17px", fontWeight:"700", cursor:"pointer",
            fontFamily:"inherit", boxShadow:"0 4px 16px rgba(240,112,64,0.25)",
          }}
        >
          Enter →
        </button>
      </div>
    </div>
  );
}


// ─── NOTIFICATION BUTTON ──────────────────────────────────────────────────────
function NotifButton() {
  const [status, setStatus] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const enable = async () => {
    if (!("Notification" in window)) {
      alert("Notifications aren't supported on this browser.");
      return;
    }
    const p = await Notification.requestPermission();
    setStatus(p);
    if (p === "granted") {
      new Notification("🏡 Weekend Decider", { body: "Notifications are on! You'll be nudged Wednesday and Thursday." });
    }
  };

  if (status === "granted") return (
    <div style={{ textAlign:"center", padding:"12px", background:"#e4f8ee", border:"1px solid #7dd8a8", borderRadius:"12px", color:"#2a8a58", fontSize:"13px", fontWeight:"700" }}>
      🔔 Notifications are on ✓
    </div>
  );

  return (
    <button onClick={enable} style={{
      width:"100%", padding:"14px",
      background:"#fff", border:"2px dashed #b8dded",
      borderRadius:"12px", color:"#38a8d0",
      fontSize:"14px", fontWeight:"700", cursor:"pointer",
      fontFamily:"inherit",
    }}>
      🔔 Enable notifications
    </button>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeView({ state, setView }) {
  const pendingMary=(state.maryReviewQueue||[]).filter(r=>r.status==="pending").length;
  const pendingErik=(state.maryReviewQueue||[]).filter(r=>r.status==="countered"&&!r.erikFinalVerdict).length;
  const evCount=(state.calendarEvents||[]).length;
  const mismatches=(state.proposals||[]).filter(p=>alignmentStatus(p.importance,(state.erikImportance||{})[p.id])==="gap").length;
  useEffect(()=>{ requestNotif(); },[]);
  return (
    <div style={{...styles.root, justifyContent:"center", minHeight:"100vh"}}>
      <div style={{ textAlign:"center", marginBottom:"44px" }}>
        <div style={{ fontSize:"52px", marginBottom:"14px" }}>🏡</div>
        <h1 style={{ fontFamily:"Georgia,serif", fontSize:"clamp(30px,6vw,50px)", fontWeight:"400", color:"#1a3040", margin:"0 0 8px", letterSpacing:"-1px" }}>Weekend Decider</h1>
        <p style={{ color:"#5a8090", fontSize:"15px", margin:0 }}>Mary proposes · Erik decides · Family calendar</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"14px", width:"100%", maxWidth:"360px" }}>
        <NavCard emoji="👩" name="Mary" sub="Propose plans, rank importance, tag life areas" badge={pendingMary} badgeColor="#e0a040" onClick={()=>setView("mary")} dark={false}/>
        <NavCard emoji="👨" name="Erik" sub="Add plans, decide Mary's, rank & calendar" badge={pendingErik} badgeColor="#c9a96e" onClick={()=>setView("erik")} dark={true}/>
        <NavCard emoji="✦" name="Alignment" sub={mismatches>0?`${mismatches} mismatch${mismatches>1?"es":""} to discuss`:"See where you agree & differ"} badge={mismatches} badgeColor="#e03060" onClick={()=>setView("alignment")} dark={false} accent/>
        <NavCard emoji="📅" name="Family Calendar" sub={evCount>0?`${evCount} event${evCount!==1?"s":""} confirmed`:"Populated after decisions"} onClick={()=>setView("calendar")} dark={false}/>
        <NotifButton/>
      </div>
    </div>
  );
}

function NavCard({ emoji, name, sub, badge, badgeColor, onClick, dark, accent }) {
  return (
    <button onClick={onClick} style={{ padding:"22px 26px", borderRadius:"16px", cursor:"pointer", textAlign:"left", fontFamily:"inherit", border:"none", background:dark?"#1e3a5a":accent?"#fff8f0":"#f0f9ff", outline:dark?"2px solid #f0a040":accent?"1px solid #f0b888":"1px solid #c0dce8", position:"relative" }}>
      {badge>0&&<div style={{ position:"absolute", top:"14px", right:"14px", background:badgeColor, color:"#1a1208", borderRadius:"99px", fontSize:"11px", fontWeight:"800", padding:"2px 8px" }}>{badge}</div>}
      <div style={{ fontSize:"22px", marginBottom:"8px" }}>{emoji}</div>
      <div style={{ fontSize:"17px", fontWeight:"700", color: dark?"#ffffff":"#1a3040", marginBottom:"3px" }}>{name}</div>
      <div style={{ fontSize:"13px", color: dark?"#a0c8d8":"#5a8090" }}>{sub}</div>
    </button>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App({ state, setState, resetAll }) {
  const [view, setView] = useState("choose");
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  });

  const handleLogin = (u) => {
    setUser(u);
    // Auto-route to their view
    setView(u.name === "mary" ? "mary" : "erik");
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setView("choose");
  };

  const handleReset = () => { resetAll(); setView("choose"); };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={styles.root}>
      {/* Logged-in header */}
      <div style={{ width:"100%", maxWidth:"520px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
        <span style={{ fontSize:"13px", color:"#7aaabb" }}>👋 Hi {user.label}</span>
        <button onClick={handleLogout} style={{ background:"none", border:"none", color:"#a0c8d8", fontSize:"12px", cursor:"pointer", fontFamily:"inherit" }}>Sign out</button>
      </div>
      {view==="choose"   &&<><HomeView state={state} setView={setView}/><div style={{...styles.switchRow,marginTop:"32px"}}><button onClick={handleReset} style={{...styles.switchBtn,color:"#b0c8d4"}}>Reset all</button></div></>}
      {view==="mary"     &&<MaryView     state={state} setState={setState} setView={setView}/>}
      {view==="erik"     &&<ErikView     state={state} setState={setState} setView={setView}/>}
      {view==="calendar" &&<CalendarView state={state} setView={setView}/>}
      {view==="alignment"&&<AlignmentView state={state} setView={setView}/>}
    </div>
  );
}

const styles = {
  root:{ minHeight:"100vh", background:"linear-gradient(160deg,#e8f5fb 0%,#f0f9f4 50%,#fff5f0 100%)", fontFamily:"'Palatino Linotype','Book Antiqua',Georgia,serif", display:"flex", flexDirection:"column", alignItems:"center", padding:"32px 16px 60px", color:"#1a3040" },
  panel:{ width:"100%", maxWidth:"520px" },
  roleTag:{ display:"inline-block", padding:"4px 14px", background:"#d0eef8", color:"#1a6080", borderRadius:"99px", fontSize:"12px", fontWeight:"700", letterSpacing:"2px", marginBottom:"12px" },
  panelTitle:{ fontSize:"32px", fontWeight:"700", color:"#1a3040", margin:"0 0 6px", letterSpacing:"-0.5px" },
  panelSub:{ color:"#5a8090", margin:0, fontSize:"15px" },
  addForm:{ background:"#ffffff", borderRadius:"14px", padding:"20px", marginBottom:"24px", border:"1px solid #c8e6f0", boxShadow:"0 2px 12px rgba(56,160,200,0.07)" },
  formRow:{ marginBottom:"10px" },
  select:{ width:"100%", padding:"10px 12px", background:"#f5fbff", border:"1px solid #b8dded", borderRadius:"8px", color:"#1a3040", fontSize:"14px", fontFamily:"inherit" },
  input:{ width:"100%", padding:"12px", background:"#f5fbff", border:"1px solid #b8dded", borderRadius:"8px", color:"#1a3040", fontSize:"15px", fontFamily:"inherit", boxSizing:"border-box" },
  addBtn:{ padding:"10px 24px", background:"linear-gradient(135deg,#38a8d0,#2090b8)", border:"none", borderRadius:"8px", color:"#ffffff", fontSize:"14px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit", width:"100%" },
  group:{ marginBottom:"24px" },
  groupHeader:{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" },
  groupLabel:{ fontSize:"12px", letterSpacing:"2px", textTransform:"uppercase", color:"#5a9ab0", fontWeight:"700", flex:1 },
  groupCount:{ fontSize:"12px", color:"#a0c8d8" },
  proposalRow:{ display:"flex", alignItems:"flex-start", gap:"12px", padding:"12px 14px", background:"#ffffff", borderRadius:"8px", marginBottom:"8px", borderLeft:"3px solid #b8dded", boxShadow:"0 1px 6px rgba(56,160,200,0.06)" },
  proposalText:{ fontSize:"15px", color:"#1a3040", marginBottom:"2px" },
  proposalNote:{ fontSize:"12px", color:"#7aabb8", fontStyle:"italic" },
  removeBtn:{ background:"none", border:"none", color:"#c0d8e0", cursor:"pointer", fontSize:"14px", padding:"2px 4px", flexShrink:0 },
  submitBtn:{ display:"block", width:"100%", padding:"18px", background:"linear-gradient(135deg,#f07040,#e05030)", border:"none", borderRadius:"12px", color:"#ffffff", fontSize:"16px", fontWeight:"700", cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 16px rgba(240,112,64,0.25)" },
  sentBadge:{ textAlign:"center", padding:"14px", background:"#e4f8ee", border:"1px solid #7dd8a8", borderRadius:"10px", color:"#2a8a58", fontSize:"14px", fontWeight:"700" },
  countdown:{ display:"flex", flexDirection:"column", alignItems:"center", padding:"20px", borderRadius:"12px", border:"1px solid", marginBottom:"24px", gap:"4px", boxShadow:"0 2px 12px rgba(56,160,200,0.1)" },
  decisionCard:{ padding:"16px", background:"#ffffff", borderRadius:"10px", marginBottom:"10px", border:"1px solid #c8e6f0", transition:"border-color 0.2s", boxShadow:"0 2px 10px rgba(56,160,200,0.07)" },
  decisionBtns:{ display:"flex", gap:"8px" },
  smallBtn:{ padding:"8px 14px", borderRadius:"8px", border:"1px solid", cursor:"pointer", fontSize:"13px", fontWeight:"700", fontFamily:"inherit", background:"transparent" },
  switchRow:{ marginTop:"24px", textAlign:"center" },
  switchBtn:{ background:"none", border:"none", color:"#7aaabb", fontSize:"13px", cursor:"pointer", fontFamily:"inherit", letterSpacing:"1px" },
};
