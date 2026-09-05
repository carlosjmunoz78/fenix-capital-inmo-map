import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchAppApi,fetchDirectionKpisApi} from './supabase';
import './direction-executive-overview.css';

type BankRank={id:string;banco:string;firmadas_mes:number;previstas_mes:number};
type BankCatalog={id:string;banco:string;activo?:boolean};
type Payload={ok?:boolean;bank_ranking?:BankRank[];bank_catalog?:BankCatalog[];bank_sample?:{firmadas_con_banco?:number;previstas_con_banco?:number};error?:string};
type Person={id?:string;actor_code?:string;worker_id?:string;personal_id?:string;code?:string;name?:string;role?:string;expedientes?:number;firmas_mes?:number};
type PersonalResponse={items?:Person[]};

function monthNow(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
async function fetchOverview(){
 const q=new URLSearchParams({key:'executive-overview',month:monthNow()});
 return fetchDirectionKpisApi<Payload>(`?${q.toString()}`);
}
function num(v:unknown){return typeof v==='number'&&Number.isFinite(v)?v:0;}
function personId(p:Person){for(const k of ['id','actor_code','worker_id','personal_id','code'] as const){const v=p[k];if(typeof v==='string'&&v.trim())return v.trim();}return'';}
function personName(p:Person){return typeof p.name==='string'&&p.name.trim()?p.name.trim():'Perfil financiero';}
function pct(v:number,max:number){return `${Math.max(8,Math.round((v/Math.max(1,max))*100))}%`;}

export default function DirectionExecutiveOverviewGuard(){
 const location=useLocation(),navigate=useNavigate();
 const[bankTarget,setBankTarget]=useState<HTMLElement|null>(null);
 const[teamTarget,setTeamTarget]=useState<HTMLElement|null>(null);
 const[status,setStatus]=useState<number|null>(null);
 const[teamStatus,setTeamStatus]=useState<number|null>(null);
 const[data,setData]=useState<Payload|null>(null);
 const[people,setPeople]=useState<Person[]>([]);
 useEffect(()=>{
  if(location.pathname!=='/inicio'){setBankTarget(null);setTeamTarget(null);return;}
  let stopped=false;let obs:MutationObserver|null=null;
  const attach=()=>{if(stopped)return;const bank=document.querySelector('.bank-card') as HTMLElement|null;const team=document.querySelector('.team-card') as HTMLElement|null;if(bank&&team){setBankTarget(bank);setTeamTarget(team);bank.dataset.executiveOverview='true';team.dataset.executiveOverview='true';obs?.disconnect();return;}obs=new MutationObserver(attach);obs.observe(document.body,{childList:true,subtree:true});};
  attach();return()=>{stopped=true;obs?.disconnect();document.querySelectorAll('[data-executive-overview]').forEach(el=>el.removeAttribute('data-executive-overview'));setBankTarget(null);setTeamTarget(null)};
 },[location.pathname]);
 useEffect(()=>{
  if(location.pathname!=='/inicio')return;
  let alive=true;setStatus(null);setTeamStatus(null);setData(null);setPeople([]);
  Promise.all([fetchOverview(),fetchAppApi<PersonalResponse>('/personal')]).then(([r,p])=>{if(!alive)return;setStatus(r.status);setData(r.data);setTeamStatus(p.status);setPeople(p.status===200&&Array.isArray(p.data?.items)?p.data.items:[]);}).catch(()=>{if(alive){setStatus(0);setTeamStatus(0);setData(null);setPeople([])}});
  return()=>{alive=false};
 },[location.pathname]);
 const banks=(data?.bank_ranking??[]).slice(0,3);
 const catalog=(data?.bank_catalog??[]).filter(x=>x.id&&x.banco).slice(0,3);
 const showPreview=status===200&&banks.length<3&&catalog.length>=3;
 const podium=showPreview?catalog.map((b,i)=>({...b,firmadas_mes:0,previstas_mes:0,preview:true,place:i+1})):banks.map((b,i)=>({...b,preview:false,place:i+1}));
 const team=[...people].sort((a,b)=>num(b.firmas_mes)-num(a.firmas_mes)||num(b.expedientes)-num(a.expedientes)||personName(a).localeCompare(personName(b),'es')).slice(0,5);
 const maxBank=Math.max(1,...banks.map(x=>x.firmadas_mes+x.previstas_mes));
 const maxTeam=Math.max(1,...team.map(x=>num(x.firmas_mes)+num(x.expedientes)));
 const bankView=bankTarget?createPortal(<div className="dir-exec-panel dir-exec-bank" data-testid="direction-bank-ranking">
  <div className="dir-exec-title"><div><small>BANCOS</small><strong>Top 3 bancos</strong></div><button onClick={()=>navigate('/bancos')}>Ver todos</button></div>
  {status===null?<div className="dir-exec-empty">Preparando ranking…</div>:status!==200?<div className="dir-exec-empty">Ranking no disponible ahora.</div>:podium.length===0?<div className="dir-exec-empty"><strong>Sin actividad suficiente este mes</strong><span>El ranking aparecerá cuando haya operaciones suficientes para ordenarlo.</span></div>:<div className={`dir-exec-bars${showPreview?' is-preview':''}`}>{podium.map(r=><button key={r.id} className={`dir-exec-row rank-${r.place}`} onClick={()=>navigate(`/bancos/${encodeURIComponent(r.id)}`)}><b className="dir-rank-medal">{r.place}</b><span className="dir-exec-copy"><strong>{r.banco}</strong>{r.preview?<small>Pendiente de actividad del mes</small>:<small>{r.firmadas_mes} firmadas · {r.previstas_mes} previstas</small>}{!r.preview&&<i><u style={{width:pct(r.firmadas_mes+r.previstas_mes,maxBank)}}/></i>}</span><em>Ficha ›</em></button>)}</div>}
 </div>,bankTarget):null;
 const teamView=teamTarget?createPortal(<div className="dir-exec-panel dir-exec-team" data-testid="direction-financial-team">
  <div className="dir-exec-title"><div><small>EQUIPO FINANCIERO</small><strong>Actividad</strong></div><button onClick={()=>navigate('/financieros')}>Ver equipo</button></div>
  {teamStatus===null?<div className="dir-exec-empty">Cargando equipo…</div>:teamStatus!==200?<div className="dir-exec-empty">Equipo no disponible ahora.</div>:team.length===0?<div className="dir-exec-empty"><strong>Sin perfiles financieros visibles</strong><span>Los financieros aparecerán aquí cuando estén disponibles.</span></div>:<div className="dir-exec-team-grid">{team.map((r,i)=>{const id=personId(r);const firmas=num(r.firmas_mes),exp=num(r.expedientes);return <button key={id||`${personName(r)}-${i}`} onClick={()=>id?navigate(`/financieros/${encodeURIComponent(id)}`):navigate('/financieros')} className="dir-exec-team-person"><span className="dir-team-dot">{personName(r).split(/\s+/).slice(0,2).map(x=>x[0]).join('')}</span><div><strong>{personName(r)}</strong><small>{firmas} firmas este mes · {exp} expedientes</small><i><u style={{width:pct(firmas+exp,maxTeam)}}/></i></div></button>})}</div>}
 </div>,teamTarget):null;
 return <>{teamView}{bankView}</>;
}
