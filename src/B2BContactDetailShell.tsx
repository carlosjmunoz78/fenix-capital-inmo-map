import {FormEvent,useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,LogOut,Moon,Save,Sun,UserRound} from 'lucide-react';
import {fetchAppApi,fetchB2BActionsApi,supabase} from './supabase';
import {anaAvatar,fenixLogo} from './assets/visualAssets';
import './operational.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type Contact={id:string;nombre:string;apellidos:string;contacto:string;cargo:string;email:string;telefono:string;activo:boolean;inmobiliaria_id:string|null};
type Envelope={ok?:boolean;status?:number;item?:Contact;inmobiliaria?:{id:string;nombre:string;localidad:string};error?:string};
function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}

export default function B2BContactDetailShell(){
 const location=useLocation(),navigate=useNavigate();const match=location.pathname.match(/^\/contactos-b2b\/([^/]+)$/);const id=match?.[1]?decodeURIComponent(match[1]):'';const active=Boolean(match&&isNotionId(id));
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[status,setStatus]=useState<number|null>(null),[data,setData]=useState<Envelope|null>(null),[nombre,setNombre]=useState(''),[apellidos,setApellidos]=useState(''),[cargo,setCargo]=useState(''),[email,setEmail]=useState(''),[telefono,setTelefono]=useState(''),[preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{const c=await fetchAppApi<Ctx>('/session/context');if(alive)setCtx(c.status===200?c.data:null)})();return()=>{alive=false};},[active,logged]);
 async function load(clearMessage=true){if(clearMessage)setMessage('');const r=await fetchB2BActionsApi<Envelope>(`/contactos/${encodeURIComponent(id)}`);setStatus(r.status);setData(r.data);if(r.status===200&&r.data?.item){const x=r.data.item;setNombre(x.nombre||'');setApellidos(x.apellidos||'');setCargo(x.cargo||'');setEmail(x.email||'');setTelefono(x.telefono||'');}else if(r.status===403)setMessage('No puedes abrir este contacto B2B: queda fuera de tu cartera o zona.');else if(r.status===404)setMessage('No se ha encontrado el contacto B2B.');else setMessage(`No se pudo cargar el contacto B2B (${r.data?.error||r.status}).`);}
 useEffect(()=>{if(active&&logged)void load();},[active,logged,id]);
 const allowed=ctx?.role==='Direccion'||ctx?.role==='Visitador';
 if(!active||!ready||!logged)return null;
 function edit(){if(preview)setPreview(false);setMessage('');}
 function review(e:React.MouseEvent<HTMLButtonElement>){e.preventDefault();e.stopPropagation();if(!allowed||nombre.trim().length<2)return;setPreview(true);setMessage('');}
 async function save(e:FormEvent){e.preventDefault();if(!allowed||!preview)return;setBusy(true);const r=await fetchB2BActionsApi<Envelope>(`/contactos/${encodeURIComponent(id)}/update`,{method:'POST',body:JSON.stringify({nombre:nombre.trim(),apellidos:apellidos.trim(),cargo:cargo.trim(),email:email.trim(),telefono:telefono.trim()})});setBusy(false);if(r.status===200){setPreview(false);await load(false);setMessage('Contacto B2B actualizado dentro de tu ámbito autorizado.');}else if(r.status===403)setMessage('No puedes modificar este contacto B2B.');else setMessage(`No se pudo actualizar (${r.data?.error||r.status}).`);}
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 const inmo=data?.inmobiliaria;
 return <div className="ops-root" data-theme={theme} style={{zIndex:6900}}>
  <aside className="ops-side"><button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button><nav><button onClick={()=>inmo?.id?navigate(`/inmobiliarias/${encodeURIComponent(inmo.id)}`):navigate('/inmobiliarias')}><ArrowLeft size={15}/> Volver a la inmobiliaria</button></nav><button className="ops-ana" onClick={()=>navigate(`/ana?mode=help&resource=contacto-b2b&contact_id=${encodeURIComponent(id)}`)}><img src={anaAvatar} alt="Ana"/><span><strong>Ana está contigo</strong><small>Solo uso el contexto B2B autorizado.</small></span></button></aside>
  <main className="ops-main"><header className="ops-top"><strong>Contacto B2B</strong><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{ctx?.role||'Usuario'}</strong></div><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>
   <section className="ops-content"><div className="ops-title"><div><span className="ops-icon"><UserRound size={20}/></span><div><h1>{data?.item?.contacto||'Contacto de inmobiliaria'}</h1><p>{inmo?.nombre||'Inmobiliaria'}{inmo?.localidad?` · ${inmo.localidad}`:''}</p></div></div><span className="ops-live ok">PRE-PROD</span></div>
    <article className="ops-ana-card"><img src={anaAvatar} alt="Ana"/><div><strong>Ana</strong><p>Este contacto pertenece al ámbito B2B. Un Visitador puede verlo y modificarlo solo si la inmobiliaria está en su cartera o zona autorizada.</p></div></article>
    {message&&<div className="ops-message">{message}</div>}
    {status===200&&data?.item&&<form className="ops-message" onSubmit={save} style={{display:'grid',gap:12}}>
      <label>Nombre<input value={nombre} onChange={e=>{setNombre(e.target.value);edit()}} maxLength={100} required/></label><label>Apellidos<input value={apellidos} onChange={e=>{setApellidos(e.target.value);edit()}} maxLength={120}/></label><label>Cargo<input value={cargo} onChange={e=>{setCargo(e.target.value);edit()}} maxLength={120}/></label><label>Teléfono<input value={telefono} onChange={e=>{setTelefono(e.target.value);edit()}} maxLength={40} inputMode="tel"/></label><label>Email<input value={email} onChange={e=>{setEmail(e.target.value);edit()}} maxLength={200} type="email"/></label>
      {preview&&<div className="ops-message" data-testid="b2b-contact-preview"><strong>Vista previa</strong><div>Nombre: {[nombre.trim(),apellidos.trim()].filter(Boolean).join(' ')}</div><div>Cargo: {cargo.trim()||'No indicado'}</div><div>Teléfono: {telefono.trim()||'No indicado'}</div><div>Email: {email.trim()||'No indicado'}</div><small>La inmobiliaria asociada no cambia en esta edición.</small></div>}
      {allowed?<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{preview&&<button type="button" onClick={()=>setPreview(false)}>Volver</button>}{preview?<button type="submit" className="primary" disabled={busy||nombre.trim().length<2}><Save size={16}/>{busy?'Guardando…':'Confirmar cambios'}</button>:<button type="button" className="primary" disabled={busy||nombre.trim().length<2} onClick={review}><Save size={16}/>Revisar cambios</button>}</div>:<div className="ops-message">Tu perfil no puede modificar contactos B2B.</div>}
    </form>}
   </section>
  </main>
 </div>;
}
