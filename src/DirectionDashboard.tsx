import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, BarChart3, Bell, Building2, CalendarDays, Calculator,
  ChevronDown, ChevronLeft, ChevronRight, FileCheck2, FileText, FolderOpen,
  Gauge, Home, Landmark, LogOut, Minimize2, Moon, Search, SlidersHorizontal,
  Sun, UserRound, Users, X
} from 'lucide-react';
import { fetchAppApi } from './supabase';
import fenixPhoenix from './assets/fenix-phoenix.svg';
import anaVertical from './assets/ana-vertical.svg';
import anaAvatar from './assets/ana-avatar.svg';

type CalcState={principal:number;rate:number;years:number;purchasePrice:number|'';income:number|'';other:number|'';open:boolean;minimized:boolean};
type MortgageResult={monthlyPayment:number;totalPaid:number;estimatedInterest:number;financingPct:number|null;effortPct:number|null;warnings:string[]}|null;
type Props={onNavigate:(route:string)=>void;onLogout:()=>void;calc:CalcState;setCalc:(updater:(value:CalcState)=>CalcState)=>void;result:MortgageResult};
type Person={name:string;role:string;expedientes:number;firmas_mes:number};
type PersonalResponse={items?:Person[];pending_profiles?:number};
type Theme='light'|'dark';

const menu=[
  ['Inicio','/inicio',Home],['Expedientes','/expedientes',FolderOpen],['Bancos','/bancos',Landmark],
  ['Contactos','/contactos',Users],['Inmobiliarias','/inmobiliarias',Building2],['Tasaciones','/tasaciones',FileText],
  ['Firmas','/firmas',FileCheck2],['Documentación','/documentacion',FileText],['Financieros','/financieros',UserRound],
  ['Visitadores','/visitadores',Users],['Economía','/economia',Gauge],['Agenda','/agenda',CalendarDays],['Informes','/informes',BarChart3]
] as const;

const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'FC';

const refinementCss=`
.dir-shell{grid-template-columns:180px minmax(0,1fr)}
.dir-sidebar{padding:16px 12px 16px}
.dir-brand{height:58px;gap:8px;padding:0 6px 11px}
.dir-brand-logo{width:34px;height:28px;object-fit:contain;display:block;flex:0 0 auto}
.dir-brand strong{font-size:11.5px;letter-spacing:.035em}
.dir-topbar{height:62px;padding:0 20px;grid-template-columns:auto minmax(300px,460px) 1fr;gap:14px}
.dir-content{max-width:1220px;padding:12px 14px 20px}
.dir-dashboard-top{grid-template-columns:270px minmax(0,1fr);gap:10px}
.dir-priority-card{grid-template-columns:112px 1fr;min-height:282px}
.dir-person-wrap{background:linear-gradient(180deg,#fff9f6,#f7f4f2)}
.dir-person-photo{display:block;width:100%;height:100%;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 6px 14px rgba(0,0,0,.08))}
.dir-help-avatar{width:36px;height:36px;border-radius:50%;object-fit:cover;object-position:center 20%;background:#fff;display:block}
.dir-theme-toggle{height:31px;border:1px solid #e7e7e7;background:#fff;color:#333;border-radius:7px;padding:0 9px;display:flex;align-items:center;gap:6px;font-size:9px;font-weight:700;cursor:pointer;white-space:nowrap}
.dir-theme-toggle:hover{border-color:#ffd3c0;background:#fffaf7}
.dir-kpis{gap:8px;margin-bottom:9px}.dir-kpi{height:96px;padding:10px 9px 7px}
.dir-mid-grid{gap:10px;margin-top:10px}.dir-quick{margin-top:10px}.dir-quick-grid{gap:10px}.dir-quick-grid button{height:58px}
.dir-shell[data-dir-theme='dark']{background:#151516;color:#f4f4f5}
.dir-shell[data-dir-theme='dark'] .dir-sidebar,.dir-shell[data-dir-theme='dark'] .dir-main,.dir-shell[data-dir-theme='dark'] .dir-topbar{background:#1b1b1d;color:#f4f4f5;border-color:#343438}
.dir-shell[data-dir-theme='dark'] .dir-brand{background:#1b1b1d;border-color:#343438;color:#f4f4f5}
.dir-shell[data-dir-theme='dark'] .dir-nav-item{color:#d7d7db}
.dir-shell[data-dir-theme='dark'] .dir-nav-item svg{color:#aaaab2}
.dir-shell[data-dir-theme='dark'] .dir-nav-item:hover,.dir-shell[data-dir-theme='dark'] .dir-profile:hover{background:#28282c}
.dir-shell[data-dir-theme='dark'] .dir-nav-item.active{background:#3a241d;color:#ff7a42}
.dir-shell[data-dir-theme='dark'] .dir-help-card,.dir-shell[data-dir-theme='dark'] .dir-kpi,.dir-shell[data-dir-theme='dark'] .dir-table-card,.dir-shell[data-dir-theme='dark'] .dir-quick-grid button,.dir-shell[data-dir-theme='dark'] .dir-search,.dir-shell[data-dir-theme='dark'] .dir-advanced,.dir-shell[data-dir-theme='dark'] .dir-theme-toggle,.dir-shell[data-dir-theme='dark'] .dir-team-person{background:#202023;color:#f4f4f5;border-color:#39393e}
.dir-shell[data-dir-theme='dark'] .dir-search input,.dir-shell[data-dir-theme='dark'] .dir-search button,.dir-shell[data-dir-theme='dark'] .dir-bell,.dir-shell[data-dir-theme='dark'] .dir-logout{color:#d0d0d5}
.dir-shell[data-dir-theme='dark'] .dir-empty-state,.dir-shell[data-dir-theme='dark'] .dir-empty-compact{background:#242427;color:#d2d2d6;border-color:#3b3b40}
.dir-shell[data-dir-theme='dark'] .dir-empty-state>span,.dir-shell[data-dir-theme='dark'] .dir-empty-compact strong{color:#f0f0f2}
.dir-shell[data-dir-theme='dark'] .dir-empty-state>small,.dir-shell[data-dir-theme='dark'] .dir-empty-compact small,.dir-shell[data-dir-theme='dark'] .dir-user-copy span,.dir-shell[data-dir-theme='dark'] .dir-help-card span{color:#aaaab2}
.dir-shell[data-dir-theme='dark'] .dir-section-head{border-color:#35353a}
.dir-shell[data-dir-theme='dark'] .dir-priority-card{background:#202023;border-color:#39393e}
.dir-shell[data-dir-theme='dark'] .dir-person-wrap{background:linear-gradient(180deg,#272326,#1d1d1f)}
.dir-shell[data-dir-theme='dark'] .dir-theme-toggle:hover,.dir-shell[data-dir-theme='dark'] .dir-kpi:hover,.dir-shell[data-dir-theme='dark'] .dir-team-person:hover,.dir-shell[data-dir-theme='dark'] .dir-quick-grid button:hover{background:#2c2929;border-color:#70402c}
@media(max-width:1000px){.dir-shell{grid-template-columns:76px 1fr}.dir-dashboard-top{grid-template-columns:220px 1fr}.dir-brand-logo{width:38px;height:30px}.dir-theme-toggle span{display:none}.dir-theme-toggle{width:31px;padding:0;justify-content:center}}
@media(max-width:760px){.dir-shell{display:block}.dir-theme-toggle{display:flex}.dir-dashboard-top{grid-template-columns:1fr}.dir-priority-card{grid-template-columns:110px 1fr}.dir-person-photo{max-height:260px}}
`;

