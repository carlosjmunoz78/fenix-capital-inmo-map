import {FormEvent,useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {LogOut,Moon,Save,Sun,UserPlus} from 'lucide-react';
import {fetchAppApi,fetchB2BActionsApi,supabase} from './supabase';
import {anaAvatar} from './assets/visualAssets';
import type {NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import './operational.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type ApiResponse={ok?:boolean;id?:string;destino?:string;error?:string;reused?:boolean;no_op?:boolean};
function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}

export default function B2BContactCreateShell(){
 const location=useLocation(),navigate=useNavigate();const match=location.pathname.match(/^\/inmobiliarias\/([^/]+)\/contactos\/nuevo$/);const inmoId=match?.[1]?decodeURIComponent(match[1]):'';const active=Boolean(match&&isNotionId(inmoId));
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[nombre,setNombre]=useState(''),[apellidos,setApellidos]=useState(''),[cargo,setCargo]=useState(''),[email,setEmail]=useState(''),[telefono,setTelefono]=useState('');
 const[preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState<ApiResponse|null>(null);
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{const r=await fetchAppApi<Ctx>('/session/context');if(alive)setCtx(r.status===200?r.data:null)})();return()=>{alive=false};},[active,logged]);
 const allowed=ctx?.role==='Direccion'||ctx?.role==='Visitador';const valid=allowed&&nombre.trim().length>=2;
 if(!active||!ready||!logged)return null;
 function edit(){setPreview(false);setMessage('');setResult(null);}
 async function submit(e:FormEvent){e.preventDefault();if(!valid)return;if(!preview){setPreview(true);setMessage('');return;}setBusy(true);setMessage('');const r=await fetchB2BActionsApi<ApiResponse>('/contactos/create',{method:'POST',body:JSON.stringify({inmobiliaria_id:inmoId,nombre:nombre.trim(),apellidos:apellidos.trim(),cargo:cargo.trim(),email:email.trim(),telefono:telefono.trim()})});setBusy(false);setResult(r.data);if((r.status===201||r.status===200)&&r.data?.ok){setMessage(r.data.reused?'Este contacto B2B ya existía; no se ha duplicado.':'Contacto B2B creado y vinculado a la inmobiliaria.');setPreview(false);}else if(r.status===403)setMessage('No puedes crear contactos en esta inmobiliaria: queda fuera de tu ámbito.');else setMessage(`No se pudo crear el contacto B2B (${r.data?.error||r.status}).`);}
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 const createNav:NavItem[]=[{label:'Volver a la inmobiliaria',route:`/inmobiliarias/${encodeURIComponent(inmoId)}`}];
 const topbar=<header className="ops-top"><strong>Nuevo contacto B2B</strong><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{ctx?.role||'Usuario'}</strong></div><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>;
 return <OperationalShellFrame className="b2b-contact-create-root" theme={theme} navigation={createNav} activeRoute="" anaSubtitle="Este contacto queda ligado a la inmobiliaria actual." query="" onQueryChange={()=>{}} searchPlaceholder="" name={ctx?.role||'Usuario'} role="" initials={(ctx?.role||'U').slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} topbar={topbar}>
   <div className="ops-title"><div><span className="ops-icon"><UserPlus size={20}/></span><div><h1>Nuevo contacto de inmobiliaria</h1><p>Contacto B2B separado de clientes hipotecarios.</p></div></div><span className="ops-live ok">PRE-PROD</span></div>
    <article className="ops-ana-card"><img src={anaAvatar} alt="Ana"/><div><strong>Ana</strong><p>Compruebo el ámbito de la inmobiliaria antes de crear. Un Visitador no puede escribir fuera de su cartera o zona autenticada.</p></div></article>
    {!allowed?<div className="ops-message">Tu perfil no puede crear contactos B2B.</div>:<form className="ops-message" onSubmit={submit} style={{display:'grid',gap:12}}>
      <label>Nombre<input value={nombre} onChange={e=>{setNombre(e.target.value);edit()}} maxLength={100} required/></label><label>Apellidos<input value={apellidos} onChange={e=>{setApellidos(e.target.value);edit()}} maxLength={120}/></label><label>Cargo<input value={cargo} onChange={e=>{setCargo(e.target.value);edit()}} maxLength={120}/></label><label>Teléfono<input value={telefono} onChange={e=>{setTelefono(e.target.value);edit()}} maxLength={40} inputMode="tel"/></label><label>Email<input value={email} onChange={e=>{setEmail(e.target.value);edit()}} maxLength={200} type="email"/></label>
      {preview&&<div className="ops-message"><strong>Vista previa</strong><div>Nombre: {[nombre.trim(),apellidos.trim()].filter(Boolean).join(' ')}</div><div>Cargo: {cargo.trim()||'No indicado'}</div><div>Teléfono: {telefono.trim()||'No indicado'}</div><div>Email: {email.trim()||'No indicado'}</div><small>Se vinculará únicamente a la inmobiliaria actual.</small></div>}
      {message&&<div className="ops-message">{message}</div>}
      {!result?.ok&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{preview&&<button type="button" onClick={()=>setPreview(false)}>Volver</button>}<button className="primary" disabled={!valid||busy}><Save size={16}/>{busy?'Creando…':preview?'Confirmar y crear':'Revisar antes de crear'}</button></div>}
      {result?.ok&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" onClick={()=>navigate(`/inmobiliarias/${encodeURIComponent(inmoId)}`)}>Volver a la inmobiliaria</button>{result.destino&&<button type="button" className="primary" onClick={()=>navigate(result.destino!)}>{result.reused?'Abrir contacto existente':'Abrir contacto creado'}</button>}</div>}
    </form>}
 </OperationalShellFrame>;
}
