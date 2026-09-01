import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,CheckCircle2,FileCheck2,FileText,Save} from 'lucide-react';
import {fetchAppApi,SUPABASE_URL,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import {anaAvatar,fenixLogo} from './assets/visualAssets';
import './operational.css';

type AnyRow=Record<string,any>;
type Ctx={role?:string};
type NavItem={label:string;route:string};
type Resource='tareas'|'documentos'|'tasaciones'|'firmas';
type Def={resource:Resource;listRoute:string;runtime:string;title:string;icon:typeof FileText};
type Assignee={actor_code:string;name:string;role:string};
type PersonalResponse={items?:Array<{actor_code?:string;name?:string;role?:string}>};
type VisitadoresResponse={items?:Array<{actor_code?:string;nombre?:string;rol?:string}>};
const defs:Record<string,Def>={
  tareas:{resource:'tareas',listRoute:'/agenda',runtime:'/tareas',title:'Tarea',icon:CheckCircle2},
  documentacion:{resource:'documentos',listRoute:'/documentacion',runtime:'/documentos',title:'Documento',icon:FileText},
  tasaciones:{resource:'tasaciones',listRoute:'/tasaciones',runtime:'/tasaciones',title:'Tasación',icon:FileText},
  firmas:{resource:'firmas',listRoute:'/firmas',runtime:'/firmas',title:'FEIN / Firma',icon:FileCheck2}
};
function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}
function pretty(k:string){return k.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase())}
function val(v:any){if(v===null||v===undefined||v==='')return '—';if(typeof v==='boolean')return v?'Sí':'No';if(Array.isArray(v))return v.length?v.map(x=>typeof x==='object'?(x.name||x.id||JSON.stringify(x)):String(x)).join(', '):'—';if(typeof v==='object')return JSON.stringify(v);return String(v)}
function normalizeNav(data:unknown):NavItem[]{if(!data||typeof data!=='object')return[];const items=(data as{items?:unknown[]}).items;if(!Array.isArray(items))return[];return items.map(x=>{if(typeof x==='string')return{label:x.replace(/^\//,'')||'Inicio',route:x};if(x&&typeof x==='object'){const o=x as Record<string,unknown>;if(typeof o.route==='string')return{label:typeof o.label==='string'?o.label:o.route.replace(/^\//,''),route:o.route};}return null;}).filter((x):x is NavItem=>Boolean(x));}
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
async function actionApi(resource:Resource,id:string,changes:Record<string,unknown>){const{data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return{status:401,data:null as any};const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notion-actions-test/${resource}/${encodeURIComponent(id)}/action`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'update',changes})});let data:any=null;try{data=await r.json()}catch{}return{status:r.status,data};}

export default function OperationalRecordDetail(){
 const location=useLocation(),navigate=useNavigate();
 const match=location.pathname.match(/^\/(tareas|documentacion|tasaciones|firmas)\/([^/]+)$/);const key=match?.[1]||'';const id=match?.[2]?decodeURIComponent(match[2]):'';const createAlias=id==='nuevo'||id==='nueva';const active=Boolean(match&&!createAlias);const def=defs[key];
 const[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[status,setStatus]=useState<number|null>(null),[data,setData]=useState<any>(null),[loading,setLoading]=useState(false),[msg,setMsg]=useState('');
 const[changes,setChanges]=useState<Record<string,unknown>>({}),[preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[saveMsg,setSaveMsg]=useState('');
 const[assignees,setAssignees]=useState<Assignee[]>([]);
 useEffect(()=>{if(!active||!def)return;let alive=true;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{if(!alive)return;setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNav(n.data):[])}).catch(()=>{if(alive){setCtx(null);setNav([])}});return()=>{alive=false};},[active,key]);
 useEffect(()=>{
  if(!active||def?.resource!=='tareas'||ctx?.role!=='Direccion'){setAssignees([]);return;}
  let alive=true;
  Promise.all([fetchAppApi<PersonalResponse>('/personal'),fetchAppApi<VisitadoresResponse>('/visitadores')]).then(([p,v])=>{
   if(!alive)return;
   const financials=(p.status===200?p.data?.items??[]:[]).flatMap(x=>x.actor_code?[{actor_code:x.actor_code,name:x.name?.trim()||x.actor_code,role:x.role?.trim()||'Financiero'}]:[]);
   const visitors=(v.status===200?v.data?.items??[]:[]).flatMap(x=>x.actor_code?[{actor_code:x.actor_code,name:x.nombre?.trim()||x.actor_code,role:x.rol?.trim()||'Visitador'}]:[]);
   const merged=[...financials,...visitors].filter((x,i,a)=>a.findIndex(y=>y.actor_code===x.actor_code)===i).sort((a,b)=>a.name.localeCompare(b.name,'es'));
   setAssignees(merged);
  }).catch(()=>{if(alive)setAssignees([])});
  return()=>{alive=false};
 },[active,def?.resource,ctx?.role]);
 async function load(){if(!active||!def||!isNotionId(id)){setStatus(404);setMsg('No se ha encontrado la ficha canónica.');return;}setLoading(true);setMsg('');const r=await fetchNotionRuntime<any>(`${def.runtime}/${encodeURIComponent(id)}`);setStatus(r.status);setData(r.data);setLoading(false);if(r.status===403)setMsg('Tu perfil no puede abrir este registro.');else if(r.status===404)setMsg('No se ha encontrado el registro.');else if(r.status!==200)setMsg('No se pudo cargar el registro.');}
 useEffect(()=>{void load();setChanges({});setPreview(false);setSaveMsg('');},[active,key,id]);
 const item=useMemo(()=>data?.item??null,[data]);
 if(!active||!def)return null;const Icon=def.icon;const fields=item?Object.keys(item).filter(k=>!['id','fuente','destino','synthetic'].includes(k)):[];const display=item?.tarea||item?.documento||item?.tasación||item?.tasacion||item?.firma||item?.title||def.title;const effectiveNav=nav.length?nav:fallbackNav;
 function set(k:string,v:unknown){setChanges(c=>({...c,[k]:v}));setPreview(false);setSaveMsg('');}
 const clean=Object.fromEntries(Object.entries(changes).filter(([,v])=>v!==''&&v!==undefined));
 async function save(){if(!Object.keys(clean).length)return;setBusy(true);setSaveMsg('');const r=await actionApi(def.resource,id,clean);setBusy(false);if(r.status===200){setSaveMsg('Cambios guardados y auditados en Notion.');setChanges({});setPreview(false);await load();}else if(r.status===403)setSaveMsg('Tu perfil no puede modificar este registro.');else setSaveMsg(`No se pudo guardar (${r.data?.error||r.status}).`);}
 return <div className="ops-root" style={{zIndex:5400}} data-theme={(sessionStorage.getItem('fenix-theme')||'light')}>
  <aside className="ops-side"><button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button><nav>{effectiveNav.map(item=><button key={item.route} className={item.route===def.listRoute?'active':''} onClick={()=>navigate(item.route)}>{item.label}</button>)}</nav><button className="ops-ana" onClick={()=>navigate('/ana')}><img src={anaAvatar} alt="Ana"/><span><strong>Hablar con Ana</strong><small>Asistente de Fénix Capital</small></span></button></aside>
  <main className="ops-main"><header className="ops-top"><strong>{def.title}</strong></header><section className="ops-content"><button className="inmo-detail-back" onClick={()=>navigate(def.listRoute)}><ArrowLeft size={15}/> Volver a {def.title==='Tarea'?'Agenda':def.title==='Documento'?'Documentación':def.title==='Tasación'?'Tasaciones':'Firmas'}</button>
   <div className="ops-title"><div><span className="ops-icon"><Icon size={20}/></span><div><h1>{display}</h1><p>Fuente canónica Notion · acciones limitadas por rol y propietario.</p></div></div><span className={status===200?'ops-live ok':'ops-live'}>{loading?'Cargando…':status===200?'Notion vivo':'PRE-PROD'}</span></div>
   <article className="ops-ana-card"><img src={anaAvatar} alt="Ana"/><div><strong>Ana</strong><p>Primero te enseño una vista previa. Nada se guarda hasta que confirmes la acción.</p></div></article>
   {msg&&<div className="ops-message">{msg}</div>}
   {item&&<><div className="ops-message" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>{fields.map(k=><div key={k}><small>{pretty(k)}</small><div><strong>{val(item[k])}</strong></div></div>)}</div>
    <div className="ops-table-card"><div className="ops-table-head"><strong>Acción contextual</strong><span>{ctx?.role||'Usuario'} · escritura auditada</span></div><div className="ops-message" style={{display:'grid',gap:10}}>
      {def.resource==='tareas'&&<><label>Estado<select value={String(changes.estado??'')} onChange={e=>set('estado',e.target.value)}><option value="">Sin cambio</option><option>Pendiente</option><option>En curso</option><option>Esperando tercero</option><option>Completada</option><option>Cancelada</option></select></label><label>Criticidad<select value={String(changes.criticidad??'')} onChange={e=>set('criticidad',e.target.value)}><option value="">Sin cambio</option><option>Normal</option><option>Importante</option><option>Crítica</option></select></label><label>Fecha límite<input type="date" value={String(changes.fecha_limite??'')} onChange={e=>set('fecha_limite',e.target.value)}/></label>{ctx?.role==='Direccion'&&<label>Trasladar tarea a<select value={String(changes.id_trabajador_operativo??'')} onChange={e=>set('id_trabajador_operativo',e.target.value)}><option value="">Sin cambio</option>{assignees.map(a=><option key={a.actor_code} value={a.actor_code}>{a.name} · {a.role}</option>)}</select><small>Responsable actual: {val(item?.id_trabajador_operativo)}</small></label>}<label><input type="checkbox" checked={Boolean(changes.completada)} onChange={e=>set('completada',e.target.checked)}/> Marcar completada</label></>}
      {def.resource==='documentos'&&<><label>Estado<select value={String(changes.estado??'')} onChange={e=>set('estado',e.target.value)}><option value="">Sin cambio</option><option>Pendiente</option><option>Recibido</option><option>Preparar</option><option>Preparado</option><option>Revisado</option><option>Válido</option><option>Incorrecto</option><option>Enviado banco</option></select></label><label>Calidad archivo<select value={String(changes.calidad_archivo??'')} onChange={e=>set('calidad_archivo',e.target.value)}><option value="">Sin cambio</option><option>Sin revisar</option><option>Correcta</option><option>Mejorable</option><option>Ilegible</option></select></label><label>Próxima revisión<input type="date" value={String(changes.fecha_proxima_revision??'')} onChange={e=>set('fecha_proxima_revision',e.target.value)}/></label><label><input type="checkbox" checked={Boolean(changes.afecta_criterio_financiero)} onChange={e=>set('afecta_criterio_financiero',e.target.checked)}/> Afecta criterio financiero</label><label>Hallazgo financiero<textarea rows={3} value={String(changes.detalle_hallazgo_financiero??'')} onChange={e=>set('detalle_hallazgo_financiero',e.target.value)}/></label></>}
      {def.resource==='tasaciones'&&<><label>Estado<select value={String(changes.estado??'')} onChange={e=>set('estado',e.target.value)}><option value="">Sin cambio</option><option>Pendiente</option><option>Solicitada</option><option>Visita programada</option><option>Visitada</option><option>Pagada</option><option>Informe recibido</option><option>Enviada banco</option><option>Incidencia</option></select></label><label>Fecha visita<input type="date" value={String(changes.fecha_visita??'')} onChange={e=>set('fecha_visita',e.target.value)}/></label><label>Fecha informe<input type="date" value={String(changes.fecha_informe??'')} onChange={e=>set('fecha_informe',e.target.value)}/></label><label>Incidencia<textarea rows={2} value={String(changes.incidencia??'')} onChange={e=>set('incidencia',e.target.value)}/></label><label>Notas<textarea rows={2} value={String(changes.notas??'')} onChange={e=>set('notas',e.target.value)}/></label>{ctx?.role==='Direccion'&&<label><input type="checkbox" checked={Boolean(changes.validacion_belen)} onChange={e=>set('validacion_belen',e.target.checked)}/> Validación Belén</label>}</>}
      {def.resource==='firmas'&&<><label>Estado<select value={String(changes.estado??'')} onChange={e=>set('estado',e.target.value)}><option value="">Sin cambio</option><option>Pendiente FEIN</option><option>FEIN recibida</option><option>FEIN firmada</option><option>Esperando plazo</option><option>Firma programada</option><option>Firmado</option><option>Incidencia</option></select></label><label>Fecha FEIN<input type="date" value={String(changes.fecha_fein??'')} onChange={e=>set('fecha_fein',e.target.value)}/></label><label>Fecha firma FEIN<input type="date" value={String(changes.fecha_firma_fein??'')} onChange={e=>set('fecha_firma_fein',e.target.value)}/></label><label>Fecha y hora firma<input type="datetime-local" value={String(changes.fecha_hora_firma??'')} onChange={e=>set('fecha_hora_firma',e.target.value)}/></label><label><input type="checkbox" checked={Boolean(changes.fein_explicada)} onChange={e=>set('fein_explicada',e.target.checked)}/> FEIN explicada al cliente</label><label>Incidencia<textarea rows={2} value={String(changes.incidencia??'')} onChange={e=>set('incidencia',e.target.value)}/></label><label>Notas<textarea rows={2} value={String(changes.notas??'')} onChange={e=>set('notas',e.target.value)}/></label></>}
      {preview&&<div className="ops-message"><strong>Vista previa</strong><div>{Object.entries(clean).map(([k,v])=><div key={k}>{pretty(k)}: {val(v)}</div>)}</div><small>Confirma para escribir únicamente estos cambios en Notion.</small></div>}
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>{!preview?<button className="primary" disabled={!Object.keys(clean).length} onClick={()=>setPreview(true)}>Revisar antes de guardar</button>:<><button onClick={()=>setPreview(false)}>Volver</button><button className="primary" disabled={busy} onClick={save}><Save size={16}/>{busy?'Guardando…':'Confirmar y guardar'}</button></>}{saveMsg&&<span>{saveMsg}</span>}</div>
    </div></div></>}
  </section></main>
 </div>;
}
