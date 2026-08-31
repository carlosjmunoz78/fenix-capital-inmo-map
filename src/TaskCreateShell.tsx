import {FormEvent,useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {CalendarDays,LogOut,Moon,Save,Sun} from 'lucide-react';
import {fetchAppApi,SUPABASE_URL,supabase} from './supabase';
import {anaVertical} from './assets/visualAssets';
import OperationalShellFrame from './OperationalShellFrame';
import type {NavItem} from './masterNavigation';
import './operational.css';
import './inmobiliarias-polish.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type Assignee={actor_code:string;name:string;role:string};
type PersonalResponse={items?:Array<{actor_code?:string;name?:string;role?:string}>};
type VisitadoresResponse={items?:Array<{actor_code?:string;nombre?:string;rol?:string}>};
type CreateResponse={ok?:boolean;id?:string;destino?:string;error?:string};

const taskCreateNav:NavItem[]=[{label:'← Volver a Agenda',route:'/agenda'}];

async function createTask(payload:Record<string,unknown>){
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null as CreateResponse|null};
 const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notion-actions-test/tareas/create`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload)});
 let data:CreateResponse|null=null;try{data=await r.json()}catch{}
 return{status:r.status,data};
}

export default function TaskCreateShell(){
 const location=useLocation(),navigate=useNavigate();const active=location.pathname==='/tareas/nueva';
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[assignees,setAssignees]=useState<Assignee[]>([]),[title,setTitle]=useState(''),[target,setTarget]=useState(''),[criticality,setCriticality]=useState(''),[due,setDue]=useState('');
 const[preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[created,setCreated]=useState<CreateResponse|null>(null);
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{const c=await fetchAppApi<Ctx>('/session/context');if(!alive)return;const context=c.status===200?c.data:null;setCtx(context);if(context?.role!=='Direccion'){setTarget(context?.actor_code||'');setAssignees([]);return;}const[p,v]=await Promise.all([fetchAppApi<PersonalResponse>('/personal'),fetchAppApi<VisitadoresResponse>('/visitadores')]);if(!alive)return;const financials=(p.status===200?p.data?.items??[]:[]).flatMap(x=>x.actor_code?[{actor_code:x.actor_code,name:x.name?.trim()||x.actor_code,role:x.role?.trim()||'Financiero'}]:[]);const visitors=(v.status===200?v.data?.items??[]:[]).flatMap(x=>x.actor_code?[{actor_code:x.actor_code,name:x.nombre?.trim()||x.actor_code,role:x.rol?.trim()||'Visitador'}]:[]);setAssignees([...financials,...visitors].filter((x,i,a)=>a.findIndex(y=>y.actor_code===x.actor_code)===i).sort((a,b)=>a.name.localeCompare(b.name,'es')));})();return()=>{alive=false};},[active,logged]);
 const isDirection=ctx?.role==='Direccion';
 const payload=useMemo(()=>({tarea:title.trim(),id_trabajador_operativo:target,...(criticality?{criticidad:criticality}:{}),...(due?{fecha_limite:due}:{})}),[title,target,criticality,due]);
 const valid=title.trim().length>=2&&Boolean(target);
 if(!active||!ready||!logged)return null;
 function edit(){setPreview(false);setMessage('');setCreated(null);}
 async function submit(e:FormEvent){e.preventDefault();if(!valid)return;if(!preview){setPreview(true);setMessage('');return;}setBusy(true);setMessage('');const r=await createTask(payload);setBusy(false);if(r.status===201&&r.data?.ok){setCreated(r.data);setMessage('Tarea creada en la fuente canónica y auditada.');setPreview(false);}else if(r.status===403)setMessage('Tu perfil no puede crear esta tarea con ese responsable.');else setMessage(`No se pudo crear la tarea (${r.data?.error||r.status}).`);}
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 const topbar=<header className="ops-top"><strong>Nueva tarea</strong><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{ctx?.role||'Usuario'}</strong></div><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>;
 return <OperationalShellFrame
  className="task-create-root"
  theme={theme}
  navigation={taskCreateNav}
  activeRoute="/agenda"
  anaSubtitle="Primero revisamos; después creamos."
  anaRoute="/ana"
  query=""
  onQueryChange={()=>{}}
  searchPlaceholder=""
  name={ctx?.role||'Usuario'}
  role=""
  initials={(ctx?.role||'U').slice(0,2).toUpperCase()}
  onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')}
  onLogout={logout}
  topbar={topbar}
 >
   <div className="ops-title"><div><span className="ops-icon"><CalendarDays size={20}/></span><div><h1>Nueva tarea</h1><p>Alta canónica con responsable explícito y confirmación previa.</p></div></div><span className="ops-live ok">PRE-PROD</span></div>
   <section className="inmo-ana-hero"><div className="inmo-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="inmo-ana-body"><span>ANA · NUEVA TAREA</span><h2>Vamos a crearla con responsable y siguiente paso claros</h2><p>No asigno personas por intuición. Primero definimos la tarea, el responsable autorizado, la prioridad y la fecha; después revisas exactamente lo que se va a crear.</p><div className="inmo-next"><button type="button" onClick={()=>document.querySelector<HTMLInputElement>('input[placeholder="Describe la tarea"]')?.focus()}><b>1</b><strong>Completar tarea</strong><small>Ir a datos →</small></button><button type="button" onClick={()=>navigate('/ana?mode=help&resource=tarea&intent=nueva')}><b>2</b><strong>Ayúdame</strong><small>Preparar con Ana →</small></button><button type="button" onClick={()=>document.querySelector<HTMLFormElement>('form.ops-message')?.scrollIntoView({behavior:'smooth'})}><b>3</b><strong>Lo hago yo</strong><small>Continuar abajo ↓</small></button></div></div></section>
   <form className="ops-message" onSubmit={submit} style={{display:'grid',gap:12}}>
     <label>Tarea<input value={title} onChange={e=>{setTitle(e.target.value);edit()}} maxLength={200} placeholder="Describe la tarea" required/></label>
     {isDirection?<label>Responsable<select value={target} onChange={e=>{setTarget(e.target.value);edit()}} required><option value="">Selecciona una persona activa</option>{assignees.map(a=><option key={a.actor_code} value={a.actor_code}>{a.name} · {a.role}</option>)}</select></label>:<label>Responsable<input value={target||ctx?.actor_code||''} readOnly aria-label="Responsable"/><small>La tarea queda asignada a tu identidad operativa.</small></label>}
     <label>Criticidad<select value={criticality} onChange={e=>{setCriticality(e.target.value);edit()}}><option value="">Sin especificar</option><option>Normal</option><option>Importante</option><option>Crítica</option></select></label>
     <label>Fecha límite<input type="date" value={due} onChange={e=>{setDue(e.target.value);edit()}}/></label>
     {preview&&<div className="ops-message"><strong>Vista previa</strong><div>Tarea: {title.trim()}</div><div>Responsable: {assignees.find(a=>a.actor_code===target)?.name||target}</div><div>Estado inicial: Pendiente</div>{criticality&&<div>Criticidad: {criticality}</div>}{due&&<div>Fecha límite: {due}</div>}<small>Confirma para crear exactamente esta tarea en Notion.</small></div>}
     {message&&<div className="ops-message">{message}</div>}
     {!created&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{preview&&<button type="button" onClick={()=>setPreview(false)}>Volver</button>}<button className="primary" disabled={!valid||busy}><Save size={16}/>{busy?'Creando…':preview?'Confirmar y crear':'Revisar antes de crear'}</button></div>}
     {created&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" className="primary" onClick={()=>navigate('/agenda')}>Volver a Agenda</button>{created.destino&&<button type="button" onClick={()=>navigate(created.destino!)}>Abrir tarea creada</button>}</div>}
   </form>
 </OperationalShellFrame>;
}
