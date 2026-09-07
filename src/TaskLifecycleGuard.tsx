import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {Power,X} from 'lucide-react';
import {IS_PRODUCTION,SUPABASE_URL,supabase} from './supabase';

const REASONS=['Tarea antigua','Ya realizada','Ya no procede','Duplicada / error','Cambio de criterio','Otro'];
type TaskResponse={item?:{version?:number;estado?:string;tarea_code?:string};ok?:boolean;status?:number;version?:number;error?:string};
function canonicalTaskCode(raw:string){
 const clean=raw.trim();
 if(/^notion\|/i.test(clean)||/^TASK-/i.test(clean))return clean;
 const hex=clean.replaceAll('-','');
 if(/^[0-9a-f]{32}$/i.test(hex))return `notion|${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
 return clean;
}
async function taskApi(code:string,init?:RequestInit){
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null as TaskResponse|null};
 try{
  const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-task-api/${encodeURIComponent(code)}`,{...init,headers:{'content-type':'application/json',...(init?.headers||{}),Authorization:`Bearer ${session.access_token}`}});
  let data:TaskResponse|null=null;try{data=await r.json()}catch{}
  return{status:r.status,data};
 }catch{return{status:0,data:null as TaskResponse|null}}
}

export default function TaskLifecycleGuard(){
 const{pathname}=useLocation();
 const match=pathname.match(/^\/tareas\/([^/]+)$/);
 const routeId=match?.[1]?decodeURIComponent(match[1]):'';
 const taskCode=useMemo(()=>canonicalTaskCode(routeId),[routeId]);
 const active=Boolean(match)&&routeId!=='nueva'&&routeId!=='nuevo';
 const[host,setHost]=useState<HTMLElement|null>(null),[version,setVersion]=useState<number|null>(null),[estado,setEstado]=useState('');
 const[open,setOpen]=useState(false),[prepared,setPrepared]=useState(false),[reason,setReason]=useState(REASONS[0]),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');

 async function load(){
  if(!active||!taskCode||!IS_PRODUCTION)return;
  const r=await taskApi(taskCode);
  if(r.status===200){const item=r.data?.item??null;setVersion(Number.isFinite(Number(item?.version))?Number(item?.version):null);setEstado(String(item?.estado??''));}
  else{setVersion(null);setMessage(r.status===404?'No se ha encontrado la tarea canónica asociada.':'No se ha podido validar la tarea canónica.');}
 }
 useEffect(()=>{void load()},[active,taskCode]);
 useEffect(()=>{
  if(!active){setHost(null);return}
  const place=()=>{
   const roots=[...document.querySelectorAll<HTMLElement>('.ops-root')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0});
   const root=roots.at(-1);const content=root?.querySelector<HTMLElement>('.ops-content');const card=content?.querySelector<HTMLElement>('.ops-table-card');if(!content||!card)return;
   let h=content.querySelector<HTMLElement>(':scope > .task-life-host');if(!h){h=document.createElement('div');h.className='task-life-host';card.after(h)}
   setHost(current=>current===h?current:h);
  };
  place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();document.querySelectorAll('.task-life-host').forEach(x=>x.remove());setHost(null)};
 },[active,pathname]);
 if(!active||!host)return null;
 const cancelled=estado.toLowerCase().includes('cancel');
 function start(){setOpen(true);setPrepared(false);setMessage('')}
 function close(){setOpen(false);setPrepared(false);setMessage('');setBusy(false)}
 function prepare(){
  if(IS_PRODUCTION&&version===null){setMessage('No se ha podido validar la versión actual de la tarea. No se ejecutará ningún cambio.');return}
  setPrepared(true);setMessage(`Vista previa lista: dar de baja · ${reason}${note.trim()?` · ${note.trim()}`:''}. Confirma para ejecutar.`)
 }
 async function confirm(){
  if(!prepared||busy)return;
  if(!IS_PRODUCTION){setMessage('PRE-PROD: flujo validado sin escribir en producción.');return}
  if(version===null){setMessage('No se ha podido validar la versión actual de la tarea.');return}
  setBusy(true);setMessage('Dando de baja la tarea…');
  const r=await taskApi(taskCode,{method:'PATCH',body:JSON.stringify({estado:'Cancelada',completada:false,expected_version:version})});
  setBusy(false);
  if(r.status===200&&r.data?.ok){setEstado('Cancelada');setVersion(Number(r.data.version??version+1));setPrepared(false);setMessage(`Tarea dada de baja correctamente. Motivo: ${reason}${note.trim()?` · ${note.trim()}`:''}`);return}
  if(r.status===409){setPrepared(false);setMessage('La tarea cambió mientras la tenías abierta. He recargado su versión; revisa y vuelve a confirmar.');await load();return}
  if(r.status===403){setMessage('Tu perfil no tiene permiso para dar de baja esta tarea.');return}
  setMessage(`No se pudo dar de baja la tarea (${r.data?.error||r.status}). No se ha aplicado ningún cambio.`)
 }
 return createPortal(<section data-testid="task-lifecycle" style={{marginTop:14,border:'1px solid var(--border)',borderRadius:16,padding:16,background:'var(--card)',display:'grid',gap:12}}>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><div><small style={{fontWeight:800}}>CICLO DE VIDA DE LA TAREA</small><h3 style={{margin:'4px 0 0'}}>Dar de baja una tarea sin borrarla</h3></div>{cancelled?<strong>Cancelada</strong>:<button type="button" onClick={start} style={{display:'inline-flex',alignItems:'center',gap:7}}><Power size={17}/> Dar de baja tarea</button>}</div>
  <small>La tarea sale de pendientes, conserva su registro y deja de contar como activa.</small>
  {open&&<div role="dialog" aria-modal="true" aria-label="Dar de baja tarea" style={{border:'1px solid var(--border)',borderRadius:14,padding:14,display:'grid',gap:10}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong>Dar de baja tarea</strong><button type="button" onClick={close} aria-label="Cerrar"><X size={18}/></button></div>
   <label>Motivo<select value={reason} onChange={e=>{setReason(e.target.value);setPrepared(false)}}>{REASONS.map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Observación opcional<textarea rows={3} value={note} onChange={e=>{setNote(e.target.value);setPrepared(false)}} placeholder="Ej.: ya se llamó al cliente y esta tarea quedó antigua"/></label>
   {message&&<div role="status" className="ops-message">{message}</div>}
   <div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button type="button" onClick={close}>Cancelar</button>{!prepared?<button type="button" className="primary" onClick={prepare}>Preparar baja</button>:<button type="button" className="primary" disabled={busy} onClick={()=>void confirm()}>{busy?'Guardando…':'Confirmar baja'}</button>}</div>
   <small>Tarea: {routeId}{taskCode!==routeId?` · canónica: ${taskCode}`:''} · versión {version??(IS_PRODUCTION?'sin validar':'PRE-PROD')} · {IS_PRODUCTION?'PROD con escritura auditada':'PRE-PROD sin escritura PROD'}.</small>
  </div>}
 </section>,host)
}
