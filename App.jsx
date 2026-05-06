import { useState, useRef, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, enableIndexedDbPersistence } from "firebase/firestore";

// ── FIREBASE SETUP ─────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDqXHIpJwk8f9KzsjIasUyoyPcCJ8398N8",
  authDomain: "atrav-insurance.firebaseapp.com",
  projectId: "atrav-insurance",
  storageBucket: "atrav-insurance.firebasestorage.app",
  messagingSenderId: "120428421399",
  appId: "1:120428421399:web:d2a5b90603bb0452421752"
};

let fbApp, fbAuth, fbDb, googleProvider;
try {
  fbApp = initializeApp(FIREBASE_CONFIG);
  fbAuth = getAuth(fbApp);
  fbDb = getFirestore(fbApp);
  googleProvider = new GoogleAuthProvider();
  enableIndexedDbPersistence(fbDb).catch(()=>{});
} catch(e) { console.warn("Firebase init error:", e); }

// Save data to Firestore under user's UID
const saveToFirestore = async (uid, key, value) => {
  if (!fbDb || !uid) return;
  try {
    await setDoc(doc(fbDb, "users", uid, "data", key), { value: JSON.stringify(value), updatedAt: Date.now() });
  } catch(e) { console.warn("Firestore save error:", e); }
};

// Load data from Firestore
const loadFromFirestore = async (uid, key) => {
  if (!fbDb || !uid) return null;
  try {
    const snap = await getDoc(doc(fbDb, "users", uid, "data", key));
    if (snap.exists()) return JSON.parse(snap.data().value);
  } catch(e) { console.warn("Firestore load error:", e); }
  return null;
};

// ── THEME ─────────────────────────────────────────────────────────────────────
const getTheme = (dark) => ({
  bg: dark ? "#080d16" : "#f0f4f8",
  surface: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)",
  surface2: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.98)",
  border: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
  text: dark ? "#e2e8f0" : "#1e293b",
  textMuted: dark ? "#94a3b8" : "#64748b",
  sidebar: dark ? "rgba(5,9,20,0.98)" : "#ffffff",
  sidebarBorder: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
  header: dark ? "rgba(8,13,22,0.92)" : "rgba(248,250,252,0.95)",
  tooltip: dark ? "#0f172a" : "#ffffff",
  chartGrid: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
  inputBg: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
  modal: dark ? "#0f172a" : "#ffffff",
  input: dark ? "rgba(255,255,255,0.08)" : "#f8fafc",
  inputBorder: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
});

// ── INITIAL DATA ──────────────────────────────────────────────────────────────
const INIT_POLICIES = [
  { id:"POL-1042", policyNo:"", client:"Rahul Sharma", contact:"9876543210", type:"Health", department:"MEDICLAIM", effectiveDate:"2026-01-15", expiry:"2026-06-15", netPremium:15678, gst:2822, premium:18500, commisionable:15678, income:8.5, status:"Active", risk:"Low", docLink:"", year:"2026", month:"Jan" },
  { id:"POL-1043", policyNo:"", client:"Priya Mehta", contact:"8765432109", type:"Life", department:"LIFE", effectiveDate:"2024-07-22", expiry:"2035-07-22", netPremium:27119, gst:4881, premium:32000, commisionable:27119, income:12, status:"Active", risk:"Low", docLink:"", year:"2024", month:"Jul" },
  { id:"POL-1044", policyNo:"", client:"Arjun Singh", contact:"7654321098", type:"Car", department:"PVT CAR", effectiveDate:"2025-05-10", expiry:"2026-05-10", netPremium:7797, gst:1403, premium:9200, commisionable:7797, income:6, status:"Renewal Due", risk:"Medium", docLink:"", year:"2025", month:"May" },
  { id:"POL-1045", policyNo:"", client:"Sneha Kapoor", contact:"6543210987", type:"Home", department:"FIRE", effectiveDate:"2026-01-30", expiry:"2027-01-30", netPremium:11864, gst:2136, premium:14000, commisionable:11864, income:5, status:"Active", risk:"Low", docLink:"", year:"2026", month:"Jan" },
  { id:"POL-1046", policyNo:"", client:"Vikram Nair", contact:"5432109876", type:"Health", department:"MEDICLAIM", effectiveDate:"2024-12-01", expiry:"2025-12-01", netPremium:18644, gst:3356, premium:22000, commisionable:18644, income:9, status:"Lapsed", risk:"High", docLink:"", year:"2024", month:"Dec" },
  { id:"POL-1047", policyNo:"", client:"Ananya Reddy", contact:"4321098765", type:"Life", department:"LIFE", effectiveDate:"2023-09-14", expiry:"2038-09-14", netPremium:24153, gst:4347, premium:28500, commisionable:24153, income:14, status:"Active", risk:"Low", docLink:"", year:"2023", month:"Sep" },
  { id:"POL-1048", policyNo:"", client:"Karan Joshi", contact:"3210987654", type:"Car", department:"PVT CAR", effectiveDate:"2025-08-25", expiry:"2026-08-25", netPremium:9661, gst:1739, premium:11400, commisionable:9661, income:7, status:"Active", risk:"Medium", docLink:"", year:"2025", month:"Aug" },
  { id:"POL-1049", policyNo:"", client:"Divya Patel", contact:"2109876543", type:"Home", department:"FIRE", effectiveDate:"2025-05-20", expiry:"2026-05-20", netPremium:14237, gst:2563, premium:16800, commisionable:14237, income:5.5, status:"Renewal Due", risk:"Medium", docLink:"", year:"2025", month:"May" },
];
const INIT_CLIENTS = [
  { id:"C-201", name:"Rahul Sharma", email:"rahul@email.com", phone:"+91 98765 43210", policies:2, totalPremium:40500, since:"2021", city:"Mumbai" },
  { id:"C-202", name:"Priya Mehta", email:"priya@email.com", phone:"+91 87654 32109", policies:1, totalPremium:32000, since:"2022", city:"Delhi" },
  { id:"C-203", name:"Arjun Singh", email:"arjun@email.com", phone:"+91 76543 21098", policies:3, totalPremium:62700, since:"2020", city:"Bangalore" },
  { id:"C-204", name:"Sneha Kapoor", email:"sneha@email.com", phone:"+91 65432 10987", policies:1, totalPremium:14000, since:"2023", city:"Pune" },
  { id:"C-205", name:"Vikram Nair", email:"vikram@email.com", phone:"+91 54321 09876", policies:2, totalPremium:46000, since:"2019", city:"Chennai" },
  { id:"C-206", name:"Ananya Reddy", email:"ananya@email.com", phone:"+91 43210 98765", policies:2, totalPremium:57000, since:"2022", city:"Hyderabad" },
];
const INIT_CLAIMS = [
  { id:"CLM-801", client:"Vikram Nair", type:"Health", amount:85000, filed:"2026-04-02", status:"In Review", agent:"Deepak Verma" },
  { id:"CLM-802", client:"Rahul Sharma", type:"Car", amount:42000, filed:"2026-04-05", status:"Approved", agent:"Sunita Rao" },
  { id:"CLM-803", client:"Sneha Kapoor", type:"Home", amount:120000, filed:"2026-04-08", status:"In Review", agent:"Manoj Kumar" },
  { id:"CLM-804", client:"Arjun Singh", type:"Health", amount:55000, filed:"2026-04-10", status:"Approved", agent:"Kavitha Iyer" },
  { id:"CLM-805", client:"Priya Mehta", type:"Life", amount:500000, filed:"2026-04-12", status:"Rejected", agent:"Rohit Bansal" },
  { id:"CLM-806", client:"Ananya Reddy", type:"Car", amount:28500, filed:"2026-04-15", status:"Approved", agent:"Sunita Rao" },
];
const INIT_AGENTS = [
  { id:"A-01", name:"Deepak Verma", region:"North", policiesSold:87, revenue:18.4, claimsHandled:34, rating:4.8, target:92, commission:92000 },
  { id:"A-02", name:"Sunita Rao", region:"South", policiesSold:102, revenue:24.1, claimsHandled:41, rating:4.9, target:100, commission:120500 },
  { id:"A-03", name:"Manoj Kumar", region:"West", policiesSold:74, revenue:15.8, claimsHandled:28, rating:4.5, target:90, commission:79000 },
  { id:"A-04", name:"Kavitha Iyer", region:"East", policiesSold:91, revenue:21.2, claimsHandled:37, rating:4.7, target:95, commission:106000 },
  { id:"A-05", name:"Rohit Bansal", region:"Central", policiesSold:65, revenue:13.0, claimsHandled:22, rating:4.2, target:85, commission:65000 },
];
const INIT_PAYMENTS = [
  { id:"PAY-3301", client:"Rahul Sharma", amount:18500, type:"Health Premium", date:"2026-04-01", status:"Paid", method:"UPI" },
  { id:"PAY-3302", client:"Priya Mehta", amount:32000, type:"Life Premium", date:"2026-04-03", status:"Paid", method:"Net Banking" },
  { id:"PAY-3303", client:"Arjun Singh", amount:9200, type:"Car Renewal", date:"2026-04-05", status:"Pending", method:"Card" },
  { id:"PAY-3304", client:"Sneha Kapoor", amount:14000, type:"Home Premium", date:"2026-04-07", status:"Paid", method:"UPI" },
  { id:"PAY-3305", client:"Vikram Nair", amount:22000, type:"Health Premium", date:"2026-04-10", status:"Failed", method:"Card" },
  { id:"PAY-3306", client:"Ananya Reddy", amount:28500, type:"Life Premium", date:"2026-04-12", status:"Paid", method:"Net Banking" },
  { id:"PAY-3307", client:"Karan Joshi", amount:11400, type:"Car Premium", date:"2026-04-15", status:"Pending", method:"UPI" },
];
const NOTIFICATIONS_INIT = [
  { id:1, type:"renewal", icon:"⚠️", title:"Renewal Due: Arjun Singh", body:"Car Insurance POL-1044 expires in 10 days", time:"2 min ago", read:false },
  { id:2, type:"renewal", icon:"⚠️", title:"Renewal Due: Divya Patel", body:"Home Insurance POL-1049 expires in 20 days", time:"1 hr ago", read:false },
  { id:3, type:"claim", icon:"🛡️", title:"New Claim Filed", body:"CLM-803 by Sneha Kapoor — ₹1,20,000 (Home)", time:"3 hrs ago", read:false },
  { id:4, type:"payment", icon:"💳", title:"Payment Failed", body:"Vikram Nair — ₹22,000 Health Premium via Card", time:"5 hrs ago", read:true },
  { id:5, type:"claim", icon:"✅", title:"Claim Approved", body:"CLM-804 Arjun Singh — ₹55,000 Health approved", time:"Yesterday", read:true },
  { id:6, type:"agent", icon:"🏆", title:"Agent Milestone", body:"Sunita Rao crossed 100 policies this month!", time:"Yesterday", read:true },
];
const CALENDAR_EVENTS = {
  "2026-05-05":[{ title:"Agent Meet - Deepak", color:"#60a5fa" }],
  "2026-05-10":[{ title:"⚠️ POL-1044 Expires", color:"#f87171" }],
  "2026-05-12":[{ title:"Claim Hearing CLM-803", color:"#a78bfa" }],
  "2026-05-15":[{ title:"Q2 Performance Review", color:"#34d399" }],
  "2026-05-18":[{ title:"Client Onboarding - 3 clients", color:"#f59e0b" }],
  "2026-05-20":[{ title:"⚠️ POL-1049 Expires", color:"#f87171" }],
  "2026-05-22":[{ title:"Agent Training - South", color:"#60a5fa" }],
  "2026-05-28":[{ title:"Board Presentation", color:"#34d399" }],
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${(n/100000).toFixed(1)}L`;
const fmtINR = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const typeIcon = (t) => ({ Health:"🏥", Life:"💛", Car:"🚗", Home:"🏠" }[t] || "📋");
const daysUntil = (d) => Math.ceil((new Date(d)-new Date())/(1000*60*60*24));
const uid = (pre) => `${pre}-${Date.now().toString(36).toUpperCase()}`;

const statusColor = (s) => {
  const m = { Active:"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", "Renewal Due":"bg-amber-500/20 text-amber-400 border border-amber-500/30", Lapsed:"bg-red-500/20 text-red-400 border border-red-500/30", Paid:"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", Pending:"bg-amber-500/20 text-amber-400 border border-amber-500/30", Failed:"bg-red-500/20 text-red-400 border border-red-500/30", Approved:"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", Rejected:"bg-red-500/20 text-red-400 border border-red-500/30", "In Review":"bg-blue-500/20 text-blue-400 border border-blue-500/30" };
  return m[s] || "bg-slate-500/20 text-slate-400";
};

// ── PERSISTENT STORAGE HOOK (localStorage + Firestore) ───────────────────────
const usePersistedState = (storageKey, initialValue, firebaseUid) => {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : initialValue;
    } catch { return initialValue; }
  });
  const [loaded, setLoaded] = useState(false);

  // Load from Firestore on login
  useEffect(() => {
    if (!firebaseUid) { setLoaded(true); return; }
    const key = storageKey.replace("atrav:", "");
    loadFromFirestore(firebaseUid, key).then(data => {
      if (data !== null) {
        setState(data);
        localStorage.setItem(storageKey, JSON.stringify(data));
      }
      setLoaded(true);
    });
  }, [firebaseUid, storageKey]);

  // Save to localStorage + Firestore on change
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    if (firebaseUid) {
      const key = storageKey.replace("atrav:", "");
      saveToFirestore(firebaseUid, key, state);
    }
  }, [state, loaded, storageKey, firebaseUid]);

  return [state, setState, loaded];
};


const exportCSV = (data, filename) => {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map(r => keys.map(k => `"${r[k]}"`).join(","))].join("\n");
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv],{type:"text/csv"})), download: filename });
  a.click(); URL.revokeObjectURL(a.href);
};

// ── PDF EXPORT ────────────────────────────────────────────────────────────────
const exportPDF = (title, data, columns) => {
  const rows = data.map(r => `<tr>${columns.map(c=>`<td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px">${r[c.key]??""}</td>`).join("")}</tr>`).join("");
  const html = `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:sans-serif;padding:32px;color:#1e293b}h1{color:#1e293b;font-size:20px;margin-bottom:4px}.sub{color:#64748b;font-size:13px;margin-bottom:24px}table{width:100%;border-collapse:collapse}th{background:#f59e0b;color:#000;padding:10px 12px;text-align:left;font-size:12px}tr:nth-child(even){background:#f8fafc}.footer{margin-top:32px;font-size:11px;color:#94a3b8;border-top:1px solid #eee;padding-top:12px}@media print{button{display:none}}</style></head><body><h1>ATRAV Insurance — ${title}</h1><p class="sub">Generated on ${new Date().toDateString()} · Total records: ${data.length}</p><table><thead><tr>${columns.map(c=>`<th>${c.label}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table><div class="footer">ATRAV Insurance Suite · Confidential Report</div><script>setTimeout(()=>window.print(),400)</script></body></html>`;
  const w = window.open("","_blank");
  w.document.write(html); w.document.close();
};

// ── MODAL ─────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, t }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
    <div style={{ background:t.modal, border:`1px solid ${t.border}`, borderRadius:20, padding:28, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-base" style={{ color:t.text }}>{title}</h2>
        <button onClick={onClose} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, width:30, height:30, cursor:"pointer", color:t.textMuted, fontSize:16 }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, value, onChange, type="text", options, t, required }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ display:"block", fontSize:11, fontWeight:600, color:t.textMuted, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}{required&&" *"}</label>
    {options ? (
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%", background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:10, padding:"9px 12px", fontSize:13, color:t.text, outline:"none" }}>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%", background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:10, padding:"9px 12px", fontSize:13, color:t.text, outline:"none", boxSizing:"border-box" }}/>
    )}
  </div>
);

const Btn = ({ children, onClick, color="#f59e0b", outline, t }) => (
  <button onClick={onClick} style={{ background:outline?"transparent":color, border:`1.5px solid ${color}`, borderRadius:10, padding:"9px 18px", fontSize:13, fontWeight:700, color:outline?color:"#000", cursor:"pointer", transition:"all 0.15s" }}>{children}</button>
);

// ── STAT CARD ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon, color, t }) => (
  <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:18, padding:"18px 20px", display:"flex", flexDirection:"column", gap:10 }}>
    <div className="flex items-center justify-between">
      <span style={{ fontSize:22 }}>{icon}</span>
      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>{sub}</span>
    </div>
    <div>
      <p style={{ fontSize:22, fontWeight:700, color:t.text, letterSpacing:"-0.5px" }}>{value}</p>
      <p style={{ fontSize:11, color:t.textMuted, marginTop:3 }}>{label}</p>
    </div>
  </div>
);

