import {FormEvent,useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {LogOut,Moon,Plus,Save,Sun,UserPlus,X} from 'lucide-react';
import {fetchAppApi,fetchB2BActionsApi,supabase} from './supabase';
import {anaVertical} from './assets/visualAssets';
import type {NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import './operational.css';
import './inmobiliarias-polish.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type ApiResponse={ok?:boolean;id?:string;destino?:string;error?:string;reused?:boolean;no_op?:boolean};
function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}
function changeAt(items:string[],index:number,value:string){return items.map((x,i)=>i===index?value:x)}

export default function B2BContactCreateShell(){
 const location=useLocation(),navigate=useNavigate();const match=location.pathname.match(/^\/inmobiliarias\/([^/]+)\/contactos\/nuevo$/);const inmoId=match?.[1]?decodeURIComponent(match[1]):'';const active=Boolean(match&&isNotionId(inmoId));
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[nombre,setNombre]=useState(''),[apellidos,setApellidos]=useState(''),[cargo,setCargo]=useState(''),[emails,setEmails]=useState<string[]>(['']),[telefonos,setTelefonos]=useState<string[]>(['']);
 const[preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState<ApiResponse|null>(null);
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{const r=await fetchAppApi<Ctx>('/session/context');if(alive)setCtx(r.status===200?r.data:null)})();return()=>{alive=false};},[active,logged]);
 const allowed=ctx?.role==='Direccion'||ctx?.role==='Visitador';const valid=allowed&&nombre.trim().length>=2;
 const cleanPhones=telefonos.map(x=>x.trim()).filter(Boolean),cleanEmails=emails.map(x=>x.trim()).filter(Boolean);
 if(!active||!ready||!logged)return null;
 function edit(){setPreview(false);setMessage('');setResult(null);}
 async function submit(e:FormEvent){e.preventDefault();if(!valid)return;if(!preview){setPreview(true);setMessage('');return;}setBusy(true);setMessage('');const r=await fetchB2BActionsApi<ApiResponse>('/contactos/create',{method:'POST',body:JSON.stringify({inmobiliaria_id:inmoId,nombre:nombre.trim(),apellidos:apellidos.trim(),cargo:cargo.trim(),email:cleanEmails[0]||'',telefono:cleanPhones[0]||'',emails:cleanEmails,telefonos:cleanPhones})});setBusy(false);setResult(r.data);if((r.status===201||r.status===200)&&r.data?.ok){setMessage(r.data.reused?'Este contacto B2B ya existía; no se ha duplicado.':'Contacto B2B creado y vinculado a la inmobiliaria.');setPreview(false);}else if(r.status===403)setMessage('No puedes crear contactos en esta inmobiliaria: queda fuera de tu ámbito.');else setMessage(`No se pudo crear el contacto B2B (${r.data?.error||r.status}).`);}
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 const createNav:NavItem[]=[{label:'Volver a la inmobiliaria',route:`/inmobiliarias/${encodeURIComponent(inmoId)}`}];
 const topbar=<header className="ops-top"><strong>Nuevo contacto B2B</strong><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{ctx?.role||'Usuario'}</strong></div><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>;
 return <OperationalShellFrame className="b2b-contact-create-root" theme={theme} navigation={createNav} activeRoute="/inmobiliarias" anaSubtitle="Este contacto queda ligado a la inmobiliaria actual." query="" onQueryChange={()=>{}} searchPlaceholder="" name={ctx?.role||'Usuario'} role="" initials={(ctx?.role||'U').slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} topbar={topbar}>
   <div className="ops-title"><div><span className="ops-icon"><UserPlus size={20}/></span><div><h1>Nuevo contacto de inmobiliaria</h1><p>Contacto B2B separado de clientes hipotecarios.</p></div></div><span className="ops-live ok">PRE-PROD</span></div>
   <section className="inmo-ana-hero"><div className="inmo-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="inmo-ana-body"><span>ANA · NUEVO CONTACTO B2B</span><h2>Lo vinculamos a la inmobiliaria correcta desde el principio</h2><p>Compruebo el ámbito antes de crear. Puedes registrar todos los teléfonos y correos reales del contacto; se conservará también el principal para compatibilidad.</p><div className="inmo-next"><button type="button" onClick={()=>document.querySelector<HTMLInputElement>('form input')?.focus()}><b>1</b><strong>Completar contacto</strong><small>Ir a datos →</small></button><button type="button" onClick={()=>navigate('/ana?mode=help&resource=contacto&intent=nuevo-b2b')}><b>2</b><strong>Ayúdame</strong><small>Preparar con Ana →</small></button><button type="button" onClick={()=>document.querySelector<HTMLFormElement>('form.ops-message')?.scrollIntoView({behavior:'smooth'})}><b>3</b><strong>Lo hago yo</strong><small>Continuar abajo ↓</small></button></div></div></section>
    {!allowed?<div className="ops-message">Tu perfil no puede crear contactos B2B.</div>:<form className="ops-message" onSubmit={submit} style={{display:'grid',gap:12}}>
      <label>Nombre<input value={nombre} onChange={e=>{setNombre(e.target.value);edit()}} maxLength={100} required/></label><label>Apellidos<input value={apellidos} onChange={e=>{setApellidos(e.target.value);edit()}} maxLength={120}/></label><label>Cargo<input value={cargo} onChange={e=>{setCargo(e.target.value);edit()}} maxLength={120}/></label>
      <div className="multi-contact-group"><div className="multi-contact-head"><strong>Teléfonos</strong><button type="button" onClick={()=>{setTelefonos(v=>[...v,'']);edit()}}><Plus size={15}/> Añadir teléfono</button></div>{telefonos.map((v,i)=><label key={`tel-${i}`}>{i===0?'Teléfono':`Teléfono ${i+1}`}<span className="multi-contact-row"><input value={v} onChange={e=>{setTelefonos(x=>changeAt(x,i,e.target.value));edit()}} maxLength={40} inputMode="tel"/>{telefonos.length>1&&<button type="button" aria-label={`Quitar teléfono ${i+1}`} onClick={()=>{setTelefonos(x=>x.filter((_,j)=>j!==i));edit()}}><X size={15}/></button>}</span></label>)}</div>
      <div className="multi-contact-group"><div className="multi-contact-head"><strong>Correos</strong><button type="button" onClick={()=>{setEmails(v=>[...v,'']);edit()}}><Plus size={15}/> Añadir correo</button></div>{emails.map((v,i)=><label key={`mail-${i}`}>{i===0?'Email':`Email ${i+1}`}<span className="multi-contact-row"><input value={v} onChange={e=>{setEmails(x=>changeAt(x,i,e.target.value));edit()}} maxLength={200} type="email"/>{emails.length>1&&<button type="button" aria-label={`Quitar correo ${i+1}`} onClick={()=>{setEmails(x=>x.filter((_,j)=>j!==i));edit()}}><X size={15}/></button>}</span></label>)}</div>
      {preview&&<div className="ops-message"><strong>Vista previa</strong><div>Nombre: {[nombre.trim(),apellidos.trim()].filter(Boolean).join(' ')}</div><div>Cargo: {cargo.trim()||'No indicado'}</div><div>Teléfonos: {cleanPhones.length?cleanPhones.join(' · '):'No indicados'}</div><div>Correos: {cleanEmails.length?cleanEmails.join(' · '):'No indicados'}</div><small>Se vinculará únicamente a la inmobiliaria actual.</small></div>}
      {message&&<div className="ops-message">{message}</div>}
      {!result?.ok&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{preview&&<button type="button" onClick={()=>setPreview(false)}>Volver</button>}<button className="primary" disabled={!valid||busy}><Save size={16}/>{busy?'Creando…':preview?'Confirmar y crear':'Revisar antes de crear'}</button></div>}
      {result?.ok&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" onClick={()=>navigate(`/inmobiliarias/${encodeURIComponent(inmoId)}`)}>Volver a la inmobiliaria</button>{result.destino&&<button type="button" className="primary" onClick={()=>navigate(result.destino!)}>{result.reused?'Abrir contacto existente':'Abrir contacto creado'}</button>}</div>}
    </form>}
 </OperationalShellFrame>;
}
