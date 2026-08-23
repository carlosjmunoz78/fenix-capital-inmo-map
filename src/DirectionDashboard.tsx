import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BarChart3, Bell, Building2, CalendarDays, Calculator,
  ChevronDown, ChevronLeft, ChevronRight, FileCheck2, FileText, FolderOpen,
  Gauge, Home, Landmark, LogOut, Minimize2, Moon, Search, SlidersHorizontal,
  Sun, UserRound, Users, X
} from 'lucide-react';
import { fetchAppApi } from './supabase';
import { anaAvatar, anaVertical, fenixLogo } from './assets/visualAssets';
import { useDirectionLiveData } from './useDirectionLiveData';

type CalcState={principal:number;rate:number;years:number;purchasePrice:number|'';income:number|'';other:number|'';open:boolean;minimized:boolean};
type MortgageResult={monthlyPayment:number;totalPaid:number;estimatedInterest:number;financingPct:number|null;effortPct:number|null;warnings:string[]}|null;
type Props={onNavigate:(route:string)=>void;onLogout:()=>void;calc:CalcState;setCalc:(updater:(value:CalcState)=>CalcState)=>void;result:MortgageResult};
type Person={name:string;role:string;expedientes:number;firmas_mes:number};
type PersonalResponse={items?:Person[];pending_profiles?:number};
type NavResponse={items?:Array<{label?:string;route?:string}|string>};
type Theme='light'|'dark';

type MenuItem={label:string;route:string;Icon:typeof Home};
const navMeta:Record<string,{label:string;Icon:typeof Home}>={
  '/inicio':{label:'Inicio',Icon:Home},
  '/expedientes':{label:'Expedientes',Icon:FolderOpen},
  '/bancos':{label:'Bancos',Icon:Landmark},
  '/contactos':{label:'Contactos',Icon:Users},
  '/inmobiliarias':{label:'Inmobiliarias',Icon:Building2},
  '/tasaciones':{label:'Tasaciones',Icon:FileText},
  '/firmas':{label:'Firmas',Icon:FileCheck2},
  '/documentacion':{label:'Documentación',Icon:FileText},
  '/financieros':{label:'Financieros',Icon:UserRound},
  '/visitadores':{label:'Visitadores',Icon:Users},
  '/economia':{label:'Economía',Icon:Gauge},
  '/agenda':{label:'Agenda',Icon:CalendarDays},
  '/informes':{label:'Informes',Icon:BarChart3},
  '/notarias':{label:'Notarías',Icon:Landmark},
  '/notificaciones':{label:'Avisos',Icon:Bell},
  '/comunicaciones':{label:'Comunicaciones',Icon:FileText}
};
const fallbackMenu:MenuItem[]=[{route:'/inicio',label:'Inicio',Icon:Home}];

const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'FC';

