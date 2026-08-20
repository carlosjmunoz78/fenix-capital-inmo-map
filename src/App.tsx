import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, LogOut, Minimize2, Moon, Sun, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { useLocation, useNavigate } from 'react-router-dom';
import { calculateMortgage, FORMULA_VERSION } from './calculator';
import { fetchAppApi, supabase } from './supabase';
import './logo.css';

type Theme = 'light' | 'dark';
type SessionContext = { actor_code?: string; role?: string; worker_id?: string; [key: string]: unknown };
type NavItem = { label: string; route: string; resource?: string };
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

const fallbackMenu: NavItem[] = [{ label:'Inicio', route:'/inicio' }];
const defaultCalc: CalcState = { principal: 100000, rate: 3, years: 30, purchasePrice: '', income: '', other: '', open: true, minimized: false };
const testLoginAliases: Record<string,string> = {
  dirtest: 'dir-test@test.fenixcapital.es',
  fina: 'fin-a@test.fenixcapital.es',
  finb: 'fin-b@test.fenixcapital.es',
  visa: 'vis-a@test.fenixcapital.es',
  visb: 'vis-b@test.fenixcapital.es'
};

function resolveTestLogin(value:string){
  const trimmed=value.trim().toLowerCase();
  if(trimmed.includes('@')) return trimmed;
  const alias=trimmed.replace(/[\s_-]+/g,'');
  return testLoginAliases[alias] || '';
}