// ── SECTION ───────────────────────────────────────────────────────────────────
const Section = ({ title, children, action, onAction, t }) => (
  <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:18, padding:22 }}>
    <div className="flex items-center justify-between" style={{ marginBottom:18 }}>
      <h3 style={{ fontWeight:700, fontSize:14, color:t.text }}>{title}</h3>
      {action && <button onClick={onAction} style={{ fontSize:12, color:"#f59e0b", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>{action}</button>}
    </div>
    {children}
  </div>
);

// ── TABLE ─────────────────────────────────────────────────────────────────────
const Table = ({ headers, rows, t }) => (
  <div style={{ overflowX:"auto" }}>
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:600 }}>
      <thead>
        <tr style={{ borderBottom:`1px solid ${t.border}` }}>
          {headers.map(h=><th key={h} style={{ padding:"0 14px 12px 0", textAlign:"left", fontSize:11, fontWeight:600, color:t.textMuted, whiteSpace:"nowrap" }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>{rows.map((row,i)=><tr key={i} style={{ borderBottom:`1px solid ${t.border}` }}>{row.map((cell,j)=><td key={j} style={{ padding:"11px 14px 11px 0", verticalAlign:"middle" }}>{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

// ── SEARCH BAR ────────────────────────────────────────────────────────────────
const SearchBar = ({ value, onChange, placeholder, t }) => (
  <div style={{ position:"relative", marginBottom:14 }}>
    <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, pointerEvents:"none" }}>🔍</span>
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"Search..."}
      style={{ width:"100%", background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:10, padding:"9px 12px 9px 36px", fontSize:13, color:t.text, outline:"none", boxSizing:"border-box" }}/>
    {value && <button onClick={()=>onChange("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:t.textMuted, fontSize:16 }}>×</button>}
  </div>
);

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
const Overview = ({ t, polData, clientData, claimData, payData }) => {
  const renewalDue = polData.filter(p=>p.status==="Renewal Due"||p.status==="Lapsed");
  const totalPremium = polData.reduce((s,p)=>s+(Number(p.premium)||0),0);
  const totalNetPrm = polData.reduce((s,p)=>s+(Number(p.netPremium)||0),0);
  const totalGST = polData.reduce((s,p)=>s+(Number(p.gst)||0),0);
  const upcoming = polData.filter(p=>{ const d=daysUntil(p.expiry); return d>=0&&d<=30; }).sort((a,b)=>daysUntil(a.expiry)-daysUntil(b.expiry));
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthlyPolicies = polData.filter(p=>{ try { const d=new Date(p.effectiveDate||""); return d.getMonth()===thisMonth&&d.getFullYear()===thisYear; } catch { return false; }});
  const deptMap = {};
  polData.forEach(p=>{ const k=p.department||p.type||"Other"; deptMap[k]=(deptMap[k]||0)+1; });
  const deptBreakdown = Object.entries(deptMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
        <StatCard t={t} label="Total Policies" value={polData.length} icon="📋" sub={`${polData.filter(p=>p.status==="Active").length} Active`} color="bg-emerald-500/20 text-emerald-400"/>
        <StatCard t={t} label="Total Premium" value={fmt(totalPremium)} icon="💰" sub={`Net: ${fmt(totalNetPrm)}`} color="bg-amber-500/20 text-amber-400"/>
        <StatCard t={t} label="Total GST" value={fmt(totalGST)} icon="🏛️" sub="Collected" color="bg-blue-500/20 text-blue-400"/>
        <StatCard t={t} label="Renewal Due" value={renewalDue.length} icon="⚠️" sub="Action needed" color="bg-red-500/20 text-red-400"/>
        <StatCard t={t} label="Total Clients" value={clientData.length} icon="👥" sub="Registered" color="bg-purple-500/20 text-purple-400"/>
        <StatCard t={t} label="This Month" value={monthlyPolicies.length} icon="📅" sub="New policies" color="bg-cyan-500/20 text-cyan-400"/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Section t={t} title={`⏳ Expiring in 30 Days (${upcoming.length})`}>
          {upcoming.length===0
            ? <p style={{ color:t.textMuted, fontSize:13, textAlign:"center", padding:20 }}>✅ Koi policy expire hone wali nahi agle 30 din mein</p>
            : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {upcoming.map(p=>{ const d=daysUntil(p.expiry); const col=d<=7?"#f87171":d<=15?"#f59e0b":"#34d399";
                  return (
                    <div key={p.id} style={{ background:t.inputBg, borderRadius:10, padding:"9px 12px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:t.text }}>{p.client}</span>
                        <span style={{ fontSize:11, fontWeight:800, color:col }}>{d}d left</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontSize:11, color:t.textMuted }}>{p.department||p.type} · {p.expiry}</span>
                        <span style={{ fontSize:11, color:"#f59e0b" }}>{fmtINR(p.premium)}</span>
                      </div>
                      <div style={{ height:2, background:t.border, borderRadius:99, marginTop:5 }}>
                        <div style={{ width:`${Math.max(5,(d/30)*100)}%`, height:"100%", background:col, borderRadius:99 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </Section>
        <Section t={t} title="📊 Department Breakdown">
          {deptBreakdown.length===0
            ? <p style={{ color:t.textMuted, fontSize:13, textAlign:"center", padding:20 }}>Data import karo — breakdown dikhega</p>
            : <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {deptBreakdown.map(([dept,count])=>{
                  const pct=Math.round((count/polData.length)*100);
                  const col=dept.includes("CAR")||dept.includes("TW")?"#34d399":dept.includes("MEDI")||dept.includes("HEALTH")?"#f59e0b":dept.includes("LIFE")?"#60a5fa":"#a78bfa";
                  return (
                    <div key={dept} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, color:t.text, minWidth:110, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{dept}</span>
                      <div style={{ flex:1, height:6, background:t.border, borderRadius:99 }}>
                        <div style={{ width:`${pct}%`, height:"100%", background:col, borderRadius:99 }}/>
                      </div>
                      <span style={{ fontSize:11, color:t.textMuted, minWidth:55, textAlign:"right" }}>{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
          }
        </Section>
      </div>
      {renewalDue.length>0&&(
        <Section t={t} title={`🔔 Renewal Alerts (${renewalDue.length})`}>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {renewalDue.slice(0,8).map(p=>(
              <div key={p.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:t.inputBg, borderRadius:12, padding:"10px 14px", flexWrap:"wrap", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:18 }}>{typeIcon(p.type)}</span>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700, color:t.text }}>{p.client}</p>
                    <p style={{ fontSize:11, color:t.textMuted }}>{p.policyNo||p.id} · {p.department||p.type} · {p.expiry}</p>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:12, color:"#f59e0b", fontWeight:700 }}>{fmtINR(p.premium)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor(p.status)}`}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
      <Section t={t} title="📋 Recent Policies">
        <Table t={t} headers={["Policy No.","Client","Dept.","Premium","Effective","Expiry","Status"]}
          rows={polData.slice(0,8).map(p=>[
            <span style={{ fontFamily:"monospace", color:"#f59e0b", fontSize:11 }}>{p.policyNo||p.id}</span>,
            <span style={{ fontWeight:600, color:t.text }}>{p.client}</span>,
            <span style={{ color:t.textMuted, fontSize:11 }}>{p.department||p.type}</span>,
            <span style={{ color:t.text }}>{fmtINR(p.premium)}</span>,
            <span style={{ color:t.textMuted, fontSize:11 }}>{p.effectiveDate||"—"}</span>,
            <span style={{ color:t.textMuted, fontSize:11 }}>{p.expiry}</span>,
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(p.status)}`}>{p.status}</span>,
          ])}
        />
      </Section>
    </div>
  );
};

// ── POLICIES PAGE ─────────────────────────────────────────────────────────────
const PoliciesPage = ({ t, data, setData }) => {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [docModal, setDocModal] = useState(null); // for doc upload
  const emptyForm = { policyNo:"", client:"", contact:"", department:"", type:"Health", effectiveDate:"", expiry:"", netPremium:"", gst:"", premium:"", commisionable:"", income:"", status:"Active", risk:"Low", docLink:"", year:"", month:"" };
  const [form, setForm] = useState(emptyForm);
  const [typeF, setTypeF] = useState("All");
  const [statusF, setStatusF] = useState("All");
  const [riskF, setRiskF] = useState("All");
  const [yearF, setYearF] = useState("All");
  const [monthF, setMonthF] = useState("All");
  const [dayF, setDayF] = useState("");
  const f = v => setForm(p=>({...p,...v}));

  // Get unique years and months from data
  const years = ["All", ...Array.from(new Set(data.map(p=>p.effectiveDate?.slice(0,4)||p.year||"").filter(Boolean))).sort().reverse()];
  const months = ["All","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTH_MAP = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };

  const filtered = data.filter(p=>{
    const effDate = p.effectiveDate||"";
    const pYear = effDate.slice(0,4)||p.year||"";
    const pMonth = effDate ? new Date(effDate).getMonth() : -1;
    const pDay = effDate.slice(8,10)||"";
    return (
      (typeF==="All"||p.type===typeF||p.department===typeF)&&
      (statusF==="All"||p.status===statusF)&&
      (riskF==="All"||p.risk===riskF)&&
      (yearF==="All"||pYear===yearF)&&
      (monthF==="All"||pMonth===MONTH_MAP[monthF])&&
      (dayF===""||pDay===dayF.padStart(2,"0"))&&
      (search===""||
        p.client?.toLowerCase().includes(search.toLowerCase())||
        (p.policyNo||"").toLowerCase().includes(search.toLowerCase())||
        (p.contact||"").includes(search)||
        (p.department||"").toLowerCase().includes(search.toLowerCase()))
    );
  });

  const openAdd = () => { setForm(emptyForm); setModal("add"); };
  const openEdit = (p) => { setForm({...emptyForm,...p, premium:String(p.premium||""), netPremium:String(p.netPremium||""), gst:String(p.gst||""), income:String(p.income||"")}); setModal(p); };
  const save = () => {
    if (!form.client||!form.premium) return;
    const item = {...form, premium:Number(form.premium)||0, netPremium:Number(form.netPremium)||0, gst:Number(form.gst)||0, income:Number(form.income)||0,
      year:form.effectiveDate?.slice(0,4)||form.year||"",
      month:form.effectiveDate?new Date(form.effectiveDate).toLocaleString("default",{month:"short"}):form.month||""
    };
    if (modal==="add") setData(d=>[...d,{...item, id:uid("POL")}]);
    else setData(d=>d.map(p=>p.id===modal.id?{...item,id:modal.id}:p));
    setModal(null);
  };
  const del = (id) => setData(d=>d.filter(p=>p.id!==id));

  // Doc upload handler
  const handleDocUpload = (policyId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setData(d=>d.map(p=>p.id===policyId?{...p, docLink:dataUrl, docName:file.name}:p));
      setDocModal(null);
    };
    reader.readAsDataURL(file);
  };

  // Get unique depts for filter
  const depts = ["All", ...Array.from(new Set(data.map(p=>p.department||p.type).filter(Boolean))).sort()];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Year / Month / Day Filters */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, padding:14, display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, fontWeight:700, color:t.textMuted, minWidth:50 }}>📅 YEAR:</span>
          {years.map(y=>(
            <button key={y} onClick={()=>setYearF(y)}
              style={{ border:yearF===y?"none":`1px solid ${t.border}`, background:yearF===y?"#f59e0b":"transparent", color:yearF===y?"#000":t.textMuted, borderRadius:99, padding:"3px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>{y}</button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, fontWeight:700, color:t.textMuted, minWidth:50 }}>📆 MONTH:</span>
          {months.map(m=>(
            <button key={m} onClick={()=>setMonthF(m)}
              style={{ border:monthF===m?"none":`1px solid ${t.border}`, background:monthF===m?"#60a5fa":"transparent", color:monthF===m?"#000":t.textMuted, borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:600, cursor:"pointer" }}>{m}</button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, fontWeight:700, color:t.textMuted, minWidth:50 }}>🗓️ DAY:</span>
          <input value={dayF} onChange={e=>setDayF(e.target.value.replace(/\D/g,"").slice(0,2))} placeholder="DD (1-31)"
            style={{ background:t.input, border:`1px solid ${dayF?`rgba(96,165,250,0.5)`:t.inputBorder}`, borderRadius:8, padding:"4px 10px", fontSize:12, color:t.text, outline:"none", width:90 }}/>
          {dayF&&<button onClick={()=>setDayF("")} style={{ background:"none", border:"none", color:t.textMuted, cursor:"pointer", fontSize:16 }}>×</button>}
          <span style={{ fontSize:11, color:t.textMuted }}>Filtered: <strong style={{ color:t.text }}>{filtered.length}</strong> records</span>
        </div>
      </div>

      {/* Type/Status/Risk Filters */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {depts.slice(0,8).map(d=>(
          <button key={d} onClick={()=>setTypeF(d)}
            style={{ border:typeF===d?"none":`1px solid ${t.border}`, background:typeF===d?"#a78bfa":"transparent", color:typeF===d?"#000":t.textMuted, borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>{d}</button>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {["All","Active","Renewal Due","Lapsed"].map(s=>(
          <button key={s} onClick={()=>setStatusF(s)}
            style={{ border:statusF===s?"none":`1px solid ${t.border}`, background:statusF===s?"#f59e0b":"transparent", color:statusF===s?"#000":t.textMuted, borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>{s}</button>
        ))}
        {["All","Low","Medium","High"].map(r=>(
          <button key={r} onClick={()=>setRiskF(r)}
            style={{ border:riskF===r?"none":`1px solid ${t.border}`, background:riskF===r?r==="Low"?"#34d399":r==="Medium"?"#f59e0b":"#f87171":"transparent", color:riskF===r?"#000":t.textMuted, borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>{r==="All"?"All Risk":`${r} Risk`}</button>
        ))}
      </div>

      <Section t={t} title={`Policies (${filtered.length})`} action="+ New Policy" onAction={openAdd}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, policy no, contact, department..." t={t}/>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <button onClick={()=>exportCSV(filtered,"policies.csv")} style={{ fontSize:11, color:t.textMuted, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, padding:"5px 10px", cursor:"pointer" }}>📤 CSV</button>
          <button onClick={()=>exportPDF("Policy Report",filtered,[{key:"policyNo",label:"Policy No."},{key:"client",label:"Client"},{key:"contact",label:"Contact"},{key:"department",label:"Dept."},{key:"effectiveDate",label:"Eff.Date"},{key:"expiry",label:"Expiry"},{key:"netPremium",label:"Net Prm."},{key:"gst",label:"GST"},{key:"premium",label:"Total Prm."},{key:"income",label:"Income%"},{key:"status",label:"Status"}])} style={{ fontSize:11, color:t.textMuted, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, padding:"5px 10px", cursor:"pointer" }}>🖨️ PDF</button>
        </div>
        <Table t={t} headers={["Policy No.","Client","Contact","Dept.","Eff. Date","Expiry","Days","Net Prm.","GST","Total Prm.","Inc%","Status","Risk","Doc","Actions"]}
          rows={filtered.map(p=>{
            const d=daysUntil(p.expiry); const dc=d<15?"#f87171":d<45?"#f59e0b":"#34d399";
            const hasDoc = p.docLink&&p.docLink.length>0;
            return [
              <span style={{ fontFamily:"monospace", color:"#f59e0b", fontSize:11, whiteSpace:"nowrap" }}>{p.policyNo||p.id}</span>,
              <span style={{ fontWeight:600, color:t.text, whiteSpace:"nowrap" }}>{p.client}</span>,
              <span style={{ color:t.textMuted, fontSize:11 }}>{p.contact||"—"}</span>,
              <span style={{ color:t.textMuted, fontSize:11, whiteSpace:"nowrap" }}>{p.department||p.type}</span>,
              <span style={{ color:t.textMuted, fontSize:11, whiteSpace:"nowrap" }}>{p.effectiveDate||"—"}</span>,
              <span style={{ color:t.textMuted, fontSize:11, whiteSpace:"nowrap" }}>{p.expiry}</span>,
              <span style={{ color:dc, fontWeight:700, fontSize:11 }}>{d<0?"Expired":`${d}d`}</span>,
              <span style={{ color:t.text, fontSize:11 }}>{p.netPremium?fmtINR(p.netPremium):"—"}</span>,
              <span style={{ color:t.textMuted, fontSize:11 }}>{p.gst?fmtINR(p.gst):"—"}</span>,
              <span style={{ color:t.text, fontWeight:600 }}>{fmtINR(p.premium)}</span>,
              <span style={{ color:"#34d399", fontSize:11, fontWeight:600 }}>{p.income!=null&&p.income!==""?`${p.income}%`:"—"}</span>,
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(p.status)}`}>{p.status}</span>,
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.risk==="Low"?"text-emerald-400 bg-emerald-500/10":p.risk==="Medium"?"text-amber-400 bg-amber-500/10":"text-red-400 bg-red-500/10"}`}>{p.risk||"—"}</span>,
              <div style={{ display:"flex", gap:4 }}>
                {hasDoc
                  ? <a href={p.docLink} target="_blank" rel="noopener noreferrer" title={p.docName||"View Document"}
                      style={{ display:"inline-flex", alignItems:"center", gap:3, background:"rgba(96,165,250,0.15)", border:"1px solid rgba(96,165,250,0.35)", borderRadius:7, padding:"3px 7px", fontSize:10, color:"#60a5fa", textDecoration:"none", fontWeight:600 }}>
                      📄 View
                    </a>
                  : null}
                <button onClick={()=>setDocModal(p)} title="Upload Document"
                  style={{ fontSize:10, padding:"3px 7px", background:"rgba(167,139,250,0.15)", border:"1px solid rgba(167,139,250,0.3)", borderRadius:7, color:"#a78bfa", cursor:"pointer", fontWeight:600 }}>
                  {hasDoc?"🔄":"📎"}
                </button>
              </div>,
              <div style={{ display:"flex", gap:5 }}>
                <button onClick={()=>openEdit(p)} style={{ fontSize:10, padding:"3px 7px", background:"rgba(96,165,250,0.15)", border:"1px solid rgba(96,165,250,0.3)", borderRadius:6, color:"#60a5fa", cursor:"pointer" }}>✏️</button>
                <button onClick={()=>del(p.id)} style={{ fontSize:10, padding:"3px 7px", background:"rgba(248,113,113,0.15)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:6, color:"#f87171", cursor:"pointer" }}>🗑️</button>
              </div>
            ];
          })}
        />
      </Section>

      {/* Add/Edit Modal */}
      {modal&&(
        <Modal title={modal==="add"?"Add New Policy":`Edit — ${modal.policyNo||modal.id||""}`} onClose={()=>setModal(null)} t={t}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
            <Field label="Policy No." value={form.policyNo||""} onChange={v=>f({policyNo:v})} t={t}/>
            <Field label="Client Name" value={form.client} onChange={v=>f({client:v})} t={t} required/>
            <Field label="Contact No." value={form.contact||""} onChange={v=>f({contact:v})} t={t}/>
            <Field label="Department" value={form.department||""} onChange={v=>f({department:v})} t={t}/>
            <Field label="Insurance Type" value={form.type} onChange={v=>f({type:v})} options={["Health","Life","Car","Home"]} t={t}/>
            <Field label="Status" value={form.status} onChange={v=>f({status:v})} options={["Active","Renewal Due","Lapsed"]} t={t}/>
            <Field label="Effective Date (dd/mm/yyyy)" value={form.effectiveDate||""} onChange={v=>f({effectiveDate:normalizeDate(v)})} t={t}/>
            <Field label="Expiry Date (dd/mm/yyyy)" value={form.expiry||""} onChange={v=>f({expiry:normalizeDate(v)})} t={t} required/>
            <Field label="Net Premium (₹)" value={String(form.netPremium||"")} onChange={v=>f({netPremium:v})} type="number" t={t}/>
            <Field label="GST (₹)" value={String(form.gst||"")} onChange={v=>f({gst:v})} type="number" t={t}/>
            <Field label="Total Premium (₹)" value={String(form.premium||"")} onChange={v=>f({premium:v})} type="number" t={t} required/>
            <Field label="Income / Commission %" value={String(form.income||"")} onChange={v=>f({income:v})} type="number" t={t}/>
            <Field label="Risk Level" value={form.risk} onChange={v=>f({risk:v})} options={["Low","Medium","High"]} t={t}/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:t.textMuted, marginBottom:5, textTransform:"uppercase" }}>Policy Document Link (URL)</label>
            <input value={form.docLink||""} onChange={e=>f({docLink:e.target.value})} placeholder="https://drive.google.com/..."
              style={{ width:"100%", background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:10, padding:"9px 12px", fontSize:13, color:t.text, outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn onClick={()=>setModal(null)} outline color={t.textMuted} t={t}>Cancel</Btn>
            <Btn onClick={save} t={t}>{modal==="add"?"Add Policy":"Save Changes"}</Btn>
          </div>
        </Modal>
      )}

      {/* Doc Upload Modal */}
      {docModal&&(
        <Modal title={`📎 Upload Document — ${docModal.client}`} onClose={()=>setDocModal(null)} t={t}>
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📄</div>
            <p style={{ color:t.text, fontWeight:600, marginBottom:6 }}>Policy Document Upload karo</p>
            <p style={{ color:t.textMuted, fontSize:12, marginBottom:20 }}>PDF, Image — koi bhi format chalta hai<br/>File browser mein save hogi (max ~2MB recommended)</p>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e=>handleDocUpload(docModal.id, e.target.files[0])}
              style={{ display:"none" }} id="docUploadInput"/>
            <label htmlFor="docUploadInput"
              style={{ display:"inline-block", background:"linear-gradient(135deg,#a78bfa,#7c3aed)", border:"none", borderRadius:12, padding:"12px 28px", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer" }}>
              📂 File Choose karo
            </label>
            <div style={{ marginTop:16 }}>
              <p style={{ color:t.textMuted, fontSize:11, marginBottom:6 }}>Ya Google Drive link paste karo:</p>
              <div style={{ display:"flex", gap:8 }}>
                <input placeholder="https://drive.google.com/..." id="docLinkInput"
                  style={{ flex:1, background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:10, padding:"9px 12px", fontSize:13, color:t.text, outline:"none" }}/>
                <button onClick={()=>{
                    const val = document.getElementById("docLinkInput").value;
                    if (val) { setData(d=>d.map(p=>p.id===docModal.id?{...p,docLink:val,docName:"Drive Link"}:p)); setDocModal(null); }
                  }}
                  style={{ background:"linear-gradient(135deg,#f59e0b,#ea580c)", border:"none", borderRadius:10, padding:"9px 16px", color:"#000", fontWeight:700, fontSize:13, cursor:"pointer" }}>Save</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── CLAIMS PAGE ───────────────────────────────────────────────────────────────
const ClaimsPage = ({ t, data, setData }) => {
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("All");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ client:"", type:"Health", amount:"", filed:"", status:"In Review", agent:"" });
  const f = v => setForm(p=>({...p,...v}));

  const [typeF, setTypeF] = useState("All");
  const statuses = ["All","In Review","Approved","Rejected"];
  const filtered = data.filter(c=>
    (statusF==="All"||c.status===statusF)&&
    (typeF==="All"||c.type===typeF)&&
    (search===""||c.client.toLowerCase().includes(search.toLowerCase())||c.id.toLowerCase().includes(search.toLowerCase()))
  );

  const save = () => {
    if (!form.client||!form.amount||!form.filed) return;
    if (!modal) setData(d=>[{...form,id:uid("CLM"),amount:Number(form.amount)},...d]);
    else setData(d=>d.map(c=>c.id===modal.id?{...form,id:modal.id,amount:Number(form.amount)}:c));
    setModal(null);
  };
  const openEdit = (c) => { setForm({...c,amount:String(c.amount)}); setModal(c); };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
        <StatCard t={t} label="Total Filed" value={data.length} icon="📝" sub="This month" color="bg-blue-500/20 text-blue-400"/>
        <StatCard t={t} label="Approved" value={data.filter(c=>c.status==="Approved").length} icon="✅" sub={`${Math.round(data.filter(c=>c.status==="Approved").length/data.length*100)}% rate`} color="bg-emerald-500/20 text-emerald-400"/>
        <StatCard t={t} label="In Review" value={data.filter(c=>c.status==="In Review").length} icon="🔍" sub="Avg 3.2 days" color="bg-amber-500/20 text-amber-400"/>
        <StatCard t={t} label="Rejected" value={data.filter(c=>c.status==="Rejected").length} icon="❌" sub={`${Math.round(data.filter(c=>c.status==="Rejected").length/data.length*100)}% rate`} color="bg-red-500/20 text-red-400"/>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {statuses.map(s=>(
          <button key={s} onClick={()=>setStatusF(s)}
            style={{ border:statusF===s?"none":`1px solid ${t.border}`, background:statusF===s?"#f59e0b":"transparent", color:statusF===s?"#000":t.textMuted, borderRadius:99, padding:"5px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>{s}</button>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {["All","Health","Life","Car","Home"].map(tp=>(
          <button key={tp} onClick={()=>setTypeF(tp)}
            style={{ border:typeF===tp?"none":`1px solid ${t.border}`, background:typeF===tp?"#a78bfa":"transparent", color:typeF===tp?"#000":t.textMuted, borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>{tp==="All"?"All Types":`${typeIcon(tp)} ${tp}`}</button>
        ))}
      </div>
      <Section t={t} title={`Claims (${filtered.length})`} action="+ File Claim" onAction={()=>{ setForm({ client:"", type:"Health", amount:"", filed:new Date().toISOString().slice(0,10), status:"In Review", agent:"" }); setModal(false); }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by client or claim ID..." t={t}/>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <button onClick={()=>exportCSV(filtered,"claims.csv")} style={{ fontSize:11, color:t.textMuted, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, padding:"5px 10px", cursor:"pointer" }}>📤 CSV</button>
          <button onClick={()=>exportPDF("Claims Report",filtered,[{key:"id",label:"Claim ID"},{key:"client",label:"Client"},{key:"type",label:"Type"},{key:"amount",label:"Amount"},{key:"filed",label:"Filed"},{key:"status",label:"Status"},{key:"agent",label:"Agent"}])} style={{ fontSize:11, color:t.textMuted, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, padding:"5px 10px", cursor:"pointer" }}>🖨️ PDF</button>
        </div>
        <Table t={t} headers={["Claim ID","Client","Type","Amount","Filed","Agent","Status","Actions"]}
          rows={filtered.map(c=>[
            <span style={{ fontFamily:"monospace", color:"#f59e0b", fontSize:11 }}>{c.id}</span>,
            <span style={{ fontWeight:600, color:t.text }}>{c.client}</span>,
            <span style={{ color:t.textMuted }}>{typeIcon(c.type)} {c.type}</span>,
            <span style={{ color:t.text }}>{fmtINR(c.amount)}</span>,
            <span style={{ color:t.textMuted, fontSize:11 }}>{c.filed}</span>,
            <span style={{ color:t.textMuted }}>{c.agent}</span>,
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(c.status)}`}>{c.status}</span>,
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={()=>openEdit(c)} style={{ fontSize:11, padding:"3px 8px", background:"rgba(96,165,250,0.15)", border:"1px solid rgba(96,165,250,0.3)", borderRadius:6, color:"#60a5fa", cursor:"pointer" }}>✏️</button>
              <button onClick={()=>setData(d=>d.filter(x=>x.id!==c.id))} style={{ fontSize:11, padding:"3px 8px", background:"rgba(248,113,113,0.15)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:6, color:"#f87171", cursor:"pointer" }}>🗑️</button>
            </div>
          ])}
        />
      </Section>
      {modal!==null&&(
        <Modal title={modal?"Edit Claim":"File New Claim"} onClose={()=>setModal(null)} t={t}>
          <Field label="Client Name" value={form.client} onChange={v=>f({client:v})} t={t} required/>
          <Field label="Insurance Type" value={form.type} onChange={v=>f({type:v})} options={["Health","Life","Car","Home"]} t={t}/>
          <Field label="Claim Amount (₹)" value={form.amount} onChange={v=>f({amount:v})} type="number" t={t} required/>
          <Field label="Filed Date" value={form.filed} onChange={v=>f({filed:v})} type="date" t={t} required/>
          <Field label="Status" value={form.status} onChange={v=>f({status:v})} options={["In Review","Approved","Rejected"]} t={t}/>
          <Field label="Assigned Agent" value={form.agent} onChange={v=>f({agent:v})} t={t}/>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn onClick={()=>setModal(null)} outline color={t.textMuted} t={t}>Cancel</Btn>
            <Btn onClick={save} t={t}>{modal?"Save Changes":"File Claim"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── CLIENTS PAGE ──────────────────────────────────────────────────────────────
const ClientsPage = ({ t, data, setData }) => {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name:"", email:"", phone:"", city:"", since:new Date().getFullYear().toString(), policies:0, totalPremium:0 });
  const f = v => setForm(p=>({...p,...v}));

  const [cityF, setCityF] = useState("All");
  const [polF, setPolF] = useState("All");

  const cities = ["All", ...Array.from(new Set(data.map(c=>c.city)))];
  const filtered = data.filter(c=>
    (cityF==="All"||c.city===cityF)&&
    (polF==="All"||(polF==="1"&&c.policies===1)||(polF==="2"&&c.policies===2)||(polF==="3+"&&c.policies>=3))&&
    (search===""||c.name.toLowerCase().includes(search.toLowerCase())||c.city.toLowerCase().includes(search.toLowerCase())||c.id.toLowerCase().includes(search.toLowerCase()))
  );
  const save = () => {
    if (!form.name||!form.email) return;
    if (!modal) setData(d=>[...d,{...form,id:uid("C"),policies:Number(form.policies),totalPremium:Number(form.totalPremium)}]);
    else setData(d=>d.map(c=>c.id===modal.id?{...form,id:modal.id,policies:Number(form.policies),totalPremium:Number(form.totalPremium)}:c));
    setModal(null);
  };
  const openEdit = c => { setForm({...c}); setModal(c); };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
        <StatCard t={t} label="Total Clients" value={data.length} icon="👥" sub="↑ 34 new" color="bg-blue-500/20 text-blue-400"/>
        <StatCard t={t} label="High-Value Clients" value={data.filter(c=>c.totalPremium>=100000).length} icon="⭐" sub="₹1L+ premium" color="bg-amber-500/20 text-amber-400"/>
        <StatCard t={t} label="Avg. Policies/Client" value={(data.reduce((s,c)=>s+c.policies,0)/data.length||0).toFixed(1)} icon="📄" sub="Industry: 1.8" color="bg-emerald-500/20 text-emerald-400"/>
      </div>
      <Section t={t} title={`Clients (${filtered.length})`} action="+ Add Client" onAction={()=>{ setForm({ name:"", email:"", phone:"", city:"", since:new Date().getFullYear().toString(), policies:0, totalPremium:0 }); setModal(false); }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
          {cities.map(c=>(
            <button key={c} onClick={()=>setCityF(c)}
              style={{ border:cityF===c?"none":`1px solid ${t.border}`, background:cityF===c?"#60a5fa":"transparent", color:cityF===c?"#000":t.textMuted, borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>🏙️ {c}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
          {[["All","All Policies"],["1","1 Policy"],["2","2 Policies"],["3+","3+ Policies"]].map(([v,l])=>(
            <button key={v} onClick={()=>setPolF(v)}
              style={{ border:polF===v?"none":`1px solid ${t.border}`, background:polF===v?"#34d399":"transparent", color:polF===v?"#000":t.textMuted, borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>📄 {l}</button>
          ))}
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, city, or ID..." t={t}/>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <button onClick={()=>exportCSV(filtered,"clients.csv")} style={{ fontSize:11, color:t.textMuted, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, padding:"5px 10px", cursor:"pointer" }}>📤 CSV</button>
          <button onClick={()=>exportPDF("Client Report",filtered,[{key:"id",label:"ID"},{key:"name",label:"Name"},{key:"city",label:"City"},{key:"phone",label:"Phone"},{key:"email",label:"Email"},{key:"policies",label:"Policies"},{key:"totalPremium",label:"Premium"},{key:"since",label:"Since"}])} style={{ fontSize:11, color:t.textMuted, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, padding:"5px 10px", cursor:"pointer" }}>🖨️ PDF</button>
        </div>
        <Table t={t} headers={["ID","Name","City","Policies","Total Premium","Since","Phone","Actions"]}
          rows={filtered.map(c=>[
            <span style={{ fontFamily:"monospace", color:"#f59e0b", fontSize:11 }}>{c.id}</span>,
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#f59e0b,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:11, color:"#000", flexShrink:0 }}>{c.name[0]}</div>
              <span style={{ fontWeight:600, color:t.text }}>{c.name}</span>
            </div>,
            <span style={{ color:t.textMuted }}>{c.city}</span>,
            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full text-xs font-semibold">{c.policies}</span>,
            <span style={{ fontWeight:600, color:t.text }}>{fmtINR(c.totalPremium)}</span>,
            <span style={{ color:t.textMuted }}>{c.since}</span>,
            <span style={{ color:t.textMuted, fontSize:11 }}>{c.phone}</span>,
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={()=>openEdit(c)} style={{ fontSize:11, padding:"3px 8px", background:"rgba(96,165,250,0.15)", border:"1px solid rgba(96,165,250,0.3)", borderRadius:6, color:"#60a5fa", cursor:"pointer" }}>✏️</button>
              <button onClick={()=>setData(d=>d.filter(x=>x.id!==c.id))} style={{ fontSize:11, padding:"3px 8px", background:"rgba(248,113,113,0.15)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:6, color:"#f87171", cursor:"pointer" }}>🗑️</button>
            </div>
          ])}
        />
      </Section>
      {modal!==null&&(
        <Modal title={modal?"Edit Client":"Add New Client"} onClose={()=>setModal(null)} t={t}>
          <Field label="Full Name" value={form.name} onChange={v=>f({name:v})} t={t} required/>
          <Field label="Email" value={form.email} onChange={v=>f({email:v})} type="email" t={t} required/>
          <Field label="Phone" value={form.phone} onChange={v=>f({phone:v})} t={t}/>
          <Field label="City" value={form.city} onChange={v=>f({city:v})} t={t}/>
          <Field label="Member Since (Year)" value={form.since} onChange={v=>f({since:v})} t={t}/>
          <Field label="No. of Policies" value={String(form.policies)} onChange={v=>f({policies:v})} type="number" t={t}/>
          <Field label="Total Premium (₹)" value={String(form.totalPremium)} onChange={v=>f({totalPremium:v})} type="number" t={t}/>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn onClick={()=>setModal(null)} outline color={t.textMuted} t={t}>Cancel</Btn>
            <Btn onClick={save} t={t}>{modal?"Save Changes":"Add Client"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── PAYMENTS PAGE ─────────────────────────────────────────────────────────────
const PaymentsPage = ({ t, data, setData }) => {
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("All");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ client:"", amount:"", type:"Health Premium", date:"", status:"Pending", method:"UPI" });
  const f = v => setForm(p=>({...p,...v}));

  const [methodF, setMethodF] = useState("All");
  const statuses=["All","Paid","Pending","Failed"];
  const filtered=data.filter(p=>
    (statusF==="All"||p.status===statusF)&&
    (methodF==="All"||p.method===methodF)&&
    (search===""||p.client.toLowerCase().includes(search.toLowerCase())||p.id.toLowerCase().includes(search.toLowerCase()))
  );

  const save=()=>{
    if(!form.client||!form.amount||!form.date)return;
    if(!modal) setData(d=>[{...form,id:uid("PAY"),amount:Number(form.amount)},...d]);
    else setData(d=>d.map(p=>p.id===modal.id?{...form,id:modal.id,amount:Number(form.amount)}:p));
    setModal(null);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
        <StatCard t={t} label="Collected" value={fmtINR(data.filter(p=>p.status==="Paid").reduce((s,p)=>s+p.amount,0))} icon="✅" sub="Paid" color="bg-emerald-500/20 text-emerald-400"/>
        <StatCard t={t} label="Pending" value={fmtINR(data.filter(p=>p.status==="Pending").reduce((s,p)=>s+p.amount,0))} icon="⏳" sub="Pending" color="bg-amber-500/20 text-amber-400"/>
        <StatCard t={t} label="Failed" value={fmtINR(data.filter(p=>p.status==="Failed").reduce((s,p)=>s+p.amount,0))} icon="❌" sub="Failed" color="bg-red-500/20 text-red-400"/>
        <StatCard t={t} label="Annual Target" value="₹9.4Cr" icon="🎯" sub="74% achieved" color="bg-blue-500/20 text-blue-400"/>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {statuses.map(s=>(
          <button key={s} onClick={()=>setStatusF(s)}
            style={{ border:statusF===s?"none":`1px solid ${t.border}`, background:statusF===s?"#f59e0b":"transparent", color:statusF===s?"#000":t.textMuted, borderRadius:99, padding:"5px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>{s}</button>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {["All","UPI","Card","Net Banking","Cash","Cheque"].map(m=>(
          <button key={m} onClick={()=>setMethodF(m)}
            style={{ border:methodF===m?"none":`1px solid ${t.border}`, background:methodF===m?"#34d399":"transparent", color:methodF===m?"#000":t.textMuted, borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>💳 {m}</button>
        ))}
      </div>
      <Section t={t} title={`Transactions (${filtered.length})`} action="+ Add Payment" onAction={()=>{ setForm({ client:"", amount:"", type:"Health Premium", date:new Date().toISOString().slice(0,10), status:"Pending", method:"UPI" }); setModal(false); }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by client or payment ID..." t={t}/>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <button onClick={()=>exportCSV(filtered,"payments.csv")} style={{ fontSize:11, color:t.textMuted, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, padding:"5px 10px", cursor:"pointer" }}>📤 CSV</button>
          <button onClick={()=>exportPDF("Payment Report",filtered,[{key:"id",label:"ID"},{key:"client",label:"Client"},{key:"amount",label:"Amount"},{key:"type",label:"Type"},{key:"date",label:"Date"},{key:"method",label:"Method"},{key:"status",label:"Status"}])} style={{ fontSize:11, color:t.textMuted, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, padding:"5px 10px", cursor:"pointer" }}>🖨️ PDF</button>
        </div>
        <Table t={t} headers={["Pay ID","Client","Amount","Type","Date","Method","Status","Actions"]}
          rows={filtered.map(p=>[
            <span style={{ fontFamily:"monospace", color:"#f59e0b", fontSize:11 }}>{p.id}</span>,
            <span style={{ fontWeight:600, color:t.text }}>{p.client}</span>,
            <span style={{ fontWeight:700, color:t.text }}>{fmtINR(p.amount)}</span>,
            <span style={{ color:t.textMuted }}>{p.type}</span>,
            <span style={{ color:t.textMuted, fontSize:11 }}>{p.date}</span>,
            <span style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:6, padding:"2px 7px", fontSize:11, color:t.textMuted }}>{p.method}</span>,
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(p.status)}`}>{p.status}</span>,
            <button onClick={()=>setData(d=>d.filter(x=>x.id!==p.id))} style={{ fontSize:11, padding:"3px 8px", background:"rgba(248,113,113,0.15)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:6, color:"#f87171", cursor:"pointer" }}>🗑️</button>
          ])}
        />
      </Section>
      {modal!==null&&(
        <Modal title="Add Payment Record" onClose={()=>setModal(null)} t={t}>
          <Field label="Client Name" value={form.client} onChange={v=>f({client:v})} t={t} required/>
          <Field label="Amount (₹)" value={form.amount} onChange={v=>f({amount:v})} type="number" t={t} required/>
          <Field label="Payment Type" value={form.type} onChange={v=>f({type:v})} options={["Health Premium","Life Premium","Car Premium","Home Premium","Car Renewal","Claim Payout"]} t={t}/>
          <Field label="Date" value={form.date} onChange={v=>f({date:v})} type="date" t={t} required/>
          <Field label="Status" value={form.status} onChange={v=>f({status:v})} options={["Paid","Pending","Failed"]} t={t}/>
          <Field label="Payment Method" value={form.method} onChange={v=>f({method:v})} options={["UPI","Net Banking","Card","Cash","Cheque"]} t={t}/>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn onClick={()=>setModal(null)} outline color={t.textMuted} t={t}>Cancel</Btn>
            <Btn onClick={save} t={t}>Add Payment</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── AGENTS PAGE ───────────────────────────────────────────────────────────────
const AgentsPage = ({ t, data, setData }) => {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name:"", region:"North", policiesSold:0, revenue:0, claimsHandled:0, rating:4.5, target:80, commission:0 });
  const [regionF, setRegionF] = useState("All");
  const [sortBy, setSortBy] = useState("policiesSold");
  const f = v => setForm(p=>({...p,...v}));
  const filtered = data
    .filter(a=>(regionF==="All"||a.region===regionF)&&(search===""||a.name.toLowerCase().includes(search.toLowerCase())||a.region.toLowerCase().includes(search.toLowerCase())))
    .sort((a,b)=>b[sortBy]-a[sortBy]);
  const save = () => {
    if (!form.name) return;
    if (!modal) setData(d=>[...d,{...form,id:uid("A"),policiesSold:Number(form.policiesSold),revenue:Number(form.revenue),claimsHandled:Number(form.claimsHandled),rating:Number(form.rating),target:Number(form.target),commission:Number(form.commission)}]);
    else setData(d=>d.map(a=>a.id===modal.id?{...form,id:modal.id,policiesSold:Number(form.policiesSold),revenue:Number(form.revenue),claimsHandled:Number(form.claimsHandled),rating:Number(form.rating),target:Number(form.target),commission:Number(form.commission)}:a));
    setModal(null);
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
        <StatCard t={t} label="Total Agents" value={data.length} icon="🧑‍💼" sub="All regions" color="bg-blue-500/20 text-blue-400"/>
        <StatCard t={t} label="Top Performer" value={[...data].sort((a,b)=>b.policiesSold-a.policiesSold)[0]?.name.split(" ")[0]||"-"} icon="🏆" sub="Most policies" color="bg-amber-500/20 text-amber-400"/>
        <StatCard t={t} label="Total Commission" value={fmtINR(data.reduce((s,a)=>s+a.commission,0))} icon="💸" sub="This month" color="bg-emerald-500/20 text-emerald-400"/>
      </div>
      <Section t={t} title="Agent Leaderboard" action="+ Add Agent" onAction={()=>{ setForm({ name:"", region:"North", policiesSold:0, revenue:0, claimsHandled:0, rating:4.5, target:80, commission:0 }); setModal(false); }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
          {["All","North","South","East","West","Central"].map(r=>(
            <button key={r} onClick={()=>setRegionF(r)}
              style={{ border:regionF===r?"none":`1px solid ${t.border}`, background:regionF===r?"#60a5fa":"transparent", color:regionF===r?"#000":t.textMuted, borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>🗺️ {r}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
          {[["policiesSold","Policies"],["revenue","Revenue"],["rating","Rating"],["commission","Commission"]].map(([key,lbl])=>(
            <button key={key} onClick={()=>setSortBy(key)}
              style={{ border:sortBy===key?"none":`1px solid ${t.border}`, background:sortBy===key?"#f59e0b":"transparent", color:sortBy===key?"#000":t.textMuted, borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>Sort: {lbl}</button>
          ))}
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or region..." t={t}/>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map((a,i)=>(
            <div key={a.id} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#b45309":"#334155", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, color:i<3?"#000":"#fff", flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1, display:"grid", gridTemplateColumns:"1.5fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 1.2fr", gap:8, alignItems:"center", minWidth:0 }}>
                <div><p style={{ fontSize:13, fontWeight:700, color:t.text }}>{a.name}</p><p style={{ fontSize:11, color:t.textMuted }}>{a.region} · {a.id}</p></div>
                <div style={{ textAlign:"center" }}><p style={{ fontWeight:700, color:t.text }}>{a.policiesSold}</p><p style={{ fontSize:10, color:t.textMuted }}>Policies</p></div>
                <div style={{ textAlign:"center" }}><p style={{ fontWeight:700, color:t.text }}>₹{a.revenue}L</p><p style={{ fontSize:10, color:t.textMuted }}>Revenue</p></div>
                <div style={{ textAlign:"center" }}><p style={{ fontWeight:700, color:t.text }}>{a.claimsHandled}</p><p style={{ fontSize:10, color:t.textMuted }}>Claims</p></div>
                <div style={{ textAlign:"center" }}><p style={{ fontWeight:700, color:"#f59e0b" }}>⭐ {a.rating}</p><p style={{ fontSize:10, color:t.textMuted }}>Rating</p></div>
                <div style={{ textAlign:"center" }}><p style={{ fontWeight:700, color:"#34d399" }}>{fmtINR(a.commission)}</p><p style={{ fontSize:10, color:t.textMuted }}>Commission</p></div>
                <div>
                  <p style={{ fontSize:10, color:t.textMuted, marginBottom:3 }}>Target {Math.round(a.policiesSold/a.target*100)}%</p>
                  <div style={{ height:4, background:t.border, borderRadius:99 }}>
                    <div style={{ width:`${Math.min(100,Math.round(a.policiesSold/a.target*100))}%`, height:"100%", background:"linear-gradient(90deg,#f59e0b,#fbbf24)", borderRadius:99 }}/>
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                <button onClick={()=>{ setForm({...a,policiesSold:String(a.policiesSold),revenue:String(a.revenue),claimsHandled:String(a.claimsHandled),rating:String(a.rating),target:String(a.target),commission:String(a.commission)}); setModal(a); }} style={{ fontSize:11, padding:"4px 10px", background:"rgba(96,165,250,0.15)", border:"1px solid rgba(96,165,250,0.3)", borderRadius:6, color:"#60a5fa", cursor:"pointer" }}>✏️</button>
                <button onClick={()=>setData(d=>d.filter(x=>x.id!==a.id))} style={{ fontSize:11, padding:"4px 10px", background:"rgba(248,113,113,0.15)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:6, color:"#f87171", cursor:"pointer" }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </Section>
      {modal!==null&&(
        <Modal title={modal?"Edit Agent":"Add New Agent"} onClose={()=>setModal(null)} t={t}>
          <Field label="Full Name" value={form.name} onChange={v=>f({name:v})} t={t} required/>
          <Field label="Region" value={form.region} onChange={v=>f({region:v})} options={["North","South","East","West","Central"]} t={t}/>
          <Field label="Policies Sold" value={String(form.policiesSold)} onChange={v=>f({policiesSold:v})} type="number" t={t}/>
          <Field label="Revenue (in Lakhs)" value={String(form.revenue)} onChange={v=>f({revenue:v})} type="number" t={t}/>
          <Field label="Claims Handled" value={String(form.claimsHandled)} onChange={v=>f({claimsHandled:v})} type="number" t={t}/>
          <Field label="Rating (out of 5)" value={String(form.rating)} onChange={v=>f({rating:v})} type="number" t={t}/>
          <Field label="Monthly Target (policies)" value={String(form.target)} onChange={v=>f({target:v})} type="number" t={t}/>
          <Field label="Commission (₹)" value={String(form.commission)} onChange={v=>f({commission:v})} type="number" t={t}/>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn onClick={()=>setModal(null)} outline color={t.textMuted} t={t}>Cancel</Btn>
            <Btn onClick={save} t={t}>{modal?"Save Changes":"Add Agent"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── PREMIUM CALCULATOR ────────────────────────────────────────────────────────
const Calculator = ({ t }) => {
  const [type, setType] = useState("Health");
  const [age, setAge] = useState(30);
  const [sumInsured, setSumInsured] = useState(500000);
  const [tenure, setTenure] = useState(1);
  const [smoker, setSmoker] = useState(false);
  const [vehicle, setVehicle] = useState("Hatchback");
  const [result, setResult] = useState(null);

  const calculate = () => {
    let base = 0;
    if (type==="Health") {
      base = sumInsured * 0.025 * (1 + (age-18)*0.012) * (smoker?1.4:1) * (tenure===3?2.7:tenure===2?1.9:1);
    } else if (type==="Life") {
      base = sumInsured * 0.006 * (1 + (age-18)*0.015) * (smoker?1.5:1) * (tenure===10?8.5:tenure===5?4.2:1);
    } else if (type==="Car") {
      const vMult = { Hatchback:0.018, Sedan:0.022, SUV:0.026, Luxury:0.038 }[vehicle]||0.02;
      base = sumInsured * vMult * (1 + (age-18)*0.003) * (tenure===3?2.6:tenure===2?1.8:1);
    } else {
      base = sumInsured * 0.004 * (tenure===3?2.7:tenure===2?1.85:1);
    }
    const tax = base * 0.18;
    setResult({ premium: Math.round(base), tax: Math.round(tax), total: Math.round(base+tax), perMonth: Math.round((base+tax)/12) });
  };

  const tenureOptions = type==="Life"?["1","5","10"]:["1","2","3"];
  const showTenureLabel = type==="Life"?["1 Year","5 Years","10 Years"]:["1 Year","2 Years","3 Years"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Section t={t} title="🧮 Premium Calculator — Estimate Your Policy Cost">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:t.textMuted, marginBottom:8, textTransform:"uppercase" }}>Insurance Type</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["Health","Life","Car","Home"].map(tp=>(
                  <button key={tp} onClick={()=>{ setType(tp); setResult(null); }}
                    style={{ border:`1px solid ${type===tp?"#f59e0b":t.border}`, background:type===tp?"rgba(245,158,11,0.15)":"transparent", color:type===tp?"#f59e0b":t.textMuted, borderRadius:10, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>{typeIcon(tp)} {tp}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:t.textMuted, marginBottom:8, textTransform:"uppercase" }}>Sum Insured: {fmtINR(sumInsured)}</label>
              <input type="range" min={100000} max={type==="Life"?50000000:10000000} step={100000} value={sumInsured} onChange={e=>{ setSumInsured(Number(e.target.value)); setResult(null); }} style={{ width:"100%", accentColor:"#f59e0b" }}/>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:t.textMuted, marginTop:4 }}>
                <span>₹1L</span><span>{type==="Life"?"₹5Cr":"₹1Cr"}</span>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:t.textMuted, marginBottom:8, textTransform:"uppercase" }}>Age: {age} years</label>
              <input type="range" min={18} max={70} step={1} value={age} onChange={e=>{ setAge(Number(e.target.value)); setResult(null); }} style={{ width:"100%", accentColor:"#f59e0b" }}/>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:t.textMuted, marginTop:4 }}><span>18</span><span>70</span></div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:t.textMuted, marginBottom:8, textTransform:"uppercase" }}>Policy Tenure</label>
              <div style={{ display:"flex", gap:8 }}>
                {tenureOptions.map((o,i)=>(
                  <button key={o} onClick={()=>{ setTenure(Number(o)); setResult(null); }}
                    style={{ flex:1, border:`1px solid ${tenure===Number(o)?"#f59e0b":t.border}`, background:tenure===Number(o)?"rgba(245,158,11,0.15)":"transparent", color:tenure===Number(o)?"#f59e0b":t.textMuted, borderRadius:10, padding:"8px", fontSize:12, fontWeight:600, cursor:"pointer" }}>{showTenureLabel[i]}</button>
                ))}
              </div>
            </div>
            {(type==="Health"||type==="Life")&&(
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:t.textMuted, marginBottom:8, textTransform:"uppercase" }}>Smoker</label>
                <div style={{ display:"flex", gap:10 }}>
                  {["No","Yes"].map(v=>(
                    <button key={v} onClick={()=>{ setSmoker(v==="Yes"); setResult(null); }}
                      style={{ flex:1, border:`1px solid ${smoker===(v==="Yes")?"#f59e0b":t.border}`, background:smoker===(v==="Yes")?"rgba(245,158,11,0.15)":"transparent", color:smoker===(v==="Yes")?"#f59e0b":t.textMuted, borderRadius:10, padding:"8px", fontSize:12, fontWeight:600, cursor:"pointer" }}>{v}</button>
                  ))}
                </div>
              </div>
            )}
            {type==="Car"&&(
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:t.textMuted, marginBottom:8, textTransform:"uppercase" }}>Vehicle Type</label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {["Hatchback","Sedan","SUV","Luxury"].map(v=>(
                    <button key={v} onClick={()=>{ setVehicle(v); setResult(null); }}
                      style={{ border:`1px solid ${vehicle===v?"#f59e0b":t.border}`, background:vehicle===v?"rgba(245,158,11,0.15)":"transparent", color:vehicle===v?"#f59e0b":t.textMuted, borderRadius:10, padding:"7px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>{v}</button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={calculate}
              style={{ width:"100%", background:"linear-gradient(135deg,#f59e0b,#ea580c)", border:"none", borderRadius:12, padding:"12px", fontSize:14, fontWeight:700, color:"#000", cursor:"pointer", marginTop:8 }}>
              Calculate Premium 🧮
            </button>
          </div>
          <div>
            {result ? (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ background:"linear-gradient(135deg,rgba(245,158,11,0.15),rgba(234,88,12,0.1))", border:"1px solid rgba(245,158,11,0.4)", borderRadius:16, padding:24, textAlign:"center" }}>
                  <p style={{ fontSize:11, color:"#f59e0b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em" }}>Estimated Annual Premium</p>
                  <p style={{ fontSize:38, fontWeight:900, color:"#f59e0b", lineHeight:1.1, marginTop:8 }}>{fmtINR(result.total)}</p>
                  <p style={{ fontSize:12, color:t.textMuted, marginTop:6 }}>incl. 18% GST</p>
                </div>
                {[
                  { label:"Base Premium", value:fmtINR(result.premium), icon:"📋" },
                  { label:"GST (18%)", value:fmtINR(result.tax), icon:"🏛️" },
                  { label:"Total Payable", value:fmtINR(result.total), icon:"💰", highlight:true },
                  { label:"Monthly EMI", value:fmtINR(result.perMonth), icon:"📅" },
                ].map(item=>(
                  <div key={item.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:item.highlight?"rgba(245,158,11,0.1)":t.inputBg, border:`1px solid ${item.highlight?"rgba(245,158,11,0.3)":t.border}`, borderRadius:12, padding:"12px 16px" }}>
                    <span style={{ fontSize:13, color:t.textMuted }}>{item.icon} {item.label}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:item.highlight?"#f59e0b":t.text }}>{item.value}</span>
                  </div>
                ))}
                <div style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:12, padding:14 }}>
                  <p style={{ fontSize:11, color:t.textMuted, lineHeight:1.6 }}>
                    ℹ️ This is an estimate. Final premium may vary based on medical history, location, IRDAI guidelines, and insurer-specific factors.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, opacity:0.5 }}>
                <span style={{ fontSize:48 }}>🧮</span>
                <p style={{ color:t.textMuted, fontSize:13, textAlign:"center" }}>Fill in the details and click<br/>"Calculate Premium" to see results</p>
              </div>
            )}
          </div>
        </div>
      </Section>
      <Section t={t} title="💡 Premium Tips">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12 }}>
          {[
            { icon:"🏥", tip:"Health", advice:"Buy early. At 25, premium is 60% cheaper than at 45." },
            { icon:"💛", tip:"Life", advice:"Term plans offer highest cover at lowest cost. Buy before 35." },
            { icon:"🚗", tip:"Car", advice:"No-claim bonus can reduce premium by up to 50% over 5 years." },
            { icon:"🏠", tip:"Home", advice:"Bundle with home loan for discounted rates. Covers natural disasters." },
          ].map(item=>(
            <div key={item.tip} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:12, padding:14 }}>
              <p style={{ fontSize:20, marginBottom:6 }}>{item.icon}</p>
              <p style={{ fontSize:12, fontWeight:700, color:t.text, marginBottom:4 }}>{item.tip} Insurance</p>
              <p style={{ fontSize:11, color:t.textMuted, lineHeight:1.5 }}>{item.advice}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
const AnalyticsPage = ({ t, polData, payData }) => {
  const [yearF, setYearF] = useState("All");
  const [monthF, setMonthF] = useState("All");
  const MONTHS = ["All","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTH_MAP = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const years = ["All", ...Array.from(new Set(polData.map(p=>p.effectiveDate?.slice(0,4)||p.year||"").filter(Boolean))).sort().reverse()];

  const filtered = polData.filter(p=>{
    const yr = p.effectiveDate?.slice(0,4)||p.year||"";
    const mo = p.effectiveDate ? new Date(p.effectiveDate).getMonth() : -1;
    return (yearF==="All"||yr===yearF)&&(monthF==="All"||mo===MONTH_MAP[monthF]);
  });

  const totalPremium = filtered.reduce((s,p)=>s+(Number(p.premium)||0),0);
  const totalNet = filtered.reduce((s,p)=>s+(Number(p.netPremium)||0),0);
  const totalGST = filtered.reduce((s,p)=>s+(Number(p.gst)||0),0);
  const totalIncome = filtered.reduce((s,p)=>s+(Number(p.netPremium||0)*Number(p.income||0)/100),0);

  // Month-wise summary from real data
  const monthSummary = {};
  filtered.forEach(p=>{
    const mo = p.effectiveDate?new Date(p.effectiveDate).toLocaleString("default",{month:"short"}):p.month||"Unknown";
    if (!monthSummary[mo]) monthSummary[mo]={count:0,premium:0,net:0,gst:0};
    monthSummary[mo].count++;
    monthSummary[mo].premium += Number(p.premium)||0;
    monthSummary[mo].net += Number(p.netPremium)||0;
    monthSummary[mo].gst += Number(p.gst)||0;
  });

  // Dept summary
  const deptSummary = {};
  filtered.forEach(p=>{ const k=p.department||p.type||"Other"; if(!deptSummary[k]) deptSummary[k]={count:0,premium:0}; deptSummary[k].count++; deptSummary[k].premium+=Number(p.premium)||0; });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {years.map(y=><button key={y} onClick={()=>setYearF(y)} style={{ border:yearF===y?"none":`1px solid ${t.border}`, background:yearF===y?"#f59e0b":"transparent", color:yearF===y?"#000":t.textMuted, borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>{y}</button>)}
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {MONTHS.map(m=><button key={m} onClick={()=>setMonthF(m)} style={{ border:monthF===m?"none":`1px solid ${t.border}`, background:monthF===m?"#60a5fa":"transparent", color:monthF===m?"#000":t.textMuted, borderRadius:99, padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer" }}>{m}</button>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12 }}>
        <StatCard t={t} label="Policies" value={filtered.length} icon="📋" sub="In selection" color="bg-blue-500/20 text-blue-400"/>
        <StatCard t={t} label="Total Premium" value={fmt(totalPremium)} icon="💰" sub="Gross" color="bg-amber-500/20 text-amber-400"/>
        <StatCard t={t} label="Net Premium" value={fmt(totalNet)} icon="📊" sub="Net" color="bg-emerald-500/20 text-emerald-400"/>
        <StatCard t={t} label="GST Collected" value={fmt(totalGST)} icon="🏛️" sub="Tax" color="bg-purple-500/20 text-purple-400"/>
        <StatCard t={t} label="Est. Income" value={fmt(totalIncome)} icon="💸" sub="Commission" color="bg-cyan-500/20 text-cyan-400"/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Section t={t} title="📅 Month-wise Summary">
          <Table t={t} headers={["Month","Policies","Total Prm.","Net Prm.","GST"]}
            rows={Object.entries(monthSummary).map(([mo,d])=>[
              <span style={{ fontWeight:600, color:t.text }}>{mo}</span>,
              <span style={{ color:t.text }}>{d.count}</span>,
              <span style={{ color:"#f59e0b", fontWeight:600 }}>{fmtINR(d.premium)}</span>,
              <span style={{ color:"#34d399" }}>{fmtINR(d.net)}</span>,
              <span style={{ color:"#60a5fa" }}>{fmtINR(d.gst)}</span>,
            ])}
          />
        </Section>
        <Section t={t} title="🏷️ Department-wise Summary">
          <Table t={t} headers={["Department","Policies","Total Premium","Share%"]}
            rows={Object.entries(deptSummary).sort((a,b)=>b[1].premium-a[1].premium).map(([dept,d])=>{
              const pct=Math.round((d.count/filtered.length)*100)||0;
              return [
                <span style={{ fontWeight:600, color:t.text }}>{dept}</span>,
                <span style={{ color:t.text }}>{d.count}</span>,
                <span style={{ color:"#f59e0b", fontWeight:600 }}>{fmtINR(d.premium)}</span>,
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:50, height:4, background:t.border, borderRadius:99 }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:"#f59e0b", borderRadius:99 }}/>
                  </div>
                  <span style={{ fontSize:11, color:t.textMuted }}>{pct}%</span>
                </div>
              ];
            })}
          />
        </Section>
      </div>
    </div>
  );
};

// ── REGION MAP ────────────────────────────────────────────────────────────────
const RegionPage = ({ t, polData }) => {
  const cityMap = {};
  polData.forEach(p=>{
    const city = p.city||p.contact?.slice(0,3)||"Unknown";
    if (!cityMap[city]) cityMap[city]={count:0,premium:0};
    cityMap[city].count++;
    cityMap[city].premium += Number(p.premium)||0;
  });
  const cityData = Object.entries(cityMap).sort((a,b)=>b[1].count-a[1].count).slice(0,10);
  const total = cityData.reduce((s,[,v])=>s+v.count,0)||1;
  const COLORS = ["#f59e0b","#60a5fa","#34d399","#a78bfa","#f87171","#fb923c","#22d3ee","#4ade80","#e879f9","#94a3b8"];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
        <StatCard t={t} label="Total Policies" value={polData.length} icon="📋" sub="All records" color="bg-blue-500/20 text-blue-400"/>
        <StatCard t={t} label="Departments" value={new Set(polData.map(p=>p.department||p.type)).size} icon="🏷️" sub="Types" color="bg-amber-500/20 text-amber-400"/>
        <StatCard t={t} label="Total Premium" value={fmt(polData.reduce((s,p)=>s+(Number(p.premium)||0),0))} icon="💰" sub="Gross" color="bg-emerald-500/20 text-emerald-400"/>
        <StatCard t={t} label="Total Net Prm." value={fmt(polData.reduce((s,p)=>s+(Number(p.netPremium)||0),0))} icon="📊" sub="Net" color="bg-purple-500/20 text-purple-400"/>
      </div>
      <Section t={t} title="📊 Department-wise Policy Breakdown">
        {(() => {
          const dm = {};
          polData.forEach(p=>{ const k=p.department||p.type||"Other"; if(!dm[k]) dm[k]={count:0,premium:0,net:0,gst:0,income:0}; dm[k].count++; dm[k].premium+=Number(p.premium)||0; dm[k].net+=Number(p.netPremium)||0; dm[k].gst+=Number(p.gst)||0; dm[k].income+=Number(p.netPremium||0)*Number(p.income||0)/100; });
          return (
            <Table t={t} headers={["Department","Policies","Share","Total Prm.","Net Prm.","GST","Est. Income"]}
              rows={Object.entries(dm).sort((a,b)=>b[1].premium-a[1].premium).map(([dept,d],i)=>{
                const pct=Math.round((d.count/polData.length)*100);
                return [
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:8,height:8,borderRadius:99,background:COLORS[i%10] }}/><span style={{ fontWeight:700, color:t.text }}>{dept}</span></div>,
                  <span style={{ color:t.text }}>{d.count}</span>,
                  <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:80 }}>
                    <div style={{ width:40, height:5, background:t.border, borderRadius:99 }}><div style={{ width:`${pct}%`, height:"100%", background:COLORS[i%10], borderRadius:99 }}/></div>
                    <span style={{ fontSize:10, color:t.textMuted }}>{pct}%</span>
                  </div>,
                  <span style={{ color:"#f59e0b", fontWeight:600 }}>{fmtINR(d.premium)}</span>,
                  <span style={{ color:"#34d399" }}>{fmtINR(d.net)}</span>,
                  <span style={{ color:"#60a5fa" }}>{fmtINR(d.gst)}</span>,
                  <span style={{ color:"#a78bfa" }}>{fmtINR(d.income)}</span>,
                ];
              })}
            />
          );
        })()}
      </Section>
    </div>
  );
};

// ── CALENDAR ──────────────────────────────────────────────────────────────────
const CalendarPage = ({ t }) => {
  const [cur, setCur] = useState(new Date(2026,4,1));
  const [sel, setSel] = useState(null);
  const year=cur.getFullYear(), month=cur.getMonth();
  const firstDay=new Date(year,month,1).getDay(), daysInMonth=new Date(year,month+1,0).getDate();
  const pad=d=>`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Section t={t} title={`📅 ${cur.toLocaleString("default",{month:"long",year:"numeric"})}`}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
          <button onClick={()=>setCur(new Date(year,month-1,1))} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, padding:"6px 14px", color:t.text, cursor:"pointer" }}>← Prev</button>
          <button onClick={()=>setCur(new Date(year,month+1,1))} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, padding:"6px 14px", color:t.text, cursor:"pointer" }}>Next →</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:8 }}>
          {DAYS.map(d=><div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:600, color:t.textMuted, padding:"4px 0" }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
          {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:daysInMonth},(_,i)=>{
            const d=i+1, key=pad(d), evts=CALENDAR_EVENTS[key]||[], isSel=sel===key;
            return (
              <div key={d} onClick={()=>setSel(isSel?null:key)}
                style={{ background:isSel?"rgba(245,158,11,0.15)":t.inputBg, border:`1px solid ${isSel?"rgba(245,158,11,0.5)":t.border}`, borderRadius:10, minHeight:50, padding:"5px 4px", cursor:"pointer", transition:"all 0.15s" }}>
                <div style={{ fontSize:11, fontWeight:700, color:t.text, textAlign:"center", marginBottom:3 }}>{d}</div>
                {evts.slice(0,2).map((e,ei)=>(
                  <div key={ei} style={{ borderLeft:`2px solid ${e.color}`, background:e.color+"22", borderRadius:2, padding:"1px 3px", marginBottom:1 }}>
                    <span style={{ fontSize:8, color:e.color, display:"block", overflow:"hidden", whiteSpace:"nowrap" }}>{e.title}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {sel&&CALENDAR_EVENTS[sel]&&(
          <div style={{ marginTop:14, background:t.inputBg, border:`1px solid rgba(245,158,11,0.3)`, borderRadius:12, padding:14 }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#f59e0b", marginBottom:8 }}>Events on {sel}</p>
            {CALENDAR_EVENTS[sel].map((e,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <div style={{ width:8, height:8, borderRadius:99, background:e.color, flexShrink:0 }}/>
                <span style={{ fontSize:13, color:t.text }}>{e.title}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
      <Section t={t} title="Upcoming Events">
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {Object.entries(CALENDAR_EVENTS).sort().map(([date,evts])=>evts.map((e,i)=>(
            <div key={`${date}-${i}`} style={{ display:"flex", alignItems:"center", gap:12, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:10, padding:"10px 14px" }}>
              <div style={{ width:4, height:36, background:e.color, borderRadius:99 }}/>
              <div><p style={{ fontSize:13, fontWeight:600, color:t.text }}>{e.title}</p><p style={{ fontSize:11, color:t.textMuted }}>{new Date(date).toDateString()}</p></div>
            </div>
          )))}
        </div>
      </Section>
    </div>
  );
};

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
const NotificationsPage = ({ t, notifications, setNotifications }) => {
  const [typeF, setTypeF] = useState("All");
  const typeColor={ renewal:"#f59e0b", claim:"#60a5fa", payment:"#34d399", agent:"#a78bfa" };
  const filtered = typeF==="All" ? notifications : notifications.filter(n=>n.type===typeF);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h2 style={{ fontWeight:700, fontSize:18, color:t.text }}>🔔 Notification Center</h2>
          <p style={{ color:t.textMuted, fontSize:13, marginTop:4 }}>{notifications.filter(n=>!n.read).length} unread alerts</p>
        </div>
        <button onClick={()=>setNotifications(n=>n.map(x=>({...x,read:true})))} style={{ fontSize:12, color:"#f59e0b", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontWeight:600 }}>Mark all read</button>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {[["All","All"],["renewal","⚠️ Renewals"],["claim","🛡️ Claims"],["payment","💳 Payments"],["agent","🏆 Agents"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTypeF(v)}
            style={{ border:typeF===v?"none":`1px solid ${t.border}`, background:typeF===v?typeColor[v]||"#f59e0b":"transparent", color:typeF===v?"#000":t.textMuted, borderRadius:99, padding:"5px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>{l}</button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.map(n=>(
          <div key={n.id} onClick={()=>setNotifications(prev=>prev.map(x=>x.id===n.id?{...x,read:true}:x))}
            style={{ background:n.read?t.surface:t.surface2, border:`1px solid ${n.read?t.border:typeColor[n.type]+"40"}`, borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"flex-start", gap:14, cursor:"pointer", transition:"all 0.2s" }}>
            <div style={{ width:40, height:40, borderRadius:12, background:typeColor[n.type]+"20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{n.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <p style={{ fontSize:13, fontWeight:700, color:t.text }}>{n.title}</p>
                {!n.read&&<div style={{ width:8, height:8, borderRadius:99, background:"#f59e0b", flexShrink:0, marginTop:4 }}/>}
              </div>
              <p style={{ fontSize:12, color:t.textMuted, marginTop:3 }}>{n.body}</p>
              <p style={{ fontSize:11, color:t.textMuted, marginTop:4, opacity:0.6 }}>{n.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── AI ASSISTANT ──────────────────────────────────────────────────────────────
const AIPage = ({ t }) => {
  const [messages, setMessages] = useState([{ role:"assistant", content:"Namaste! 👋 Main ATRAV ka Insurance AI Assistant hoon. Policy recommendations, risk analysis, agent performance, claims management — kuch bhi poochho Hindi, English, ya Hinglish mein!" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const QUICK=["Best health plan for family of 4?","Claim rejection kyun hota hai?","Agent ki performance improve kaise karein?","Car insurance mein NCB benefit kya hai?"];
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);
  const send = async (text) => {
    const msg=text||input.trim(); if(!msg) return;
    setInput(""); setMessages(p=>[...p,{role:"user",content:msg}]); setLoading(true);
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{ method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:`You are an expert AI assistant for "ATRAV Insurance Suite" — a business management platform for insurance companies in India. Help with: Policy advice (Health/Life/Car/Home), IRDAI compliance, risk analysis, agent coaching, claims management, client retention, revenue growth. Be concise, practical, and data-driven. Respond in the user's language (Hindi/English/Hinglish). Use emojis sparingly.`,
          messages:[...messages.slice(-8).map(m=>({role:m.role,content:m.content})),{role:"user",content:msg}]
        })
      });
      const data=await res.json();
      const reply=data.content?.find(b=>b.type==="text")?.text||"Error. Please retry.";
      setMessages(p=>[...p,{role:"assistant",content:reply}]);
    } catch { setMessages(p=>[...p,{role:"assistant",content:"⚠️ Network error. Please retry."}]); }
    setLoading(false);
  };
  return (
    <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, overflow:"hidden", display:"flex", flexDirection:"column", height:580 }}>
      <div style={{ background:"linear-gradient(135deg,rgba(245,158,11,0.15),rgba(96,165,250,0.1))", borderBottom:`1px solid ${t.border}`, padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#f59e0b,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🤖</div>
        <div>
          <p style={{ fontWeight:700, fontSize:14, color:t.text }}>ATRAV AI Assistant</p>
          <p style={{ fontSize:11, color:t.textMuted }}>Powered by Claude · Insurance Expert</p>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:99, background:"#34d399" }}/>
          <span style={{ fontSize:11, color:t.textMuted }}>Online</span>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:10 }}>
        {messages.map((m,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            <div style={{ maxWidth:"80%", padding:"10px 14px", borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px", background:m.role==="user"?"linear-gradient(135deg,#f59e0b,#ea580c)":t.surface2, border:m.role==="user"?"none":`1px solid ${t.border}`, color:m.role==="user"?"#000":t.text, fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{m.content}</div>
          </div>
        ))}
        {loading&&(
          <div style={{ display:"flex" }}>
            <div style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:"18px 18px 18px 4px", padding:"12px 16px", display:"flex", gap:6 }}>
              {[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:99, background:"#f59e0b", animation:"bounce 1s infinite", animationDelay:`${i*0.15}s` }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      <div style={{ borderTop:`1px solid ${t.border}`, padding:"12px 16px" }}>
        <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
          {QUICK.map(q=>(
            <button key={q} onClick={()=>send(q)} style={{ background:t.inputBg, border:`1px solid ${t.border}`, color:t.textMuted, borderRadius:20, padding:"4px 10px", fontSize:11, cursor:"pointer" }}>{q}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Kuch bhi poochho..."
            style={{ flex:1, background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:12, padding:"10px 14px", fontSize:13, color:t.text, outline:"none" }}/>
          <button onClick={()=>send()} disabled={loading||!input.trim()}
            style={{ background:"linear-gradient(135deg,#f59e0b,#ea580c)", border:"none", borderRadius:12, padding:"10px 18px", color:"#000", fontWeight:700, fontSize:13, cursor:"pointer", opacity:loading||!input.trim()?0.5:1 }}>↑</button>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
    </div>
  );
};

// ── GLOBAL SEARCH ─────────────────────────────────────────────────────────────
const GlobalSearch = ({ t, polData, clientData, claimData, payData, setActive, onClose }) => {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(()=>{ inputRef.current?.focus(); },[]);
  const results = q.trim().length < 2 ? [] : [
    ...polData.filter(p=>p.client.toLowerCase().includes(q.toLowerCase())||p.id.toLowerCase().includes(q.toLowerCase())).slice(0,3).map(p=>({ type:"Policy", label:`${p.id} — ${p.client}`, sub:`${p.type} · ${p.status}`, nav:"policies", icon:"📋" })),
    ...clientData.filter(c=>c.name.toLowerCase().includes(q.toLowerCase())||c.city.toLowerCase().includes(q.toLowerCase())).slice(0,3).map(c=>({ type:"Client", label:c.name, sub:`${c.city} · ${c.policies} policies`, nav:"clients", icon:"👥" })),
    ...claimData.filter(c=>c.client.toLowerCase().includes(q.toLowerCase())||c.id.toLowerCase().includes(q.toLowerCase())).slice(0,3).map(c=>({ type:"Claim", label:`${c.id} — ${c.client}`, sub:`${c.type} · ${c.status}`, nav:"claims", icon:"🛡️" })),
    ...payData.filter(p=>p.client.toLowerCase().includes(q.toLowerCase())||p.id.toLowerCase().includes(q.toLowerCase())).slice(0,3).map(p=>({ type:"Payment", label:`${p.id} — ${p.client}`, sub:`${fmtINR(p.amount)} · ${p.status}`, nav:"payments", icon:"💳" })),
  ];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:300, display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:80 }} onClick={onClose}>
      <div style={{ width:"100%", maxWidth:560, background:t.modal, border:`1px solid ${t.border}`, borderRadius:18, overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 18px", borderBottom:`1px solid ${t.border}` }}>
          <span style={{ fontSize:18 }}>🔍</span>
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search policies, clients, claims, payments..."
            style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:15, color:t.text }}/>
          <button onClick={onClose} style={{ background:"none", border:"none", color:t.textMuted, cursor:"pointer", fontSize:18 }}>×</button>
        </div>
        {q.length>1&&(
          <div>
            {results.length===0?(
              <div style={{ padding:"24px", textAlign:"center", color:t.textMuted, fontSize:13 }}>No results for "{q}"</div>
            ):(
              <div>
                {results.map((r,i)=>(
                  <div key={i} onClick={()=>{ setActive(r.nav); onClose(); }}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 18px", borderBottom:`1px solid ${t.border}`, cursor:"pointer" }}
                    onMouseEnter={e=>e.currentTarget.style.background=t.inputBg}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <span style={{ fontSize:20 }}>{r.icon}</span>
                    <div>
                      <p style={{ fontSize:13, fontWeight:600, color:t.text }}>{r.label}</p>
                      <p style={{ fontSize:11, color:t.textMuted }}>{r.type} · {r.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {q.length<=1&&(
          <div style={{ padding:"14px 18px" }}>
            <p style={{ fontSize:11, color:t.textMuted, marginBottom:8, fontWeight:600, textTransform:"uppercase" }}>Quick Navigate</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {[["📋","Policies","policies"],["👥","Clients","clients"],["🛡️","Claims","claims"],["💳","Payments","payments"],["🧮","Calculator","calculator"],["🤖","AI Assistant","ai"]].map(([icon,label,nav])=>(
                <button key={nav} onClick={()=>{ setActive(nav); onClose(); }}
                  style={{ display:"flex", alignItems:"center", gap:6, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:10, padding:"7px 12px", fontSize:12, color:t.text, cursor:"pointer" }}>{icon} {label}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── AUTH HELPERS ──────────────────────────────────────────────────────────────
const hashPassword = async (pass) => {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pass + "ATRAV_SALT_2026"));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
  } catch { return btoa(pass + "ATRAV_SALT_2026"); }
};

const ROLES = {
  admin:  { label:"Admin",  color:"#f59e0b", badge:"bg-amber-500/20 text-amber-400",    canEdit:true,  canDelete:true,  canImport:true,  canManageUsers:true  },
  agent:  { label:"Agent",  color:"#60a5fa", badge:"bg-blue-500/20 text-blue-400",      canEdit:true,  canDelete:false, canImport:false, canManageUsers:false },
  viewer: { label:"Viewer", color:"#34d399", badge:"bg-emerald-500/20 text-emerald-400",canEdit:false, canDelete:false, canImport:false, canManageUsers:false },
};

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────
const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()||!password.trim()) { setError("Username aur password dono daalo."); return; }
    setLoading(true); setError("");
    const hashed = await hashPassword(password);
    let users = JSON.parse(localStorage.getItem("atrav:users")||"[]");
    if (!users.length) {
      const defaultHash = await hashPassword("admin123");
      users = [{ id:"u-001", username:"admin", name:"Super Admin", role:"admin", hash:defaultHash, createdAt:new Date().toISOString() }];
      localStorage.setItem("atrav:users", JSON.stringify(users));
    }
    const user = users.find(u=>u.username.toLowerCase()===username.toLowerCase()&&u.hash===hashed);
    if (user) {
      const session = { userId:user.id, username:user.username, name:user.name, role:user.role, loginAt:new Date().toISOString(), provider:"local" };
      localStorage.setItem("atrav:session", JSON.stringify(session));
      onLogin(session);
    } else { setError("❌ Username ya password galat hai."); }
    setLoading(false);
  };

  const handleGoogle = async () => {
    if (!fbAuth||!googleProvider) { setError("Firebase setup nahi hua."); return; }
    setGLoading(true); setError("");
    try {
      const result = await signInWithPopup(fbAuth, googleProvider);
      const u = result.user;
      const session = { userId:u.uid, uid:u.uid, username:u.email, name:u.displayName||u.email, role:"admin", loginAt:new Date().toISOString(), provider:"google", photoURL:u.photoURL, email:u.email };
      localStorage.setItem("atrav:session", JSON.stringify(session));
      onLogin(session);
    } catch(e) {
      if (e.code==="auth/popup-closed-by-user") setError("Login cancel ho gaya.");
      else if (e.code==="auth/unauthorized-domain") setError("⚠️ Firebase Console → Authentication → Settings → Authorized domains mein GitHub Pages domain add karo: nidekhsambaria-max.github.io");
      else setError("Google login failed: " + (e.message||e.code));
    }
    setGLoading(false);
  };

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#080d16", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:16, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", background:"rgba(245,158,11,0.06)", filter:"blur(80px)", top:"10%", left:"20%", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:"rgba(96,165,250,0.05)", filter:"blur(80px)", bottom:"10%", right:"15%", pointerEvents:"none" }}/>
      <div style={{ width:"100%", maxWidth:420, position:"relative" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:18, background:"linear-gradient(135deg,#f59e0b,#ea580c)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:28, color:"#000", marginBottom:14, boxShadow:"0 8px 32px rgba(245,158,11,0.35)" }}>A</div>
          <h1 style={{ color:"#fff", fontWeight:800, fontSize:26, margin:0 }}>ATRAV Insurance Suite</h1>
          <p style={{ color:"#64748b", fontSize:13, marginTop:4 }}>Secure Login · Data Cloud Mein Save</p>
        </div>
        <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:22, padding:28 }}>

          {/* ── GOOGLE BUTTON ── */}
          <button onClick={handleGoogle} disabled={gLoading}
            style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10, background:"#fff", border:"none", borderRadius:12, padding:"13px", fontSize:14, fontWeight:700, color:"#1e293b", cursor:gLoading?"not-allowed":"pointer", marginBottom:22, opacity:gLoading?0.7:1, boxShadow:"0 2px 16px rgba(0,0,0,0.4)", transition:"opacity 0.2s" }}>
            {gLoading
              ? <div style={{ width:18, height:18, border:"2px solid #ddd", borderTop:"2px solid #4285f4", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
              : <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                  <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.32-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                  <path fill="#FBBC05" d="M11.68 28.18A13.9 13.9 0 0 1 10.9 24c0-1.45.25-2.86.78-4.18v-5.7H4.34A23.93 23.93 0 0 0 0 24c0 3.86.92 7.51 2.56 10.74l7.12-5.56z"/>
                  <path fill="#EA4335" d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 3.09 29.93 1 24 1 15.4 1 7.96 5.93 4.34 13.26l7.34 5.56C13.42 13.62 18.27 9.75 24 9.75z"/>
                </svg>
            }
            {gLoading ? "Google se login ho raha hai..." : "Google se Sign In karo"}
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)" }}/>
            <span style={{ color:"#475569", fontSize:12, fontWeight:600 }}>ya</span>
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)" }}/>
          </div>

          {/* ── USERNAME/PASSWORD ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6, textTransform:"uppercase" }}>Username</label>
              <input value={username} onChange={e=>{setUsername(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="admin"
                style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"11px 14px", fontSize:13, color:"#e2e8f0", outline:"none", boxSizing:"border-box" }}/>
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6, textTransform:"uppercase" }}>Password</label>
              <div style={{ position:"relative" }}>
                <input type={showPass?"text":"password"} value={password} onChange={e=>{setPassword(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="••••••••"
                  style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"11px 42px 11px 14px", fontSize:13, color:"#e2e8f0", outline:"none", boxSizing:"border-box" }}/>
                <button onClick={()=>setShowPass(p=>!p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:16 }}>{showPass?"🙈":"👁️"}</button>
              </div>
            </div>
            {error && <div style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#f87171" }}>{error}</div>}
            <button onClick={handleLogin} disabled={loading}
              style={{ background:"linear-gradient(135deg,#f59e0b,#ea580c)", border:"none", borderRadius:12, padding:"12px", fontSize:14, fontWeight:800, color:"#000", cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
              {loading?"🔄 Login ho raha hai...":"🔐 Login"}
            </button>
          </div>

          <div style={{ marginTop:20, padding:"12px 14px", background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:12 }}>
            <p style={{ fontSize:11, color:"#f59e0b", fontWeight:700, marginBottom:4 }}>🔑 Default Admin:</p>
            <p style={{ fontSize:12, color:"#94a3b8" }}>Username: <b style={{ color:"#e2e8f0" }}>admin</b> · Password: <b style={{ color:"#e2e8f0" }}>admin123</b></p>
          </div>
        </div>
        <p style={{ textAlign:"center", color:"#334155", fontSize:11, marginTop:16 }}>ATRAV Insurance Suite · Data Firestore mein save hoga</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#080d16", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:64, height:64, borderRadius:18, background:"linear-gradient(135deg,#f59e0b,#ea580c)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:28, color:"#000", marginBottom:16 }}>A</div>
          <h1 style={{ color:"#e2e8f0", fontWeight:800, fontSize:26, letterSpacing:"-0.5px" }}>ATRAV Insurance Suite</h1>
          <p style={{ color:"#94a3b8", fontSize:13, marginTop:6 }}>Apne account mein login karein</p>
        </div>
        <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:22, padding:32 }}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>Username</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Apna username daalo"
              style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#e2e8f0", outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>Password</label>
            <div style={{ position:"relative" }}>
              <input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} type={showPass?"text":"password"} placeholder="••••••••"
                style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"12px 44px 12px 14px", fontSize:14, color:"#e2e8f0", outline:"none", boxSizing:"border-box" }}/>
              <button onClick={()=>setShowPass(p=>!p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:18 }}>{showPass?"🙈":"👁️"}</button>
            </div>
          </div>
          {error && <div style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#f87171", marginBottom:16 }}>{error}</div>}
          <button onClick={handleLogin} disabled={loading}
            style={{ width:"100%", background:"linear-gradient(135deg,#f59e0b,#ea580c)", border:"none", borderRadius:12, padding:"14px", fontSize:15, fontWeight:800, color:"#000", cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, transition:"opacity 0.2s" }}>
            {loading?"🔄 Logging in...":"🔐 Login"}
          </button>
          <div style={{ marginTop:20, padding:14, background:"rgba(255,255,255,0.03)", borderRadius:12, border:"1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize:11, color:"#64748b", fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Default Credentials (Pehli Baar)</p>
            <p style={{ fontSize:13, color:"#94a3b8" }}>Username: <b style={{ color:"#f59e0b" }}>admin</b> &nbsp; Password: <b style={{ color:"#f59e0b" }}>admin123</b></p>
            <p style={{ fontSize:11, color:"#64748b", marginTop:8 }}>⚠️ Login ke baad User Settings mein password zaroor change karein!</p>
          </div>
        </div>
        <p style={{ textAlign:"center", color:"#334155", fontSize:11, marginTop:16 }}>© 2026 ATRAV Insurance Suite · Secured with SHA-256</p>
      </div>
    </div>
  );
};

// ── USER MANAGEMENT PAGE ──────────────────────────────────────────────────────
const UserManagement = ({ t, currentUser }) => {
  const [users, setUsers] = useState(()=>JSON.parse(localStorage.getItem("atrav:users")||"[]"));
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ username:"", name:"", role:"agent", password:"" });
  const [msg, setMsg] = useState(null);
  const [changingPass, setChangingPass] = useState({});
  const f = v => setForm(p=>({...p,...v}));

  const saveUsers = (updated) => { setUsers(updated); localStorage.setItem("atrav:users", JSON.stringify(updated)); };

  const saveUser = async () => {
    if (!form.username||!form.name||!form.password) { setMsg({type:"error",text:"Sab required fields bharo."}); return; }
    if (users.find(u=>u.username.toLowerCase()===form.username.toLowerCase()&&(!modal||u.id!==modal.id))) { setMsg({type:"error",text:"Yeh username already exist karta hai."}); return; }
    const hashed = await hashPassword(form.password);
    if (!modal) saveUsers([...users,{id:`u-${Date.now()}`,username:form.username,name:form.name,role:form.role,hash:hashed,createdAt:new Date().toISOString()}]);
    else saveUsers(users.map(u=>u.id===modal.id?{...u,username:form.username,name:form.name,role:form.role,hash:hashed}:u));
    setMsg({type:"success",text:"✅ User save ho gaya!"}); setModal(null); setTimeout(()=>setMsg(null),3000);
  };

  const doChangePass = async (userId) => {
    const np = changingPass[userId]?.val||"";
    if (!np||np.length<4) { setMsg({type:"error",text:"Password kam se kam 4 characters ka hona chahiye."}); return; }
    const hashed = await hashPassword(np);
    saveUsers(users.map(u=>u.id===userId?{...u,hash:hashed}:u));
    setChangingPass(p=>({...p,[userId]:{...p[userId],show:false,val:""}}));
    setMsg({type:"success",text:"✅ Password change ho gaya!"}); setTimeout(()=>setMsg(null),3000);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12 }}>
        <StatCard t={t} label="Total Users" value={users.length} icon="👤" sub="Registered" color="bg-blue-500/20 text-blue-400"/>
        <StatCard t={t} label="Admins" value={users.filter(u=>u.role==="admin").length} icon="👑" sub="Full access" color="bg-amber-500/20 text-amber-400"/>
        <StatCard t={t} label="Agents" value={users.filter(u=>u.role==="agent").length} icon="🧑‍💼" sub="Edit access" color="bg-emerald-500/20 text-emerald-400"/>
        <StatCard t={t} label="Viewers" value={users.filter(u=>u.role==="viewer").length} icon="👁️" sub="Read only" color="bg-purple-500/20 text-purple-400"/>
      </div>

      {/* Role guide */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        {Object.entries(ROLES).map(([role,info])=>(
          <div key={role} style={{ background:info.color+"15", border:`1px solid ${info.color}40`, borderRadius:12, padding:"10px 16px", flex:1, minWidth:140 }}>
            <p style={{ fontSize:13, fontWeight:700, color:info.color }}>👤 {info.label}</p>
            <p style={{ fontSize:11, color:"#94a3b8", marginTop:4, lineHeight:1.6 }}>
              {info.canEdit?"✅":"❌"} Edit &nbsp;{info.canDelete?"✅":"❌"} Delete &nbsp;{info.canImport?"✅":"❌"} Import &nbsp;{info.canManageUsers?"✅":"❌"} Users
            </p>
          </div>
        ))}
      </div>

      {msg && <div style={{ background:msg.type==="error"?"rgba(248,113,113,0.1)":"rgba(52,211,153,0.1)", border:`1px solid ${msg.type==="error"?"rgba(248,113,113,0.3)":"rgba(52,211,153,0.3)"}`, borderRadius:10, padding:"10px 16px", fontSize:13, color:msg.type==="error"?"#f87171":"#34d399" }}>{msg.text}</div>}

      <Section t={t} title="All Users" action="+ Add User" onAction={()=>{ setForm({username:"",name:"",role:"agent",password:""}); setModal(false); }}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {users.map(u=>(
            <div key={u.id} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:14, padding:"14px 18px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:`linear-gradient(135deg,${ROLES[u.role]?.color||"#94a3b8"},#1e293b)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:15, flexShrink:0 }}>{u.name[0].toUpperCase()}</div>
                <div style={{ flex:1, minWidth:100 }}>
                  <p style={{ fontWeight:700, fontSize:14, color:t.text }}>{u.name} {u.id===currentUser.userId&&<span style={{ fontSize:10, color:"#94a3b8" }}>(You)</span>}</p>
                  <p style={{ fontSize:11, color:t.textMuted }}>@{u.username} · {new Date(u.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${ROLES[u.role]?.badge}`}>{ROLES[u.role]?.label}</span>
                {currentUser.role==="admin" && (
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>setChangingPass(p=>({...p,[u.id]:{show:!p[u.id]?.show,val:p[u.id]?.val||""}}))}
                      style={{ fontSize:11, padding:"4px 10px", background:"rgba(96,165,250,0.15)", border:"1px solid rgba(96,165,250,0.3)", borderRadius:6, color:"#60a5fa", cursor:"pointer" }}>🔑 Password</button>
                    {u.id!==currentUser.userId && (
                      <button onClick={()=>saveUsers(users.filter(x=>x.id!==u.id))}
                        style={{ fontSize:11, padding:"4px 10px", background:"rgba(248,113,113,0.15)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:6, color:"#f87171", cursor:"pointer" }}>🗑️ Remove</button>
                    )}
                  </div>
                )}
              </div>
              {changingPass[u.id]?.show && (
                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  <input value={changingPass[u.id]?.val||""} onChange={e=>setChangingPass(p=>({...p,[u.id]:{...p[u.id],val:e.target.value}}))} type="password" placeholder="Naya password (min 4 chars)..."
                    style={{ flex:1, background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:8, padding:"8px 12px", fontSize:13, color:t.text, outline:"none" }}/>
                  <button onClick={()=>doChangePass(u.id)} style={{ background:"linear-gradient(135deg,#f59e0b,#ea580c)", border:"none", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:700, color:"#000", cursor:"pointer" }}>Save</button>
                  <button onClick={()=>setChangingPass(p=>({...p,[u.id]:{...p[u.id],show:false}}))} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, padding:"8px 10px", fontSize:12, color:t.textMuted, cursor:"pointer" }}>✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {modal!==null && (
        <Modal title={modal?"Edit User":"Add New User"} onClose={()=>setModal(null)} t={t}>
          <Field label="Full Name" value={form.name} onChange={v=>f({name:v})} t={t} required/>
          <Field label="Username" value={form.username} onChange={v=>f({username:v})} t={t} required/>
          <Field label="Password" value={form.password} onChange={v=>f({password:v})} type="password" t={t} required/>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:t.textMuted, marginBottom:8, textTransform:"uppercase" }}>Role *</label>
            <div style={{ display:"flex", gap:8 }}>
              {Object.entries(ROLES).map(([role,info])=>(
                <button key={role} onClick={()=>f({role})}
                  style={{ flex:1, border:`1px solid ${form.role===role?info.color:t.border}`, background:form.role===role?info.color+"25":"transparent", color:form.role===role?info.color:t.textMuted, borderRadius:10, padding:"9px 6px", fontSize:12, fontWeight:700, cursor:"pointer" }}>{info.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <Btn onClick={()=>setModal(null)} outline color={t.textMuted} t={t}>Cancel</Btn>
            <Btn onClick={saveUser} t={t}>Save User</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── IMPORT DATA PAGE ──────────────────────────────────────────────────────────
const ImportPage = ({ t, setPolData, setClientData, setClaimData, setAgentData, setPayData }) => {
  const [tab, setTab] = useState("excel"); // "excel" | "gsheet"
  const [gsUrl, setGsUrl] = useState("");
  const [gsType, setGsType] = useState("policies");
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(null);
  const [status, setStatus] = useState(null); // {type:"success"|"error"|"loading", msg}
  const [preview, setPreview] = useState(null); // {headers, rows, type}
  const [colMap, setColMap] = useState({});
  const [rawParsed, setRawParsed] = useState(null);
  const fileRef = useRef(null);

  // ── COLUMN DEFINITIONS per data type ──
  const SCHEMA = {
    policies: { required:["policyNo","client","contact","department","type","effectiveDate","expiry","netPremium","gst","premium","commisionable","income","status","risk","docLink"], labels:{ policyNo:"Policy No.", client:"Client Name (Name)", contact:"Contact No.", department:"Department (TW/PVT CAR/MEDICLAIM etc.)", type:"Insurance Type (auto-detected)", effectiveDate:"Effective Date", expiry:"Expiry Date", netPremium:"Net Premium (Net Prm.)", gst:"GST", premium:"Total Premium", commisionable:"OD/Net Prm. Commisionable", income:"Income %", status:"Status", risk:"Risk Level", docLink:"Policy Document Link (URL) — Optional" } },
    clients:   { required:["name","email","phone","city","policies","totalPremium","since"], labels:{ name:"Client Name", email:"Email", phone:"Phone", city:"City", policies:"No. of Policies", totalPremium:"Total Premium (₹)", since:"Member Since (Year)" } },
    claims:    { required:["client","type","amount","filed","status","agent"],   labels:{ client:"Client Name", type:"Type (Health/Life/Car/Home)", amount:"Claim Amount (₹)", filed:"Filed Date (YYYY-MM-DD)", status:"Status (In Review/Approved/Rejected)", agent:"Assigned Agent" } },
    agents:    { required:["name","region","policiesSold","revenue","rating","target","commission"], labels:{ name:"Agent Name", region:"Region", policiesSold:"Policies Sold", revenue:"Revenue (Lakhs)", rating:"Rating (0-5)", target:"Monthly Target", commission:"Commission (₹)", claimsHandled:"Claims Handled" } },
    payments:  { required:["client","amount","type","date","status","method"],   labels:{ client:"Client Name", amount:"Amount (₹)", type:"Payment Type", date:"Date (YYYY-MM-DD)", status:"Status (Paid/Pending/Failed)", method:"Method (UPI/Card/Net Banking)" } },
  };

  const SETTERS = { policies:setPolData, clients:setClientData, claims:setClaimData, agents:setAgentData, payments:setPayData };
  const ID_PREFIX = { policies:"POL", clients:"C", claims:"CLM", agents:"A", payments:"PAY" };

  // Parse CSV text → [{header→value}]
  // ── PARSE CSV — handles quoted commas, \r\n, BOM ──
  const parseCSV = (text) => {
    // Remove BOM and normalize line endings
    const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = clean.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) return [];

    // Parse a single CSV line respecting quoted fields
    const parseLine = (line) => {
      const result = [];
      let cur = "", inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i+1] === '"') { cur += '"'; i++; }
          else inQuote = !inQuote;
        } else if (ch === ',' && !inQuote) {
          result.push(cur.trim()); cur = "";
        } else cur += ch;
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g,"").trim());
    return lines.slice(1).map(line => {
      const vals = parseLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] || "").replace(/^"|"$/g,"").trim(); });
      return obj;
    }).filter(row => Object.values(row).some(v => v !== ""));
  };

  // ── DATE NORMALIZER — handles ALL Indian date formats ──
  const normalizeDate = (val) => {
    if (!val) return "";
    let s = String(val).trim().replace(/\s+/g," ");
    if (!s || s === "0" || s.toLowerCase() === "n/a") return "";

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // dd/mm/yyyy or d/m/yyyy (Indian standard)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const [d,m,y] = s.split("/");
      return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    }
    // dd-mm-yyyy
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
      const [d,m,y] = s.split("-");
      return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    }
    // dd.mm.yyyy
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)) {
      const [d,m,y] = s.split(".");
      return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    }
    // d/m/yy → assume 20xx
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(s)) {
      const [d,m,y] = s.split("/");
      return `20${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    }
    // Excel serial number (days since 1900-01-01)
    if (/^\d{5}$/.test(s)) {
      const d = new Date(Date.UTC(1900,0,1) + (parseInt(s)-2)*86400000);
      return d.toISOString().slice(0,10);
    }
    // Try JS Date parse as last resort
    try {
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) return dt.toISOString().slice(0,10);
    } catch {}
    return s;
  };

  // ── FORMAT DATE for display as dd/mm/yyyy ──
  const fmtDate = (val) => {
    if (!val) return "—";
    const s = String(val).trim();
    // Convert YYYY-MM-DD to dd/mm/yyyy
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y,m,d] = s.split("-");
      return `${d}/${m}/${y}`;
    }
    // If already dd/mm/yyyy
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;
    return s;
  };

  // ── INSURANCE TYPE NORMALIZER ──
  const normalizeType = (val) => {
    const v = String(val||"").toUpperCase().trim();
    if (v.includes("TW")||v.includes("BIKE")||v.includes("MOTOR")||v.includes("CAR")||v.includes("AUTO")||v.includes("VEHICLE")||v.includes("PVT")||v.includes("TRUCK")||v.includes("BUS")||v.includes("TAXI")||v.includes("GCV")||v.includes("MISC")) return "Car";
    if (v.includes("MEDICLAIM")||v.includes("HEALTH")||v.includes("MEDICAL")||v.includes("ACCIDENT")||v.includes("PA ")||v.includes("CORONA")||v.includes("COVID")||v.includes("GROUP")) return "Health";
    if (v.includes("LIFE")||v.includes("TERM")||v.includes("ULIP")||v.includes("ENDOW")||v.includes("LIC")||v.includes("JEEVAN")) return "Life";
    if (v.includes("HOME")||v.includes("FIRE")||v.includes("HOUSE")||v.includes("PROPERTY")||v.includes("SHOP")||v.includes("BURGLARY")||v.includes("MARINE")) return "Home";
    return "Car"; // default for insurance companies is usually motor
  };
  const normalizeStatus = (val) => {
    const v = String(val||"").toUpperCase().trim();
    if (v.includes("ACTIVE")||v.includes("LIVE")||v.includes("INFORCE")||v.includes("IN FORCE")||v==="1"||v==="YES") return "Active";
    if (v.includes("RENEW")||v.includes("DUE")) return "Renewal Due";
    if (v.includes("LAPSE")||v.includes("CANCEL")||v.includes("VOID")||v.includes("EXPIR")||v==="0"||v==="NO") return "Lapsed";
    return "Active";
  };
  const normalizeRisk = (val) => {
    const v = String(val||"").toUpperCase().trim();
    if (v.includes("HIGH")||v==="3") return "High";
    if (v.includes("MED")||v==="2") return "Medium";
    return "Low";
  };

  // ── APPLY MAPPING ──
  const applyMapping = (rows, type, map) => {
    const schema = SCHEMA[type];
    return rows.map((row) => {
      const item = { id: uid(ID_PREFIX[type]) };
      schema.required.forEach(field => {
        const srcCol = map[field];
        let val = srcCol ? (row[srcCol] ?? "") : "";
        if (field === "type") val = normalizeType(val || (map["department"] ? row[map["department"]] : ""));
        else if (field === "department") val = String(val||"").trim();
        else if (field === "status") {
          const rawStatus = normalizeStatus(val);
          if (!srcCol || !val.trim()) {
            const expiryCol = map["expiry"];
            const expNorm = normalizeDate(expiryCol ? row[expiryCol] : "");
            if (expNorm) {
              const days = Math.ceil((new Date(expNorm) - new Date()) / (1000*60*60*24));
              val = days < 0 ? "Lapsed" : days <= 30 ? "Renewal Due" : "Active";
            } else val = "Active";
          } else val = rawStatus;
        }
        else if (["expiry","filed","date","effectiveDate"].includes(field)) val = normalizeDate(val);
        else if (field === "risk") val = normalizeRisk(val);
        else if (["docLink","policyNo","contact"].includes(field)) val = String(val||"").trim();
        else if (field === "income") val = parseFloat(String(val||"0").replace(/[%,\s₹]/g,"")) || 0;
        else if (["netPremium","gst","commisionable","premium","amount","totalPremium","commission"].includes(field)) val = Number(String(val||"0").replace(/[₹,\s]/g,"")) || 0;
        else if (["policiesSold","policies","target","claimsHandled"].includes(field)) val = Number(val) || 0;
        else if (["revenue","rating"].includes(field)) val = parseFloat(val) || 0;
        item[field] = val;
      });
      // Store ALL original columns too (so nothing is lost)
      Object.keys(row).forEach(k => { if (!(k in item)) item["_"+k] = row[k]; });
      if (type==="agents" && map["claimsHandled"]) item.claimsHandled = Number(row[map["claimsHandled"]])||0;
      if (type==="policies") {
        if (!item.year && item.effectiveDate) item.year = item.effectiveDate.slice(0,4);
        if (!item.month && item.effectiveDate) item.month = new Date(item.effectiveDate).toLocaleString("default",{month:"short"});
        if (!item.type || item.type==="Car") item.type = normalizeType(item.department||"");
      }
      return item;
    }).filter(item => {
      const first = schema.required.find(f => !["docLink","risk","type","status"].includes(f));
      return item[first] && String(item[first]).length > 0;
    });
  };

  // ── EXCEL / CSV UPLOAD ──
  const handleFile = async (file) => {
    if (!file) return;
    setStatus({ type:"loading", msg:"File parse ho raha hai..." });
    setPreview(null); setColMap({});
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      let rows = [];
      if (ext === "csv") {
        const text = await file.text();
        rows = parseCSV(text);
      } else {
        // Excel via SheetJS
        const buf = await file.arrayBuffer();
        const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
        const wb = XLSX.read(buf, { type:"array", cellDates:true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval:"", raw:false });
        rows = json;
      }
      if (!rows.length) { setStatus({ type:"error", msg:"File empty hai ya format sahi nahi." }); return; }
      const headers = Object.keys(rows[0]);
      // Auto-guess column mapping
      // Smart auto-guess column mapping
      const autoMap = {};
      const SCHEMA_TYPE = gsType;
      const FIELD_ALIASES = {
        policyNo:     ["policy no","policy no.","policy number","policyno","pol no","policy_no","policy id"],
        client:       ["name","client","customer","insured","policyholder","policy holder","assured","member"],
        contact:      ["contact no","contact no.","contact","phone","mobile","mob no","contact number","phone no"],
        department:   ["department","dept","product","cover","product type"],
        type:         ["insurance type","ins type"],
        effectiveDate:["effective date","effective dt","effective","start date","issue date","policy date","from date","inception date","commencement"],
        netPremium:   ["net prm","net prm.","net premium","net prem","basic premium","basic prm"],
        gst:          ["gst","tax","service tax","igst","cgst"],
        premium:      ["total premium","totalpremium","gross premium","total prm","total prm."],
        commisionable:["od/net prm. commisionable","commisionable","commissionable","od/net prm","od net prm"],
        income:       ["income%","income %","income","commission %","comm %","brokerage %","rate%"],
        status:       ["status","policy status","state"],
        expiry:       ["expiry date","expiry","expiry dt","maturity","end date","policy end","renewal date","due date"],
        risk:         ["risk","risk level","grade"],
        docLink:      ["policy link","policy_link","policylink","document link","doc link","link","url","policy url",
                       "soft copy","pdf link","download link","policy copy","policy document","doc","document",
                       "policy doc","file link","hyperlink","google drive","drive link","file","attachment","policy file"],
        name:         ["name","client","customer","insured"],
        email:        ["email","mail","e-mail","email id"],
        phone:        ["phone","mobile","mob"],
        city:         ["city","location","place","district"],
        policies:     ["policies","no of policies","policy count"],
        totalPremium: ["total premium","totalpremium","gross premium"],
        since:        ["since","joining year","member since"],
        amount:       ["amount","claim amount","loss amount","settled amount"],
        filed:        ["filed","claim date","filed date","reported date"],
        agent:        ["agent","rm","relationship manager","executive","sales person"],
        revenue:      ["revenue","business","premium (l)"],
        rating:       ["rating","score","stars"],
        target:       ["target","goal","monthly target"],
        commission:   ["commission","brokerage","earning","incentive"],
        date:         ["payment date","paid on","transaction date"],
        method:       ["method","mode","payment mode","pay mode","channel"],
      };
      Object.keys(SCHEMA[SCHEMA_TYPE].labels).forEach(field => {
        const aliases = FIELD_ALIASES[field] || [field];
        const guess = headers.find(h => {
          const hl = h.toLowerCase().replace(/[\s._\-\/]/g,"");
          return aliases.some(a => {
            const al = a.replace(/[\s._\-\/]/g,"");
            return hl === al || hl.includes(al) || al.includes(hl);
          });
        });
        if (guess) autoMap[field] = guess;
      });
      setColMap(autoMap);
      setRawParsed(rows);
      setPreview({ headers, rows: rows.slice(0,5), type: SCHEMA_TYPE });
      setStatus({ type:"success", msg:`✅ ${rows.length} rows milein. Column mapping check karo, phir "Import" karo.` });
    } catch(e) {
      setStatus({ type:"error", msg:"File parse nahi ho saka: " + e.message });
    }
  };

  const handleImportFile = () => {
    if (!rawParsed || !preview) return;
    const mapped = applyMapping(rawParsed, preview.type, colMap);
    if (!mapped.length) { setStatus({ type:"error", msg:"Koi valid row nahi mili mapping ke baad." }); return; }
    SETTERS[preview.type](mapped);
    setStatus({ type:"success", msg:`🎉 ${mapped.length} ${preview.type} successfully import ho gaye! Dashboard mein dekho.` });
    setPreview(null); setRawParsed(null);
  };

  // ── GOOGLE SHEETS ──
  const extractSheetId = (url) => {
    const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return m ? m[1] : null;
  };

  const extractGid = (url) => {
    const m = url.match(/[#&?]gid=([0-9]+)/);
    return m ? m[1] : "0";
  };

  const fetchGSheet = async (url, type) => {
    const id = extractSheetId(url);
    if (!id) { setStatus({ type:"error", msg:"Invalid Google Sheet URL. Sahi URL paste karo." }); return; }
    const gid = extractGid(url);
    setStatus({ type:"loading", msg:"Google Sheet fetch ho raha hai..." });
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("Sheet public nahi hai. File → Share → Anyone with link can view karo.");
      const text = await res.text();
      const rows = parseCSV(text);
      if (!rows.length) throw new Error("Sheet mein koi data nahi mila.");
      const headers = Object.keys(rows[0]);
      // Use same comprehensive aliases as file upload
      const autoMap = {};
      Object.keys(SCHEMA[type].labels).forEach(field => {
        const aliases = FIELD_ALIASES[field] || [field];
        const guess = headers.find(h => {
          const hl = h.toLowerCase().replace(/[\s._\-\/]/g,"");
          return aliases.some(a => {
            const al = a.replace(/[\s._\-\/]/g,"");
            return hl === al || hl.includes(al) || al.includes(hl);
          });
        });
        if (guess) autoMap[field] = guess;
      });
      setColMap(autoMap);
      setRawParsed(rows);
      setPreview({ headers, rows: rows.slice(0,5), type });
      setStatus({ type:"success", msg:`✅ ${rows.length} rows Google Sheet se aaye. Column mapping verify karo phir Import karo.` });
    } catch(e) {
      setStatus({ type:"error", msg:"Fetch failed: " + e.message });
    }
  };

  const handleImportGSheet = () => {
    if (!rawParsed || !preview) return;
    const mapped = applyMapping(rawParsed, preview.type, colMap);
    if (!mapped.length) { setStatus({ type:"error", msg:"Koi valid row nahi mili." }); return; }
    SETTERS[preview.type](mapped);
    setStatus({ type:"success", msg:`🎉 ${mapped.length} ${preview.type} Google Sheet se import ho gaye!` });
    setPreview(null); setRawParsed(null);
  };

  const startAutoSync = () => {
    if (!gsUrl || !extractSheetId(gsUrl)) { setStatus({ type:"error", msg:"Pehle valid Google Sheet URL dalo." }); return; }
    fetchGSheet(gsUrl, gsType);
    const id = setInterval(() => fetchGSheet(gsUrl, gsType), 5 * 60 * 1000);
    setSyncInterval(id);
    setAutoSync(true);
    setStatus({ type:"success", msg:"🔄 Auto-sync ON! Sheet har 5 minute mein automatically refresh hogi." });
  };
  const stopAutoSync = () => {
    clearInterval(syncInterval); setSyncInterval(null); setAutoSync(false);
    setStatus({ type:"success", msg:"⏹️ Auto-sync band ho gaya." });
  };

  useEffect(() => () => { if (syncInterval) clearInterval(syncInterval); }, [syncInterval]);

  const statusBg = { success:"rgba(52,211,153,0.1)", error:"rgba(248,113,113,0.1)", loading:"rgba(245,158,11,0.1)" };
  const statusCol = { success:"#34d399", error:"#f87171", loading:"#f59e0b" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,rgba(245,158,11,0.12),rgba(96,165,250,0.08))", border:`1px solid rgba(245,158,11,0.25)`, borderRadius:18, padding:"22px 24px" }}>
        <h2 style={{ color:t.text, fontWeight:800, fontSize:18, marginBottom:6 }}>📥 Data Import Center</h2>
        <p style={{ color:t.textMuted, fontSize:13, lineHeight:1.6 }}>
          Apni Excel/CSV files upload karo ya Google Sheet directly connect karo. Dashboard automatically data load karega aur save karega.
        </p>
      </div>

      {/* Tab Switcher */}
      <div style={{ display:"flex", gap:8 }}>
        {[["excel","📊 Excel / CSV Upload"],["gsheet","🔗 Google Sheet Live Sync"]].map(([v,l])=>(
          <button key={v} onClick={()=>{ setTab(v); setPreview(null); setStatus(null); setRawParsed(null); }}
            style={{ flex:1, border:tab===v?"none":`1px solid ${t.border}`, background:tab===v?"linear-gradient(135deg,#f59e0b,#ea580c)":"transparent", color:tab===v?"#000":t.textMuted, borderRadius:12, padding:"11px", fontSize:13, fontWeight:700, cursor:"pointer" }}>{l}</button>
        ))}
      </div>

      {/* Data Type Selector */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:20 }}>
        <p style={{ fontSize:12, fontWeight:700, color:t.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Kaunsa data import karna hai?</p>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {[["policies","📋 Policies"],["clients","👥 Clients"],["claims","🛡️ Claims"],["payments","💳 Payments"],["agents","🧑‍💼 Agents"]].map(([v,l])=>(
            <button key={v} onClick={()=>{ setGsType(v); setPreview(null); setColMap({}); setRawParsed(null); }}
              style={{ border:gsType===v?"none":`1px solid ${t.border}`, background:gsType===v?"rgba(245,158,11,0.2)":"transparent", color:gsType===v?"#f59e0b":t.textMuted, borderRadius:10, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer", border:gsType===v?"1px solid rgba(245,158,11,0.5)":`1px solid ${t.border}` }}>{l}</button>
          ))}
        </div>
      </div>

      {/* EXCEL TAB */}
      {tab==="excel" && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:20, display:"flex", flexDirection:"column", gap:16 }}>
          <div
            onClick={()=>fileRef.current?.click()}
            onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.borderColor="#f59e0b"; }}
            onDragLeave={e=>{ e.currentTarget.style.borderColor=t.border; }}
            onDrop={e=>{ e.preventDefault(); e.currentTarget.style.borderColor=t.border; handleFile(e.dataTransfer.files[0]); }}
            style={{ border:`2px dashed ${t.border}`, borderRadius:14, padding:"36px 20px", textAlign:"center", cursor:"pointer", transition:"border-color 0.2s" }}>
            <div style={{ fontSize:42, marginBottom:10 }}>📂</div>
            <p style={{ color:t.text, fontWeight:700, fontSize:14 }}>File yahan drop karo ya click karo</p>
            <p style={{ color:t.textMuted, fontSize:12, marginTop:4 }}>Excel (.xlsx, .xls) aur CSV (.csv) supported · Multiple sheets → pehli sheet load hogi</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])}/>
          </div>

          {/* Column Format Guide */}
          <div style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:12, padding:16 }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#f59e0b", marginBottom:10 }}>📋 {gsType.toUpperCase()} — Expected Columns:</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {Object.entries(SCHEMA[gsType].labels).map(([field, desc])=>(
                <span key={field} style={{ background: field==="docLink"?"rgba(96,165,250,0.15)":"rgba(245,158,11,0.1)", border: field==="docLink"?"1px solid rgba(96,165,250,0.4)":"1px solid rgba(245,158,11,0.25)", borderRadius:6, padding:"3px 8px", fontSize:11, color: field==="docLink"?"#60a5fa":"#f59e0b" }}>{desc}</span>
              ))}
            </div>
          </div>

          {/* Policy Link Special Guide */}
          {gsType==="policies" && (
            <div style={{ background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.3)", borderRadius:12, padding:16 }}>
              <p style={{ fontSize:13, fontWeight:700, color:"#60a5fa", marginBottom:10 }}>📎 Policy Document Link — Excel mein kaise add karein?</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { step:"1", text:'Excel mein ek nayi column banao — naam rakho: "Policy Link" ya "Link" ya "URL"' },
                  { step:"2", text:"Har row mein us policy ka Google Drive / OneDrive / Dropbox link paste karo" },
                  { step:"3", text:"Google Drive link ke liye: File → Share → Copy Link (Anyone with link can view)" },
                  { step:"4", text:"File upload karo — column auto-detect ho jaayega! Dashboard mein 📄 View button ban jaayega" },
                ].map(({step,text})=>(
                  <div key={step} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <div style={{ width:20, height:20, borderRadius:"50%", background:"rgba(96,165,250,0.2)", border:"1px solid rgba(96,165,250,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#60a5fa", flexShrink:0 }}>{step}</div>
                    <p style={{ fontSize:12, color:t.textMuted, lineHeight:1.5 }}>{text}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12, background:"rgba(96,165,250,0.1)", borderRadius:8, padding:"8px 12px" }}>
                <p style={{ fontSize:11, color:"#60a5fa", fontWeight:600 }}>✅ Auto-detect hone wale column names:</p>
                <p style={{ fontSize:11, color:t.textMuted, marginTop:3 }}>"Policy Link" · "Link" · "URL" · "Policy URL" · "Document Link" · "Doc Link" · "Soft Copy" · "PDF Link" · "Drive Link" · "Policy Document" · "File"</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GOOGLE SHEET TAB */}
      {tab==="gsheet" && (
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:20, display:"flex", flexDirection:"column", gap:16 }}>

          {/* Step by step */}
          <div style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:12, padding:16 }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#60a5fa", marginBottom:10 }}>📖 Google Sheet Setup (Ek baar karo):</p>
            {["Google Sheet kholo → File → Share → Publish to Web",
              "Format: CSV select karo → Publish karo",
              "Ya sirf: Share → Anyone with link → Viewer",
              "Phir sheet ka URL neeche paste karo ↓"
            ].map((step,i)=>(
              <div key={i} style={{ display:"flex", gap:10, marginBottom:6, alignItems:"flex-start" }}>
                <div style={{ width:20, height:20, borderRadius:"50%", background:"rgba(96,165,250,0.2)", border:"1px solid rgba(96,165,250,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#60a5fa", flexShrink:0 }}>{i+1}</div>
                <p style={{ fontSize:12, color:t.textMuted, lineHeight:1.5 }}>{step}</p>
              </div>
            ))}
          </div>

          <div>
            <label style={{ fontSize:11, fontWeight:700, color:t.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Google Sheet URL</label>
            <div style={{ display:"flex", gap:8 }}>
              <input value={gsUrl} onChange={e=>setGsUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..."
                style={{ flex:1, background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:10, padding:"10px 14px", fontSize:13, color:t.text, outline:"none" }}/>
              <button onClick={()=>fetchGSheet(gsUrl, gsType)}
                style={{ background:"linear-gradient(135deg,#60a5fa,#3b82f6)", border:"none", borderRadius:10, padding:"10px 18px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
                🔄 Fetch Now
              </button>
            </div>
          </div>

          {/* Auto Sync */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background: autoSync?"rgba(52,211,153,0.08)":"rgba(255,255,255,0.03)", border:`1px solid ${autoSync?"rgba(52,211,153,0.3)":t.border}`, borderRadius:12, padding:"14px 18px" }}>
            <div>
              <p style={{ fontWeight:700, fontSize:13, color:t.text }}>🔄 Auto-Sync (har 5 min)</p>
              <p style={{ fontSize:11, color:t.textMuted, marginTop:2 }}>Sheet mein koi bhi change hoga toh dashboard automatically update ho jaayega</p>
            </div>
            <button onClick={autoSync?stopAutoSync:startAutoSync}
              style={{ background:autoSync?"#f87171":"linear-gradient(135deg,#34d399,#059669)", border:"none", borderRadius:10, padding:"8px 18px", color:autoSync?"#fff":"#000", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
              {autoSync?"⏹️ Stop Sync":"▶️ Start Auto-Sync"}
            </button>
          </div>

          {autoSync && (
            <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.25)", borderRadius:10, padding:"10px 14px" }}>
              <div style={{ width:8, height:8, borderRadius:99, background:"#34d399", animation:"pulse 2s infinite" }}/>
              <span style={{ fontSize:12, color:"#34d399", fontWeight:600 }}>Live sync chal raha hai — har 5 minute mein refresh hoga</span>
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
            </div>
          )}
        </div>
      )}

      {/* Status Message */}
      {status && (
        <div style={{ background:statusBg[status.type], border:`1px solid ${statusCol[status.type]}40`, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
          {status.type==="loading" && <div style={{ width:16, height:16, border:"2px solid #f59e0b", borderTop:"2px solid transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", flexShrink:0 }}/>}
          <p style={{ fontSize:13, color:statusCol[status.type], fontWeight:500 }}>{status.msg}</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Preview + Column Mapping */}
      {preview && (
        <div style={{ background:t.surface, border:`1px solid rgba(245,158,11,0.3)`, borderRadius:16, padding:20, display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <p style={{ fontWeight:700, fontSize:14, color:t.text }}>🗺️ Column Mapping — "{preview.type}"</p>
            <span style={{ fontSize:11, color:t.textMuted }}>{rawParsed?.length} total rows</span>
          </div>
          <p style={{ fontSize:12, color:t.textMuted, marginTop:-8 }}>File ke columns ko dashboard ke fields se match karo. Auto-detect kiya hai — verify karo.</p>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {Object.entries(SCHEMA[preview.type].labels).map(([field, label])=>(
              <div key={field}>
                <label style={{ fontSize:11, fontWeight:600, color:t.textMuted, display:"block", marginBottom:4 }}>{label}</label>
                <select value={colMap[field]||""} onChange={e=>setColMap(p=>({...p,[field]:e.target.value}))}
                  style={{ width:"100%", background:t.input, border:`1px solid ${colMap[field]?"rgba(245,158,11,0.5)":t.inputBorder}`, borderRadius:8, padding:"7px 10px", fontSize:12, color:t.text, outline:"none" }}>
                  <option value="">— Select Column —</option>
                  {preview.headers.map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Data Preview Table */}
          <div>
            <p style={{ fontSize:12, fontWeight:700, color:t.textMuted, marginBottom:8 }}>Preview (first 5 rows):</p>
            <div style={{ overflowX:"auto", borderRadius:10, border:`1px solid ${t.border}` }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ background:t.inputBg }}>
                    {preview.headers.map(h=><th key={h} style={{ padding:"8px 12px", textAlign:"left", color:t.textMuted, fontWeight:600, whiteSpace:"nowrap", borderBottom:`1px solid ${t.border}` }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${t.border}` }}>
                      {preview.headers.map(h=><td key={h} style={{ padding:"7px 12px", color:t.text, whiteSpace:"nowrap", maxWidth:150, overflow:"hidden", textOverflow:"ellipsis" }}>{String(row[h]||"")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={tab==="excel"?handleImportFile:handleImportGSheet}
            style={{ background:"linear-gradient(135deg,#f59e0b,#ea580c)", border:"none", borderRadius:12, padding:"13px", fontSize:14, fontWeight:800, color:"#000", cursor:"pointer" }}>
            ✅ Import {rawParsed?.length} Rows into Dashboard
          </button>
        </div>
      )}

      {/* Template Download */}
      <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:20 }}>
        <p style={{ fontWeight:700, fontSize:14, color:t.text, marginBottom:4 }}>📋 CSV Template Download</p>
        <p style={{ fontSize:12, color:t.textMuted, marginBottom:14 }}>Agar naya data enter karna hai toh yeh templates use karo — seedha fill karo aur upload karo.</p>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {[
            ["policies","📋 Policies Template","client,type,premium,status,expiry,risk\nRahul Sharma,Health,18500,Active,2026-12-31,Low"],
            ["clients","👥 Clients Template","name,email,phone,city,policies,totalPremium,since\nRahul Sharma,rahul@email.com,9876543210,Mumbai,2,40000,2021"],
            ["claims","🛡️ Claims Template","client,type,amount,filed,status,agent\nRahul Sharma,Health,50000,2026-04-01,In Review,Agent Name"],
            ["payments","💳 Payments Template","client,amount,type,date,status,method\nRahul Sharma,18500,Health Premium,2026-04-01,Paid,UPI"],
            ["agents","🧑‍💼 Agents Template","name,region,policiesSold,revenue,rating,target,commission,claimsHandled\nDeepak Verma,North,87,18.4,4.8,92,92000,34"],
          ].map(([type, label, csv])=>(
            <button key={type} onClick={()=>exportCSV([Object.fromEntries(csv.split("\n")[0].split(",").map((h,i)=>[h,csv.split("\n")[1]?.split(",")[i]||""]))], `${type}_template.csv`)}
              style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:10, padding:"8px 14px", fontSize:12, color:t.textMuted, cursor:"pointer", fontWeight:600 }}>⬇️ {label}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── NAV ───────────────────────────────────────────────────────────────────────
const NAV=[
  {id:"overview",label:"Overview",icon:"⚡"},
  {id:"policies",label:"Policies",icon:"📋"},
  {id:"claims",label:"Claims",icon:"🛡️"},
  {id:"clients",label:"Clients",icon:"👥"},
  {id:"payments",label:"Payments",icon:"💳"},
  {id:"agents",label:"Agents",icon:"🧑‍💼"},
  {id:"analytics",label:"Analytics",icon:"📊"},
  {id:"regions",label:"Region Map",icon:"🗺️"},
  {id:"calendar",label:"Calendar",icon:"📅"},
  {id:"calculator",label:"Premium Calc",icon:"🧮"},
  {id:"import",label:"Import Data",icon:"📥"},
  {id:"users",label:"Users",icon:"🔐"},
  {id:"ai",label:"AI Assistant",icon:"🤖"},
  {id:"notifications",label:"Notifications",icon:"🔔"},
];

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function InsuranceDashboard() {
  const [active, setActive] = useState("overview");
  const [dark, setDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showFAB, setShowFAB] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // ── SESSION ──
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("atrav:session") || "null"); } catch { return null; }
  });
  const handleLogin = (sess) => setSession(sess);
  const handleLogout = async () => {
    try { if (fbAuth && session?.provider==="google") await fbSignOut(fbAuth); } catch {}
    localStorage.removeItem("atrav:session");
    setSession(null);
  };
  const isAdmin = session?.role === "admin";
  const isViewer = session?.role === "viewer";
  const firebaseUid = session?.uid || null; // Google users have uid

  // Show login if not authenticated
  if (!session) return <LoginPage onLogin={handleLogin}/>;

  // ── PERSISTENT DATA (synced to Firestore for Google users) ──
  const [notifications, setNotificationsRaw, notifLoaded] = usePersistedState("atrav:notifications", NOTIFICATIONS_INIT, firebaseUid);
  const [polData, setPolDataRaw, polLoaded]       = usePersistedState("atrav:policies",      INIT_POLICIES,   firebaseUid);
  const [clientData, setClientDataRaw, clientLoaded] = usePersistedState("atrav:clients",    INIT_CLIENTS,    firebaseUid);
  const [claimData, setClaimDataRaw, claimLoaded] = usePersistedState("atrav:claims",        INIT_CLAIMS,     firebaseUid);
  const [agentData, setAgentDataRaw, agentLoaded] = usePersistedState("atrav:agents",        INIT_AGENTS,     firebaseUid);
  const [payData, setPayDataRaw, payLoaded]       = usePersistedState("atrav:payments",      INIT_PAYMENTS,   firebaseUid);

  const allLoaded = notifLoaded && polLoaded && clientLoaded && claimLoaded && agentLoaded && payLoaded;

  // Wrap setters to show save indicator
  const withSave = (setter) => (val) => {
    setter(val);
    setSaveStatus("saving");
    setTimeout(() => setSaveStatus("saved"), 600);
    setTimeout(() => setSaveStatus(null), 2200);
  };
  const setNotifications = withSave(setNotificationsRaw);
  const setPolData       = withSave(setPolDataRaw);
  const setClientData    = withSave(setClientDataRaw);
  const setClaimData     = withSave(setClaimDataRaw);
  const setAgentData     = withSave(setAgentDataRaw);
  const setPayData       = withSave(setPayDataRaw);

  const resetAllData = async () => {
    setPolDataRaw(INIT_POLICIES);
    setClientDataRaw(INIT_CLIENTS);
    setClaimDataRaw(INIT_CLAIMS);
    setAgentDataRaw(INIT_AGENTS);
    setPayDataRaw(INIT_PAYMENTS);
    setNotificationsRaw(NOTIFICATIONS_INIT);
    setShowResetConfirm(false);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const t = getTheme(dark);
  const unread = notifications.filter(n=>!n.read).length;

  // Keyboard shortcut for search
  useEffect(()=>{
    const handler=(e)=>{ if((e.ctrlKey||e.metaKey)&&e.key==="k"){ e.preventDefault(); setShowSearch(true); } if(e.key==="Escape"){ setShowSearch(false); setShowResetConfirm(false); } };
    window.addEventListener("keydown",handler);
    return ()=>window.removeEventListener("keydown",handler);
  },[]);

  // Loading screen
  if (!allLoaded) {
    return (
      <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#080d16", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
        <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#f59e0b,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:22, color:"#000" }}>A</div>
        <div style={{ textAlign:"center" }}>
          <p style={{ color:"#e2e8f0", fontWeight:700, fontSize:18 }}>ATRAV Insurance Suite</p>
          <p style={{ color:"#94a3b8", fontSize:13, marginTop:6 }}>Loading your data...</p>
        </div>
        <div style={{ width:200, height:3, background:"rgba(255,255,255,0.1)", borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", background:"linear-gradient(90deg,#f59e0b,#ea580c)", borderRadius:99, animation:"loadbar 1.2s ease infinite" }}/>
        </div>
        <style>{`@keyframes loadbar{0%{width:0%}100%{width:100%}}`}</style>
      </div>
    );
  }

  const pages = {
    overview: <Overview t={t} polData={polData} clientData={clientData} claimData={claimData} payData={payData}/>,
    policies: <PoliciesPage t={t} data={polData} setData={setPolData}/>,
    claims: <ClaimsPage t={t} data={claimData} setData={setClaimData}/>,
    clients: <ClientsPage t={t} data={clientData} setData={setClientData}/>,
    payments: <PaymentsPage t={t} data={payData} setData={setPayData}/>,
    agents: <AgentsPage t={t} data={agentData} setData={setAgentData}/>,
    analytics: <AnalyticsPage t={t} polData={polData} payData={payData}/>,
    regions: <RegionPage t={t} polData={polData}/>,
    calendar: <CalendarPage t={t}/>,
    calculator: <Calculator t={t}/>,
    import: <ImportPage t={t} setPolData={setPolData} setClientData={setClientData} setClaimData={setClaimData} setAgentData={setAgentData} setPayData={setPayData}/>,
    users: <UserManagement t={t} currentUser={session}/>,
    ai: <AIPage t={t}/>,
    notifications: <NotificationsPage t={t} notifications={notifications} setNotifications={setNotifications}/>,
  };

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:t.bg, minHeight:"100vh", color:t.text, transition:"background 0.3s", display:"flex", position:"relative" }}>
      {/* Sidebar */}
      <aside style={{ width:sidebarOpen?220:0, minWidth:sidebarOpen?220:0, background:t.sidebar, borderRight:`1px solid ${t.sidebarBorder}`, height:"100vh", position:"sticky", top:0, overflowY:"auto", overflowX:"hidden", transition:"all 0.25s", flexShrink:0, display:"flex", flexDirection:"column" }}>
        <div style={{ borderBottom:`1px solid ${t.sidebarBorder}`, padding:"20px 18px", whiteSpace:"nowrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#f59e0b,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:14, color:"#000", flexShrink:0 }}>A</div>
            <div><p style={{ fontWeight:800, fontSize:14, color:t.text }}>ATRAV</p><p style={{ fontSize:10, color:t.textMuted }}>Insurance Suite</p></div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"12px 8px", display:"flex", flexDirection:"column", gap:2 }}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>{ setActive(n.id); if(window.innerWidth<768) setSidebarOpen(false); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:12, fontSize:13, textAlign:"left", cursor:"pointer", background:active===n.id?"rgba(245,158,11,0.12)":"transparent", border:`1px solid ${active===n.id?"rgba(245,158,11,0.25)":"transparent"}`, color:active===n.id?"#f59e0b":t.textMuted, fontWeight:active===n.id?700:400, transition:"all 0.15s", whiteSpace:"nowrap", position:"relative" }}>
              <span style={{ fontSize:15 }}>{n.icon}</span>
              <span style={{ flex:1 }}>{n.label}</span>
              {n.id==="notifications"&&unread>0&&<span style={{ background:"#f87171", color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, minWidth:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>{unread}</span>}
            </button>
          ))}
        </nav>
        <div style={{ borderTop:`1px solid ${t.sidebarBorder}`, padding:"12px 14px", whiteSpace:"nowrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            {session.photoURL
              ? <img src={session.photoURL} referrerPolicy="no-referrer" style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, objectFit:"cover" }} alt="avatar"/>
              : <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#f59e0b,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#000", flexShrink:0 }}>{(session.name||"A")[0].toUpperCase()}</div>
            }
            <div style={{ minWidth:0, overflow:"hidden" }}>
              <p style={{ fontSize:12, fontWeight:700, color:t.text, overflow:"hidden", textOverflow:"ellipsis" }}>{session.name||"Admin"}</p>
              <p style={{ fontSize:10, color:t.textMuted }}>{session.role} · {session.provider==="google"?"🌐 Google":"🔐 Local"}</p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 8px", borderRadius:8, background: session.provider==="google"?"rgba(96,165,250,0.08)":"rgba(52,211,153,0.08)", border:`1px solid ${session.provider==="google"?"rgba(96,165,250,0.2)":"rgba(52,211,153,0.2)"}`, marginBottom:6 }}>
            <div style={{ width:6, height:6, borderRadius:99, background: session.provider==="google"?"#60a5fa":"#34d399", animation: session.provider==="google"?"pulse 2s infinite":"none", flexShrink:0 }}/>
            <span style={{ fontSize:10, color: session.provider==="google"?"#60a5fa":"#34d399", fontWeight:600 }}>
              {session.provider==="google" ? "☁️ Cloud Sync Active" : "💾 Local Saved ✓"}
            </span>
          </div>
          {saveStatus&&<div style={{ fontSize:10, color:saveStatus==="saving"?"#f59e0b":"#34d399", marginBottom:6, textAlign:"center", fontWeight:600 }}>{saveStatus==="saving"?"💾 Saving...":"✅ Saved!"}</div>}
          {isAdmin&&<button onClick={()=>setShowResetConfirm(true)} style={{ width:"100%", marginBottom:6, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:8, padding:"5px 10px", fontSize:11, color:"#f87171", cursor:"pointer", fontWeight:600 }}>🔄 Reset Data</button>}
          <button onClick={handleLogout} style={{ width:"100%", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:8, padding:"7px 10px", fontSize:12, color:"#f87171", cursor:"pointer", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>🚪 Logout</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>
        {/* Header */}
        <header style={{ borderBottom:`1px solid ${t.border}`, background:t.header, position:"sticky", top:0, zIndex:100, padding:"12px 20px", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <button onClick={()=>setSidebarOpen(p=>!p)} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, width:34, height:34, cursor:"pointer", color:t.text, fontSize:16, flexShrink:0 }}>☰</button>
          <div style={{ flex:1, minWidth:0 }}>
            <h1 style={{ fontWeight:700, fontSize:16, color:t.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{NAV.find(n=>n.id===active)?.icon} {NAV.find(n=>n.id===active)?.label}</h1>
            <p style={{ fontSize:10, color:t.textMuted }}>ATRAV Insurance · May 2, 2026</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <button onClick={()=>setShowSearch(true)} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:10, padding:"7px 12px", fontSize:12, color:t.textMuted, display:"flex", alignItems:"center", gap:6, cursor:"pointer", whiteSpace:"nowrap" }}>
              🔍 <span style={{ opacity:0.7 }}>Search</span><span style={{ fontSize:10, opacity:0.5 }}>⌘K</span>
            </button>
            {saveStatus && (
              <div style={{ display:"flex", alignItems:"center", gap:5, background:saveStatus==="saved"?"rgba(52,211,153,0.15)":"rgba(245,158,11,0.15)", border:`1px solid ${saveStatus==="saved"?"rgba(52,211,153,0.3)":"rgba(245,158,11,0.3)"}`, borderRadius:8, padding:"5px 10px", fontSize:11, fontWeight:600, color:saveStatus==="saved"?"#34d399":"#f59e0b", transition:"all 0.3s" }}>
                {saveStatus==="saving"?"💾 Saving...":"✅ Saved"}
              </div>
            )}
            <button onClick={()=>setActive("notifications")} style={{ width:34, height:34, borderRadius:10, background:"rgba(248,113,113,0.15)", border:"1px solid rgba(248,113,113,0.3)", cursor:"pointer", position:"relative", fontSize:16 }}>
              🔔{unread>0&&<span style={{ position:"absolute", top:-4, right:-4, background:"#f87171", color:"#fff", borderRadius:99, fontSize:8, fontWeight:800, minWidth:15, height:15, display:"flex", alignItems:"center", justifyContent:"center" }}>{unread}</span>}
            </button>
            <button onClick={()=>setDark(p=>!p)} style={{ width:34, height:34, borderRadius:10, background:dark?"rgba(251,191,36,0.15)":"rgba(100,116,139,0.15)", border:`1px solid ${dark?"rgba(251,191,36,0.3)":"rgba(100,116,139,0.3)"}`, cursor:"pointer", fontSize:16 }}>{dark?"☀️":"🌙"}</button>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"22px 22px" }}>
          {pages[active]}
        </div>
      </main>

      {/* Global Search Modal */}
      {showSearch&&<GlobalSearch t={t} polData={polData} clientData={clientData} claimData={claimData} payData={payData} setActive={setActive} onClose={()=>setShowSearch(false)}/>}

      {/* Reset Confirm Modal */}
      {showResetConfirm&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setShowResetConfirm(false)}>
          <div style={{ background:t.modal, border:`1px solid ${t.border}`, borderRadius:20, padding:28, maxWidth:400, width:"90%", textAlign:"center" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
            <p style={{ fontWeight:700, fontSize:16, color:t.text, marginBottom:8 }}>Reset All Data?</p>
            <p style={{ fontSize:13, color:t.textMuted, marginBottom:24, lineHeight:1.6 }}>Sab data — policies, clients, claims, payments, agents — default sample data se replace ho jayega. Yeh action undo nahi ho sakta.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <button onClick={()=>setShowResetConfirm(false)} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:10, padding:"9px 20px", fontSize:13, color:t.text, cursor:"pointer", fontWeight:600 }}>Cancel</button>
              <button onClick={resetAllData} style={{ background:"linear-gradient(135deg,#f87171,#dc2626)", border:"none", borderRadius:10, padding:"9px 20px", fontSize:13, color:"#fff", cursor:"pointer", fontWeight:700 }}>Yes, Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <div style={{ position:"fixed", bottom:22, right:22, zIndex:150 }}>
        {showFAB&&(
          <div style={{ marginBottom:10, display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
            {[
              {label:"+ New Policy",color:"#f59e0b",nav:"policies"},
              {label:"+ Add Client",color:"#60a5fa",nav:"clients"},
              {label:"+ File Claim",color:"#34d399",nav:"claims"},
              {label:"🧮 Calculator",color:"#a78bfa",nav:"calculator"},
              {label:"🤖 Ask AI",color:"#fb923c",nav:"ai"},
            ].map(item=>(
              <button key={item.label} onClick={()=>{ setActive(item.nav); setShowFAB(false); }}
                style={{ background:item.color, color:"#000", border:"none", borderRadius:20, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 16px ${item.color}60`, whiteSpace:"nowrap" }}>{item.label}</button>
            ))}
          </div>
        )}
        <button onClick={()=>setShowFAB(p=>!p)}
          style={{ width:50, height:50, borderRadius:"50%", background:"linear-gradient(135deg,#f59e0b,#ea580c)", border:"none", cursor:"pointer", fontSize:22, boxShadow:"0 6px 20px rgba(245,158,11,0.5)", transition:"transform 0.2s", transform:showFAB?"rotate(45deg)":"rotate(0deg)" }}>+</button>
      </div>
    </div>
  );
}
