import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchAppApi} from './supabase';
import './direction-executive-overview.css';

type Row=Record<string,unknown>;
type BankRank={id:string;banco:string;score:number;reasons:string[]};
type Person={id?:string;actor_code?:string;worker_id?:string;personal_id?:string;code?:string;name?:string;role?:string;expedientes?:number;firmas_mes?:number};
type PersonalResponse={items?:Person[]};

function rowsFrom(data:unknown):Row[]{if(!data||typeof data!=='object')return[];const d=data as Record<string,unknown>;for(const k of ['items','bancos','results'])if(Array.isArray(d[k]))return d[k] as Row[];return[];}
function first(r:Row,keys:string[]){for(const k of keys){const v=r[k];if(typeof v==='string'&&v.trim())return v.trim();if(typeof v==='number'&&Number.isFinite(v))return String(v)}return'';}
function finiteNumber(v:unknown){if(typeof v==='number'&&Number.isFinite(v))return v;if(typeof v==='string'&&v.trim()){const n=Number(v);if(Number.isFinite(n))return n;}return null;}
function explicitRankingScore(r:Row){for(const k of ['ranking_score','performance_score','score','puntuacion','approval_score','conversion_score']){const n=finiteNumber(r[k]);if(n!==null)return n;}return null;}
function rankBank(r:Row):BankRank|null{
 const id=first(r,['bank_code','banco_code','id','code','codigo']);
 const banco=first(r,['nombre','name','banco','entidad']);
 const score=explicitRankingScore(r);
 if(!id||!banco||r.activo===false||score===null)return null;
 const reasons:string[]=[];
 const reason=first(r,['ranking_reason','performance_reason','motivo_ranking','reason']);
 if(reason)reasons.push(reason);else reasons.push('Puntuación recibida desde una señal canónica de ranking/rendimiento.');
 return{id,banco,score,reasons};
}
async function fetchBankRanking(){
 const r=await fetchAppApi<unknown>('/bancos');
 if(r.status!==200)return{status:r.status,items:[] as BankRank[]};
 const items=rowsFrom(r.data).map(rankBank).filter((x):x is BankRank=>Boolean(x)).sort((a,b)=>b.score-a.score||a.banco.localeCompare(b.banco,'es')).slice(0,3);
 return{status:items.length?200:204,items};
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
 const[banks,setBanks]=useState<BankRank[]>([]);
 const[people,setPeople]=useState<Person[]>([]);
 useEffect(()=>{
  if(location.pathname!=='/inicio'){setBankTarget(null);setTeamTarget(null);return;}
  let stopped=false;let obs:MutationObserver|null=null;
  const attach=()=>{if(stopped)return;const bank=document.querySelector('.bank-card') as HTMLElement|null;const team=document.querySelector('.team-card') as HTMLElement|null;if(bank&&team){setBankTarget(bank);setTeamTarget(team);bank.dataset.executiveOverview='true';team.dataset.executiveOverview='true';obs?.disconnect();return;}obs=new MutationObserver(attach);obs.observe(document.body,{childList:true,subtree:true});};
  attach();return()=>{stopped=true;obs?.disconnect();document.querySelectorAll('[data-executive-overview]').forEach(el=>el.removeAttribute('data-executive-overview'));setBankTarget(null);setTeamTarget(null)};
 },[location.pathname]);
 useEffect(()=>{
  if(location.pathname!=='/inicio')return;
  let alive=true;setStatus(null);setTeamStatus(null);setBanks([]);setPeople([]);
  Promise.all([fetchBankRanking(),fetchAppApi<PersonalResponse>('/personal')]).then(([r,p])=>{if(!alive)return;setStatus(r.status);setBanks(r.items);setTeamStatus(p.status);setPeople(p.status===200&&Array.isArray(p.data?.items)?p.data.items:[]);}).catch(()=>{if(alive){setStatus(0);setTeamStatus(0);setBanks([]);setPeople([])}});
  return()=>{alive=false};
 },[location.pathname]);
 const team=[...people].sort((a,b)=>num(b.firmas_mes)-num(a.firmas_mes)||num(b.expedientes)-num(a.expedientes)||personName(a).localeCompare(personName(b),'es')).slice(0,5);
 const maxBank=Math.max(1,...banks.map(x=>x.score));
 const maxTeam=Math.max(1,...team.map(x=>num(x.firmas_mes)+num(x.expedientes)));
 const bankView=bankTarget?createPortal(<div className="dir-exec-panel dir-exec-bank" data-testid="direction-bank-ranking">
  <div className="dir-exec-title"><div><small>BANCOS</small><strong>Top 3 bancos</strong></div><button onClick={()=>navigate('/bancos')}>Ver todos</button></div>
  {status===null?<div className="dir-exec-empty">Preparando ranking…</div>:status===204?<div className="dir-exec-empty"><strong>Ranking pendiente de señal canónica</strong><span>Mostraremos el Top 3 cuando exista una puntuación real de rendimiento; no se ordena por catálogo ni por capacidades declaradas.</span></div>:status!==200?<div className="dir-exec-empty">Ranking no disponible ahora.</div>:<div className="dir-exec-bars">{banks.map((r,i)=><button key={r.id} className={`dir-exec-row rank-${i+1}`} onClick={()=>navigate(`/bancos/${encodeURIComponent(r.id)}`)}><b className="dir-rank-medal">{i+1}</b><span className="dir-exec-copy"><strong>{r.banco}</strong><small>{r.reasons.join(' ')}</small><i><u style={{width:pct(r.score,maxBank)}}/></i></span><em>Ficha ›</em></button>)}</div>}
 </div>,bankTarget):null;
 const teamView=teamTarget?createPortal(<div className="dir-exec-panel dir-exec-team" data-testid="direction-financial-team">
  <div className="dir-exec-title"><div><small>EQUIPO FINANCIERO</small><strong>Actividad</strong></div><button onClick={()=>navigate('/financieros')}>Ver equipo</button></div>
  {teamStatus===null?<div className="dir-exec-empty">Cargando equipo…</div>:teamStatus!==200?<div className="dir-exec-empty">Equipo no disponible ahora.</div>:team.length===0?<div className="dir-exec-empty"><strong>Sin perfiles financieros visibles</strong><span>Los financieros aparecerán aquí cuando estén disponibles.</span></div>:<div className="dir-exec-team-grid">{team.map((r,i)=>{const id=personId(r);const firmas=num(r.firmas_mes),exp=num(r.expedientes);return <button key={id||`${personName(r)}-${i}`} onClick={()=>id?navigate(`/financieros/${encodeURIComponent(id)}`):navigate('/financieros')} className="dir-exec-team-person"><span className="dir-team-dot">{personName(r).split(/\s+/).slice(0,2).map(x=>x[0]).join('')}</span><div><strong>{personName(r)}</strong><small>{firmas} firmas este mes · {exp} expedientes</small><i><u style={{width:pct(firmas+exp,maxTeam)}}/></i></div></button>})}</div>}
 </div>,teamTarget):null;
 return <>{teamView}{bankView}</>;
}
