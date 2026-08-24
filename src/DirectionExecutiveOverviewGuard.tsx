import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {supabase,SUPABASE_URL} from './supabase';
import './direction-executive-overview.css';

type BankRank={id:string;banco:string;firmadas_mes:number;previstas_mes:number};
type Payload={ok?:boolean;bank_ranking?:BankRank[];bank_sample?:{firmadas_con_banco?:number;previstas_con_banco?:number};error?:string};

function monthNow(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
async function fetchOverview(){
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null as Payload|null};
 const q=new URLSearchParams({key:'executive-overview',month:monthNow()});
 const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-direction-kpis-test?${q.toString()}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
 let data:Payload|null=null;try{data=await r.json()}catch{data=null}
 return{status:r.status,data};
}

export default function DirectionExecutiveOverviewGuard(){
 const location=useLocation(),navigate=useNavigate();
 const[target,setTarget]=useState<HTMLElement|null>(null);
 const[status,setStatus]=useState<number|null>(null);
 const[data,setData]=useState<Payload|null>(null);
 useEffect(()=>{
  if(location.pathname!=='/inicio'){setTarget(null);return;}
  let stopped=false;let obs:MutationObserver|null=null;
  const attach=()=>{if(stopped)return;const el=document.querySelector('.bank-card') as HTMLElement|null;if(el){setTarget(el);el.dataset.executiveOverview='true';obs?.disconnect();return;}obs=new MutationObserver(attach);obs.observe(document.body,{childList:true,subtree:true});};
  attach();return()=>{stopped=true;obs?.disconnect();document.querySelectorAll('.bank-card[data-executive-overview]').forEach(el=>el.removeAttribute('data-executive-overview'));setTarget(null)};
 },[location.pathname]);
 useEffect(()=>{if(location.pathname!=='/inicio')return;let alive=true;setStatus(null);setData(null);fetchOverview().then(r=>{if(!alive)return;setStatus(r.status);setData(r.data)}).catch(()=>{if(alive){setStatus(0);setData(null)}});return()=>{alive=false}},[location.pathname]);
 if(!target)return null;
 const rows=data?.bank_ranking??[];
 return createPortal(<div className="dir-bank-live" data-testid="direction-bank-ranking">
   {status===null?<div className="dir-bank-live-state">Calculando ranking con datos canónicos…</div>:status!==200?<div className="dir-bank-live-state">Ranking no disponible ahora. No se muestran datos estimados.</div>:rows.length===0?<div className="dir-bank-live-state"><strong>Sin muestra suficiente este mes.</strong><span>No hay firmas del mes enlazadas a una oferta bancaria con banco identificado.</span></div>:<>
    <div className="dir-bank-live-caption">Ordenado por firmas realizadas este mes; las previstas solo desempatan.</div>
    <div className="dir-bank-live-list">{rows.map((r,i)=><button key={r.id} onClick={()=>navigate('/bancos')} className="dir-bank-live-row"><b>{i+1}</b><span><strong>{r.banco}</strong><small>{r.firmadas_mes} firmada{r.firmadas_mes===1?'':'s'} · {r.previstas_mes} prevista{r.previstas_mes===1?'':'s'}</small></span><em>Ver banco ›</em></button>)}</div>
   </>}
  </div>,target);
}
