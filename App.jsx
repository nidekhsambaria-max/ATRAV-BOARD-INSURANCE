import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut
} from "firebase/auth";
import {
  getFirestore, doc, getDoc, setDoc, collection,
  writeBatch, getDocs, deleteDoc
} from "firebase/firestore";

// ── FIREBASE ──────────────────────────────────────────────────────────────────
const FB = {
  apiKey:  "AIzaSyClC3Sr9PPauLP82DtaPoYA0upxvbgLRWU"          import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};
let fbApp, fbAuth, fbDb, gProvider;
try {
  fbApp    = initializeApp(FB);
  fbAuth   = getAuth(fbApp);
  fbDb     = getFirestore(fbApp);
  gProvider = new GoogleAuthProvider();
} catch(e) { console.warn("Firebase init:", e); }

// ── FIRESTORE HELPERS ─────────────────────────────────────────────────────────
const FS_BATCH_SIZE = 400; // Firestore batch limit is 500, keep margin

const fsLoad = async (uid, collName) => {
  if (!fbDb || !uid) return null;
  try {
    const snap = await getDocs(collection(fbDb, "users", uid, collName));
    return snap.docs.map(d => ({ ...d.data(), _fsId: d.id }));
  } catch(e) { console.warn("Firestore load:", e); return null; }
};

const fsSaveAll = async (uid, collName, rows) => {
  if (!fbDb || !uid) return false;
  try {
    // Delete existing docs first in batches
    const existing = await getDocs(collection(fbDb, "users", uid, collName));
    const delBatches = [];
    let b = writeBatch(fbDb); let cnt = 0;
    existing.docs.forEach(d => {
      b.delete(d.ref); cnt++;
      if (cnt >= FS_BATCH_SIZE) { delBatches.push(b.commit()); b = writeBatch(fbDb); cnt = 0; }
    });
    if (cnt > 0) delBatches.push(b.commit());
    await Promise.all(delBatches);

    // Write new docs in batches
    const writeBatches = [];
    let wb = writeBatch(fbDb); let wCnt = 0;
    rows.forEach((row, i) => {
      const ref = doc(collection(fbDb, "users", uid, collName));
      const clean = Object.fromEntries(Object.entries(row).filter(([k]) => k !== "_fsId"));
      wb.set(ref, clean); wCnt++;
      if (wCnt >= FS_BATCH_SIZE) { writeBatches.push(wb.commit()); wb = writeBatch(fbDb); wCnt = 0; }
    });
    if (wCnt > 0) writeBatches.push(wb.commit());
    await Promise.all(writeBatches);
    return true;
  } catch(e) { console.warn("Firestore save:", e); return false; }
};

// ── THEME ─────────────────────────────────────────────────────────────────────
const T = (dark) => ({
  bg:     dark ? "#0a0f1e" : "#f1f5f9",
  card:   dark ? "rgba(255,255,255,0.04)" : "#ffffff",
  border: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
  text:   dark ? "#e2e8f0" : "#1e293b",
  muted:  dark ? "#94a3b8" : "#64748b",
  input:  dark ? "rgba(255,255,255,0.07)" : "#f8fafc",
  inputB: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
  sidebar:dark ? "#080d1a" : "#ffffff",
  header: dark ? "rgba(8,13,26,0.92)" : "rgba(241,245,249,0.95)",
});

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmtINR = (n) => n ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
const fmtL   = (n) => n ? `₹${(Number(n)/100000).toFixed(1)}L` : "—";
const daysLeft = (d) => {
  if (!d) return 9999;
  return Math.ceil((new Date(d+"T00:00:00") - new Date()) / 86400000);
};

const normDate = (v) => {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{4}$/.test(s)) {
    const [a,b,y] = s.split(/[\/\.\-]/);
    return `${y}-${b.padStart(2,"0")}-${a.padStart(2,"0")}`;
  }
  if (/^\d{5}$/.test(s)) {
    const d = new Date((+s-25569)*86400*1000);
    return isNaN(d)?"":`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  try { const d=new Date(s); return isNaN(d)?"":d.toISOString().slice(0,10); } catch { return ""; }
};

const ddmm = (v) => {
  const s = normDate(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const[y,m,d]=s.split("-"); return `${d}/${m}/${y}`; }
  return v||"—";
};

const parseCSV = (txt) => {
  const lines = txt.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length<2) return [];
  const headers = lines[0].split(",").map(h=>h.replace(/^"|"$/g,"").trim());
  return lines.slice(1).map(line => {
    const vals=[]; let cur=""; let inQ=false;
    for(let i=0;i<line.length;i++){
      if(line[i]==='"'){inQ=!inQ;continue;}
      if(line[i]===","&&!inQ){vals.push(cur.trim());cur="";continue;}
      cur+=line[i];
    }
    vals.push(cur.trim());
    const obj={};
    headers.forEach((h,i)=>obj[h]=(vals[i]||"").replace(/^"|"$/g,"").trim());
    return obj;
  }).filter(r=>Object.values(r).some(v=>v));
};

const hashPw = async (pw) => {
  const buf = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
};

const exportCSV = (rows,name) => {
  if(!rows.length) return;
  const keys=Object.keys(rows[0]).filter(k=>k!=="id"&&k!=="_fsId");
  const csv=[keys.join(","),...rows.map(r=>keys.map(k=>`"${r[k]??""}`).join(","))].join("\n");
  const a=Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([csv],{type:"text/csv"})),download:name});
  a.click();URL.revokeObjectURL(a.href);
};

const ls = {
  get:(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}},
};

// ── COLUMN ALIASES ────────────────────────────────────────────────────────────
const ALIASES = {
  policyNo:     ["policy no","policy no.","policy number","policyno","pol no"],
  client:       ["name","client","customer","insured","policyholder","assured","member"],
  contact:      ["contact no","contact no.","contact","phone","mobile","mob"],
  department:   ["department","dept","product","cover"],
  effectiveDate:["effective date","effective dt","start date","issue date","policy date","from date","inception","effective"],
  netPremium:   ["net prm","net prm.","net premium","basic premium","od premium"],
  gst:          ["gst","tax","igst"],
  premium:      ["total premium","totalpremium","gross premium","total prm","grand total"],
  income:       ["income%","income %","income","commission %","comm %","rate%"],
  status:       ["status","policy status"],
  expiry:       ["expiry date","expiry","maturity","end date","renewal date","due date","valid till","expiry dt"],
  docLink:      ["policy link","link","url","soft copy","pdf link","doc link","policy document"],
};

const detectCols = (headers) => {
  const map={};
  Object.entries(ALIASES).forEach(([field,aliases])=>{
    const found=headers.find(h=>{
      const hl=h.toLowerCase().replace(/[\s._\-\/]/g,"");
      return aliases.some(a=>{const al=a.replace(/[\s._\-\/]/g,"");return hl===al||hl.includes(al)||al.includes(hl);});
    });
    if(found) map[field]=found;
  });
  return map;
};

