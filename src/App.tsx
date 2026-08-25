import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, Eye, EyeOff, LogOut, Minimize2, Moon, Sun, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { useLocation, useNavigate } from 'react-router-dom';
import { calculateMortgage } from './calculator';
import { fetchAppApi, supabase } from './supabase';
import DirectionDashboard from './DirectionDashboard';
import './logo.css';
import './direction.css';

type Theme = 'light' | 'dark';
type SessionContext = { actor_code?: string; role?: string; worker_id?: string; [key: string]: unknown };
type SessionContextPayload = SessionContext | { context?: SessionContext; [key: string]: unknown };
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
const defaultCalc: CalcState = { principal: 100000, rate: 3, years: 30, purchasePrice: '', income: '', other: '', open: false, minimized: false };
const testLoginAliases: Record<string,string> = {
  fina: 'fin-a@test.fenixcapital.es',
  finb: 'fin-b@test.fenixcapital.es',
  visa: 'vis-a@test.fenixcapital.es',
  visb: 'vis-b@test.fenixcapital.es'
};

function resolveLogin(value:string){
  const trimmed=value.trim().toLowerCase();
  if(trimmed.includes('@')) return trimmed;
  const alias=trimmed.replace(/[\s_-]+/g,'');
  return testLoginAliases[alias] || '';
}

function unwrapSessionContext(data:SessionContextPayload|null|undefined):SessionContext|null{
  if(!data || typeof data!=='object') return null;
  const nested=(data as {context?:unknown}).context;
  if(nested && typeof nested==='object') return nested as SessionContext;
  return data as SessionContext;
}

