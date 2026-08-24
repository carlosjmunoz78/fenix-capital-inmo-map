import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchNotionRuntime} from './notionRuntime';
import './direction-ana-urgent.css';

type Row=Record<string,unknown>;
function rowsFrom(data:unknown):Row[]{if(!data||typeof data!=='object')return[];const d=data as Record<string,unknown>;return Array.isArray(d.items)?d.items as Row[]:[];}
function text(r:Row,keys:string[]){for(const k of keys){const v=r[k];if(typeof v==='string'&&v.trim())return v.trim();}return'';}
function critical(r:Row){const c=text(r,['criticidad','prioridad','priority']);const s=text(r,['estado','status']);const done=Boolean(r.completada)||/complet|cancelad|cerrad|hecha/i.test(s);return /cr[ií]tica/i.test(c)&&!done;}
function title(r:Row){return text(r,['tarea','titulo','título','nombre','title'])||'Tarea crítica';}
function id(r:Row){return text(r,['id','tarea_id','tarea_code','code']);}
function due(r:Row){return text(r,['fecha_limite','fecha_límite','vencimiento','due_date'])||'Sin fecha límite visible';}

export default function DirectionAnaUrgentGuard(){
 const location=useLocation(),navigate=useNavigate();
 const[rows,setRows]=useState<Row[]>([]),[status,setStatus]=useState<number|null>(null),[portal,setPortal]=useState<HTMLElement|null>(null);
 const urgent=useMemo(()=>rows.filter(critical).sort((a,b)=>due(a).localeCompare(due(b),'es')),[rows]);
 useEffect(()=>{if(!['/inicio','/agenda'].includes(location.pathname))return;let alive=true;fetchNotionRuntime<unknown>('/tareas').then(r=>{if(!alive)return;setStatus(r.status);setRows(r.status===200?rowsFrom(r.data):[])}).catch(()=>{if(alive){setStatus(0);setRows([])}});return()=>{alive=false}},[location.pathname]);
 useEffect(()=>{
  if(location.pathname!=='/inicio')return;
  const handler=(ev:MouseEvent)=>{const target=ev.target as Element|null;const button=target?.closest('.dir-alert-button') as HTMLButtonElement|null;if(!button)return;ev.preventDefault();ev.stopPropagation();if(urgent.length)navigate('/agenda?criticidad=critica&ana=urgentes');};
  const patch=()=>{const b=document.querySelector('.dir-alert-button') as HTMLButtonElement|null;if(!b)return;b.textContent=status===200?(urgent.length?`Ver urgentes de Ana (${urgent.length})`:'Sin urgencias críticas ahora'):'Urgentes de Ana';b.disabled=status===200&&urgent.length===0;b.dataset.anaUrgent='true';};
  patch();const obs=new MutationObserver(patch);obs.observe(document.body,{childList:true,subtree:true});document.addEventListener('click',handler,true);return()=>{obs.disconnect();document.removeEventListener('click',handler,true)};
 },[location.pathname,navigate,status,urgent.length]);
 useEffect(()=>{
  const focused=location.pathname==='/agenda'&&new URLSearchParams(location.search).get('ana')==='urgentes';if(!focused){setPortal(null);document.querySelectorAll('.agenda-root[data-ana-urgent]').forEach(el=>el.removeAttribute('data-ana-urgent'));return;}
  let stopped=false;let obs:MutationObserver|null=null;const attach=()=>{if(stopped)return;const target=document.querySelector('.agenda-content') as HTMLElement|null;const root=document.querySelector('.agenda-root') as HTMLElement|null;if(target&&root){root.dataset.anaUrgent='true';setPortal(target);obs?.disconnect();return;}obs=new MutationObserver(attach);obs.observe(document.body,{childList:true,subtree:true});};attach();return()=>{stopped=true;obs?.disconnect();document.querySelectorAll('.agenda-root[data-ana-urgent]').forEach(el=>el.removeAttribute('data-ana-urgent'));setPortal(null)};
 },[location.pathname,location.search]);
 if(!portal)return null;
 return createPortal(<section className="fenix-ana-urgent-view" data-testid="ana-urgent-view"><div className="fenix-ana-urgent-head"><div><small>ANA · SOLO LO CRÍTICO</small><h1>Urgentes de Dirección</h1><p>Vista enfocada en tareas canónicas con Criticidad = Crítica y todavía no completadas ni canceladas.</p></div><button onClick={()=>navigate('/inicio')}>← Volver a Inicio</button></div>{status===null?<div className="fenix-ana-urgent-state">Cargando urgencias reales…</div>:status!==200?<div className="fenix-ana-urgent-state">No se pudo confirmar la fuente canónica. No se muestran urgencias estimadas.</div>:urgent.length===0?<div className="fenix-ana-urgent-state"><strong>No hay tareas críticas pendientes ahora.</strong><span>La vista de Notion seguirá capturando automáticamente cualquier tarea marcada como Crítica.</span></div>:<div className="fenix-ana-urgent-list">{urgent.map((r,i)=><button key={id(r)||i} onClick={()=>id(r)&&navigate(`/tareas/${encodeURIComponent(id(r))}`)}><b>{i+1}</b><span><strong>{title(r)}</strong><small>{due(r)} · {text(r,['estado','status'])||'Pendiente'}</small></span><em>Abrir ›</em></button>)}</div>}</section>,portal);
}
