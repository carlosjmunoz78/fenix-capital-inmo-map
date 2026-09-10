import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {FileClock} from 'lucide-react';
import {fetchAppApi,IS_PRODUCTION} from './supabase';

type HistoryItem=Record<string,unknown>;
type HistoryEnvelope={ok?:boolean;status?:number;history?:HistoryItem[];items?:HistoryItem[];error?:string};
function val(v:unknown){if(v===null||v===undefined||v==='')return'—';if(typeof v==='object')return JSON.stringify(v);return String(v)}

export default function FirmaLifecycleGuard(){
 const location=useLocation();const match=location.pathname.match(/^\/firmas\/([^/]+)$/);const id=match?.[1]?decodeURIComponent(match[1]):'';const active=Boolean(IS_PRODUCTION&&match&&id&&id!=='nuevo'&&id!=='nueva');
 const[host,setHost]=useState<HTMLElement|null>(null),[history,setHistory]=useState<HistoryItem[]>([]),[status,setStatus]=useState<number|null>(null),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(!active){setHost(null);return}const place=()=>{const roots=[...document.querySelectorAll('.ops-root')].filter(el=>{const r=(el as HTMLElement).getBoundingClientRect();return r.width>0&&r.height>0});const root=roots.at(-1) as HTMLElement|undefined;const content=root?.querySelector('.ops-content') as HTMLElement|null;if(!content)return;let h=content.querySelector(':scope > .firma-lifecycle-host') as HTMLElement|null;if(!h){h=document.createElement('div');h.className='firma-lifecycle-host';content.appendChild(h)}setHost(h)};place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();document.querySelectorAll('.firma-lifecycle-host').forEach(el=>el.remove());setHost(null)}},[active,location.pathname]);
 async function load(){if(!active)return;setLoading(true);setMessage('');const r=await fetchAppApi<HistoryEnvelope>(`/firmas/${encodeURIComponent(id)}/history`);setStatus(r.status);setHistory(r.status===200?(r.data?.history??r.data?.items??[]):[]);if(r.status===403)setMessage('Tu perfil no puede consultar el histórico de esta firma.');else if(r.status===404)setMessage('No se ha encontrado la firma.');else if(r.status!==200)setMessage('No se pudo cargar el histórico de firma.');setLoading(false)}
 useEffect(()=>{void load()},[active,id]);
 const ordered=useMemo(()=>[...history].sort((a,b)=>String(b.created_at??'').localeCompare(String(a.created_at??''))),[history]);
 if(!active||!host)return null;
 return createPortal(<section className="ops-table-card" data-testid="firma-lifecycle" style={{marginTop:16}}><div className="ops-table-head"><strong>Histórico de firma</strong><span>Trazabilidad canónica PROD</span></div><div className="ops-message" style={{display:'grid',gap:10}}><button type="button" onClick={()=>void load()} disabled={loading}><FileClock size={16}/>{loading?'Actualizando…':'Actualizar histórico'}</button>{message&&<div className="ops-message">{message}</div>}{!loading&&status===200&&ordered.length===0?<p>No hay eventos registrados para esta firma.</p>:!loading&&status===200?<div style={{display:'grid',gap:8}}>{ordered.map((e,i)=><div className="ops-message" key={String(e.id??i)}><strong>{val(e.action??'Evento')}</strong><div>{val(e.before_state)} → {val(e.after_state)}</div><small>{val(e.created_at)} · {val(e.actor_code)}</small></div>)}</div>:null}</div></section>,host);
}