const refinementCss=`
.dir-shell{grid-template-columns:196px minmax(0,1fr);font-size:14px}
.dir-sidebar{padding:18px 14px 18px}
.dir-brand{height:64px;gap:10px;padding:0 6px 13px}
.dir-brand-logo{width:39px;height:31px;object-fit:contain;display:block;flex:0 0 auto}
.dir-brand strong{font-size:13px;letter-spacing:.035em}
.dir-nav{gap:4px;padding-top:12px}
.dir-nav-item{height:38px;font-size:13px;gap:11px;padding:0 11px}
.dir-nav-item svg{width:17px;height:17px}
.dir-help-card{padding:12px 11px 11px;grid-template-columns:1fr 42px;gap:8px}
.dir-help-card strong{font-size:11.5px}.dir-help-card span{font-size:10px}.dir-help-card button{height:30px;font-size:10px}
.dir-help-avatar{width:40px;height:40px;border-radius:50%;object-fit:cover;object-position:center 18%;background:#fff;display:block}
.dir-topbar{height:66px;padding:0 22px;grid-template-columns:auto minmax(360px,560px) 1fr;gap:16px}
.dir-advanced{height:35px;padding:0 14px;font-size:11px}
.dir-search{height:35px}.dir-search input{font-size:11px}
.dir-theme-toggle{height:35px;border:1px solid #e7e7e7;background:#fff;color:#333;border-radius:8px;padding:0 11px;display:flex;align-items:center;gap:7px;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap}
.dir-theme-toggle:hover{border-color:#ffd3c0;background:#fffaf7}
.dir-bell,.dir-logout{width:32px;height:32px}.dir-profile{gap:9px}.dir-user-copy strong{font-size:11px}.dir-user-copy span{font-size:9px}.dir-avatar{width:34px;height:34px}
.dir-content{max-width:none;width:100%;padding:12px 18px 18px;margin:0}
.dir-dashboard-top{grid-template-columns:minmax(300px,31%) minmax(0,1fr);gap:10px}
.dir-priority-card{grid-template-columns:minmax(118px,38%) 1fr;min-height:286px}
.dir-person-wrap{background:linear-gradient(180deg,#fff9f6,#f7f4f2)}
.dir-person-photo{display:block;width:100%;height:100%;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 6px 14px rgba(0,0,0,.08))}
.dir-priority-copy{padding:14px 12px 10px}.dir-priority-copy h1{font-size:13px;margin-bottom:4px}.dir-priority-copy>p{font-size:10px;margin-bottom:10px}
.dir-empty-compact{padding:11px 9px;grid-template-columns:18px 1fr;gap:8px}.dir-empty-compact strong{font-size:9.5px}.dir-empty-compact small{font-size:8.5px}
.dir-alert-button{height:31px;font-size:9.5px;margin-top:10px}
.dir-kpis{gap:8px;margin-bottom:9px}.dir-kpi{height:103px;padding:11px 10px 8px}.dir-kpi>svg{width:18px;height:18px;left:9px;top:11px}.dir-kpi>span{font-size:7.5px;margin-left:25px;min-height:21px}.dir-kpi>strong{font-size:21px;margin-top:8px}.dir-kpi>small{font-size:7.5px;margin-top:4px}
.dir-section-head{height:34px;padding:0 11px}.dir-section-head strong{font-size:9.5px}.dir-section-head button{font-size:8.5px}
.dir-empty-state{min-height:140px;padding:18px 22px}.dir-empty-state>span{font-size:10.5px}.dir-empty-state>small{font-size:8.5px;max-width:390px}.dir-empty-state>button{font-size:8.5px;padding:7px 10px}
.dir-live-priorities{display:grid;gap:6px;padding:9px}.dir-live-priority{display:grid;grid-template-columns:1fr auto;gap:5px 10px;width:100%;text-align:left;padding:9px 10px;border:1px solid #ececec;border-radius:10px;background:#fff;color:inherit;cursor:pointer}.dir-live-priority strong{font-size:9.5px}.dir-live-priority small{font-size:8px;color:#777}.dir-live-priority b{grid-row:1/3;grid-column:2;font-size:8px;color:#f36c21;align-self:center}
.dir-mid-grid{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:10px;margin-top:10px}
.dir-team-person{min-width:178px;padding:9px}.dir-team-person>strong{font-size:9px}.dir-team-person>small{font-size:7.5px}.dir-team-person dt,.dir-team-person dd{font-size:7.5px}
.dir-quick{margin-top:10px}.dir-quick h2{font-size:10px;margin-bottom:7px}.dir-quick-grid{gap:10px}.dir-quick-grid button{height:62px;font-size:9px}.dir-quick-grid button svg{width:24px;height:24px}
.dir-calc-launcher{font-size:12px!important}
.dir-shell[data-dir-theme='dark']{background:#151516;color:#f4f4f5}
.dir-shell[data-dir-theme='dark'] .dir-sidebar,.dir-shell[data-dir-theme='dark'] .dir-main,.dir-shell[data-dir-theme='dark'] .dir-topbar{background:#1b1b1d;color:#f4f4f5;border-color:#343438}
.dir-shell[data-dir-theme='dark'] .dir-brand{background:#1b1b1d;border-color:#343438;color:#f4f4f5}
.dir-shell[data-dir-theme='dark'] .dir-nav-item{color:#d7d7db}.dir-shell[data-dir-theme='dark'] .dir-nav-item svg{color:#aaaab2}
.dir-shell[data-dir-theme='dark'] .dir-nav-item:hover,.dir-shell[data-dir-theme='dark'] .dir-profile:hover{background:#28282c}
.dir-shell[data-dir-theme='dark'] .dir-nav-item.active{background:#3a241d;color:#ff7a42}
.dir-shell[data-dir-theme='dark'] .dir-help-card,.dir-shell[data-dir-theme='dark'] .dir-kpi,.dir-shell[data-dir-theme='dark'] .dir-table-card,.dir-shell[data-dir-theme='dark'] .dir-quick-grid button,.dir-shell[data-dir-theme='dark'] .dir-search,.dir-shell[data-dir-theme='dark'] .dir-advanced,.dir-shell[data-dir-theme='dark'] .dir-theme-toggle,.dir-shell[data-dir-theme='dark'] .dir-team-person,.dir-shell[data-dir-theme='dark'] .dir-live-priority{background:#202023;color:#f4f4f5;border-color:#39393e}
.dir-shell[data-dir-theme='dark'] .dir-search input,.dir-shell[data-dir-theme='dark'] .dir-search button,.dir-shell[data-dir-theme='dark'] .dir-bell,.dir-shell[data-dir-theme='dark'] .dir-logout{color:#d0d0d5}
.dir-shell[data-dir-theme='dark'] .dir-empty-state,.dir-shell[data-dir-theme='dark'] .dir-empty-compact{background:#242427;color:#d2d2d6;border-color:#3b3b40}
.dir-shell[data-dir-theme='dark'] .dir-empty-state>span,.dir-shell[data-dir-theme='dark'] .dir-empty-compact strong{color:#f0f0f2}
.dir-shell[data-dir-theme='dark'] .dir-empty-state>small,.dir-shell[data-dir-theme='dark'] .dir-empty-compact small,.dir-shell[data-dir-theme='dark'] .dir-user-copy span,.dir-shell[data-dir-theme='dark'] .dir-help-card span,.dir-shell[data-dir-theme='dark'] .dir-live-priority small{color:#aaaab2}
.dir-shell[data-dir-theme='dark'] .dir-section-head{border-color:#35353a}.dir-shell[data-dir-theme='dark'] .dir-priority-card{background:#202023;border-color:#39393e}.dir-shell[data-dir-theme='dark'] .dir-person-wrap{background:linear-gradient(180deg,#272326,#1d1d1f)}
.dir-shell[data-dir-theme='dark'] .dir-theme-toggle:hover,.dir-shell[data-dir-theme='dark'] .dir-kpi:hover,.dir-shell[data-dir-theme='dark'] .dir-team-person:hover,.dir-shell[data-dir-theme='dark'] .dir-quick-grid button:hover{background:#2c2929;border-color:#70402c}
@media(min-width:1440px){.dir-shell{grid-template-columns:214px minmax(0,1fr)}.dir-sidebar{padding-left:16px;padding-right:16px}.dir-content{padding-left:22px;padding-right:22px}.dir-dashboard-top{grid-template-columns:minmax(330px,30%) minmax(0,1fr)}.dir-priority-card{grid-template-columns:minmax(130px,38%) 1fr}.dir-kpi{height:108px}.dir-empty-state{min-height:150px}.dir-quick-grid button{height:66px}}
@media(max-width:1100px){.dir-shell{grid-template-columns:82px 1fr}.dir-brand{justify-content:center;padding:0 0 10px}.dir-brand>span:last-child{display:none}.dir-brand-logo{width:42px;height:33px}.dir-nav-item{justify-content:center;padding:0}.dir-nav-item span,.dir-help-card{display:none}.dir-topbar{grid-template-columns:auto minmax(260px,1fr) auto}.dir-user-copy{display:none}.dir-dashboard-top{grid-template-columns:240px 1fr}.dir-kpis{grid-template-columns:repeat(3,1fr)}.dir-mid-grid{grid-template-columns:1fr}.dir-quick-grid{grid-template-columns:repeat(3,1fr)}.dir-theme-toggle span{display:none}.dir-theme-toggle{width:35px;padding:0;justify-content:center}}
@media(max-width:760px){.dir-shell{display:block}.dir-sidebar{display:none}.dir-topbar{height:auto;min-height:62px;grid-template-columns:1fr auto;padding:8px 10px}.dir-advanced{display:none}.dir-search{grid-column:1/2}.dir-top-right{grid-column:2/3}.dir-content{padding:8px}.dir-dashboard-top{grid-template-columns:1fr}.dir-priority-card{grid-template-columns:115px 1fr}.dir-person-photo{max-height:270px}.dir-kpis{grid-template-columns:repeat(2,1fr)}.dir-kpi:last-child{grid-column:1/-1}.dir-quick-grid{grid-template-columns:repeat(2,1fr)}}
`;

