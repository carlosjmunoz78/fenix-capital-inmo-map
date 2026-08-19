import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Calculator, LogOut, Minimize2, Moon, Sun, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { calculateMortgage, FORMULA_VERSION } from './calculator';
import { fetchAppApi, supabase } from './supabase';

type Theme = 'light' | 'dark';
type SessionContext = { actor_code?: string; role?: string; worker_id?: string; [key: string]: unknown };
type NavData = { items?: Array<{ label?: string; route?: string; resource?: string }>; [key: string]: unknown };
type CalcState = {
  principal: number;
  rate: number;
  years: number;
  purchasePrice: number | '';
  income: number | '';
  other: number | '';
  open: boolean;
  minimized: boolean;
};

const fallbackMenu = ['Inicio','Expedientes','Bancos','Contactos','Inmobiliarias','Tasaciones','Firmas','Documentación','Financieros','Visitadores','Agenda/Tareas','Informes','Buscador'];
const defaultCalc: CalcState = { principal: 100000, rate: 3, years: 30, purchasePrice: '', income: '', other: '', open: true, minimized: false };

export default function App(){
  const [theme,setTheme]=useState<Theme>(() => (sessionStorage.getItem('fenix-theme') as Theme) || 'light');
  const [session,setSession]=useState<Session|null>(null);
  const [ctx,setCtx]=useState<SessionContext|null>(null);
  const [nav,setNav]=useState<NavData|null>(null);
  const [authReady,setAuthReady]=useState(false);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [authError,setAuthError]=useState('');
  const [loadingLogin,setLoadingLogin]=useState(false);
  const [calc,setCalc]=useState<CalcState>(defaultCalc);

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    sessionStorage.setItem('fenix-theme',theme);
  },[theme]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!session?.user?.id){setCtx(null);setNav(null);setCalc(defaultCalc);return;}
    const key=`fenix-calc:${session.user.id}`;
    const saved=sessionStorage.getItem(key);
    if(saved){try{setCalc({...defaultCalc,...JSON.parse(saved)})}catch{setCalc(defaultCalc)}} else setCalc(defaultCalc);
    Promise.all([
      fetchAppApi<SessionContext>('/session/context'),
      fetchAppApi<NavData>('/navigation')
    ]).then(([c,n])=>{
      setCtx(c.status===200?c.data:null);
      setNav(n.status===200?n.data:null);
    });
  },[session?.user?.id]);

  useEffect(()=>{
    if(!session?.user?.id)return;
    sessionStorage.setItem(`fenix-calc:${session.user.id}`,JSON.stringify(calc));
  },[calc,session?.user?.id]);

  const result=useMemo(()=>{
    try{
      return calculateMortgage({principal:calc.principal,annualRate:calc.rate,years:calc.years,purchasePrice:calc.purchasePrice===''?undefined:Number(calc.purchasePrice),netIncome:calc.income===''?undefined:Number(calc.income),otherPayments:calc.other===''?undefined:Number(calc.other),mortgageType:'fixed'});
    }catch{return null}
  },[calc]);

  const menu = nav?.items?.map(x=>x.label).filter((x):x is string=>Boolean(x)) || fallbackMenu;

  async function login(e:FormEvent){
    e.preventDefault();setAuthError('');setLoadingLogin(true);
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error)setAuthError('No se pudo iniciar sesión TEST. Revisa las credenciales.');
    setLoadingLogin(false);
  }

  async function logout(){
    const uid=session?.user?.id;
    if(uid)sessionStorage.removeItem(`fenix-calc:${uid}`);
    setCalc(defaultCalc);setCtx(null);setNav(null);setPassword('');
    await supabase.auth.signOut();
  }

  if(!authReady)return <div className="auth-shell"><p>Validando sesión TEST…</p></div>;

  if(!session)return <div className="auth-shell">
    <button className="theme-toggle auth-theme" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}<span>{theme==='light'?'Oscuro':'Claro'}</span></button>
    <form className="auth-card" onSubmit={login}>
      <div className="brand auth-brand"><div className="brand-mark">F</div><div><strong>FÉNIX CAPITAL</strong><span>APP PRE-PROD · Fase 1</span></div></div>
      <span className="eyebrow">AUTH TEST</span>
      <h1>Acceso seguro</h1>
      <p>Usa únicamente las identidades TEST autorizadas. No se aceptan datos reales.</p>
      <label>Email TEST<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
      {authError&&<div className="warning">{authError}</div>}
      <button className="primary" disabled={loadingLogin}>{loadingLogin?'Entrando…':'Entrar'}</button>
    </form>
  </div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">F</div><div><strong>FÉNIX CAPITAL</strong><span>PRE-PROD · Fase 1</span></div></div>
      <nav>{menu.map((item,i)=><button className={i===0?'nav-item active':'nav-item'} key={item}>{item}</button>)}</nav>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><h1>Inicio</h1><p>{ctx?.actor_code ? `${ctx.actor_code} · ${ctx.role||'Rol TEST'}` : 'Sesión TEST autenticada'}</p></div>
        <div className="top-actions">
          <button className="theme-toggle" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}<span>{theme==='light'?'Oscuro':'Claro'}</span></button>
          <button className="logout" onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/><span>Salir</span></button>
          <div className="avatar">{(ctx?.actor_code||'TT').slice(0,2)}</div>
        </div>
      </header>
      <section className="hero-card"><div><span className="eyebrow">CONTROL OPERATIVO</span><h2>Frontend TEST conectado a Supabase Auth</h2><p>El menú y el contexto se solicitan al backend con JWT. La calculadora conserva estado solo dentro de la sesión del usuario autenticado y se limpia al salir.</p></div><div className="hero-kpi"><strong>{ctx?.actor_code||'TEST'}</strong><span>{ctx?.role||'validando scope'}</span></div></section>
      <section className="grid">
        <article className="card"><span className="eyebrow">SIGUIENTE</span><h3>QA navegador A→B</h3><p>Login FIN-A, navegación, CAL-001, logout, login FIN-B y comprobación de que el estado privado anterior no reaparece.</p></article>
        <article className="card"><span className="eyebrow">SEGURIDAD</span><h3>JWT + RBAC servidor</h3><p>La UI consume contexto y navegación autorizados; no envía rol o worker como autoridad confiable.</p></article>
        <article className="card"><span className="eyebrow">CAL-001</span><h3>Motor validado</h3><p>Amortización francesa · fórmula {FORMULA_VERSION}.</p></article>
      </section>
    </main>

    {!calc.open && <button className="calc-launcher" onClick={()=>setCalc(v=>({...v,open:true,minimized:false}))}><Calculator size={20}/>Calculadora PRO</button>}
    {calc.open && <section className={calc.minimized?'calc-panel minimized':'calc-panel'} aria-label="Calculadora Hipotecaria PRO">
      <header><div><span className="eyebrow">CAL-001</span><strong>Calculadora Hipotecaria PRO</strong></div><div className="calc-actions"><button onClick={()=>setCalc(v=>({...v,minimized:!v.minimized}))}><Minimize2 size={17}/></button><button onClick={()=>setCalc(v=>({...v,open:false}))}><X size={17}/></button></div></header>
      {!calc.minimized && <div className="calc-body">
        <div className="calc-grid">
          <label>Importe €<input type="number" min="1" value={calc.principal} onChange={e=>setCalc(v=>({...v,principal:Number(e.target.value)}))}/></label>
          <label>TIN anual %<input type="number" min="0" step="0.01" value={calc.rate} onChange={e=>setCalc(v=>({...v,rate:Number(e.target.value)}))}/></label>
          <label>Plazo años<input type="number" min="1" value={calc.years} onChange={e=>setCalc(v=>({...v,years:Number(e.target.value)}))}/></label>
          <label>Precio compra €<input type="number" min="0" value={calc.purchasePrice} onChange={e=>setCalc(v=>({...v,purchasePrice:e.target.value===''?'':Number(e.target.value)}))}/></label>
          <label>Ingresos netos €/mes<input type="number" min="0" value={calc.income} onChange={e=>setCalc(v=>({...v,income:e.target.value===''?'':Number(e.target.value)}))}/></label>
          <label>Otras cuotas €/mes<input type="number" min="0" value={calc.other} onChange={e=>setCalc(v=>({...v,other:e.target.value===''?'':Number(e.target.value)}))}/></label>
        </div>
        {result ? <div className="result-box"><div><span>Cuota estimada</span><strong>{result.monthlyPayment.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong></div><div className="result-row"><span>Total pagado <b>{result.totalPaid.toLocaleString('es-ES')} €</b></span><span>Intereses <b>{result.estimatedInterest.toLocaleString('es-ES')} €</b></span></div>{result.financingPct!==null&&<div className="result-row"><span>Financiación <b>{result.financingPct}%</b></span>{result.effortPct!==null&&<span>Esfuerzo <b>{result.effortPct}%</b></span>}</div>}{result.warnings.map(w=><div className="warning" key={w}>{w}</div>)}</div> : <div className="warning">Revisa importe, plazo y tipo.</div>}
        <p className="calc-note">Simulación matemática. No implica aprobación bancaria ni sustituye validación de Belén.</p>
      </div>}
    </section>}
  </div>
}
