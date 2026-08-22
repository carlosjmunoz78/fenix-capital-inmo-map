import {FormEvent,useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,FolderPlus,LogOut,Moon,Save,Sun} from 'lucide-react';
import {fetchAppApi,SUPABASE_URL,supabase} from './supabase';
import {anaAvatar,fenixLogo} from './assets/visualAssets';
import './operational.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type Assignee={actor_code:string;name:string;role:string};
type PersonalResponse={items?:Array<{actor_code?:string;name?:string;role?:string}>};
type CreateResponse={ok?:boolean;id?:string;destino?:string;error?:string;cliente_id?:string;cliente_destino?:string;cliente_reutilizado?:boolean};

async function createExpediente(payload:Record<string,unknown>){
 const{data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return{status:401,data:null as CreateResponse|null};
 const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notion-actions-test/expedientes/create`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload)});let data:CreateResponse|null=null;try{data=await r.json()}catch{}return{status:r.status,data};
}

export default function ExpedienteCreateShell(){
 const location=useLocation(),navigate=useNavigate();const active=location.pathname==='/expedientes/nuevo';
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[assignees,setAssignees]=useState<Assignee[]>([]),[nombre,setNombre]=useState(''),[apellidos,setApellidos]=useState(''),[email,setEmail]=useState(''),[telefono,setTelefono]=useState(''),[localidad,setLocalidad]=useState(''),[precio,setPrecio]=useState(''),[importe,setImporte]=useState(''),[target,setTarget]=useState(''),[consent,setConsent]=useState(false);
 const[preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState<CreateResponse|null>(null);
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{const c=await fetchAppApi<Ctx>('/session/context');if(!alive)return;const context=c.status===200?c.data:null;setCtx(context);if(context?.role==='Financiero'){setTarget(context.actor_code||'');setAssignees([]);return;}if(context?.role!=='Direccion'){setTarget('');setAssignees([]);return;}const p=await fetchAppApi<PersonalResponse>('/personal');if(!alive)return;setAssignees((p.status===200?p.data?.items??[]:[]).flatMap(x=>x.actor_code?[{actor_code:x.actor_code,name:x.name?.trim()||x.actor_code,role:x.role?.trim()||'Financiero'}]:[]).filter(x=>x.role==='Financiero').sort((a,b)=>a.name.localeCompare(b.name,'es')));})();return()=>{alive=false};},[active,logged]);
 const allowed=ctx?.role==='Direccion'||ctx?.role==='Financiero';
 const payload=useMemo(()=>({nombre:nombre.trim(),apellidos:apellidos.trim(),email:email.trim(),telefono:telefono.trim(),localidad:localidad.trim(),precio_vivienda:precio===''?null:Number(precio),importe_solicitado:importe===''?null:Number(importe),id_financiero_operativo:target,consentimiento_comercial:consent}),[nombre,apellidos,email,telefono,localidad,precio,importe,target,consent]);
 const valid=allowed&&nombre.trim().length>=2;
 if(!active||!ready||!logged)return null;
 function edit(){setPreview(false);setMessage('');setResult(null);}
 async function submit(e:FormEvent){e.preventDefault();if(!valid)return;if(!preview){setPreview(true);setMessage('');return;}setBusy(true);setMessage('');const r=await createExpediente(payload);setBusy(false);setResult(r.data);if(r.status===201&&r.data?.ok){setMessage(r.data.cliente_reutilizado?'Expediente creado y enlazado al contacto existente. No se ha duplicado el cliente.':'Expediente y contacto de cliente creados y enlazados en las fuentes canónicas.');setPreview(false);}else if(r.status===403&&r.data?.error==='contact_owned_by_other_financial'){setMessage('El contacto ya existe y pertenece a otro ámbito financiero. No se ha creado ningún expediente duplicado.');setPreview(false);}else if(r.status===403)setMessage('Tu perfil no puede abrir este expediente.');else setMessage(`No se pudo crear el expediente (${r.data?.error||r.status}).`);}
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 return <div className="ops-root" data-theme={theme} style={{zIndex:5700}}>
  <aside className="ops-side"><button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button><nav><button onClick={()=>navigate('/expedientes')}><ArrowLeft size={15}/> Volver a Expedientes</button></nav><button className="ops-ana" onClick={()=>navigate('/ana')}><img src={anaAvatar} alt="Ana"/><span><strong>Ana está contigo</strong><small>El cliente se crea o se reutiliza automáticamente.</small></span></button></aside>
  <main className="ops-main"><header className="ops-top"><strong>Nuevo expediente</strong><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{ctx?.role||'Usuario'}</strong></div><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>
   <section className="ops-content"><div className="ops-title"><div><span className="ops-icon"><FolderPlus size={20}/></span><div><h1>Nuevo expediente</h1><p>Alta canónica del expediente y resolución automática del contacto del cliente.</p></div></div><span className="ops-live ok">PRE-PROD</span></div>
    <article className="ops-ana-card"><img src={anaAvatar} alt="Ana"/><div><strong>Ana</strong><p>Al confirmar, primero busco el contacto por email o teléfono. Si ya existe, lo reutilizo; si no existe, lo creo y lo enlazo al expediente. Nunca se obliga a dar de alta el contacto dos veces.</p></div></article>
    {!allowed?<div className="ops-message">Tu perfil no puede crear expedientes.</div>:<form className="ops-message" onSubmit={submit} style={{display:'grid',gap:12}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}><label>Nombre<input value={nombre} onChange={e=>{setNombre(e.target.value);edit()}} maxLength={100} required/></label><label>Apellidos<input value={apellidos} onChange={e=>{setApellidos(e.target.value);edit()}} maxLength={100}/></label><label>Teléfono<input value={telefono} onChange={e=>{setTelefono(e.target.value);edit()}} maxLength={40} inputMode="tel"/></label><label>Email<input value={email} onChange={e=>{setEmail(e.target.value);edit()}} maxLength={200} type="email"/></label><label>Localidad<input value={localidad} onChange={e=>{setLocalidad(e.target.value);edit()}} maxLength={160}/></label><label>Precio vivienda €<input value={precio} onChange={e=>{setPrecio(e.target.value);edit()}} type="number" min="0" step="1"/></label><label>Importe solicitado €<input value={importe} onChange={e=>{setImporte(e.target.value);edit()}} type="number" min="0" step="1"/></label></div>
      {ctx?.role==='Direccion'?<label>Responsable financiero<select value={target} onChange={e=>{setTarget(e.target.value);edit()}}><option value="">Sin asignar por ahora</option>{assignees.map(a=><option key={a.actor_code} value={a.actor_code}>{a.name}</option>)}</select><small>El expediente y el contacto comparten la misma asignación cuando se elige responsable.</small></label>:<label>Responsable financiero<input aria-label="Responsable financiero" value={target||ctx?.actor_code||''} readOnly/></label>}
      <label><input type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);edit()}}/> Consentimiento comercial confirmado</label>
      {preview&&<div className="ops-message"><strong>Vista previa antes de crear</strong><div>Cliente: {[nombre.trim(),apellidos.trim()].filter(Boolean).join(' ')}</div><div>Teléfono: {telefono.trim()||'No indicado'}</div><div>Email: {email.trim()||'No indicado'}</div><div>Localidad: {localidad.trim()||'No indicada'}</div><div>Precio vivienda: {precio||'No indicado'}</div><div>Importe solicitado: {importe||'No indicado'}</div><div>Responsable: {assignees.find(a=>a.actor_code===target)?.name||target||'Sin asignar'}</div><small>Al confirmar, el sistema reutilizará un contacto coincidente por email/teléfono o creará uno nuevo y lo enlazará al expediente.</small></div>}
      {message&&<div className="ops-message">{message}</div>}
      {!result?.ok&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{preview&&<button type="button" onClick={()=>setPreview(false)}>Volver</button>}<button className="primary" disabled={!valid||busy}><Save size={16}/>{busy?'Creando…':preview?'Confirmar y crear':'Revisar antes de crear'}</button></div>}
      {result?.ok&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" onClick={()=>navigate('/expedientes')}>Volver a Expedientes</button>{result.cliente_destino&&<button type="button" onClick={()=>navigate(result.cliente_destino!)}>Abrir contacto</button>}{result.destino&&<button type="button" className="primary" onClick={()=>navigate(result.destino!)}>Abrir expediente</button>}</div>}
    </form>}
   </section>
  </main>
 </div>;
}