export default function DirectionDashboard({onNavigate,onLogout,calc,setCalc,result}:Props){
  const [people,setPeople]=useState<Person[]>([]);
  const [peopleLoading,setPeopleLoading]=useState(true);
  const [pendingProfiles,setPendingProfiles]=useState(0);
  const [authorizedNav,setAuthorizedNav]=useState<MenuItem[]>([]);
  const [search,setSearch]=useState('');
  const [theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
  const teamRail=useRef<HTMLDivElement|null>(null);
  const live=useDirectionLiveData();

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    sessionStorage.setItem('fenix-theme',theme);
  },[theme]);

  useEffect(()=>{
    let alive=true;
    Promise.all([fetchAppApi<PersonalResponse>('/personal'),fetchAppApi<NavResponse>('/navigation')]).then(([p,n])=>{
      if(!alive)return;
      setPeople(p.status===200?(p.data?.items??[]):[]);
      setPendingProfiles(p.status===200?(p.data?.pending_profiles??0):0);
      setPeopleLoading(false);
      if(n.status===200&&Array.isArray(n.data?.items)){
        const seen=new Set<string>();
        const next:MenuItem[]=[];
        for(const raw of n.data.items){
          const route=typeof raw==='string'?raw:raw?.route;
          if(!route||route==='/buscar'||seen.has(route)||!navMeta[route])continue;
          const supplied=typeof raw==='string'?'':raw?.label?.trim()||'';
          next.push({route,label:supplied||navMeta[route].label,Icon:navMeta[route].Icon});
          seen.add(route);
        }
        setAuthorizedNav(next);
      }
    }).catch(()=>{if(alive)setPeopleLoading(false)});
    return()=>{alive=false};
  },[]);

  const effectiveMenu=useMemo(()=>authorizedNav.length?authorizedNav:fallbackMenu,[authorizedNav]);

  function runSearch(){
    const q=search.trim();
    onNavigate(q?`/buscar?q=${encodeURIComponent(q)}`:'/buscar');
  }
  function scrollTeam(direction:number){teamRail.current?.scrollBy({left:direction*280,behavior:'smooth'});}
  function kpiValue(ready:boolean,value:number){return ready?String(value):'—';}

  return <div className="dir-shell" data-dir-theme={theme}>
    <style>{refinementCss}</style>
    <aside className="dir-sidebar">
      <button className="dir-brand" onClick={()=>onNavigate('/inicio')} aria-label="Inicio Fénix Capital">
        <img className="dir-brand-logo" src={fenixLogo} alt=""/><span><strong>FÉNIX CAPITAL</strong></span>
      </button>
      <nav className="dir-nav">{effectiveMenu.map(({label,route,Icon})=><button key={route} className={route==='/inicio'?'dir-nav-item active':'dir-nav-item'} onClick={()=>onNavigate(route)}><Icon size={17}/><span>{label}</span></button>)}</nav>
      <div className="dir-help-card">
        <div><strong>¿Necesitas ayuda?</strong><span>Pregunta a Ana, tu asistente inteligente.</span></div>
        <div className="dir-help-person"><img className="dir-help-avatar" src={anaAvatar} alt="Ana"/></div>
        <button onClick={()=>onNavigate('/ana')}>Abrir chat con Ana <span>→</span></button>
      </div>
    </aside>

    <main className="dir-main">
      <header className="dir-topbar">
        <button className="dir-advanced" onClick={()=>onNavigate('/buscar')}><SlidersHorizontal size={16}/>Buscador avanzado</button>
        <div className="dir-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')runSearch()}} placeholder="Buscar expediente, cliente, banco, inmobiliaria, contacto..."/><button onClick={runSearch} aria-label="Buscar"><Search size={16}/></button></div>
        <div className="dir-top-right">
          <button className="dir-theme-toggle" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={16}/>:<Sun size={16}/>}<span>{theme==='light'?'Oscuro':'Claro'}</span></button>
          <button className="dir-bell" aria-label="Notificaciones" onClick={()=>onNavigate('/notificaciones')}><Bell size={20}/></button>
          <button className="dir-profile" onClick={()=>onNavigate('/perfil')}><div className="dir-avatar">D</div><div className="dir-user-copy"><strong>Dirección</strong><span>Dirección</span></div><ChevronDown size={16}/></button>
          <button className="dir-logout" onClick={onLogout} aria-label="Cerrar sesión"><LogOut size={17}/></button>
        </div>
      </header>

      <div className="dir-content">
        <section className="dir-dashboard-top">
          <article className="dir-priority-card">
            <div className="dir-person-wrap"><img className="dir-person-photo" src={anaVertical} alt="Ana"/></div>
            <div className="dir-priority-copy">
              <h1>Buenos días 👋</h1><p>Estas son tus prioridades de hoy.</p>
              {live.tareasReady&&live.priorities.length?<div className="dir-empty-compact"><AlertTriangle size={17}/><span><strong>{live.priorities.length} prioridades reales disponibles</strong><small>Proceden de Agenda/Tareas y respetan tu ámbito autorizado.</small></span></div>:<div className="dir-empty-compact"><AlertTriangle size={17}/><span><strong>{live.tareasReady?'Sin tareas pendientes visibles':'Prioridades no disponibles'}</strong><small>{live.tareasReady?'No hay tareas pendientes en la fuente visible.':'La fuente canónica no ha podido confirmar prioridades.'}</small></span></div>}
              <button className="dir-alert-button" onClick={()=>onNavigate('/agenda')}>Ver Agenda/Tareas <span>›</span></button>
            </div>
          </article>

          <div className="dir-right-top">
            <section className="dir-kpis">
              <button className="dir-kpi" onClick={()=>onNavigate('/expedientes')}><FolderOpen size={18}/><span>EXPEDIENTES<br/>EN CURSO</span><strong>{kpiValue(live.expedientesReady,live.openExp)}</strong><small>{live.expedientesReady?'Derivado de estado/fase canónica':'Dato no disponible'}</small></button>
              <button className="dir-kpi" onClick={()=>onNavigate('/firmas')}><FileCheck2 size={18}/><span>FIRMAS<br/>ESTE MES</span><strong>{kpiValue(live.firmasReady,live.firmasMes)}</strong><small>{live.firmasReady?'Fechas canónicas del mes':'Dato no disponible'}</small></button>
              <button className="dir-kpi" onClick={()=>onNavigate('/firmas')}><FileCheck2 size={18}/><span>FIRMADOS<br/>ESTE MES</span><strong>{kpiValue(live.firmasReady,live.signedMes)}</strong><small>{live.firmasReady?'Estado + fecha canónicos':'Dato no disponible'}</small></button>
              <button className="dir-kpi" onClick={()=>onNavigate('/expedientes')}><AlertTriangle size={18}/><span>EN RIESGO</span><strong>{kpiValue(live.expedientesReady,live.riskExp)}</strong><small>{live.expedientesReady?'Solo riesgo explícito visible':'Dato no disponible'}</small></button>
              <button className="dir-kpi" onClick={()=>onNavigate('/economia')}><Gauge size={18}/><span>HONORARIOS<br/>PENDIENTES</span><strong>—</strong><small>Sin fuente económica suficiente</small></button>
            </section>
            <section className="dir-table-card priorities">
              <div className="dir-section-head"><strong>PRIORIDADES Y TAREAS</strong><button onClick={()=>onNavigate('/agenda')}>Ver todas</button></div>
              {live.tareasReady&&live.priorities.length?<div className="dir-live-priorities">{live.priorities.map((p,i)=><button className="dir-live-priority" key={p.id||`${p.title}-${i}`} onClick={()=>onNavigate('/agenda')}><strong>{p.title}</strong><small>{p.state} · {p.due}</small><b>ABRIR</b></button>)}</div>:<div className="dir-empty-state"><span>{live.tareasReady?'No hay tareas pendientes visibles.':'No se muestran tareas sin fuente confirmada.'}</span><small>{live.tareasReady?'Agenda está al día para el ámbito visible.':'Abre Agenda para consultar directamente la fuente canónica.'}</small><button onClick={()=>onNavigate('/agenda')}>Abrir Agenda/Tareas</button></div>}
            </section>
          </div>
        </section>

        <section className="dir-mid-grid">
          <article className="dir-table-card team-card">
            <div className="dir-section-head"><strong>EQUIPO FINANCIERO</strong><div className="dir-team-head-actions"><button aria-label="Anterior" onClick={()=>scrollTeam(-1)}><ChevronLeft size={14}/></button><button aria-label="Siguiente" onClick={()=>scrollTeam(1)}><ChevronRight size={14}/></button><button onClick={()=>onNavigate('/financieros')}>Ver todos</button></div></div>
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

    {!calc.open&&<button className="calc-launcher dir-calc-launcher" onClick={()=>setCalc(v=>({...v,open:true,minimized:false}))}><Calculator size={20}/>Calculadora</button>}
    {calc.open&&<section className={calc.minimized?'calc-panel minimized':'calc-panel'} aria-label="Calculadora Hipotecaria">
      <header><div><strong>Calculadora Hipotecaria</strong></div><div className="calc-actions"><button aria-label="Minimizar calculadora" onClick={()=>setCalc(v=>({...v,minimized:!v.minimized}))}><Minimize2 size={17}/></button><button aria-label="Cerrar calculadora" onClick={()=>setCalc(v=>({...v,open:false}))}><X size={17}/></button></div></header>
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
