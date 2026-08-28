import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {Landmark,ShieldCheck,ArrowRight} from 'lucide-react';
import {SUPABASE_URL,supabase} from './supabase';

type Rank={bank_id:string;bank:string;score:number;reasons:string[];risks:string[];confidence?:number|null;last_review?:string|null;requires_belen?:boolean};
type StrategyStep={order:number;bank_id:string;bank:string;score:number;label:string;why:string[];verify_before:string[];move_to_next_when?:string|null;stop_and_escalate?:string|null;requires_belen?:boolean};
type Envelope={ok?:boolean;status?:number;ranking?:Rank[];strategy?:StrategyStep[];strategy_status?:string;policy?:string;requires_belen_gate?:boolean};
function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}
async function getRanking(id:string){const{data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return{status:401,data:null as Envelope|null};try{const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-bank-ranking-test/expedientes/${encodeURIComponent(id)}/ranking`,{headers:{Authorization:`Bearer ${session.access_token}`}});let data:Envelope|null=null;try{data=await r.json()}catch{}return{status:r.status,data}}catch{return{status:0,data:null as Envelope|null}}}
export default function ExpedienteBankRankingGuard(){
 const location=useLocation(),navigate=useNavigate();const match=location.pathname.match(/^\/expedientes\/([^/]+)$/),id=match?.[1]?decodeURIComponent(match[1]):'';const active=Boolean(match&&isNotionId(id));
 const[target,setTarget]=useState<Element|null>(null),[data,setData]=useState<Envelope|null>(null);
 useEffect(()=>{if(!active){setTarget(null);setData(null);return;}const attach=()=>setTarget(document.querySelector('.exp-ana-runtime-main'));attach();const obs=new MutationObserver(attach);obs.observe(document.body,{childList:true,subtree:true});return()=>obs.disconnect()},[active,id]);
 useEffect(()=>{if(!active)return;let alive=true;void getRanking(id).then(r=>{if(alive)setData(r.status===200&&r.data?.ok?r.data:null)});return()=>{alive=false}},[active,id]);
 if(!active||!target||!data?.ranking?.length)return null;const ranking=data.ranking.slice(0,3),strategy=(data.strategy||[]).slice(0,3);
 return createPortal(<>
  <section className="exp-ana-memory" data-testid="expediente-bank-ranking" aria-label="Bancos con mejor encaje"><div className="exp-ana-memory-head"><Landmark size={16}/><strong>Bancos con mejor encaje para este expediente</strong></div>{ranking.map((x,i)=><article key={x.bank_id}><small>OPCIÓN {i+1} · ENCAJE {x.score}/100</small><p><b>{x.bank}</b></p>{x.reasons.length>0&&<p>{x.reasons.join(' ')}</p>}{x.risks.length>0&&<em>Revisar: {x.risks.join(' ')}</em>}<button type="button" onClick={()=>navigate(`/bancos/${encodeURIComponent(x.bank_id)}`)}>Ver ficha del banco</button></article>)}<div className="exp-ana-evidence-line"><ShieldCheck size={15}/><span>Esto ordena alternativas por encaje con los datos actuales. No es una aprobación del banco y la estrategia financiera final sigue pasando por Belén.</span></div></section>
  {strategy.length>0&&<section className="exp-ana-memory" data-testid="expediente-bank-strategy" aria-label="Plan bancario recomendado"><div className="exp-ana-memory-head"><ArrowRight size={16}/><strong>Plan bancario recomendado</strong></div>{strategy.map((x,i)=><article key={`strategy-${x.bank_id}`}><small>PASO {x.order} · {x.label}</small><p><b>{x.bank}</b> · encaje {x.score}/100</p>{x.why.length>0&&<p><b>Por qué:</b> {x.why.join(' ')}</p>}{x.verify_before.length>0&&<div><p><b>Antes de presentarlo:</b></p><ul>{x.verify_before.map((v,j)=><li key={j}>{v}</li>)}</ul></div>}{x.move_to_next_when&&<p><b>Cuándo pasar a la siguiente opción:</b> {x.move_to_next_when}</p>}{x.stop_and_escalate&&<em>{x.stop_and_escalate}</em>}{i<strategy.length-1&&<div aria-hidden="true">↓</div>}<button type="button" onClick={()=>navigate(`/bancos/${encodeURIComponent(x.bank_id)}`)}>Revisar este banco</button></article>)}<div className="exp-ana-evidence-line"><ShieldCheck size={15}/><span>Este plan sirve para preparar la estrategia, no para enviar el expediente automáticamente. Belén revisa la secuencia y decide antes de cualquier presentación bancaria.</span></div></section>}
 </>,target);
}
