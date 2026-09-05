import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,Landmark,Plus,X} from 'lucide-react';
import {fetchAppApi,fetchEnvironmentApi,IS_PRODUCTION,supabase} from './supabase';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import {anaVertical} from './assets/visualAssets';
import './operational.css';
import './inmobiliarias-polish.css';

type Theme='light'|'dark';type Ctx={role?:string};type CreateBankResponse={ok?:boolean;status?:number;error?:string;bank_code?:string;existing_bank_code?:string;bank?:Record<string,unknown>};
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
function updateList(list:string[],index:number,value:string){return list.map((item,i)=>i===index?value:item)}
function yn(v:string){return v==='Sí'?true:v==='No'?false:null}
export default function BankCreateShell(){
 const location=useLocation(),navigate=useNavigate();const active=location.pathname==='/bancos/nuevo';
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light'),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[nombre,setNombre]=useState(''),[direccion,setDireccion]=useState(''),[localidad,setLocalidad]=useState(''),[provincia,setProvincia]=useState(''),[telefonos,setTelefonos]=useState<string[]>(['']),[emails,setEmails]=useState<string[]>(['']),[perfil,setPerfil]=useState(''),[cien,setCien]=useState('No informado'),[doble,setDoble]=useState('No informado'),[observaciones,setObservaciones]=useState(''),[globalQuery,setGlobalQuery]=useState(''),[preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState<CreateBankResponse|null>(null);
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()}},[active]);
 useEffect(()=>{if(active){document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme)}},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{if(!alive)return;setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[])});return()=>{alive=false}},[active,logged]);
 if(!active||!ready||!logged)return null;
 const canCreate=ctx?.role==='Direccion';
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL}function globalSearch(){const q=globalQuery.trim();navigate(q?`/buscar?q=${encodeURIComponent(q)}`:'/buscar')}
 function invalidate(){setPreview(false);setMessage('');setResult(null)}
 function prepareWithAna(){const q=new URLSearchParams({mode:'help',resource:'banco',intent:'nuevo',nombre:nombre.trim(),direccion:direccion.trim(),localidad:localidad.trim(),provincia:provincia.trim(),perfil,financiacion_100:cien,doble_garantia:doble});navigate(`/ana?${q.toString()}`)}
 async function createBank(){
  if(!canCreate||!nombre.trim())return;
  if(!preview){setPreview(true);setMessage('');return}
  setBusy(true);setMessage('');setResult(null);
  const endpoint=IS_PRODUCTION?'fenix-bank-api':'fenix-bank-actions';
  const response=await fetchEnvironmentApi<CreateBankResponse>(endpoint,'',{method:'POST',body:JSON.stringify({nombre:nombre.trim(),direccion:direccion.trim(),localidad:localidad.trim(),provincia:provincia.trim(),perfil:perfil.trim(),financiacion_100:yn(cien),doble_garantia:yn(doble),telefonos:telefonos.map(x=>x.trim()).filter(Boolean),emails:emails.map(x=>x.trim()).filter(Boolean),observaciones:observaciones.trim()})});
  setBusy(false);setResult(response.data);setPreview(false);
  if(response.status===201&&response.data?.ok){setMessage(`Banco creado en la fuente canónica de ${IS_PRODUCTION?'producción':'PRE-PROD'}.`);return}
  if(response.status===409&&response.data?.existing_bank_code){setMessage('Ese banco ya existe. No se ha creado un duplicado.');return}
  if(response.status===403){setMessage('Tu perfil no puede crear bancos.');return}
  setMessage(`No se pudo crear el banco (${response.data?.error||response.status}).`)
 }
 return <OperationalShellFrame theme={theme} navigation={nav.length?nav:fallbackNav} activeRoute="/bancos" query={globalQuery} onQueryChange={setGlobalQuery} searchPlaceholder="Buscar en toda la app..." searchActionLabel="Buscar" onSearchAction={globalSearch} name={ctx?.role||'Usuario'} role="" initials={(ctx?.role||'U').slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout}>
  <button className="secondary-action" onClick={()=>navigate('/bancos')}><ArrowLeft size={15}/> Volver a Bancos</button>
  <div className="ops-title"><div><span className="ops-icon"><Landmark size={20}/></span><div><h1>Nuevo banco</h1><p>Alta controlada de entidad, contacto y criterios principales.</p></div></div><span className="ops-live ok">{IS_PRODUCTION?'OPERATIVO':'PRE-PROD'}</span></div>
  <section className="inmo-ana-hero"><div className="inmo-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="inmo-ana-body"><span>ANA · NUEVO BANCO</span><h2>Registramos solo información conocida y revisada</h2><p>La ficha se crea únicamente después de revisar y confirmar. Los datos no informados permanecen vacíos; Ana no completa condiciones bancarias por suposición.</p><div className="inmo-next"><button onClick={()=>document.getElementById('nueva-ficha-banco')?.scrollIntoView({behavior:'smooth'})}><b>1</b><strong>Completar ficha</strong><small>Ir a datos →</small></button><button onClick={()=>navigate('/bancos/contactos')}><b>2</b><strong>Revisar contactos</strong><small>Abrir contactos →</small></button><button onClick={prepareWithAna}><b>3</b><strong>Ayúdame con Ana</strong><small>Analizar la ficha →</small></button></div></div></section>
  {!canCreate&&<div className="ops-message">Tu perfil puede consultar Bancos, pero no crear nuevas entidades.</div>}
  {canCreate&&<section id="nueva-ficha-banco" className="ops-table-card" style={{padding:20,display:'grid',gap:12}}>
   <label>Nombre del banco<input value={nombre} onChange={e=>{setNombre(e.target.value);invalidate()}} placeholder="Entidad"/></label>
   <label>Dirección<input value={direccion} onChange={e=>{setDireccion(e.target.value);invalidate()}} placeholder="Calle, número, oficina o sucursal"/></label>
   <label>Localidad<input value={localidad} onChange={e=>{setLocalidad(e.target.value);invalidate()}} placeholder="Localidad"/></label>
   <label>Provincia<input value={provincia} onChange={e=>{setProvincia(e.target.value);invalidate()}} placeholder="Provincia"/></label>
   <div className="multi-contact-group"><div className="multi-contact-head"><strong>Teléfonos</strong><button type="button" onClick={()=>{setTelefonos(v=>[...v,'']);invalidate()}}><Plus size={15}/> Añadir teléfono</button></div>{telefonos.map((value,index)=><label key={`tel-${index}`}>Teléfono {index+1}<span className="multi-contact-row"><input value={value} onChange={e=>{setTelefonos(v=>updateList(v,index,e.target.value));invalidate()}} inputMode="tel" placeholder="Teléfono"/>{telefonos.length>1&&<button type="button" aria-label={`Quitar teléfono ${index+1}`} onClick={()=>{setTelefonos(v=>v.filter((_,i)=>i!==index));invalidate()}}><X size={15}/></button>}</span></label>)}</div>
   <div className="multi-contact-group"><div className="multi-contact-head"><strong>Correos</strong><button type="button" onClick={()=>{setEmails(v=>[...v,'']);invalidate()}}><Plus size={15}/> Añadir correo</button></div>{emails.map((value,index)=><label key={`mail-${index}`}>Correo {index+1}<span className="multi-contact-row"><input value={value} onChange={e=>{setEmails(v=>updateList(v,index,e.target.value));invalidate()}} type="email" placeholder="correo@entidad.es"/>{emails.length>1&&<button type="button" aria-label={`Quitar correo ${index+1}`} onClick={()=>{setEmails(v=>v.filter((_,i)=>i!==index));invalidate()}}><X size={15}/></button>}</span></label>)}</div>
   <label>Perfil principal<select value={perfil} onChange={e=>{setPerfil(e.target.value);invalidate()}}><option value="">Sin clasificar</option><option>General</option><option>Jóvenes</option><option>Funcionarios</option><option>Autónomos</option><option>Segunda vivienda</option><option>Operaciones especiales</option></select></label>
   <label>Financiación 100%<select value={cien} onChange={e=>{setCien(e.target.value);invalidate()}}><option>No informado</option><option>Sí</option><option>No</option></select></label>
   <label>Doble garantía<select value={doble} onChange={e=>{setDoble(e.target.value);invalidate()}}><option>No informado</option><option>Sí</option><option>No</option></select></label>
   <label>Observaciones<textarea rows={4} value={observaciones} onChange={e=>{setObservaciones(e.target.value);invalidate()}} placeholder="Solo información verificada"/></label>
   {!preview?<button className="primary" disabled={!nombre.trim()||busy} onClick={createBank}>Revisar antes de crear</button>:<div className="ops-message" data-testid="bank-create-preview"><strong>Revisión previa</strong><div>Entidad: {nombre.trim()}</div><div>Ubicación: {[localidad.trim(),provincia.trim()].filter(Boolean).join(' · ')||'No informada'}</div><div>100%: {cien} · Doble garantía: {doble}</div><div>Teléfonos: {telefonos.map(x=>x.trim()).filter(Boolean).length} · Correos: {emails.map(x=>x.trim()).filter(Boolean).length}</div><button className="primary" disabled={busy} onClick={createBank}>{busy?'Creando…':'Confirmar y crear'}</button><button type="button" onClick={()=>setPreview(false)}>Seguir editando</button></div>}
   {message&&<div className="ops-message" data-testid="bank-create-message">{message}</div>}
   {result?.bank_code&&<button className="primary" onClick={()=>navigate(`/bancos/${encodeURIComponent(result.bank_code!)}`)}>Abrir ficha del banco</button>}
   {!result?.bank_code&&result?.existing_bank_code&&<button onClick={()=>navigate(`/bancos/${encodeURIComponent(result.existing_bank_code!)}`)}>Abrir banco existente</button>}
  </section>}
 </OperationalShellFrame>
}