const typeFromDept = (dept) => {
  const v=(dept||"").toUpperCase();
  if(v.includes("TW")||v.includes("CAR")||v.includes("PVT")||v.includes("BUS")||v.includes("TRUCK")||v.includes("BIKE")||v.includes("VEHICLE")) return "Car";
  if(v.includes("MEDI")||v.includes("HEALTH")||v.includes("PA ")) return "Health";
  if(v.includes("LIFE")||v.includes("TERM")||v.includes("LIC")) return "Life";
  if(v.includes("FIRE")||v.includes("HOME")||v.includes("SHOP")) return "Home";
  return dept||"";
};

const normStatus = (v) => {
  const s=(v||"").toLowerCase();
  if(s.includes("active")||s==="1"||s==="yes") return "Active";
  if(s.includes("renew")||s.includes("due")) return "Renewal Due";
  if(s.includes("lapse")||s.includes("cancel")||s.includes("expir")) return "Lapsed";
  return v||"Active";
};

const mapRows = (rows, colMap) => rows.map((row,i)=>{
  const g=(f)=>colMap[f]?String(row[colMap[f]]||"").trim():"";
  const dept=g("department");
  return {
    id: "P-"+Date.now()+"-"+i,
    policyNo:     g("policyNo"),
    client:       g("client"),
    contact:      g("contact"),
    department:   dept,
    type:         typeFromDept(dept),
    effectiveDate:normDate(g("effectiveDate")),
    expiry:       normDate(g("expiry")),
    netPremium:   Number(g("netPremium").replace(/[₹,\s]/g,""))||0,
    gst:          Number(g("gst").replace(/[₹,\s]/g,""))||0,
    premium:      Number(g("premium").replace(/[₹,\s]/g,""))||0,
    income:       parseFloat(g("income").replace(/[%\s]/g,""))||0,
    status:       normStatus(g("status")),
    docLink:      g("docLink"),
  };
}).filter(r=>r.client||r.policyNo);

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
const Badge = ({label,col="#60a5fa"})=>(
  <span style={{background:`${col}18`,border:`1px solid ${col}40`,borderRadius:99,padding:"2px 9px",fontSize:11,fontWeight:700,color:col,whiteSpace:"nowrap"}}>{label}</span>
);

const statusBadge=(s)=>{
  if(!s) return <Badge label="—"/>;
  const v=s.toLowerCase();
  if(v.includes("active")) return <Badge label={s} col="#34d399"/>;
  if(v.includes("renew"))  return <Badge label={s} col="#f59e0b"/>;
  if(v.includes("lapse")||v.includes("expir")) return <Badge label={s} col="#f87171"/>;
  return <Badge label={s}/>;
};

const Stat=({label,value,icon,sub,col="#f59e0b",t})=>(
  <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:"18px 20px",display:"flex",flexDirection:"column",gap:8}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:22}}>{icon}</span>
      {sub&&<span style={{fontSize:10,fontWeight:700,color:col,background:`${col}18`,border:`1px solid ${col}30`,borderRadius:99,padding:"2px 8px"}}>{sub}</span>}
    </div>
    <p style={{fontSize:22,fontWeight:800,color:t.text,letterSpacing:"-0.5px",margin:0}}>{value}</p>
    <p style={{fontSize:11,color:t.muted,margin:0}}>{label}</p>
  </div>
);

