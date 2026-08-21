import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, CalendarDays, FileCheck2, FileText, FolderOpen, Home, Landmark, LogOut, Moon, Search, Sun, UserRound, Users } from 'lucide-react';
import { fetchAppApi, supabase, SUPABASE_URL } from './supabase';
import { fenixLogo, anaAvatar } from './assets/visualAssets';
import './operational.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type NavItem={label:string;route:string;resource?:string};
type NavResponse={items?:NavItem[]};
type AnyRow=Record<string,unknown>;

type ModuleDef={title:string;endpoint?:string;description:string;icon:typeof Home};
const modules:Record<string,ModuleDef>={
  '/expedientes':{title:'Expedientes',endpoint:'/expedientes',description:'Cartera hipotecaria autorizada para tu perfil.',icon:FolderOpen},
  '/bancos':{title:'Bancos',endpoint:'/bancos',description:'Entidades y capacidades bancarias disponibles.',icon:Landmark},
  '/contactos':{title:'Contactos',description:'Vista federada de clientes, contactos bancarios e inmobiliarias.',icon:Users},
  '/inmobiliarias':{title:'Inmobiliarias',endpoint:'/inmobiliarias',description:'Cartera B2B autorizada por usuario y ámbito.',icon:Building2},
  '/tasaciones':{title:'Tasaciones',endpoint:'/tasaciones',description:'Pre-tasación, tasación, desviaciones y validación.',icon:FileText},
  '/firmas':{title:'Firmas',endpoint:'/firmas',description:'FEIN, notaría y cierre de firma.',icon:FileCheck2},
  '/documentacion':{title:'Documentación',endpoint:'/documentos',description:'Documentos y versiones dentro del ámbito autorizado.',icon:FileText},
  '/financieros':{title:'Financieros',endpoint:'/personal',description:'Carga operativa del equipo financiero.',icon:UserRound},
  '/visitadores':{title:'Visitadores',description:'Cartera y actividad B2B por visitador.',icon:Users},
  '/agenda':{title:'Agenda',endpoint:'/tareas',description:'Tareas, vencimientos y trabajo asignado.',icon:CalendarDays},
  '/tareas':{title:'Agenda',endpoint:'/tareas',description:'Tareas, vencimientos y trabajo asignado.',icon:CalendarDays},
  '/informes':{title:'Informes',description:'Informes vivos y trazables de PRE-PROD.',icon:FileText},
  '/economia':{title:'Economía',description:'Panel económico reservado a Dirección.',icon:Landmark},
  '/buscar':{title:'Buscador',description:'Búsqueda transversal según permisos efectivos.',icon:Search},
};

const fallbackNav:NavItem[]=[
  {label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},
  {label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},
  {label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Agenda',route:'/agenda'},{label:'Informes',route:'/informes'}
];

function pathKey(pathname:string){
  const hit=Object.keys(modules).find(k=>pathname===k||pathname.startsWith(`${k}/`));
  return hit||'';
}
function rowsFrom(data:unknown):AnyRow[]{
  if(!data||typeof data!=='object')return [];
  const d=data as Record<string,unknown>;
  for(const key of ['items','expedientes','bancos','documentos','tareas','tasaciones','firmas','results','reports']){
    if(Array.isArray(d[key]))return d[key] as AnyRow[];
  }
  return [];
}
function prettyKey(k:string){return k.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase());}
function prettyValue(v:unknown){
  if(v===null||v===undefined||v==='')return '—';
  if(typeof v==='boolean')return v?'Sí':'No';
  if(typeof v==='object')return JSON.stringify(v);
  return String(v);
}