export default function App(){
  const navigate = useNavigate();
  const location = useLocation();
  const suppressCalcPersistence = useRef(false);
  const [theme,setTheme]=useState<Theme>(() => (sessionStorage.getItem('fenix-theme') as Theme) || 'light');
  const [session,setSession]=useState<Session|null>(null);
  const [ctx,setCtx]=useState<SessionContext|null>(null);
  const [nav,setNav]=useState<NavData|null>(null);
  const [authReady,setAuthReady]=useState(false);
  const [loginId,setLoginId]=useState('');
  const [password,setPassword]=useState('');
  const [authError,setAuthError]=useState('');
  const [resetMessage,setResetMessage]=useState('');
  const [loadingLogin,setLoadingLogin]=useState(false);
  const [loadingReset,setLoadingReset]=useState(false);
  const [passwordRecovery,setPasswordRecovery]=useState(false);
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [calc,setCalc]=useState<CalcState>(defaultCalc);

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    sessionStorage.setItem('fenix-theme',theme);
  },[theme]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{
      setSession(next);
      if(event==='PASSWORD_RECOVERY') setPasswordRecovery(true);
    });
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!session?.user?.id){setCtx(null);setNav(null);setCalc(defaultCalc);return;}
    if(passwordRecovery)return;
    suppressCalcPersistence.current = false;
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
  },[session?.user?.id,passwordRecovery]);

  useEffect(()=>{
    if(!session?.user?.id || suppressCalcPersistence.current || passwordRecovery)return;
    sessionStorage.setItem(`fenix-calc:${session.user.id}`,JSON.stringify(calc));
  },[calc,session?.user?.id,passwordRecovery]);

  useEffect(()=>{
    if(session?.user?.id && !passwordRecovery && location.pathname==='/') navigate('/inicio',{replace:true});
  },[session?.user?.id,passwordRecovery,location.pathname,navigate]);

  const result=useMemo(()=>{
    try{
      return calculateMortgage({principal:calc.principal,annualRate:calc.rate,years:calc.years,purchasePrice:calc.purchasePrice===''?undefined:Number(calc.purchasePrice),netIncome:calc.income===''?undefined:Number(calc.income),otherPayments:calc.other===''?undefined:Number(calc.other),mortgageType:'fixed'});
    }catch{return null}
  },[calc]);

  const menuItems: NavItem[] = (nav?.items || [])
    .filter((x): x is {label:string;route:string;resource?:string} => Boolean(x.label && x.route))
    .map(x=>({label:x.label,route:x.route,resource:x.resource}));
  const effectiveMenu = menuItems.length ? menuItems : fallbackMenu;
  const activeItem = effectiveMenu.find(item => location.pathname===item.route || (item.route!=='/inicio' && location.pathname.startsWith(`${item.route}/`))) || effectiveMenu[0];

  async function login(e:FormEvent){
    e.preventDefault();
    setAuthError('');
    setResetMessage('');
    const email=resolveTestLogin(loginId);
    if(!email){
      setAuthError('Usuario TEST no reconocido. Puedes escribir DIR-TEST, FIN-A, FIN-B, VIS-A, VIS-B, con espacios o guiones.');
      return;
    }
    setLoadingLogin(true);
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error)setAuthError('No se pudo iniciar sesión TEST. Revisa la contraseña.');
    setLoadingLogin(false);
  }

  async function requestPasswordReset(){
    setAuthError('');
    setResetMessage('');
    const email=resolveTestLogin(loginId);
    if(!email){
      setAuthError('Escribe primero tu usuario TEST: DIR-TEST, FIN-A, FIN-B, VIS-A o VIS-B.');
      return;
    }
    setLoadingReset(true);
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
    setLoadingReset(false);
    if(error){
      setAuthError('No se pudo iniciar la recuperación. Inténtalo de nuevo o solicita un restablecimiento TEST al administrador.');
      return;
    }
    setResetMessage('Recuperación solicitada. Revisa el correo asociado a ese usuario TEST y abre el enlace para crear una nueva contraseña.');
  }

  async function saveRecoveredPassword(e:FormEvent){
    e.preventDefault();
    setAuthError('');
    if(newPassword.length<8){
      setAuthError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if(newPassword!==confirmPassword){
      setAuthError('Las contraseñas no coinciden.');
      return;
    }
    setLoadingLogin(true);
    const {error}=await supabase.auth.updateUser({password:newPassword});
    setLoadingLogin(false);
    if(error){
      setAuthError('No se pudo guardar la nueva contraseña. Abre de nuevo el enlace de recuperación.');
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setPasswordRecovery(false);
    navigate('/inicio',{replace:true});
  }

  async function logout(){
    const uid=session?.user?.id;
    suppressCalcPersistence.current = true;
    if(uid)sessionStorage.removeItem(`fenix-calc:${uid}`);
    setCtx(null);setNav(null);setPassword('');
    await supabase.auth.signOut();
    setCalc(defaultCalc);
    navigate('/',{replace:true});
  }

  if(!authReady)return <div className="auth-shell"><p>Validando sesión TEST…</p></div>;

  if(passwordRecovery)return <div className="auth-shell">
    <button className="theme-toggle auth-theme" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}<span>{theme==='light'?'Oscuro':'Claro'}</span></button>
    <form className="auth-card" onSubmit={saveRecoveredPassword}>
      <div className="brand auth-brand"><div className="brand-mark" role="img" aria-label="Logotipo Fénix Capital"/><div><strong>FÉNIX CAPITAL</strong><span>APP PRE-PROD · Fase 1</span></div></div>
      <span className="eyebrow">RECUPERAR ACCESO</span>
      <h1>Nueva contraseña</h1>
      <p>Crea una nueva contraseña para tu usuario TEST.</p>
      <label htmlFor="fenix-new-password">Nueva contraseña<input id="fenix-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required/></label>
      <label htmlFor="fenix-confirm-password">Repite la contraseña<input id="fenix-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required/></label>
      {authError&&<div className="warning">{authError}</div>}
      <button className="primary" disabled={loadingLogin}>{loadingLogin?'Guardando…':'Guardar nueva contraseña'}</button>
    </form>
  </div>;

  if(!session)return <div className="auth-shell">
    <button className="theme-toggle auth-theme" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}<span>{theme==='light'?'Oscuro':'Claro'}</span></button>
    <form className="auth-card" onSubmit={login}>
      <div className="brand auth-brand"><div className="brand-mark" role="img" aria-label="Logotipo Fénix Capital"/><div><strong>FÉNIX CAPITAL</strong><span>APP PRE-PROD · Fase 1</span></div></div>
      <span className="eyebrow">AUTH TEST</span>
      <h1>Acceso seguro</h1>
      <p>Usa únicamente las identidades TEST autorizadas. No se aceptan datos reales.</p>
      <div className="auth-fields">
        <label className="auth-field" htmlFor="fenix-test-user"><span>Usuario o email TEST</span><input id="fenix-test-user" type="text" autoComplete="username" value={loginId} onChange={e=>setLoginId(e.target.value)} placeholder="Ej. FIN-A o FIN A" required/></label>
        <label className="auth-field" htmlFor="fenix-test-password"><span>Contraseña</span><input id="fenix-test-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Escribe tu contraseña TEST" required/></label>
      </div>
      {authError&&<div className="warning">{authError}</div>}
      {resetMessage&&<div className="warning">{resetMessage}</div>}
      <button className="primary" disabled={loadingLogin}>{loadingLogin?'Entrando…':'Entrar'}</button>
      <button type="button" className="theme-toggle" style={{marginTop:12,width:'100%',justifyContent:'center'}} onClick={requestPasswordReset} disabled={loadingReset}>{loadingReset?'Solicitando…':'¿Has olvidado tu contraseña?'}</button>
    </form>
  </div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark" role="img" aria-label="Logotipo Fénix Capital"/><div><strong>FÉNIX CAPITAL</strong><span>PRE-PROD · Fase 1</span></div></div>
      <nav>{effectiveMenu.map(item=><button className={activeItem?.route===item.route?'nav-item active':'nav-item'} key={item.route} onClick={()=>navigate(item.route)}>{item.label}</button>)}</nav>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><h1>{activeItem?.label || 'Inicio'}</h1><p>{ctx?.actor_code ? `${ctx.actor_code} · ${ctx.role||'Rol TEST'}` : 'Sesión TEST autenticada'}</p></div>
        <div className="top-actions">
          <button className="theme-toggle" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}<span>{theme==='light'?'Oscuro':'Claro'}</span></button>
          <button className="logout" onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/><span>Salir</span></button>
          <div className="avatar">{(ctx?.actor_code||'TT').slice(0,2)}</div>
        </div>
      </header>
      <section className="hero-card"><div><span className="eyebrow">RUTA INTERNA</span><h2>{activeItem?.label || 'Inicio'} · entorno TEST</h2><p>La navegación usa rutas internas del SPA y conserva el contexto autorizado. La Calculadora PRO permanece transversal sin recargar la aplicación.</p></div><div className="hero-kpi"><strong>{ctx?.actor_code||'TEST'}</strong><span>{activeItem?.route || location.pathname}</span></div></section>
      <section className="grid">
        <article className="card"><span className="eyebrow">NAVEGACIÓN</span><h3>Router interno activo</h3><p>Back/forward y cambio de módulo se resuelven dentro de la APP, sin enlaces directos a Notion.</p></article>
        <article className="card"><span className="eyebrow">SEGURIDAD</span><h3>JWT + RBAC servidor</h3><p>La UI consume contexto y navegación autorizados; no envía rol o worker como autoridad confiable.</p></article>
        <article className="card"><span className="eyebrow">CAL-001</span><h3>Motor validado</h3><p>Amortización francesa · fórmula {FORMULA_VERSION}.</p></article>
      </section>
    </main>

    {!calc.open && <button className="calc-launcher" onClick={()=>setCalc(v=>({...v,open:true,minimized:false}))}><Calculator size={20}/>Calculadora PRO</button>}
    {calc.open && <section className={calc.minimized?'calc-panel minimized':'calc-panel'} aria-label="Calculadora Hipotecaria PRO">
      <header><div><span className="eyebrow">CAL-001</span><strong>Calculadora Hipotecaria PRO</strong></div><div className="calc-actions"><button aria-label="Minimizar calculadora" onClick={()=>setCalc(v=>({...v,minimized:!v.minimized}))}><Minimize2 size={17}/></button><button aria-label="Cerrar calculadora" onClick={()=>setCalc(v=>({...v,open:false}))}><X size={17}/></button></div></header>
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
