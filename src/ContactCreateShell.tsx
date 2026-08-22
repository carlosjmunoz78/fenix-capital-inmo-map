import {FormEvent,useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,LogOut,Moon,Save,Sun,UserRound} from 'lucide-react';
import {fetchAppApi,SUPABASE_URL,supabase} from './supabase';
import {anaAvatar,fenixLogo} from './assets/visualAssets';
import './operational.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type Assignee={actor_code:string;name:string;role:string};
type PersonalResponse={items?:Array<{actor_code?:string;name?:string;role?:string}>};
type CreateResponse={ok?:boolean;id?:string;destino?:string;error?:string;existing_id?:string};

async function createContact(payload:Record<string,unknown>){
 const{data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return{status:401,data:null as CreateResponse|null};
 const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notion-actions-test/clientes/create`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload)});let data:CreateResponse|null=null;try{data=await r.json()}catch{}return{status:r.status,data};
}

export default function ContactCreateShell(){
 const location=useLocation(),navigate=useNavigate();const active=location.pathname==='/contactos/nuevo';
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[assignees,setAssignees]=useState<Assignee[]>([]),[nombre,setNombre]=useState(''),[apellidos,setApellidos]=useState(''),[email,setEmail]=useState(''),[telefono,setTelefono]=useState(''),[target,setTarget]=useState(''),[consent,setConsent]=useState(false);
 const[preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState<CreateResponse|null>(null);
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{const c=await fetchAppApi<Ctx>('/session/context');if(!alive)return;const context=c.status===200?c.data:null;setCtx(context);if(context?.role==='Financiero'){setTarget(context.actor_code||'');setAssignees([]);return;}if(context?.role!=='Direccion'){setTarget('');setAssignees([]);return;}const p=await fetchAppApi<PersonalResponse>('/personal');if(!alive)return;setAssignees((p.status===200?p.data?.items??[]:[]).flatMap(x=>x.actor_code?[{actor_code:x.actor_code,name:x.name?.trim()||x.actor_code,role:x.role?.trim()||'Financiero'}]:[]).sort((a,b)=>a.name.localeCompare(b.name,'es')));})();return()=>{alive=false};},[active,logged]);
 const allowed=ctx?.role==='Direccion'||ctx?.role==='Financiero';const fullName=[nombre.trim(),apellidos.trim()].filter(Boolean).join(' ');const payload=useMemo(()=>({nombre:nombre.trim(),apellidos:apellidos.trim(),email:email.trim(),telefono:telefono.trim(),id_financiero_operativo:target,consentimiento_comercial:consent}),[nombre,apellidos,email,telefono,target,consent]);const valid=allowed&&nombre.trim().length>=2;
 if(!active||!ready||!logged)return null;
 function edit(){setPreview(false);setMessage('');setResult(null);}
 async function submit(e:FormEvent){e.preventDefault();if(!valid)return;if(!preview){setPreview(true);setMessage('');return;}setBusy(true);setMessage('');const r=await createContact(payload);setBusy(false);setResult(r.data);if(r.status===201&&r.data?.ok){setMessage('Contacto creado en la fuente canónica y auditado.');setPreview(false);}else if(r.status===409&&r.data?.error==='duplicate_contact'){setMessage('Ya existe un contacto con ese email o teléfono. No se ha creado un duplicado.');setPreview(false);}else if(r.status===403)setMessage('Tu perfil no puede crear contactos.');else setMessage(`No se pudo crear el contacto (${r.data?.error||r.status}).`);}
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 return <div className="ops-root" data-theme={theme} style={{zIndex:5600}}>
  <aside className="ops-side"><button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button><nav><button onClick={()=>navigate('/contactos')}><ArrowLeft size={15}/> Volver a Contactos</button></nav><button className="ops-ana" onClick={()=>navigate('/ana')}><img src={anaAvatar} alt="Ana"/><span><strong>Ana está contigo</strong><small>No duplicamos contactos existentes.</small></span></button></aside>
  <main className="ops-main"><header className="ops-top"><strong>Nuevo contacto</strong><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{ctx?.role||'Usuario'}</strong></div><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>
   <section className="ops-content"><div className="ops-title"><div><span className="ops-icon"><UserRound size={20}/></span><div><h1>Nuevo contacto</h1><p>Alta mínima, canónica y sin asignaciones inferidas.</p></div></div><span className="ops-live ok">PRE-PROD</span></div>
    <article className="ops-ana-card"><img src={anaAvatar} alt="Ana"/><div><strong>Ana</strong><p>Antes de crear, compruebo duplicados por email y teléfono. Dirección puede dejar el contacto sin asignar hasta decidir responsable.</p></div></article>
    {!allowed?<div className="ops-message">Tu perfil no puede crear contactos de cliente.</div>:<form className="ops-message" onSubmit={submit} style={{display:'grid',gap:12}}>
      <label>Nombre<input value={nombre} onChange={e=>{setNombre(e.target.value);edit()}} maxLength={100} required/></label><label>Apellidos<input value={apellidos} onChange={e=>{setApellidos(e.target.value);edit()}} maxLength={100}/></label><label>Teléfono<input value={telefono} onChange={e=>{setTelefono(e.target.value);edit()}} maxLength={40} inputMode="tel"/></label><label>Email<input value={email} onChange={e=>{setEmail(e.target.value);edit()}} maxLength={200} type="email"/></label>
      {ctx?.role==='Direccion'?<label>Responsable financiero<select value={target} onChange={e=>{setTarget(e.target.value);edit()}}><option value="">Sin asignar por ahora</option>{assignees.map(a=><option key={a.actor_code} value={a.actor_code}>{a.name}</option>)}</select><small>No se asigna nadie por intuición.</small></label>:<label>Responsable financiero<input aria-label="Responsable financiero" value={target||ctx?.actor_code||''} readOnly/></label>}
      <label><input type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);edit()}}/> Consentimiento comercial confirmado</label>
      {preview&&<div className="ops-message"><strong>Vista previa</strong><div>Contacto: {fullName}</div><div>Teléfono: {telefono.trim()||'No indicado'}</div><div>Email: {email.trim()||'No indicado'}</div><div>Responsable: {assignees.find(a=>a.actor_code===target)?.name||target||'Sin asignar'}</div><div>Estado inicial: Nuevo</div><div>Consentimiento comercial: {consent?'Sí':'No'}</div><small>Confirma para crear exactamente este contacto.</small></div>}
      {message&&<div className="ops-message">{message}</div>}
      {!result?.ok&&result?.error!=='duplicate_contact'&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{preview&&<button type="button" onClick={()=>setPreview(false)}>Volver</button>}<button className="primary" disabled={!valid||busy}><Save size={16}/>{busy?'Creando…':preview?'Confirmar y crear':'Revisar antes de crear'}</button></div>}
      {(result?.ok||result?.error==='duplicate_contact')&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" onClick={()=>navigate('/contactos')}>Volver a Contactos</button>{result.destino&&<button type="button" className="primary" onClick={()=>navigate(result.destino!)}>{result.ok?'Abrir contacto creado':'Abrir contacto existente'}</button>}</div>}
    </form>}
   </section>
  </main>
 </div>;
}