async function fetchReports(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return {status:401,data:null};
  const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-reports-api-test/reports`,{headers:{Authorization:`Bearer ${session.access_token}`}});
  let data:unknown=null;try{data=await r.json()}catch{data=null}
  return {status:r.status,data};
}

export default function OperationalShell(){
  const location=useLocation();
  const navigate=useNavigate();
  const key=pathKey(location.pathname);
  const module=modules[key];
  const [sessionReady,setSessionReady]=useState(false);
  const [logged,setLogged]=useState(false);
  const [ctx,setCtx]=useState<Ctx|null>(null);
  const [nav,setNav]=useState<NavItem[]>([]);
  const [theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState<number|null>(null);
  const [rows,setRows]=useState<AnyRow[]>([]);
  const [message,setMessage]=useState('');
  const [search,setSearch]=useState(()=>new URLSearchParams(location.search).get('q')||'');

  useEffect(()=>{
    let alive=true;
    supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setSessionReady(true)}});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setSessionReady(true)});
    return()=>{alive=false;subscription.unsubscribe()};
  },[]);

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    sessionStorage.setItem('fenix-theme',theme);
  },[theme]);

  useEffect(()=>{
    if(!logged||!module)return;
    Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<NavResponse>('/navigation')]).then(([c,n])=>{
      setCtx(c.status===200?c.data:null);
      setNav(n.status===200?(n.data?.items||[]):[]);
    });
  },[logged,module?.title]);

  useEffect(()=>{
    if(!logged||!module)return;
    let alive=true;
    async function load(){
      setLoading(true);setRows([]);setMessage('');setStatus(null);
      if(key==='/contactos'||key==='/visitadores'||key==='/economia'){
        setMessage('Este módulo ya está definido en el plan maestro, pero todavía no se expone desde el gateway PRE-PROD. No se muestran datos de demostración.');
        setStatus(503);setLoading(false);return;
      }
      if(key==='/buscar'){
        const q=new URLSearchParams(location.search).get('q')?.trim()||'';
        if(q.length<2){setMessage('Escribe al menos 2 caracteres para buscar.');setStatus(200);setLoading(false);return;}
        const r=await fetchAppApi<unknown>(`/search?q=${encodeURIComponent(q)}`);
        if(!alive)return;setStatus(r.status);setRows(rowsFrom(r.data));if(r.status!==200)setMessage('No se pudo completar la búsqueda.');setLoading(false);return;
      }
      if(key==='/informes'){
        const r=await fetchReports();if(!alive)return;setStatus(r.status);setRows(rowsFrom(r.data));if(r.status!==200)setMessage('No se pudieron cargar los informes.');setLoading(false);return;
      }
      if(!module.endpoint){setMessage('Módulo pendiente de conexión PRE-PROD.');setStatus(503);setLoading(false);return;}
      const r=await fetchAppApi<unknown>(module.endpoint);
      if(!alive)return;
      setStatus(r.status);setRows(rowsFrom(r.data));
      if(r.status===403)setMessage('Tu perfil no tiene acceso a este módulo.');
      else if(r.status!==200)setMessage('No se pudo cargar el módulo.');
      setLoading(false);
    }
    load();return()=>{alive=false};
  },[logged,key,location.search,module?.endpoint]);

  const effectiveNav=useMemo(()=>nav.length?nav:fallbackNav,[nav]);
  const columns=useMemo(()=>{
    const first=rows[0];if(!first)return [];
    return Object.keys(first).filter(k=>!['id','synthetic','updated_at','created_at'].includes(k)).slice(0,6);
  },[rows]);

  if(!sessionReady||!logged||!module)return null;
  const Icon=module.icon;
  function submitSearch(){const q=search.trim();navigate(q?`/buscar?q=${encodeURIComponent(q)}`:'/buscar');}
  async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}

  return <div className="ops-root" data-theme={theme}>
    <aside className="ops-side">
      <button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button>
      <nav>{effectiveNav.map(item=><button key={item.route} className={location.pathname===item.route?'active':''} onClick={()=>navigate(item.route)}>{item.label}</button>)}</nav>
      <button className="ops-ana" onClick={()=>navigate('/ana')}><img src={anaAvatar} alt="Ana"/><span><strong>Hablar con Ana</strong><small>Asistente de Fénix Capital</small></span></button>
    </aside>
    <main className="ops-main">
      <header className="ops-top">
        <div className="ops-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitSearch()}} placeholder="Buscar expediente, cliente, banco, inmobiliaria..."/><button onClick={submitSearch}>Buscar</button></div>
        <div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{ctx?.role||'Usuario'}</strong></div><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div>
      </header>
      <section className="ops-content">
        <div className="ops-title"><div><span className="ops-icon"><Icon size={20}/></span><div><h1>{module.title}</h1><p>{module.description}</p></div></div><span className={status===200?'ops-live ok':'ops-live'}>{loading?'Cargando…':status===200?'Datos vivos':'PRE-PROD'}</span></div>
        <article className="ops-ana-card"><img src={anaAvatar} alt="Ana"/><div><strong>Ana</strong><p>Te muestro solo información permitida por tu sesión. Si falta una conexión, lo indico en lugar de inventar datos.</p></div></article>
        {message&&<div className="ops-message">{message}</div>}
        {!loading&&status===200&&rows.length===0&&!message&&<div className="ops-empty"><strong>Sin registros visibles</strong><span>No hay datos para tu ámbito actual.</span></div>}
        {rows.length>0&&<div className="ops-table-card"><div className="ops-table-head"><strong>{rows.length} registros</strong><span>Fuente autorizada PRE-PROD</span></div><div className="ops-table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{prettyKey(c)}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={String(row.id??row.expediente_code??row.inmobiliaria_code??row.tarea_code??row.appraisal_code??row.firma_code??i)}>{columns.map(c=><td key={c}>{prettyValue(row[c])}</td>)}</tr>)}</tbody></table></div></div>}
      </section>
    </main>
  </div>;
}