const passwordFieldWrapStyle = { position:'relative' as const };
const passwordEyeStyle = {
  position:'absolute' as const,
  right:'8px',
  bottom:'7px',
  width:'34px',
  height:'34px',
  border:'0',
  borderRadius:'8px',
  background:'transparent',
  color:'var(--muted)',
  display:'grid',
  placeItems:'center',
  cursor:'pointer'
};

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
  const [showPassword,setShowPassword]=useState(false);
  const [rememberDevice,setRememberDevice]=useState(()=>localStorage.getItem('fenix-remember-device')==='true');
  const [authError,setAuthError]=useState('');
  const [resetMessage,setResetMessage]=useState('');
  const [loadingLogin,setLoadingLogin]=useState(false);
  const [loadingReset,setLoadingReset]=useState(false);
  const [passwordRecovery,setPasswordRecovery]=useState(false);
  const [recoveryEmail,setRecoveryEmail]=useState('');
  const [recoveryCode,setRecoveryCode]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [showNewPassword,setShowNewPassword]=useState(false);
  const [showConfirmPassword,setShowConfirmPassword]=useState(false);
  const [calc,setCalc]=useState<CalcState>(defaultCalc);

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    sessionStorage.setItem('fenix-theme',theme);
  },[theme]);

  useEffect(()=>{
    let mounted=true;
    supabase.auth.getSession().then(async ({data})=>{
      const remembered=localStorage.getItem('fenix-remember-device')==='true';
      const activeThisBrowser=sessionStorage.getItem('fenix-session-active')==='1';
      if(data.session && !remembered && !activeThisBrowser){
        await supabase.auth.signOut();
        if(mounted){setSession(null);setAuthReady(true);}
        return;
      }
      if(mounted){setSession(data.session);setAuthReady(true);}
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{
      setSession(next);
      if(event==='PASSWORD_RECOVERY') setPasswordRecovery(true);
    });
    return ()=>{mounted=false;subscription.unsubscribe();};
  },[]);

  useEffect(()=>{
    if(!session?.user?.id){setCtx(null);setNav(null);setCalc(defaultCalc);return;}
    if(passwordRecovery)return;
    suppressCalcPersistence.current = false;
    const key=`fenix-calc:${session.user.id}`;
    const saved=sessionStorage.getItem(key);
    if(saved){
      try{setCalc({...defaultCalc,...JSON.parse(saved),open:false,minimized:false})}
      catch{setCalc(defaultCalc)}
    } else setCalc(defaultCalc);
    Promise.all([
      fetchAppApi<SessionContextPayload>('/session/context'),
      fetchAppApi<NavData>('/navigation')
    ]).then(([c,n])=>{
      setCtx(c.status===200?unwrapSessionContext(c.data):null);
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
  const roleLabel=ctx?.role || 'Usuario';
  const avatarLabel=roleLabel.slice(0,2).toUpperCase();

  async function login(e:FormEvent){
    e.preventDefault();
    setAuthError('');
    setResetMessage('');
    const email=resolveLogin(loginId);
    if(!email){
      setAuthError('No hemos reconocido ese usuario. Revisa los datos de acceso.');
      return;
    }
    setLoadingLogin(true);
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){
      setAuthError('No se pudo iniciar sesión. Revisa el usuario y la contraseña.');
      setLoadingLogin(false);
      return;
    }
    localStorage.setItem('fenix-remember-device',rememberDevice?'true':'false');
    if(rememberDevice) sessionStorage.removeItem('fenix-session-active');
    else sessionStorage.setItem('fenix-session-active','1');
    setLoadingLogin(false);
  }

  async function requestPasswordReset(){
    setAuthError('');
    setResetMessage('');
    const email=resolveLogin(loginId);
    if(!email){
      setAuthError('Escribe primero tu usuario o email.');
      return;
    }
    setLoadingReset(true);
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
    setLoadingReset(false);
    if(error){
      const authFailure=error as {status?:number;code?:string};
      if(authFailure.status===429 || authFailure.code==='over_email_send_rate_limit'){
        setAuthError('Has solicitado varios códigos seguidos. Por seguridad, espera unos minutos antes de volver a intentarlo.');
      }else{
        setAuthError('No se pudo iniciar la recuperación. Inténtalo de nuevo.');
      }
      return;
    }
    setRecoveryEmail(email);
    setPasswordRecovery(true);
    setResetMessage('Código enviado. Revisa tu correo e introdúcelo completo para crear una nueva contraseña.');
  }

  async function saveRecoveredPassword(e:FormEvent){
    e.preventDefault();
    setAuthError('');
    const email=recoveryEmail || resolveLogin(loginId);
    const token=recoveryCode.trim().replace(/\s+/g,'');
    if(!email){setAuthError('No se ha podido identificar el usuario. Vuelve al acceso y solicita un código nuevo.');return;}
    if(!/^\d{4,12}$/.test(token)){setAuthError('Introduce el código numérico completo recibido por correo.');return;}
    if(newPassword.length<8){setAuthError('La nueva contraseña debe tener al menos 8 caracteres.');return;}
    if(newPassword!==confirmPassword){setAuthError('Las contraseñas no coinciden.');return;}
    setLoadingLogin(true);
    const verified=await supabase.auth.verifyOtp({email,token,type:'recovery'});
    if(verified.error){
      setLoadingLogin(false);
      setAuthError('El código no es válido o ha caducado. Solicita uno nuevo.');
      return;
    }
    const {error}=await supabase.auth.updateUser({password:newPassword});
    setLoadingLogin(false);
    if(error){setAuthError('El código se validó, pero no se pudo guardar la nueva contraseña.');return;}
    setRecoveryCode('');setNewPassword('');setConfirmPassword('');setPasswordRecovery(false);setResetMessage('');
    setShowNewPassword(false);setShowConfirmPassword(false);
    navigate('/inicio',{replace:true});
  }

  async function logout(){
    const uid=session?.user?.id;
    suppressCalcPersistence.current = true;
    if(uid)sessionStorage.removeItem(`fenix-calc:${uid}`);
    sessionStorage.removeItem('fenix-session-active');
    setCtx(null);setNav(null);setPassword('');setShowPassword(false);
    await supabase.auth.signOut();
    setCalc(defaultCalc);
    navigate('/',{replace:true});
  }

  if(!authReady)return <div className="auth-shell"><p>Validando sesión…</p></div>;

  if(passwordRecovery)return <div className="auth-shell">
    <button className="theme-toggle auth-theme" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}<span>{theme==='light'?'Oscuro':'Claro'}</span></button>
    <form className="auth-card" onSubmit={saveRecoveredPassword}>
      <div className="brand auth-brand"><div className="brand-mark" role="img" aria-label="Logotipo Fénix Capital"/><div><strong>FÉNIX CAPITAL</strong><span>Área privada</span></div></div>
      <h1>Nueva contraseña</h1>
      <p>Introduce el código recibido por correo completo y crea tu nueva contraseña.</p>
      {resetMessage&&<div className="warning">{resetMessage}</div>}
      <label htmlFor="fenix-recovery-code">Código de recuperación<input id="fenix-recovery-code" inputMode="numeric" autoComplete="one-time-code" value={recoveryCode} onChange={e=>setRecoveryCode(e.target.value.replace(/\D/g,'').slice(0,12))} placeholder="Código recibido" required/></label>
      <label htmlFor="fenix-new-password">Nueva contraseña<div style={passwordFieldWrapStyle}><input id="fenix-new-password" type={showNewPassword?'text':'password'} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} style={{paddingRight:'48px'}} required/><button type="button" style={passwordEyeStyle} onClick={()=>setShowNewPassword(v=>!v)} aria-label={showNewPassword?'Ocultar nueva contraseña':'Mostrar nueva contraseña'}>{showNewPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></label>
      <label htmlFor="fenix-confirm-password">Repite la contraseña<div style={passwordFieldWrapStyle}><input id="fenix-confirm-password" type={showConfirmPassword?'text':'password'} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} style={{paddingRight:'48px'}} required/><button type="button" style={passwordEyeStyle} onClick={()=>setShowConfirmPassword(v=>!v)} aria-label={showConfirmPassword?'Ocultar contraseña repetida':'Mostrar contraseña repetida'}>{showConfirmPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></label>
      {authError&&<div className="warning">{authError}</div>}
      <button className="primary" disabled={loadingLogin}>{loadingLogin?'Validando y guardando…':'Guardar nueva contraseña'}</button>
      <button type="button" className="secondary-action" onClick={()=>{setPasswordRecovery(false);setRecoveryCode('');setAuthError('');setResetMessage('');setShowNewPassword(false);setShowConfirmPassword(false)}}>Volver al acceso</button>
    </form>
  </div>;

  if(!session)return <div className="auth-shell">
    <button className="theme-toggle auth-theme" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}<span>{theme==='light'?'Oscuro':'Claro'}</span></button>
    <form className="auth-card" onSubmit={login}>
      <div className="brand auth-brand"><div className="brand-mark" role="img" aria-label="Logotipo Fénix Capital"/><div><strong>FÉNIX CAPITAL</strong><span>Área privada</span></div></div>
      <h1>Acceso seguro</h1>
      <p>Accede con tu usuario y contraseña.</p>
      <div className="auth-fields">
        <label className="auth-field" htmlFor="fenix-user"><span>Usuario o email</span><input id="fenix-user" type="text" autoComplete="username" value={loginId} onChange={e=>setLoginId(e.target.value)} placeholder="Usuario o email" required/></label>
        <label className="auth-field" htmlFor="fenix-password"><span>Contraseña</span><div style={passwordFieldWrapStyle}><input id="fenix-password" type={showPassword?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña" style={{paddingRight:'48px'}} required/><button type="button" style={passwordEyeStyle} onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Ocultar contraseña':'Mostrar contraseña'}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></label>
      </div>
      <label className="remember-row" htmlFor="fenix-remember-device"><input id="fenix-remember-device" type="checkbox" checked={rememberDevice} onChange={e=>setRememberDevice(e.target.checked)}/><span>Recordarme en este dispositivo</span></label>
      {authError&&<div className="warning">{authError}</div>}
      {resetMessage&&<div className="warning">{resetMessage}</div>}
      <button className="primary" disabled={loadingLogin}>{loadingLogin?'Entrando…':'Entrar'}</button>
      <button type="button" className="forgot-link" onClick={requestPasswordReset} disabled={loadingReset}>{loadingReset?'Solicitando…':'¿Has olvidado tu contraseña?'}</button>
    </form>
  </div>;

  const isDirection = ctx?.actor_code==='DIR-TEST' || roleLabel.toLowerCase().includes('direccion') || roleLabel.toLowerCase().includes('dirección');
  if(isDirection && location.pathname==='/inicio'){
    return <DirectionDashboard onNavigate={route=>navigate(route)} onLogout={logout} calc={calc} setCalc={setCalc} result={result}/>;
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark" role="img" aria-label="Logotipo Fénix Capital"/><div><strong>FÉNIX CAPITAL</strong><span>Área privada</span></div></div>
      <nav>{effectiveMenu.map(item=><button className={activeItem?.route===item.route?'nav-item active':'nav-item'} key={item.route} onClick={()=>navigate(item.route)}>{item.label}</button>)}</nav>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><h1>{activeItem?.label || 'Inicio'}</h1><p>{roleLabel}</p></div>
        <div className="top-actions">
          <button className="theme-toggle" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}<span>{theme==='light'?'Oscuro':'Claro'}</span></button>
          <button className="logout" onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/><span>Salir</span></button>
          <div className="avatar">{avatarLabel}</div>
        </div>
      </header>
      <section className="hero-card"><div><span className="eyebrow">FÉNIX CAPITAL</span><h2>{activeItem?.label || 'Inicio'}</h2><p>Tu espacio de trabajo centralizado. Accede a la información y herramientas disponibles según tu perfil.</p></div><div className="hero-kpi"><strong>{roleLabel}</strong><span>Sesión activa</span></div></section>
      <section className="grid">
        <article className="card"><span className="eyebrow">TRABAJO</span><h3>Acceso centralizado</h3><p>Consulta y gestiona desde aquí los módulos habilitados para tu perfil.</p></article>
        <article className="card"><span className="eyebrow">SEGURIDAD</span><h3>Acceso protegido</h3><p>La información disponible se adapta automáticamente a tus permisos.</p></article>
        <article className="card"><span className="eyebrow">HERRAMIENTAS</span><h3>Calculadora hipotecaria</h3><p>La calculadora permanece disponible mientras trabajas en cualquier módulo.</p></article>
      </section>
    </main>

    {!calc.open && <button className="calc-launcher" onClick={()=>setCalc(v=>({...v,open:true,minimized:false}))}><Calculator size={20}/>Calculadora</button>}
    {calc.open && <section className={calc.minimized?'calc-panel minimized':'calc-panel'} aria-label="Calculadora Hipotecaria">
      <header><div><strong>Calculadora Hipotecaria</strong></div><div className="calc-actions"><button aria-label="Minimizar calculadora" onClick={()=>setCalc(v=>({...v,minimized:!v.minimized}))}><Minimize2 size={17}/></button><button aria-label="Cerrar calculadora" onClick={()=>setCalc(v=>({...v,open:false}))}><X size={17}/></button></div></header>
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
        <p className="calc-note">Simulación orientativa. No implica aprobación bancaria.</p>
      </div>}
    </section>}
  </div>
}