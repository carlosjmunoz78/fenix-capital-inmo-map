import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {supabase,SUPABASE_URL} from './supabase';
import './direction-executive-overview.css';

type BankRank={id:string;banco:string;firmadas_mes:number;previstas_mes:number};
type TeamRank={id:string;nombre:string;codigo:string;firmadas_mes:number;previstas_mes:number;expedientes_en_curso:number;test?:boolean};
type Payload={ok?:boolean;bank_ranking?:BankRank[];team?:TeamRank[];bank_sample?:{firmadas_con_banco?:number;previstas_con_banco?:number};error?:string};

function monthNow(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
async function fetchOverview(){
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null as Payload|null};
 const q=new URLSearchParams({key:'executive-overview',month:monthNow()});
 const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-direction-kpis-test?${q.toString()}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
 let data:Payload|null=null;try{data=await r.json()}catch{data=null}
 return{status:r.status,data};
}
function pct(v:number,max:number){return `${Math.max(8,Math.round((v/Math.max(1,max))*100))}%`;}

export default function DirectionExecutiveOverviewGuard(){
 const location=useLocation(),navigate=useNavigate();
 const[bankTarget,setBankTarget]=useState<HTMLElement|null>(null);
 const[teamTarget,setTeamTarget]=useState<HTMLElement|null>(null);
 const[status,setStatus]=useState<number|null>(null);
 const[data,setData]=useState<Payload|null>(null);
 useEffect(()=>{
  if(location.pathname!=='/inicio'){setBankTarget(null);setTeamTarget(null);return;}
  let stopped=false;let obs:MutationObserver|null=null;
  const attach=()=>{if(stopped)return;const bank=document.querySelector('.bank-card') as HTMLElement|null;const team=document.querySelector('.team-card') as HTMLElement|null;if(bank&&team){setBankTarget(bank);setTeamTarget(team);bank.dataset.executiveOverview='true';team.dataset.executiveOverview='true';obs?.disconnect();return;}obs=new MutationObserver(attach);obs.observe(document.body,{childList:true,subtree:true});};
  attach();return()=>{stopped=true;obs?.disconnect();document.querySelectorAll('[data-executive-overview]').forEach(el=>el.removeAttribute('data-executive-overview'));setBankTarget(null);setTeamTarget(null)};
 },[location.pathname]);
 useEffect(()=>{if(location.pathname!=='/inicio')return;let alive=true;setStatus(null);setData(null);fetchOverview().then(r=>{if(!alive)return;setStatus(r.status);setData(r.data)}).catch(()=>{if(alive){setStatus(0);setData(null)}});return()=>{alive=false}},[location.pathname]);
 const banks=(data?.bank_ranking??[]).slice(0,3);
 const team=(data?.team??[]).filter(x=>!x.test).slice(0,5);
 const maxBank=Math.max(1,...banks.map(x=>x.firmadas_mes+x.previstas_mes));
 const maxTeam=Math.max(1,...team.map(x=>x.firmadas_mes+x.previstas_mes+x.expedientes_en_curso));
 const bankView=bankTarget?createPortal(<div className="dir-exec-panel dir-exec-bank" data-testid="direction-bank-ranking">
  <div className="dir-exec-title"><div><small>RENDIMIENTO REAL</small><strong>Top 3 bancos</strong></div><button onClick={()=>navigate('/bancos')}>Ver todos</button></div>
  {status===null?<div className="dir-exec-empty">Calculando con datos canónicos…</div>:status!==200?<div className="dir-exec-empty">Ranking no disponible ahora. No se muestran estimaciones.</div>:banks.length===0?<div className="dir-exec-empty"><strong>Sin muestra suficiente este mes</strong><span>El ranking aparecerá cuando existan firmas enlazadas de forma segura a una oferta y un banco.</span></div>:<div className="dir-exec-bars">{banks.map((r,i)=><button key={r.id} className="dir-exec-row" onClick={()=>navigate(`/bancos/${encodeURIComponent(r.id)}`)}><b className="dir-rank-medal">{i+1}</b><span className="dir-exec-copy"><strong>{r.banco}</strong><small>{r.firmadas_mes} firmadas · {r.previstas_mes} previstas</small><i><u style={{width:pct(r.firmadas_mes+r.previstas_mes,maxBank)}}/></i></span><em>Ficha ›</em></button>)}</div>}
 </div>,bankTarget):null;
 const teamView=teamTarget?createPortal(<div className="dir-exec-panel dir-exec-team" data-testid="direction-financial-team">
  <div className="dir-exec-title"><div><small>EQUIPO FINANCIERO</small><strong>Actividad del mes</strong></div><button onClick={()=>navigate('/financieros')}>Ver equipo</button></div>
  {status===null?<div className="dir-exec-empty">Cargando equipo canónico…</div>:status!==200?<div className="dir-exec-empty">Equipo no disponible ahora.</div>:team.length===0?<div className="dir-exec-empty"><strong>Sin financieros reales activos visibles</strong><span>El gráfico está preparado y aparecerá automáticamente al existir perfiles reales canónicos; los perfiles TEST no se presentan como rendimiento real.</span></div>:<div className="dir-exec-team-grid">{team.map(r=><button key={r.id} onClick={()=>navigate(`/financieros/${encodeURIComponent(r.id)}`)} className="dir-exec-team-person"><span className="dir-team-dot">{r.nombre.split(/\s+/).slice(0,2).map(x=>x[0]).join('')}</span><div><strong>{r.nombre}</strong><small>{r.firmadas_mes} firmadas · {r.previstas_mes} previstas · {r.expedientes_en_curso} en curso</small><i><u style={{width:pct(r.firmadas_mes+r.previstas_mes+r.expedientes_en_curso,maxTeam)}}/></i></div></button>)}</div>}
 </div>,teamTarget):null;
 return <>{teamView}{bankView}</>;
}
