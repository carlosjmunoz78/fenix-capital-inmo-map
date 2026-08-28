import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {Brain,ShieldCheck} from 'lucide-react';
import {SUPABASE_URL,supabase} from './supabase';

type Person={role?:string|null;situacion_laboral?:string|null;next_missing_field?:{label?:string}|null};
type Advice={action?:string|null;why?:string;blocking_reason?:string;evidence?:{phase?:string|null;blocking_reason?:string|null};people?:{items?:Person[]}};
type Rule={id:string;category:string;text:string;requires_belen?:boolean};
type ApprovedRule={id:string;category?:string;text:string;condition?:string|null;reason?:string|null;confidence?:number|null;version?:string|null;revalidate?:boolean};
type Envelope={ok?:boolean;status?:number;source?:string;authority?:string;baseline?:Rule[];approved_rules?:ApprovedRule[];approved_count?:number;requires_belen_gate?:boolean;policy?:string};

function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}
async function edgeJson<T>(slug:string,path:string,init?:RequestInit){
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null as T|null};
 try{
  const r=await fetch(`${SUPABASE_URL}/functions/v1/${slug}${path}`,{...init,headers:{'content-type':'application/json',...(init?.headers||{}),Authorization:`Bearer ${session.access_token}`}});
  let data:T|null=null;try{data=await r.json()}catch{}
  return{status:r.status,data};
 }catch{return{status:0,data:null as T|null}}
}

export default function ExpedienteBelenFinancialGuard(){
 const location=useLocation();
 const match=location.pathname.match(/^\/expedientes\/([^/]+)$/),id=match?.[1]?decodeURIComponent(match[1]):'';
 const active=Boolean(match&&isNotionId(id));
 const[target,setTarget]=useState<Element|null>(null),[ctx,setCtx]=useState<Envelope|null>(null);

 useEffect(()=>{if(!active){setTarget(null);setCtx(null);return;}const attach=()=>setTarget(document.querySelector('.exp-ana-runtime-main'));attach();const obs=new MutationObserver(attach);obs.observe(document.body,{childList:true,subtree:true});return()=>obs.disconnect()},[active,id]);
 useEffect(()=>{if(!active)return;let alive=true;void edgeJson<Advice>('fenix-expediente-assistant-test',`/expedientes/${encodeURIComponent(id)}/advice`).then(async a=>{
  if(!alive||a.status!==200||!a.data)return;
  const r=await edgeJson<Envelope>('fenix-belen-financial-context-test','/context',{method:'POST',body:JSON.stringify({phase:a.data.evidence?.phase||'',action:a.data.action||'',blocking_reason:a.data.evidence?.blocking_reason||a.data.blocking_reason||'',people:a.data.people?.items||[]})});
  if(!alive)return;setCtx(r.status===200&&r.data?.ok?r.data:null);
 });return()=>{alive=false}},[active,id]);
 if(!active||!target||!ctx)return null;
 const baseline=(ctx.baseline||[]).slice(0,6),approved=(ctx.approved_rules||[]).filter(x=>x.text).slice(0,3);
 if(!baseline.length&&!approved.length)return null;
 return createPortal(<section className="exp-ana-memory" data-testid="expediente-belen-financial-context" aria-label="Criterios de Belén que Ana está usando">
   <div className="exp-ana-memory-head"><Brain size={16}/><strong>Criterios de Belén que Ana está usando</strong></div>
   {baseline.map(x=><article key={x.id}><small>{x.category}</small><p>{x.text}</p></article>)}
   {approved.map(x=><article key={x.id}><small>{x.category||'Criterio financiero'}</small><p>{x.text}</p>{x.condition&&<em>Aplica cuando: {x.condition}</em>}</article>)}
   <div className="exp-ana-evidence-line"><ShieldCheck size={15}/><span>Si hay una excepción, una duda financiera material o un criterio bancario que pueda haber cambiado, Ana lo eleva a Belén antes de darlo por válido.</span></div>
 </section>,target);
}