export default function DirectionDashboard({onNavigate,onLogout,calc,setCalc,result}:Props){
  const [people,setPeople]=useState<Person[]>([]);
  const [peopleLoading,setPeopleLoading]=useState(true);
  const [pendingProfiles,setPendingProfiles]=useState(0);
  const [search,setSearch]=useState('');
  const [theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
  const teamRail=useRef<HTMLDivElement|null>(null);

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    sessionStorage.setItem('fenix-theme',theme);
  },[theme]);

  useEffect(()=>{
    let alive=true;
    fetchAppApi<PersonalResponse>('/personal').then(r=>{
      if(!alive)return;
      setPeople(r.status===200?(r.data?.items??[]):[]);
      setPendingProfiles(r.status===200?(r.data?.pending_profiles??0):0);
      setPeopleLoading(false);
    }).catch(()=>{if(alive)setPeopleLoading(false)});
    return()=>{alive=false};
  },[]);

  function runSearch(){
    const q=search.trim();
    onNavigate(q?`/buscar?q=${encodeURIComponent(q)}`:'/buscar');
  }
  function scrollTeam(direction:number){teamRail.current?.scrollBy({left:direction*250,behavior:'smooth'});}

  return <div className="dir-shell" data-dir-theme={theme}>
    <style>{refinementCss}</style>
    <aside className="dir-sidebar">
      <button className="dir-brand" onClick={()=>onNavigate('/inicio')} aria-label="Inicio Fénix Capital">
        <img className="dir-brand-logo" src={fenixPhoenix} alt=""/><span><strong>FÉNIX CAPITAL</strong></span>
      </button>
      <nav className="dir-nav">{menu.map(([label,route,Icon],i)=><button key={label} className={i===0?'dir-nav-item active':'dir-nav-item'} onClick={()=>onNavigate(route)}><Icon size={16}/><span>{label}</span></button>)}</nav>
      <div className="dir-help-card">
        <div><strong>¿Necesitas ayuda?</strong><span>Pregunta a Ana, tu asistente inteligente.</span></div>
        <div className="dir-help-person"><img className="dir-help-avatar" src={anaAvatar} alt="Ana"/></div>
        <button onClick={()=>onNavigate('/ana')}>Abrir chat con Ana <span>→</span></button>
      </div>
    </aside>

    <main className="dir-main">
      <header className="dir-topbar">
        <button className="dir-advanced" onClick={()=>onNavigate('/buscar')}><SlidersHorizontal size={15}/>Buscador avanzado</button>
        <div className="dir-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')runSearch()}} placeholder="Buscar expediente, cliente, banco, inmobiliaria, contacto..."/><button onClick={runSearch} aria-label="Buscar"><Search size={15}/></button></div>
        <div className="dir-top-right">
          <button className="dir-theme-toggle" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={15}/>:<Sun size={15}/>}<span>{theme==='light'?'Oscuro':'Claro'}</span></button>
          <button className="dir-bell" aria-label="Notificaciones" onClick={()=>onNavigate('/tareas')}><Bell size={19}/></button>
          <button className="dir-profile" onClick={()=>onNavigate('/perfil')}><div className="dir-avatar">B</div><div className="dir-user-copy"><strong>Belén Muñoz</strong><span>Directora Financiera</span></div><ChevronDown size={15}/></button>
          <button className="dir-logout" onClick={onLogout} aria-label="Cerrar sesión"><LogOut size={16}/></button>
        </div>
      </header>

      <div className="dir-content">
        <section className="dir-dashboard-top">
          <article className="dir-priority-card">
            <div className="dir-person-wrap"><img className="dir-person-photo" src={anaVertical} alt="Ana"/></div>
            <div className="dir-priority-copy">
              <h1>Hola Belén, buenos días 👋</h1><p>Estas son tus prioridades de hoy.</p>
              <div className="dir-empty-compact"><AlertTriangle size={16}/><span><strong>Sin alertas reales cargadas</strong><small>Las prioridades aparecerán aquí cuando estén conectadas a expedientes y tareas reales.</small></span></div>
              <button className="dir-alert-button" onClick={()=>onNavigate('/tareas')}>Ver todas las alertas <span>›</span></button>
            </div>
          </article>

          <div className="dir-right-top">
            <section className="dir-kpis">
              <button className="dir-kpi" onClick={()=>onNavigate('/expedientes')}><FolderOpen size={17}/><span>EXPEDIENTES<br/>EN CURSO</span><strong>—</strong><small>Dato real pendiente</small></button>
              <button className="dir-kpi" onClick={()=>onNavigate('/firmas')}><FileCheck2 size={17}/><span>FIRMAS<br/>ESTE MES</span><strong>—</strong><small>Dato real pendiente</small></button>
              <button className="dir-kpi" onClick={()=>onNavigate('/firmas')}><FileCheck2 size={17}/><span>FIRMADOS<br/>ESTE MES</span><strong>—</strong><small>Dato real pendiente</small></button>
              <button className="dir-kpi" onClick={()=>onNavigate('/expedientes')}><AlertTriangle size={17}/><span>EN RIESGO</span><strong>—</strong><small>Dato real pendiente</small></button>
              <button className="dir-kpi" onClick={()=>onNavigate('/economia')}><Gauge size={17}/><span>HONORARIOS<br/>PENDIENTES</span><strong>—</strong><small>Dato real pendiente</small></button>
            </section>

            <section className="dir-table-card priorities">
              <div className="dir-section-head"><strong>PRIORIDADES Y TAREAS</strong><button onClick={()=>onNavigate('/tareas')}>Ver todas</button></div>
              <div className="dir-empty-state"><span>No se muestran tareas ficticias.</span><small>Las tareas reales se cargarán aquí desde Agenda/Tareas.</small><button onClick={()=>onNavigate('/tareas')}>Abrir Agenda/Tareas</button></div>
            </section>
          </div>
        </section>

        <section className="dir-mid-grid">
          <article className="dir-table-card team-card">
            <div className="dir-section-head"><strong>EQUIPO FINANCIERO</strong><div className="dir-team-head-actions"><button aria-label="Anterior" onClick={()=>scrollTeam(-1)}><ChevronLeft size={13}/></button><button aria-label="Siguiente" onClick={()=>scrollTeam(1)}><ChevronRight size={13}/></button><button onClick={()=>onNavigate('/financieros')}>Ver todos</button></div></div>
            {peopleLoading?<div className="dir-empty-state"><span>Cargando personal…</span></div>:
              people.length?<div className="dir-team-rail" ref={teamRail}>{people.map(p=><button className="dir-team-person" key={p.name} onClick={()=>onNavigate('/financieros')}>
                <div className="dir-team-avatar">{initials(p.name)}</div><strong>{p.name}</strong><small>{p.role}</small>
                <dl><div><dt>Expedientes</dt><dd>{p.expedientes}</dd></div><div><dt>Firmas mes</dt><dd>{p.firmas_mes}</dd></div></dl>
              </button>)}</div>:
              <div className="dir-empty-state"><span>Aún no hay personal real con ficha completa.</span><small>{pendingProfiles>0?`${pendingProfiles} identidad(es) TEST quedan ocultas hasta tener perfil real.`:'Cuando se dé de alta personal real, sus fichas aparecerán automáticamente aquí.'}</small><button onClick={()=>onNavigate('/financieros')}>Gestionar financieros</button></div>}
          </article>

          <article className="dir-table-card bank-card">
            <div className="dir-section-head"><strong>RANKING BANCOS</strong><button onClick={()=>onNavigate('/bancos')}>Ver análisis completo</button></div>
            <div className="dir-empty-state"><span>Sin ranking ficticio.</span><small>Conversión, respuesta, LTV y confianza aparecerán cuando exista histórico real suficiente.</small><button onClick={()=>onNavigate('/bancos')}>Abrir Bancos</button></div>
          </article>
        </section>

        <section className="dir-quick"><h2>ACCESOS RÁPIDOS</h2><div className="dir-quick-grid">
          <button onClick={()=>onNavigate('/expedientes/nuevo')}><FolderOpen/>+ Nuevo expediente</button>
          <button onClick={()=>onNavigate('/contactos/nuevo')}><UserRound/>+ Nuevo contacto</button>
          <button onClick={()=>onNavigate('/inmobiliarias/nueva')}><Building2/>+ Nueva inmobiliaria</button>
          <button onClick={()=>onNavigate('/agenda')}><CalendarDays/>Agenda</button>
          <button onClick={()=>onNavigate('/documentacion')}><FileText/>Documentación</button>
          <button onClick={()=>onNavigate('/informes')}><BarChart3/>Informes</button>
        </div></section>
      </div>
    </main>

    {!calc.open&&<button className="calc-launcher dir-calc-launcher" onClick={()=>setCalc(v=>({...v,open:true,minimized:false}))}><Calculator size={20}/>Calculadora PRO</button>}
    {calc.open&&<section className={calc.minimized?'calc-panel minimized':'calc-panel'} aria-label="Calculadora Hipotecaria PRO">
      <header><div><strong>Calculadora Hipotecaria PRO</strong></div><div className="calc-actions"><button aria-label="Minimizar calculadora" onClick={()=>setCalc(v=>({...v,minimized:!v.minimized}))}><Minimize2 size={17}/></button><button aria-label="Cerrar calculadora" onClick={()=>setCalc(v=>({...v,open:false}))}><X size={17}/></button></div></header>
      {!calc.minimized&&<div className="calc-body"><div className="calc-grid">
        <label>Importe €<input type="number" min="1" value={calc.principal} onChange={e=>setCalc(v=>({...v,principal:Number(e.target.value)}))}/></label>
        <label>TIN anual %<input type="number" min="0" step="0.01" value={calc.rate} onChange={e=>setCalc(v=>({...v,rate:Number(e.target.value)}))}/></label>
        <label>Plazo años<input type="number" min="1" value={calc.years} onChange={e=>setCalc(v=>({...v,years:Number(e.target.value)}))}/></label>
        <label>Precio compra €<input type="number" min="0" value={calc.purchasePrice} onChange={e=>setCalc(v=>({...v,purchasePrice:e.target.value===''?'':Number(e.target.value)}))}/></label>
        <label>Ingresos netos €/mes<input type="number" min="0" value={calc.income} onChange={e=>setCalc(v=>({...v,income:e.target.value===''?'':Number(e.target.value)}))}/></label>
        <label>Otras cuotas €/mes<input type="number" min="0" value={calc.other} onChange={e=>setCalc(v=>({...v,other:e.target.value===''?'':Number(e.target.value)}))}/></label>
      </div>{result?<div className="result-box"><div><span>Cuota estimada</span><strong>{result.monthlyPayment.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong></div><div className="result-row"><span>Total pagado <b>{result.totalPaid.toLocaleString('es-ES')} €</b></span><span>Intereses <b>{result.estimatedInterest.toLocaleString('es-ES')} €</b></span></div>{result.financingPct!==null&&<div className="result-row"><span>Financiación <b>{result.financingPct}%</b></span>{result.effortPct!==null&&<span>Esfuerzo <b>{result.effortPct}%</b></span>}</div>}{result.warnings.map(w=><div className="warning" key={w}>{w}</div>)}</div>:<div className="warning">Revisa importe, plazo y tipo.</div>}<p className="calc-note">Simulación orientativa. No implica aprobación bancaria.</p></div>}
    </section>}
  </div>;
}