const Field=({label,value,onChange,type="text",opts,t,required})=>(
  <div style={{marginBottom:14}}>
    <label style={{display:"block",fontSize:10,fontWeight:700,color:t.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}{required?" *":""}</label>
    {opts
      ?<select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",background:t.input,border:`1px solid ${t.inputB}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:t.text,outline:"none"}}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>
      :<input type={type} value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",background:t.input,border:`1px solid ${t.inputB}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:t.text,outline:"none",boxSizing:"border-box"}}/>
    }
  </div>
);

const Modal=({title,onClose,children,t})=>(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div style={{background:t.sidebar,border:`1px solid ${t.border}`,borderRadius:20,padding:28,width:"100%",maxWidth:540,maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontWeight:700,fontSize:16,color:t.text,margin:0}}>{title}</h2>
        <button onClick={onClose} style={{background:t.input,border:`1px solid ${t.border}`,borderRadius:8,width:30,height:30,cursor:"pointer",color:t.muted,fontSize:18}}>×</button>
      </div>
      {children}
    </div>
  </div>
);

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const LoginPage=({onLogin})=>{
  const [user,setUser]=useState("admin");
  const [pass,setPass]=useState("");
  const [show,setShow]=useState(false);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [gLoad,setGLoad]=useState(false);

  const doLogin=async()=>{
    if(!user||!pass){setErr("Dono fields fill karo.");return;}
    setLoading(true);setErr("");
    const hash=await hashPw(pass);
    let users=ls.get("atrav:users",[]);
    if(!users.length){const dh=await hashPw("admin123");users=[{id:"u1",username:"admin",name:"Admin",hash:dh}];ls.set("atrav:users",users);}
    const found=users.find(u=>u.username===user.toLowerCase()&&u.hash===hash);
    if(found){const s={id:found.id,name:found.name,username:found.username,provider:"local",at:Date.now()};ls.set("atrav:session",s);onLogin(s);}
    else setErr("❌ Galat username ya password.");
    setLoading(false);
  };

  const doGoogle=async()=>{
    if(!fbAuth||!gProvider){setErr("Firebase setup check karo.");return;}
    setGLoad(true);setErr("");
    try{
      const r=await signInWithPopup(fbAuth,gProvider);
      const u=r.user;
      const s={id:u.uid,uid:u.uid,name:u.displayName||u.email,username:u.email,photo:u.photoURL,email:u.email,provider:"google",at:Date.now()};
      ls.set("atrav:session",s);onLogin(s);
    }catch(e){
      setErr(e.code==="auth/popup-closed-by-user"?"Login cancel ho gaya.":e.code==="auth/unauthorized-domain"?"⚠️ Firebase Console → Auth → Authorized domains mein apna domain add karo.":"Google login failed: "+e.message);
    }
    setGLoad(false);
  };

  return(
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#0a0f1e",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:68,height:68,borderRadius:20,background:"linear-gradient(135deg,#f59e0b,#ea580c)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:30,color:"#000",marginBottom:16,boxShadow:"0 8px 32px rgba(245,158,11,0.35)"}}>A</div>
          <h1 style={{color:"#fff",fontWeight:800,fontSize:28,margin:0}}>ATRAV</h1>
          <p style={{color:"#64748b",fontSize:13,marginTop:6}}>Insurance Suite · Secure Login</p>
        </div>
        <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:24,padding:32}}>
          <button onClick={doGoogle} disabled={gLoad}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,color:"#1e293b",cursor:"pointer",marginBottom:22,boxShadow:"0 2px 12px rgba(0,0,0,0.3)",opacity:gLoad?0.7:1}}>
            {gLoad?<div style={{width:18,height:18,border:"2px solid #ddd",borderTop:"2px solid #4285f4",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>:<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={18} height={18} alt="G"/>}
            {gLoad?"Signing in...":"Google se Sign In karo"}
          </button>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:22}}>
            <div style={{flex:1,height:1,background:"rgba(255,255,255,0.08)"}}/>
            <span style={{color:"#475569",fontSize:12,fontWeight:600}}>ya</span>
            <div style={{flex:1,height:1,background:"rgba(255,255,255,0.08)"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6,textTransform:"uppercase"}}>Username</label>
              <input value={user} onChange={e=>{setUser(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"11px 14px",fontSize:13,color:"#e2e8f0",outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6,textTransform:"uppercase"}}>Password</label>
              <div style={{position:"relative"}}>
                <input type={show?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"11px 42px 11px 14px",fontSize:13,color:"#e2e8f0",outline:"none",boxSizing:"border-box"}}/>
                <button onClick={()=>setShow(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:16}}>{show?"🙈":"👁️"}</button>
              </div>
            </div>
            {err&&<div style={{background:"rgba(248,113,113,0.12)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#f87171"}}>{err}</div>}
            <button onClick={doLogin} disabled={loading} style={{background:"linear-gradient(135deg,#f59e0b,#ea580c)",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",opacity:loading?0.7:1}}>
              {loading?"🔄 Login...":"🔐 Login"}
            </button>
          </div>
          <div style={{marginTop:20,padding:"12px 16px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:12}}>
            <p style={{fontSize:11,color:"#f59e0b",fontWeight:700,margin:"0 0 4px"}}>🔑 Default:</p>
            <p style={{fontSize:12,color:"#94a3b8",margin:0}}>Username: <b style={{color:"#e2e8f0"}}>admin</b> · Password: <b style={{color:"#e2e8f0"}}>admin123</b></p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
const Overview=({t,policies})=>{
  const expiring=policies.filter(p=>{const d=daysLeft(p.expiry);return d>=0&&d<=30;});
  const totPrem=policies.reduce((s,p)=>s+(+p.premium||0),0);
  const totNet=policies.reduce((s,p)=>s+(+p.netPremium||0),0);
  const deptMap={};policies.forEach(p=>{const k=p.department||"Other";deptMap[k]=(deptMap[k]||0)+1;});
  const depts=Object.entries(deptMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const COLS=["#f59e0b","#60a5fa","#34d399","#a78bfa","#f87171","#fb923c","#22d3ee","#4ade80"];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12}}>
        <Stat t={t} label="Total Policies" value={policies.length} icon="📋" sub={`${policies.filter(p=>p.status==="Active").length} Active`}/>
        <Stat t={t} label="Total Premium" value={fmtL(totPrem)} icon="💰" col="#34d399"/>
        <Stat t={t} label="Net Premium" value={fmtL(totNet)} icon="📊" col="#60a5fa"/>
        <Stat t={t} label="Expiring ≤30d" value={expiring.length} icon="⏳" col="#f87171" sub="Action needed"/>
        <Stat t={t} label="Lapsed" value={policies.filter(p=>daysLeft(p.expiry)<0).length} icon="❌" col="#f87171"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:20}}>
          <h3 style={{color:t.text,fontWeight:700,fontSize:14,margin:"0 0 14px"}}>⏳ Expiring in 30 Days ({expiring.length})</h3>
          {expiring.length===0
            ?<p style={{color:t.muted,fontSize:13,textAlign:"center",padding:"20px 0"}}>✅ Koi policy expire nahi ho rahi</p>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {expiring.sort((a,b)=>daysLeft(a.expiry)-daysLeft(b.expiry)).slice(0,8).map(p=>{
                const d=daysLeft(p.expiry);const col=d<=7?"#f87171":d<=15?"#f59e0b":"#34d399";
                return(
                  <div key={p.id} style={{background:t.input,borderRadius:10,padding:"9px 12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:700,color:t.text}}>{p.client}</span>
                      <span style={{fontSize:11,fontWeight:800,color:col}}>{d}d left</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:11,color:t.muted}}>{p.department||p.type} · {ddmm(p.expiry)}</span>
                      <span style={{fontSize:11,color:"#f59e0b",fontWeight:600}}>{fmtINR(p.premium)}</span>
                    </div>
                    <div style={{height:2,background:t.border,borderRadius:99,marginTop:5}}>
                      <div style={{width:`${Math.max(5,(d/30)*100)}%`,height:"100%",background:col,borderRadius:99}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </div>
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:20}}>
          <h3 style={{color:t.text,fontWeight:700,fontSize:14,margin:"0 0 14px"}}>📊 Department Breakdown</h3>
          {depts.length===0
            ?<p style={{color:t.muted,fontSize:13,textAlign:"center",padding:"20px 0"}}>Import Data karo</p>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {depts.map(([dept,count],i)=>{
                const pct=Math.round((count/policies.length)*100);
                return(
                  <div key={dept} style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:t.text,minWidth:90,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dept}</span>
                    <div style={{flex:1,height:6,background:t.border,borderRadius:99}}>
                      <div style={{width:`${pct}%`,height:"100%",background:COLS[i%8],borderRadius:99}}/>
                    </div>
                    <span style={{fontSize:11,color:t.muted,minWidth:52,textAlign:"right"}}>{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          }
        </div>
      </div>
    </div>
  );
};

// ── POLICIES ──────────────────────────────────────────────────────────────────
const PoliciesPage=({t,policies,setPolicies})=>{
  const [search,setSearch]=useState("");
  const [yearF,setYearF]=useState("All");
  const [monthF,setMonthF]=useState("All");
  const [deptF,setDeptF]=useState("All");
  const [statF,setStatF]=useState("All");
  const [modal,setModal]=useState(null);
  const [docModal,setDocModal]=useState(null);
  const docRef=useRef(null);
  const MONTHS=["All","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MI={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const years=["All",...[...new Set(policies.map(p=>(p.effectiveDate||"").slice(0,4)).filter(Boolean))].sort((a,b)=>b-a)];
  const depts=["All",...[...new Set(policies.map(p=>p.department||"").filter(Boolean))].sort()];

  const filtered=policies.filter(p=>{
    const yr=(p.effectiveDate||"").slice(0,4);
    const mo=p.effectiveDate?new Date(p.effectiveDate+"T00:00:00").getMonth():-1;
    const q=search.toLowerCase();
    return(
      (yearF==="All"||yr===yearF)&&
      (monthF==="All"||mo===MI[monthF])&&
      (deptF==="All"||p.department===deptF)&&
      (statF==="All"||p.status===statF)&&
      (!q||[p.policyNo,p.client,p.contact,p.department].some(v=>(v||"").toLowerCase().includes(q)))
    );
  });

  const EMPTY={policyNo:"",client:"",contact:"",department:"",type:"",effectiveDate:"",expiry:"",netPremium:"",gst:"",premium:"",income:"",status:"Active",docLink:""};
  const [form,setForm]=useState(EMPTY);
  const f=v=>setForm(p=>({...p,...v}));

  const save=()=>{
    if(!form.client) return;
    const item={...form,effectiveDate:normDate(form.effectiveDate),expiry:normDate(form.expiry),netPremium:+form.netPremium||0,gst:+form.gst||0,premium:+form.premium||0,income:+form.income||0};
    if(!item.id) item.id="P-"+Date.now();
    setPolicies(d=>item.id&&d.find(p=>p.id===item.id)?d.map(p=>p.id===item.id?item:p):[...d,item]);
    setModal(null);
  };

  const handleDoc=(pId,file)=>{
    if(!file) return;
    const rd=new FileReader();
    rd.onload=e=>{setPolicies(d=>d.map(p=>p.id===pId?{...p,docLink:e.target.result,docName:file.name}:p));setDocModal(null);};
    rd.readAsDataURL(file);
  };

  const totP=filtered.reduce((s,p)=>s+(+p.premium||0),0);
  const totN=filtered.reduce((s,p)=>s+(+p.netPremium||0),0);
  const totG=filtered.reduce((s,p)=>s+(+p.gst||0),0);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}}>
        <Stat t={t} label="Filtered Policies" value={filtered.length} icon="📋" sub={`Total: ${policies.length}`}/>
        <Stat t={t} label="Total Premium" value={fmtL(totP)} icon="💰" col="#34d399"/>
        <Stat t={t} label="Net Premium" value={fmtL(totN)} icon="📊" col="#60a5fa"/>
        <Stat t={t} label="GST" value={fmtL(totG)} icon="🏛️" col="#a78bfa"/>
      </div>

      {/* Filters */}
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:16,display:"flex",flexDirection:"column",gap:10}}>
        {[
          {label:"📅 YEAR",items:years,active:yearF,set:setYearF,col:"#f59e0b"},
          {label:"📆 MONTH",items:MONTHS,active:monthF,set:setMonthF,col:"#60a5fa"},
          {label:"🏷️ DEPT",items:depts.slice(0,12),active:deptF,set:setDeptF,col:"#a78bfa"},
          {label:"STATUS",items:["All","Active","Renewal Due","Lapsed"],active:statF,set:setStatF,col:"#34d399"},
        ].map(row=>(
          <div key={row.label} style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:10,fontWeight:700,color:t.muted,minWidth:52}}>{row.label}</span>
            {row.items.map(v=>(
              <button key={v} onClick={()=>row.set(v)} style={{border:row.active===v?"none":`1px solid ${t.border}`,background:row.active===v?row.col:"transparent",color:row.active===v?"#000":t.muted,borderRadius:99,padding:"3px 11px",fontSize:11,fontWeight:600,cursor:"pointer"}}>{v}</button>
            ))}
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
          <h3 style={{color:t.text,fontWeight:700,fontSize:15,margin:0}}>Policies ({filtered.length})</h3>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, policy no..."
                style={{background:t.input,border:`1px solid ${t.inputB}`,borderRadius:10,padding:"7px 10px 7px 30px",fontSize:12,color:t.text,outline:"none",width:190}}/>
            </div>
            <button onClick={()=>exportCSV(filtered,"policies.csv")} style={{background:t.input,border:`1px solid ${t.border}`,borderRadius:10,padding:"7px 14px",fontSize:12,color:t.muted,cursor:"pointer",fontWeight:600}}>📤 CSV</button>
            <button onClick={()=>{setForm(EMPTY);setModal("add");}} style={{background:"linear-gradient(135deg,#f59e0b,#ea580c)",border:"none",borderRadius:10,padding:"7px 16px",fontSize:12,color:"#000",cursor:"pointer",fontWeight:700}}>+ Add</button>
          </div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:950}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${t.border}`}}>
                {["Policy No.","Client","Contact","Dept.","Eff. Date","Expiry","Days","Net Prm.","GST","Total Prm.","Inc%","Status","Doc","Actions"].map(h=>(
                  <th key={h} style={{padding:"0 10px 10px 0",textAlign:"left",color:t.muted,fontWeight:600,fontSize:10,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0
                ?<tr><td colSpan={14} style={{textAlign:"center",padding:40,color:t.muted}}>Koi policy nahi — Import Data se upload karo</td></tr>
                :filtered.map(p=>{
                  const d=daysLeft(p.expiry);
                  const dc=d<0?"#f87171":d<30?"#f87171":d<60?"#f59e0b":"#34d399";
                  return(
                    <tr key={p.id} style={{borderBottom:`1px solid ${t.border}`}}>
                      <td style={{padding:"10px 10px 10px 0",fontFamily:"monospace",color:"#f59e0b",fontSize:11,whiteSpace:"nowrap"}}>{p.policyNo||p.id?.slice(0,10)}</td>
                      <td style={{padding:"10px 10px 10px 0",fontWeight:700,color:t.text,whiteSpace:"nowrap"}}>{p.client}</td>
                      <td style={{padding:"10px 10px 10px 0",color:t.muted}}>{p.contact||"—"}</td>
                      <td style={{padding:"10px 10px 10px 0",color:t.muted,whiteSpace:"nowrap"}}>{p.department||"—"}</td>
                      <td style={{padding:"10px 10px 10px 0",color:t.muted,whiteSpace:"nowrap"}}>{ddmm(p.effectiveDate)}</td>
                      <td style={{padding:"10px 10px 10px 0",whiteSpace:"nowrap"}}>
                        <span style={{color:dc,fontWeight:700}}>{ddmm(p.expiry)}</span>
                      </td>
                      <td style={{padding:"10px 10px 10px 0",fontWeight:700,color:dc,whiteSpace:"nowrap"}}>{d<0?"Expired":`${d}d`}</td>
                      <td style={{padding:"10px 10px 10px 0",color:t.text}}>{fmtINR(p.netPremium)}</td>
                      <td style={{padding:"10px 10px 10px 0",color:t.muted}}>{fmtINR(p.gst)}</td>
                      <td style={{padding:"10px 10px 10px 0",fontWeight:700,color:t.text}}>{fmtINR(p.premium)}</td>
                      <td style={{padding:"10px 10px 10px 0",color:"#34d399"}}>{p.income?`${p.income}%`:"—"}</td>
                      <td style={{padding:"10px 10px 10px 0"}}>{statusBadge(p.status)}</td>
                      <td style={{padding:"10px 10px 10px 0"}}>
                        {p.docLink
                          ?<a href={p.docLink} target="_blank" rel="noreferrer" style={{background:"rgba(96,165,250,0.15)",border:"1px solid rgba(96,165,250,0.3)",borderRadius:7,padding:"3px 8px",fontSize:11,color:"#60a5fa",textDecoration:"none",fontWeight:600}}>📄 View</a>
                          :<button onClick={()=>setDocModal(p)} style={{background:t.input,border:`1px solid ${t.border}`,borderRadius:7,padding:"3px 8px",fontSize:11,color:t.muted,cursor:"pointer"}}>📎 Add</button>
                        }
                      </td>
                      <td style={{padding:"10px 0"}}>
                        <div style={{display:"flex",gap:5}}>
                          <button onClick={()=>{setForm({...p,netPremium:String(p.netPremium||""),gst:String(p.gst||""),premium:String(p.premium||""),income:String(p.income||"")});setModal("edit");}} style={{background:"rgba(96,165,250,0.15)",border:"1px solid rgba(96,165,250,0.3)",borderRadius:7,padding:"3px 8px",fontSize:11,color:"#60a5fa",cursor:"pointer"}}>✏️</button>
                          <button onClick={()=>setPolicies(d=>d.filter(x=>x.id!==p.id))} style={{background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:7,padding:"3px 8px",fontSize:11,color:"#f87171",cursor:"pointer"}}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>

      {modal&&(
        <Modal title={modal==="add"?"Add Policy":`Edit — ${form.policyNo||""}`} onClose={()=>setModal(null)} t={t}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Policy No." value={form.policyNo||""} onChange={v=>f({policyNo:v})} t={t}/>
            <Field label="Client Name" value={form.client||""} onChange={v=>f({client:v})} t={t} required/>
            <Field label="Contact No." value={form.contact||""} onChange={v=>f({contact:v})} t={t}/>
            <Field label="Department" value={form.department||""} onChange={v=>f({department:v})} t={t}/>
            <Field label="Status" value={form.status||"Active"} onChange={v=>f({status:v})} opts={["Active","Renewal Due","Lapsed"]} t={t}/>
            <Field label="Effective Date" value={form.effectiveDate||""} onChange={v=>f({effectiveDate:v})} type="date" t={t}/>
            <Field label="Expiry Date" value={form.expiry||""} onChange={v=>f({expiry:v})} type="date" t={t} required/>
            <Field label="Net Premium ₹" value={String(form.netPremium||"")} onChange={v=>f({netPremium:v})} type="number" t={t}/>
            <Field label="GST ₹" value={String(form.gst||"")} onChange={v=>f({gst:v})} type="number" t={t}/>
            <Field label="Total Premium ₹" value={String(form.premium||"")} onChange={v=>f({premium:v})} type="number" t={t}/>
            <Field label="Income %" value={String(form.income||"")} onChange={v=>f({income:v})} type="number" t={t}/>
          </div>
          <Field label="Policy Document Link" value={form.docLink||""} onChange={v=>f({docLink:v})} t={t}/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
            <button onClick={()=>setModal(null)} style={{background:t.input,border:`1px solid ${t.border}`,borderRadius:10,padding:"9px 18px",fontSize:13,color:t.muted,cursor:"pointer"}}>Cancel</button>
            <button onClick={save} style={{background:"linear-gradient(135deg,#f59e0b,#ea580c)",border:"none",borderRadius:10,padding:"9px 20px",fontSize:13,fontWeight:700,color:"#000",cursor:"pointer"}}>{modal==="add"?"Add":"Save"}</button>
          </div>
        </Modal>
      )}

      {docModal&&(
        <Modal title={`📎 Document — ${docModal.client}`} onClose={()=>setDocModal(null)} t={t}>
          <div style={{textAlign:"center",padding:"12px 0"}}>
            <p style={{color:t.text,fontWeight:600,marginBottom:16}}>Policy document attach karo</p>
            <input ref={docRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{display:"none"}} onChange={e=>handleDoc(docModal.id,e.target.files[0])}/>
            <button onClick={()=>docRef.current?.click()} style={{background:"linear-gradient(135deg,#a78bfa,#7c3aed)",border:"none",borderRadius:12,padding:"11px 24px",fontSize:13,fontWeight:700,color:"#fff",cursor:"pointer",marginBottom:20}}>📂 File Upload karo</button>
            <p style={{color:t.muted,fontSize:11,marginBottom:8}}>Ya Google Drive / OneDrive link:</p>
            <div style={{display:"flex",gap:8}}>
              <input id="docIn" defaultValue={docModal.docLink||""} placeholder="https://drive.google.com/..." style={{flex:1,background:t.input,border:`1px solid ${t.inputB}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:t.text,outline:"none"}}/>
              <button onClick={()=>{const v=document.getElementById("docIn").value;if(v){setPolicies(d=>d.map(p=>p.id===docModal.id?{...p,docLink:v,docName:"Link"}:p));setDocModal(null);}}} style={{background:"linear-gradient(135deg,#f59e0b,#ea580c)",border:"none",borderRadius:10,padding:"9px 16px",color:"#000",fontWeight:700,fontSize:13,cursor:"pointer"}}>Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── IMPORT PAGE ───────────────────────────────────────────────────────────────
const ImportPage=({t,setPolicies,uid})=>{
  const [tab,setTab]=useState("excel");
  const [gsUrl,setGsUrl]=useState("");
  const [status,setStatus]=useState(null);
  const [preview,setPreview]=useState(null);
  const [colMap,setColMap]=useState({});
  const [rawRows,setRawRows]=useState(null);
  const [autoSync,setAutoSync]=useState(false);
  const [syncId,setSyncId]=useState(null);
  const [importing,setImporting]=useState(false);
  const [progress,setProgress]=useState(0);
  const fileRef=useRef(null);

  const processRows=(rows)=>{
    const headers=Object.keys(rows[0]);
    const map=detectCols(headers);
    setColMap(map);setRawRows(rows);
    setPreview({headers,rows:rows.slice(0,5)});
    return map;
  };

  const handleFile=async(file)=>{
    if(!file) return;
    setStatus({type:"loading",msg:`📂 "${file.name}" parse ho raha hai...`});
    setPreview(null);setColMap({});setRawRows(null);
    try{
      let rows=[];
      const ext=file.name.split(".").pop().toLowerCase();
      if(ext==="csv"){
        rows=parseCSV(await file.text());
      }else{
        const buf=await file.arrayBuffer();
        let XLSX;
        try{XLSX=await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");}
        catch{XLSX=await import("https://unpkg.com/xlsx@0.18.5/xlsx.mjs");}
        const wb=XLSX.read(buf,{type:"array",cellDates:true});
        rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:"",raw:false});
      }
      if(!rows.length){setStatus({type:"error",msg:"❌ File empty ya format galat hai."});return;}
      const map=processRows(rows);
      const matched=Object.keys(map).length;
      setStatus({type:"success",msg:`✅ ${rows.length} rows mili! ${matched}/${Object.keys(ALIASES).length} columns auto-detect hue. Mapping verify karo phir Import karo.`});
    }catch(e){setStatus({type:"error",msg:"❌ "+e.message});}
  };

  const extractId=url=>{const m=url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);return m?m[1]:null;};
  const extractGid=url=>{const m=url.match(/[#&?]gid=([0-9]+)/);return m?m[1]:"0";};

  const fetchSheet=async(url)=>{
    const id=extractId(url);
    if(!id){setStatus({type:"error",msg:"❌ Invalid Google Sheet URL."});return;}
    setStatus({type:"loading",msg:"🔄 Google Sheet se data fetch ho raha hai..."});
    try{
      const res=await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${extractGid(url)}`,{cache:"no-store"});
      if(!res.ok) throw new Error("Sheet public nahi hai — File → Share → 'Anyone with link can view' karo.");
      const rows=parseCSV(await res.text());
      if(!rows.length) throw new Error("Sheet empty aa rahi hai.");
      const map=processRows(rows);
      const matched=Object.keys(map).length;
      setStatus({type:"success",msg:`✅ ${rows.length} rows Google Sheet se aayi! ${matched} columns detect hue.`});
    }catch(e){setStatus({type:"error",msg:"❌ "+e.message});}
  };

  const doImport=async(mode)=>{
    if(!rawRows) return;
    setImporting(true);setProgress(0);
    const mapped=mapRows(rawRows,colMap);
    if(!mapped.length){setStatus({type:"error",msg:"❌ Koi valid row nahi mili."});setImporting(false);return;}

    // Show progress
    const total=mapped.length;
    setStatus({type:"loading",msg:`⏳ ${total} rows import ho rahi hain...`});

    // Process in chunks for UI responsiveness
    const CHUNK=500;
    let allDone=[];
    for(let i=0;i<mapped.length;i+=CHUNK){
      allDone=[...allDone,...mapped.slice(i,i+CHUNK)];
      setProgress(Math.round((Math.min(i+CHUNK,total)/total)*80));
      await new Promise(r=>setTimeout(r,10));
    }

    if(mode==="replace") setPolicies(allDone);
    else setPolicies(d=>[...d,...allDone]);

    setProgress(100);
    setStatus({type:"success",msg:`🎉 ${mapped.length} policies successfully import ho gayi! Dashboard mein dekho.`});
    setPreview(null);setRawRows(null);
    setTimeout(()=>setProgress(0),2000);
    setImporting(false);
  };

  const startSync=()=>{
    if(!gsUrl||!extractId(gsUrl)){setStatus({type:"error",msg:"Pehle valid URL daalo."});return;}
    fetchSheet(gsUrl);
    const id=setInterval(()=>fetchSheet(gsUrl),5*60*1000);
    setSyncId(id);setAutoSync(true);
    setStatus({type:"success",msg:"🔄 Auto-sync ON — har 5 min mein refresh."});
  };
  const stopSync=()=>{clearInterval(syncId);setSyncId(null);setAutoSync(false);setStatus({type:"success",msg:"⏹️ Auto-sync band."});};
  useEffect(()=>()=>{if(syncId)clearInterval(syncId);},[syncId]);

  const SC={success:"rgba(52,211,153,0.1)",error:"rgba(248,113,113,0.1)",loading:"rgba(245,158,11,0.1)"};
  const CC={success:"#34d399",error:"#f87171",loading:"#f59e0b"};

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:"linear-gradient(135deg,rgba(245,158,11,0.12),rgba(96,165,250,0.08))",border:"1px solid rgba(245,158,11,0.25)",borderRadius:16,padding:"20px 24px"}}>
        <h2 style={{color:t.text,fontWeight:800,fontSize:18,margin:"0 0 6px"}}>📥 Data Import Center</h2>
        <p style={{color:t.muted,fontSize:13,margin:0}}>Excel/CSV upload ya Google Sheet se live sync · Saara data safe storage mein</p>
      </div>

      <div style={{display:"flex",gap:8}}>
        {[["excel","📊 Excel / CSV"],["gsheet","🔗 Google Sheet"]].map(([v,l])=>(
          <button key={v} onClick={()=>{setTab(v);setPreview(null);setStatus(null);setRawRows(null);}}
            style={{flex:1,border:tab===v?"none":`1px solid ${t.border}`,background:tab===v?"linear-gradient(135deg,#f59e0b,#ea580c)":"transparent",color:tab===v?"#000":t.muted,borderRadius:12,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      {tab==="excel"&&(
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:20,display:"flex",flexDirection:"column",gap:14}}>
          <div onClick={()=>fileRef.current?.click()}
            onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="#f59e0b";}}
            onDragLeave={e=>{e.currentTarget.style.borderColor=t.border;}}
            onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=t.border;handleFile(e.dataTransfer.files[0]);}}
            style={{border:`2px dashed ${t.border}`,borderRadius:14,padding:"36px 20px",textAlign:"center",cursor:"pointer",transition:"border-color 0.2s"}}>
            <div style={{fontSize:44,marginBottom:10}}>📂</div>
            <p style={{color:t.text,fontWeight:700,fontSize:14,margin:"0 0 6px"}}>File yahan drop karo ya click karo</p>
            <p style={{color:t.muted,fontSize:12,margin:0}}>Excel (.xlsx, .xls) · CSV (.csv) · Koi bhi size</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
          </div>
          <div style={{background:t.input,border:`1px solid ${t.inputB}`,borderRadius:12,padding:14}}>
            <p style={{fontSize:12,fontWeight:700,color:"#f59e0b",margin:"0 0 8px"}}>📋 Recommended Excel columns:</p>
            <p style={{fontSize:11,color:t.muted,margin:0,lineHeight:1.8}}>
              <b style={{color:t.text}}>Policy No.</b> · <b style={{color:t.text}}>Name</b> · <b style={{color:t.text}}>Contact No.</b> · <b style={{color:t.text}}>Department</b> · <b style={{color:t.text}}>Effective Date</b> · <b style={{color:t.text}}>Expiry Date</b> · <b style={{color:t.text}}>Net Prm.</b> · <b style={{color:t.text}}>GST</b> · <b style={{color:t.text}}>Total Premium</b> · <b style={{color:t.text}}>Income%</b> · <b style={{color:t.text}}>Status</b> · <b style={{color:t.text}}>Policy Link</b>
            </p>
          </div>
        </div>
      )}

      {tab==="gsheet"&&(
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:20,display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:t.input,border:`1px solid ${t.inputB}`,borderRadius:12,padding:14}}>
            <p style={{fontSize:12,fontWeight:700,color:"#60a5fa",margin:"0 0 10px"}}>📖 Setup (ek baar):</p>
            {["Google Sheet → File → Share → 'Anyone with link can view'","Sheet URL copy karo","Neeche paste karo → Fetch Now dabao"].map((s,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:"rgba(96,165,250,0.2)",border:"1px solid rgba(96,165,250,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#60a5fa",flexShrink:0}}>{i+1}</div>
                <p style={{fontSize:12,color:t.muted,margin:0}}>{s}</p>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <input value={gsUrl} onChange={e=>setGsUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..."
              style={{flex:1,background:t.input,border:`1px solid ${t.inputB}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:t.text,outline:"none"}}/>
            <button onClick={()=>fetchSheet(gsUrl)} style={{background:"linear-gradient(135deg,#60a5fa,#3b82f6)",border:"none",borderRadius:10,padding:"10px 18px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>🔄 Fetch Now</button>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:autoSync?"rgba(52,211,153,0.08)":t.input,border:`1px solid ${autoSync?"rgba(52,211,153,0.3)":t.inputB}`,borderRadius:12,padding:"14px 18px"}}>
            <div>
              <p style={{fontWeight:700,fontSize:13,color:t.text,margin:"0 0 3px"}}>🔄 Auto-Sync (har 5 min)</p>
              <p style={{fontSize:11,color:t.muted,margin:0}}>Sheet update hogi toh dashboard automatically refresh hoga</p>
            </div>
            <button onClick={autoSync?stopSync:startSync} style={{background:autoSync?"#f87171":"linear-gradient(135deg,#34d399,#059669)",border:"none",borderRadius:10,padding:"8px 18px",color:autoSync?"#fff":"#000",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>
              {autoSync?"⏹️ Stop":"▶️ Start"}
            </button>
          </div>
        </div>
      )}

      {status&&(
        <div style={{background:SC[status.type],border:`1px solid ${CC[status.type]}40`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
          {status.type==="loading"&&<div style={{width:16,height:16,border:"2px solid #f59e0b",borderTop:"2px solid transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0}}/>}
          <p style={{fontSize:13,color:CC[status.type],margin:0}}>{status.msg}</p>
        </div>
      )}

      {progress>0&&progress<100&&(
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:12,color:t.text,fontWeight:600}}>Import progress</span>
            <span style={{fontSize:12,color:"#f59e0b",fontWeight:700}}>{progress}%</span>
          </div>
          <div style={{height:6,background:t.border,borderRadius:99}}>
            <div style={{width:`${progress}%`,height:"100%",background:"linear-gradient(90deg,#f59e0b,#ea580c)",borderRadius:99,transition:"width 0.3s"}}/>
          </div>
        </div>
      )}

      {preview&&rawRows&&(
        <div style={{background:t.card,border:"1px solid rgba(245,158,11,0.3)",borderRadius:16,padding:20,display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <p style={{fontWeight:700,fontSize:14,color:t.text,margin:0}}>🗺️ Column Mapping — Verify karo</p>
            <span style={{fontSize:11,color:t.muted,background:t.input,padding:"4px 10px",borderRadius:99}}>{rawRows.length} total rows</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {Object.keys(ALIASES).map(field=>(
              <div key={field}>
                <label style={{display:"block",fontSize:10,fontWeight:700,color:t.muted,marginBottom:4,textTransform:"uppercase"}}>{field}</label>
                <select value={colMap[field]||""} onChange={e=>setColMap(p=>({...p,[field]:e.target.value}))}
                  style={{width:"100%",background:t.input,border:`1px solid ${colMap[field]?"rgba(245,158,11,0.5)":t.inputB}`,borderRadius:8,padding:"6px 10px",fontSize:12,color:t.text,outline:"none"}}>
                  <option value="">— Select —</option>
                  {preview.headers.map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{overflowX:"auto",borderRadius:10,border:`1px solid ${t.border}`}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:t.input}}>{preview.headers.slice(0,8).map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:t.muted,fontWeight:600,borderBottom:`1px solid ${t.border}`,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
              <tbody>{preview.rows.map((row,i)=><tr key={i} style={{borderBottom:`1px solid ${t.border}`}}>{preview.headers.slice(0,8).map(h=><td key={h} style={{padding:"6px 10px",color:t.text,whiteSpace:"nowrap",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis"}}>{String(row[h]||"")}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>doImport("add")} disabled={importing}
              style={{flex:1,background:"linear-gradient(135deg,#f59e0b,#ea580c)",border:"none",borderRadius:12,padding:"12px",fontSize:13,fontWeight:800,color:"#000",cursor:"pointer",opacity:importing?0.6:1}}>
              {importing?"⏳ Import ho raha hai...":` ✅ Add to Existing (${rawRows.length} rows)`}
            </button>
            <button onClick={()=>doImport("replace")} disabled={importing}
              style={{background:t.input,border:`1px solid ${t.border}`,borderRadius:12,padding:"12px 18px",fontSize:13,fontWeight:700,color:"#f87171",cursor:"pointer",opacity:importing?0.6:1}}>
              🔄 Replace All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
const NotifPage=({t,policies})=>{
  const [read,setRead]=useState(()=>ls.get("atrav:read",[]));
  const markAll=()=>{const ids=notifs.map(n=>n.id);const n=[...new Set([...read,...ids])];setRead(n);ls.set("atrav:read",n);};
  const markOne=id=>{const n=[...read,id];setRead(n);ls.set("atrav:read",n);};

  const notifs=[];
  policies.forEach(p=>{
    const d=daysLeft(p.expiry);
    if(d<0) notifs.push({id:`L-${p.id}`,icon:"❌",col:"#f87171",title:`Lapsed: ${p.client}`,body:`${p.policyNo||""} · ${p.department||""} · Expired ${ddmm(p.expiry)}`,prm:fmtINR(p.premium)});
    else if(d<=7) notifs.push({id:`C-${p.id}`,icon:"🚨",col:"#f87171",title:`Critical (${d}d): ${p.client}`,body:`${p.policyNo||""} · ${p.department||""} · Expires ${ddmm(p.expiry)}`,prm:fmtINR(p.premium),urgent:true});
    else if(d<=30) notifs.push({id:`R-${p.id}`,icon:"⚠️",col:"#f59e0b",title:`Renewal (${d}d): ${p.client}`,body:`${p.policyNo||""} · ${p.department||""} · Expires ${ddmm(p.expiry)}`,prm:fmtINR(p.premium)});
  });
  notifs.sort((a,b)=>(b.urgent?1:0)-(a.urgent?1:0));
  const unread=notifs.filter(n=>!read.includes(n.id));

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12}}>
        <Stat t={t} label="Total Alerts" value={notifs.length} icon="🔔" col="#f59e0b"/>
        <Stat t={t} label="Unread" value={unread.length} icon="🔴" col="#f87171"/>
        <Stat t={t} label="Critical ≤7d" value={notifs.filter(n=>n.id.startsWith("C-")).length} icon="🚨" col="#f87171"/>
        <Stat t={t} label="Renewal ≤30d" value={notifs.filter(n=>n.id.startsWith("R-")).length} icon="⚠️" col="#f59e0b"/>
        <Stat t={t} label="Lapsed" value={notifs.filter(n=>n.id.startsWith("L-")).length} icon="❌" col="#f87171"/>
      </div>
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <h3 style={{color:t.text,fontWeight:700,fontSize:15,margin:0}}>🔔 Renewal & Expiry Alerts</h3>
          {unread.length>0&&<button onClick={markAll} style={{fontSize:12,color:"#f59e0b",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:600}}>Mark all read</button>}
        </div>
        {notifs.length===0
          ?<div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:52,marginBottom:12}}>✅</div>
            <p style={{color:t.text,fontWeight:700,fontSize:16,margin:"0 0 6px"}}>Koi urgent alert nahi!</p>
            <p style={{color:t.muted,fontSize:13,margin:0}}>Saari policies time par hain</p>
          </div>
          :<div style={{display:"flex",flexDirection:"column",gap:10}}>
            {notifs.map(n=>{
              const isRead=read.includes(n.id);
              return(
                <div key={n.id} onClick={()=>markOne(n.id)}
                  style={{background:isRead?t.input:`${n.col}10`,border:`1px solid ${isRead?t.border:n.col+"40"}`,borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",transition:"all 0.15s"}}>
                  <div style={{width:42,height:42,borderRadius:12,background:`${n.col}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{n.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <p style={{fontWeight:700,fontSize:13,color:t.text,margin:0}}>{n.title}</p>
                      {!isRead&&<div style={{width:7,height:7,borderRadius:"50%",background:n.col,flexShrink:0}}/>}
                    </div>
                    <p style={{fontSize:12,color:t.muted,margin:"3px 0 0"}}>{n.body}</p>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:n.col,flexShrink:0}}>{n.prm}</span>
                </div>
              );
            })}
          </div>
        }
      </div>
    </div>
  );
};

// ── NAV ───────────────────────────────────────────────────────────────────────
const NAV=[
  {id:"overview",label:"Overview",icon:"⚡"},
  {id:"policies",label:"Policies",icon:"📋"},
  {id:"notifications",label:"Notifications",icon:"🔔"},
  {id:"import",label:"Import Data",icon:"📥"},
];

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [dark,setDark]=useState(true);
  const [active,setActive]=useState("overview");
  const [sidebar,setSidebar]=useState(true);
  const [session,setSession]=useState(()=>ls.get("atrav:session",null));
  const [policies,setPoliciesRaw]=useState(()=>ls.get("atrav:policies",[]));
  const [saving,setSaving]=useState(false);
  const [synced,setSynced]=useState(false);
  const t=T(dark);

  // Load from Firestore when Google user logs in
  useEffect(()=>{
    if(!session?.uid||!fbDb) return;
    fsLoad(session.uid,"policies").then(rows=>{
      if(rows&&rows.length>0){
        setPoliciesRaw(rows);
        ls.set("atrav:policies",rows);
        setSynced(true);
      }
    });
  },[session?.uid]);

  const setPolicies=async(v)=>{
    const val=typeof v==="function"?v(policies):v;
    setPoliciesRaw(val);
    ls.set("atrav:policies",val);
    if(session?.uid&&fbDb){
      setSaving(true);
      await fsSaveAll(session.uid,"policies",val);
      setSaving(false);setSynced(true);
    }
  };

  const logout=async()=>{
    try{if(fbAuth&&session?.provider==="google") await fbSignOut(fbAuth);}catch{}
    localStorage.removeItem("atrav:session");
    setSession(null);
  };

  const unread=(()=>{
    const r=ls.get("atrav:read",[]);
    return policies.filter(p=>{const d=daysLeft(p.expiry);return d<30;}).filter(p=>!r.includes(`C-${p.id}`)&&!r.includes(`R-${p.id}`)&&!r.includes(`L-${p.id}`)).length;
  })();

  if(!session) return <LoginPage onLogin={s=>{ls.set("atrav:session",s);setSession(s);}}/>;

  const pages={
    overview:<Overview t={t} policies={policies}/>,
    policies:<PoliciesPage t={t} policies={policies} setPolicies={setPolicies}/>,
    notifications:<NotifPage t={t} policies={policies}/>,
    import:<ImportPage t={t} setPolicies={setPolicies} uid={session?.uid}/>,
  };

  return(
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:t.bg,minHeight:"100vh",color:t.text,display:"flex",transition:"background 0.3s"}}>
      <aside style={{width:sidebar?218:0,minWidth:sidebar?218:0,background:t.sidebar,borderRight:`1px solid ${t.border}`,height:"100vh",position:"sticky",top:0,overflow:"hidden",transition:"all 0.25s",flexShrink:0,display:"flex",flexDirection:"column"}}>
        <div style={{borderBottom:`1px solid ${t.border}`,padding:"20px 18px",whiteSpace:"nowrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#f59e0b,#ea580c)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:16,color:"#000",flexShrink:0}}>A</div>
            <div><p style={{fontWeight:800,fontSize:14,color:t.text,margin:0}}>ATRAV</p><p style={{fontSize:10,color:t.muted,margin:0}}>Insurance Suite</p></div>
          </div>
        </div>
        <nav style={{flex:1,padding:"12px 8px",display:"flex",flexDirection:"column",gap:2}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setActive(n.id)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,fontSize:13,textAlign:"left",cursor:"pointer",background:active===n.id?"rgba(245,158,11,0.12)":"transparent",border:`1px solid ${active===n.id?"rgba(245,158,11,0.25)":"transparent"}`,color:active===n.id?"#f59e0b":t.muted,fontWeight:active===n.id?700:400,transition:"all 0.15s",whiteSpace:"nowrap",position:"relative"}}>
              <span style={{fontSize:16}}>{n.icon}</span>
              <span style={{flex:1}}>{n.label}</span>
              {n.id==="notifications"&&unread>0&&<span style={{background:"#f87171",color:"#fff",borderRadius:99,fontSize:9,fontWeight:800,minWidth:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{unread}</span>}
            </button>
          ))}
        </nav>
        <div style={{borderTop:`1px solid ${t.border}`,padding:"12px 14px",whiteSpace:"nowrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            {session.photo
              ?<img src={session.photo} referrerPolicy="no-referrer" style={{width:30,height:30,borderRadius:"50%",flexShrink:0,objectFit:"cover"}} alt="avatar"/>
              :<div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#f59e0b,#ea580c)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#000",flexShrink:0}}>{(session.name||"A")[0].toUpperCase()}</div>
            }
            <div style={{minWidth:0,overflow:"hidden"}}>
              <p style={{fontSize:11,fontWeight:700,color:t.text,overflow:"hidden",textOverflow:"ellipsis",margin:0}}>{session.name||"Admin"}</p>
              <p style={{fontSize:10,color:t.muted,margin:0}}>{session.provider==="google"?"☁️ Cloud Sync":"🔐 Local"}</p>
            </div>
          </div>
          {saving&&<p style={{fontSize:10,color:"#f59e0b",margin:"0 0 6px",textAlign:"center",fontWeight:600}}>💾 Saving to cloud...</p>}
          {synced&&!saving&&session.uid&&<p style={{fontSize:10,color:"#34d399",margin:"0 0 6px",textAlign:"center",fontWeight:600}}>☁️ Cloud synced ✓</p>}
          <button onClick={logout} style={{width:"100%",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:8,padding:"7px",fontSize:12,color:"#f87171",cursor:"pointer",fontWeight:700}}>🚪 Logout</button>
        </div>
      </aside>
      <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>
        <header style={{borderBottom:`1px solid ${t.border}`,background:t.header,position:"sticky",top:0,zIndex:100,padding:"11px 18px",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <button onClick={()=>setSidebar(p=>!p)} style={{background:t.input,border:`1px solid ${t.border}`,borderRadius:8,width:34,height:34,cursor:"pointer",color:t.text,fontSize:16,flexShrink:0}}>☰</button>
          <div style={{flex:1}}>
            <h1 style={{fontWeight:700,fontSize:16,color:t.text,margin:0}}>{NAV.find(n=>n.id===active)?.icon} {NAV.find(n=>n.id===active)?.label}</h1>
            <p style={{fontSize:10,color:t.muted,margin:0}}>ATRAV Insurance · {new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <button onClick={()=>setActive("notifications")} style={{width:34,height:34,borderRadius:10,background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.3)",cursor:"pointer",fontSize:16,position:"relative"}}>
              🔔{unread>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#f87171",color:"#fff",borderRadius:99,fontSize:8,fontWeight:800,minWidth:15,height:15,display:"flex",alignItems:"center",justifyContent:"center"}}>{unread}</span>}
            </button>
            <button onClick={()=>setDark(p=>!p)} style={{width:34,height:34,borderRadius:10,background:dark?"rgba(251,191,36,0.15)":"rgba(100,116,139,0.15)",border:`1px solid ${dark?"rgba(251,191,36,0.3)":"rgba(100,116,139,0.3)"}`,cursor:"pointer",fontSize:16}}>{dark?"☀️":"🌙"}</button>
          </div>
        </header>
        <div style={{flex:1,overflowY:"auto",padding:"18px"}}>
          {pages[active]}
        </div>
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.12) transparent}`}</style>
    </div>
  );
}
