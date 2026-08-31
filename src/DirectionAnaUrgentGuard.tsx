import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchNotionRuntime} from './notionRuntime';
import './direction-ana-urgent.css';

type Row=Record<string,unknown>;
function rowsFrom(data:unknown):Row[]{if(!data||typeof data!=='object')return[];const d=data as Record<string,unknown>;return Array.isArray(d.items)?d.items as Row[]:[];}
function text(r:Row,keys:string[]){for(const k of keys){const v=r[k];if(typeof v==='string'&&v.trim())return v.trim();}return'';}
function critical(r:Row){const c=text(r,['criticidad','prioridad','priority']);const s=text(r,['estado','status']);const done=Boolean(r.completada)||/complet|cancelad|cerrad|hecha/i.test(s);return /cr[ií]tica/i.test(c)&&!done;}

export default function DirectionAnaUrgentGuard(){
 const location=useLocation(),navigate=useNavigate();
 const[rows,setRows]=useState<Row[]>([]),[status,setStatus]=useState<number|null>(null);
 const urgent=useMemo(()=>rows.filter(critical),[rows]);
 useEffect(()=>{if(location.pathname!=='/inicio')return;let alive=true;fetchNotionRuntime<unknown>('/tareas').then(r=>{if(!alive)return;setStatus(r.status);setRows(r.status===200?rowsFrom(r.data):[])}).catch(()=>{if(alive){setStatus(0);setRows([])}});return()=>{alive=false}},[location.pathname]);
 useEffect(()=>{if(location.pathname!=='/inicio')return;const handler=(ev:MouseEvent)=>{const target=ev.target as Element|null;const button=target?.closest('.dir-alert-button') as HTMLButtonElement|null;if(!button)return;ev.preventDefault();ev.stopPropagation();if(urgent.length)navigate('/agenda?criticidad=Crítica&ana=urgentes');};const patch=()=>{const b=document.querySelector('.dir-alert-button') as HTMLButtonElement|null;if(!b)return;const next=status===200?(urgent.length?`Ver urgentes de Ana (${urgent.length})`:'Sin urgencias críticas ahora'):'Urgentes de Ana';const disabled=status===200&&urgent.length===0;if(b.textContent!==next)b.textContent=next;if(b.disabled!==disabled)b.disabled=disabled;if(b.dataset.anaUrgent!=='true')b.dataset.anaUrgent='true';};patch();const timer=window.setInterval(patch,250);document.addEventListener('click',handler,true);return()=>{window.clearInterval(timer);document.removeEventListener('click',handler,true)}},[location.pathname,navigate,status,urgent.length]);
 useEffect(()=>{const focused=location.pathname==='/agenda'&&new URLSearchParams(location.search).get('ana')==='urgentes';if(!focused)return;let tries=0;const timer=window.setInterval(()=>{const selects=Array.from(document.querySelectorAll('.agenda-filter select')) as HTMLSelectElement[];const priority=selects.find(s=>Array.from(s.options).some(o=>/cr[ií]tica/i.test(o.textContent||'')));if(priority){const option=Array.from(priority.options).find(o=>/cr[ií]tica/i.test(o.textContent||''));if(option&&priority.value!==option.value){priority.value=option.value;priority.dispatchEvent(new Event('change',{bubbles:true}));}window.clearInterval(timer);}else if(++tries>40)window.clearInterval(timer);},100);return()=>window.clearInterval(timer)},[location.pathname,location.search]);
 return null;
}
