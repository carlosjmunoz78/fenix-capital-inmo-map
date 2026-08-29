import {FormEvent,useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {LogOut,Moon,Save,Sun,UserRound} from 'lucide-react';
import {fetchAppApi,SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,supabase} from './supabase';
import {anaVertical} from './assets/visualAssets';
import OperationalShellFrame from './OperationalShellFrame';
import type {NavItem} from './masterNavigation';
import './operational.css';
import './contact-detail.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type Assignee={actor_code:string;name:string;role:string};
type PersonalResponse={items?:Array<{actor_code?:string;name?:string;role?:string}>};
type CreateResponse={ok?:boolean;id?:string;destino?:string;error?:string;existing_id?:string;entidad_id?:string|null;entidad_tipo?:string|null;entidad_nombre?:string|null};
type ContactType='cliente_hipoteca_particular'|'cliente_hipoteca_inmobiliaria'|'cliente_deuda_refinanciacion'|'cliente_herencia'|'cliente_obra_nueva'|'trabajador_inmobiliaria'|'trabajador_notaria'|'trabajador_registro'|'contacto_bancario'|'tasador'|'proveedor'|'otro';
type EntityKind=''|'inmobiliaria'|'notaria'|'registro';
type EntityOption={id:string;name:string};

const contactCreateNav:NavItem[]=[{label:'← Volver a Contactos',route:'/contactos'}];
const CONTACT_TYPES:Array<{value:ContactType;label:string;entity:boolean;cargo:boolean;defaultLink?:EntityKind}>=[
 {value:'cliente_hipoteca_particular',label:'Cliente hipotecario particular',entity:false,cargo:false},
 {value:'cliente_hipoteca_inmobiliaria',label:'Cliente hipotecario derivado de inmobiliaria',entity:true,cargo:false,defaultLink:'inmobiliaria'},
 {value:'cliente_deuda_refinanciacion',label:'Cliente de deuda / refinanciación',entity:false,cargo:false},
 {value:'cliente_herencia',label:'Cliente de herencia',entity:false,cargo:false},
 {value:'cliente_obra_nueva',label:'Cliente de obra nueva',entity:false,cargo:false},
 {value:'trabajador_inmobiliaria',label:'Trabajador de inmobiliaria',entity:true,cargo:true,defaultLink:'inmobiliaria'},
 {value:'trabajador_notaria',label:'Trabajador de notaría',entity:true,cargo:true,defaultLink:'notaria'},
 {value:'trabajador_registro',label:'Trabajador de Registro de la Propiedad',entity:true,cargo:true,defaultLink:'registro'},
 {value:'contacto_bancario',label:'Contacto bancario',entity:true,cargo:true},
 {value:'tasador',label:'Tasador',entity:true,cargo:true},
 {value:'proveedor',label:'Proveedor',entity:true,cargo:true},
 {value:'otro',label:'Otro contacto',entity:true,cargo:true}
];
const ENTITY_KINDS:Array<{value:EntityKind;label:string}>=[
 {value:'',label:'Sin vincular por ahora'},
 {value:'inmobiliaria',label:'Inmobiliaria'},
 {value:'notaria',label:'Notaría'},
 {value:'registro',label:'Registro de la Propiedad'}
];

async function createContact(payload:Record<string,unknown>){
 const{data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return{status:401,data:null as CreateResponse|null};
 const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-contactos-unified-test`,{method:'POST',headers:{'content-type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload)});let data:CreateResponse|null=null;try{data=await r.json()}catch{}return{status:r.status,data};
}
async function fetchEntityOptions(kind:EntityKind){
 if(!kind)return{status:200,items:[] as EntityOption[]};
 const{data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return{status:401,items:[] as EntityOption[]};
 const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-contactos-unified-test?entity_kind=${encodeURIComponent(kind)}`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`}});let data:{items?:EntityOption[]}|null=null;try{data=await r.json()}catch{}return{status:r.status,items:r.ok&&Array.isArray(data?.items)?data!.items!:[]};
}

export default function ContactCreateShell(){
 const location=useLocation(),navigate=useNavigate();const active=location.pathname==='/contactos/nuevo';
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[assignees,setAssignees]=useState<Assignee[]>([]),[tipo,setTipo]=useState<ContactType>('cliente_hipoteca_particular'),[nombre,setNombre]=useState(''),[apellidos,setApellidos]=useState(''),[email,setEmail]=useState(''),[telefono,setTelefono]=useState(''),[entidad,setEntidad]=useState(''),[entityKind,setEntityKind]=useState<EntityKind>(''),[entityId,setEntityId]=useState(''),[entityOptions,setEntityOptions]=useState<EntityOption[]>([]),[entityLoading,setEntityLoading]=useState(false),[cargo,setCargo]=useState(''),[observaciones,setObservaciones]=useState(''),[target,setTarget]=useState(''),[consent,setConsent]=useState(false);
 const[preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState<CreateResponse|null>(null);
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{const c=await fetchAppApi<Ctx>('/session/context');if(!alive)return;const context=c.status===200?c.data:null;setCtx(context);if(context?.role==='Financiero'){setTarget(context.actor_code||'');setAssignees([]);return;}if(context?.role!=='Direccion'){setTarget('');setAssignees([]);return;}const p=await fetchAppApi<PersonalResponse>('/personal');if(!alive)return;setAssignees((p.status===200?p.data?.items??[]:[]).flatMap(x=>x.actor_code?[{actor_code:x.actor_code,name:x.name?.trim()||x.actor_code,role:x.role?.trim()||'Financiero'}]:[]).sort((a,b)=>a.name.localeCompare(b.name,'es')));})();return()=>{alive=false};},[active,logged]);
 useEffect(()=>{if(!active||!logged||!entityKind){setEntityOptions([]);setEntityId('');return;}let alive=true;setEntityLoading(true);fetchEntityOptions(entityKind).then(r=>{if(!alive)return;setEntityOptions(r.items);setEntityLoading(false);});return()=>{alive=false};},[active,logged,entityKind]);
 const selected=CONTACT_TYPES.find(x=>x.value===tipo)!;
 const selectedEntity=entityOptions.find(x=>x.id===entityId);
 const allowed=ctx?.role==='Direccion'||ctx?.role==='Financiero';
 const fullName=[nombre.trim(),apellidos.trim()].filter(Boolean).join(' ');
 const payload=useMemo(()=>({tipo_contacto:tipo,nombre:nombre.trim(),apellidos:apellidos.trim(),email:email.trim(),telefono:telefono.trim(),entidad_relacionada:selectedEntity?.name||entidad.trim(),entidad_tipo:entityKind,entidad_id:entityId,cargo:cargo.trim(),observaciones:observaciones.trim(),id_financiero_operativo:target,consentimiento_comercial:consent}),[tipo,nombre,apellidos,email,telefono,selectedEntity,entidad,entityKind,entityId,cargo,observaciones,target,consent]);
 const valid=allowed&&Boolean(tipo)&&nombre.trim().length>=2;
 if(!active||!ready||!logged)return null;
 function edit(){setPreview(false);setMessage('');setResult(null);}
 function changeType(next:ContactType){const cfg=CONTACT_TYPES.find(x=>x.value===next)!;setTipo(next);setEntidad('');setCargo('');setEntityKind(cfg.defaultLink||'');setEntityId('');edit();}
 async function submit(e:FormEvent){e.preventDefault();if(!valid)return;if(!preview){setPreview(true);setMessage('');return;}setBusy(true);setMessage('');const r=await createContact(payload);setBusy(false);setResult(r.data);if(r.status===201&&r.data?.ok){setMessage(r.data.entidad_id?'Contacto creado, clasificado y vinculado a su entidad.':'Contacto creado y clasificado desde el origen.');setPreview(false);}else if(r.status===409&&r.data?.error==='duplicate_contact'){setMessage('Ya existe un contacto con ese email o teléfono. No se ha creado un duplicado.');setPreview(false);}else if(r.status===400&&r.data?.error==='entity_not_found'){setMessage('La entidad seleccionada ya no está disponible. Vuelve a seleccionarla.');setPreview(false);}else if(r.status===403)setMessage('Tu perfil no puede crear contactos.');else setMessage(`No se pudo crear el contacto (${r.data?.error||r.status}).`);}
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 const topbar=<header className="ops-top"><strong>Nuevo contacto</strong><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{ctx?.role||'Usuario'}</strong></div><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>;
 return <OperationalShellFrame className="contact-create-root" theme={theme} navigation={contactCreateNav} activeRoute="/contactos" anaSubtitle="Primero clasificamos el contacto; después pedimos solo lo que corresponde." anaRoute="/ana" query="" onQueryChange={()=>{}} searchPlaceholder="" name={ctx?.role||'Usuario'} role="" initials={(ctx?.role||'U').slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} topbar={topbar}>
   <div className="ops-title"><div><span className="ops-icon"><UserRound size={20}/></span><div><h1>Nuevo contacto</h1><p>Primero define qué tipo de contacto es y, cuando corresponda, a qué entidad pertenece.</p></div></div><span className="ops-live ok">PRE-PROD</span></div>
   <section className="contact-create-ana-hero"><div className="contact-detail-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="contact-detail-ana-body"><span>ANA · NUEVO CONTACTO</span><h2>Primero dime quién es y con qué está relacionado</h2><p>Con esa clasificación adapto los datos que pedimos y puedo dejarlo vinculado desde el alta a una inmobiliaria, notaría o Registro de la Propiedad.</p><div className="contact-detail-next"><button type="button" onClick={()=>document.getElementById('tipo-contacto')?.focus()}><b>1</b><strong>Elegir tipo de contacto</strong><small>Clasificar →</small></button><button type="button" onClick={()=>document.getElementById('entidad-tipo')?.focus()}><b>2</b><strong>Vincularlo correctamente</strong><small>Elegir entidad →</small></button><button type="button" onClick={()=>document.querySelector<HTMLFormElement>('form.ops-message')?.scrollIntoView({behavior:'smooth'})}><b>3</b><strong>Siguiente paso</strong><small>Completar y crear →</small></button></div></div></section>
   {!allowed?<div className="ops-message">Tu perfil no puede crear contactos.</div>:<form className="ops-message" onSubmit={submit} style={{display:'grid',gap:12}}>
     <label>Tipo de contacto<select id="tipo-contacto" value={tipo} onChange={e=>changeType(e.target.value as ContactType)} required>{CONTACT_TYPES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select><small>Esta clasificación se guarda con el contacto y determina qué información adicional tiene sentido pedir.</small></label>
     <label>Vincular este contacto a<select id="entidad-tipo" value={entityKind} onChange={e=>{setEntityKind(e.target.value as EntityKind);setEntityId('');setEntidad('');edit()}}>{ENTITY_KINDS.map(x=><option key={x.value||'none'} value={x.value}>{x.label}</option>)}</select><small>La vinculación es opcional, pero permite saber inmediatamente de qué inmobiliaria, notaría o Registro depende este contacto.</small></label>
     {entityKind&&<label>{entityKind==='inmobiliaria'?'Inmobiliaria':entityKind==='notaria'?'Notaría':'Registro de la Propiedad'}<select value={entityId} onChange={e=>{setEntityId(e.target.value);edit()}} disabled={entityLoading}><option value="">{entityLoading?'Cargando entidades…':'Selecciona una entidad'}</option>{entityOptions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><small>{entityOptions.length||entityLoading?'Se guardará el vínculo con la ficha exacta seleccionada.':'No hay entidades disponibles en tu ámbito para vincular.'}</small></label>}
     {!entityKind&&selected.entity&&<label>{tipo==='cliente_hipoteca_inmobiliaria'?'Entidad de origen':'Empresa / entidad relacionada'}<input value={entidad} onChange={e=>{setEntidad(e.target.value);edit()}} maxLength={200} placeholder={tipo==='contacto_bancario'?'Banco / sucursal':tipo==='tasador'?'Tasadora / empresa':'Nombre de la entidad'}/><small>Si la entidad ya existe como inmobiliaria, notaría o Registro, es mejor vincularla con el selector anterior.</small></label>}
     {selected.cargo&&<label>Cargo / función<input value={cargo} onChange={e=>{setCargo(e.target.value);edit()}} maxLength={140} placeholder="Cargo, puesto o función"/></label>}
     <label>Nombre<input value={nombre} onChange={e=>{setNombre(e.target.value);edit()}} maxLength={100} required/></label><label>Apellidos<input value={apellidos} onChange={e=>{setApellidos(e.target.value);edit()}} maxLength={100}/></label><label>Teléfono<input value={telefono} onChange={e=>{setTelefono(e.target.value);edit()}} maxLength={40} inputMode="tel"/></label><label>Email<input value={email} onChange={e=>{setEmail(e.target.value);edit()}} maxLength={200} type="email"/></label>
     <label>Observaciones<textarea value={observaciones} onChange={e=>{setObservaciones(e.target.value);edit()}} rows={3} maxLength={1200} placeholder="Cualquier dato útil para entender la relación con este contacto"/></label>
     {ctx?.role==='Direccion'?<label>Responsable financiero<select value={target} onChange={e=>{setTarget(e.target.value);edit()}}><option value="">Sin asignar por ahora</option>{assignees.map(a=><option key={a.actor_code} value={a.actor_code}>{a.name}</option>)}</select><small>Si no corresponde a un cliente financiero puede quedar sin asignar.</small></label>:<label>Responsable financiero<input aria-label="Responsable financiero" value={target||ctx?.actor_code||''} readOnly/></label>}
     <label><input type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);edit()}}/> Consentimiento comercial confirmado</label>
     {preview&&<div className="ops-message"><strong>Vista previa</strong><div>Tipo: {selected.label}</div><div>Contacto: {fullName}</div>{entityKind&&<div>Vinculado a: {selectedEntity?.name||'Sin entidad seleccionada'}</div>}{!entityKind&&entidad.trim()&&<div>Entidad indicada: {entidad.trim()}</div>}{cargo.trim()&&<div>Cargo / función: {cargo.trim()}</div>}<div>Teléfono: {telefono.trim()||'No indicado'}</div><div>Email: {email.trim()||'No indicado'}</div><div>Responsable: {assignees.find(a=>a.actor_code===target)?.name||target||'Sin asignar'}</div><div>Estado inicial: Nuevo</div><div>Consentimiento comercial: {consent?'Sí':'No'}</div><small>Confirma para crear este contacto con esta clasificación y vinculación.</small></div>}
     {message&&<div className="ops-message">{message}</div>}
     {!result?.ok&&result?.error!=='duplicate_contact'&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{preview&&<button type="button" onClick={()=>setPreview(false)}>Volver</button>}<button className="primary" disabled={!valid||busy}><Save size={16}/>{busy?'Creando…':preview?'Confirmar y crear':'Revisar antes de crear'}</button></div>}
     {(result?.ok||result?.error==='duplicate_contact')&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" onClick={()=>navigate('/contactos')}>Volver a Contactos</button>{result.destino&&<button type="button" className="primary" onClick={()=>navigate(result.destino!)}>{result.ok?'Abrir contacto creado':'Abrir contacto existente'}</button>}</div>}
   </form>}
 </OperationalShellFrame>;
}
