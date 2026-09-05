import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {Brain,ShieldCheck} from 'lucide-react';
import {fetchEnvironmentApi} from './supabase';

type Person={role?:string|null;situacion_laboral?:string|null;next_missing_field?:{label?:string}|null};
type Advice={action?:string|null;why?:string;blocking_reason?:string;evidence?:{phase?:string|null;blocking_reason?:string|null};people?:{items?:Person[]}};
type Rule={id:string;category:string;text:string;requires_belen?:boolean};
type ApprovedRule={id:string;category?:string;text:string;condition?:string|null;reason?:string|null;confidence?:number|null;version?:string|null;revalidate?:boolean};
type Envelope={ok?:boolean;status?:number;source?:string;source_page_id?:string;snapshot_date?:string;authority?:string;baseline?:Rule[];approved_rules?:ApprovedRule[];approved_count?:number;requires_belen_gate?:boolean;policy?:string};

function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}
async function edgeJson<T>(slug:string,path:string,init?:RequestInit){
 return fetchEnvironmentApi<T>(slug,path,init,{productionAvailable:false});
}

export default function ExpedienteBelenFinancialGuard(){
 const location=useLocation();
 const match=location.pathname.match(/^\/expedientes\/([^/]+)$/),id=match?.[1]?decodeURIComponent(match[1]):'';
 const active=Boolean(match&&isNotionId(id));
 const[target,setTarget]=useState<Element|null>(null),[ctx,setCtx]=useState<Envelope|null>(null);

 useEffect(()=>{if(!active){setTarget(null);setCtx(null);return;}const attach=()=>setTarget(document.querySelector('.exp-ana-runtime-main'));attach();const obs=new MutationObserver(attach);obs.observe(document.body,{childList:true,subtree:true});return()=>obs.disconnect()},[active,id]);
 useEffect(()=>{if(!active)return;let alive=true;void edgeJson<Advice>('fenix-expediente-assistant',`/expedientes/${encodeURIComponent(id)}/advice`).then(async a=>{
  if(!alive||a.status!==200||!a.data)return;
  const r=await edgeJson<Envelope>('fenix-belen-financial-context','/context',{method:'POST',body:JSON.stringify({phase:a.data.evidence?.phase||'',action:a.data.action||'',blocking_reason:a.data.evidence?.blocking_reason||a.data.blocking_reason||'',people:a.data.people?.items||[]})});
  if(!alive)return;setCtx(r.status===200&&r.data?.ok?r.data:null);
 });return()=>{alive=false}},[active,id]);
 if(!active||!target||!ctx)return null;
 const baseline=(ctx.baseline||[]).slice(0,6),approved=(ctx.approved_rules||[]).filter(x=>x.text).slice(0,3);
 if(!baseline.length&&!approved.length)return null;
 return createPortal(<section className="exp-ana-memory" data-testid="expediente-belen-financial-context" aria-label="Conocimiento financiero de Belén que Ana consulta">
   <div className="exp-ana-memory-head"><Brain size={16}/><strong>Conocimiento financiero de Belén que Ana consulta</strong></div>
   {baseline.length>0&&<div data-testid="belen-financial-guidance"><small>GUÍA OPERATIVA · BASE MAESTRA BELÉN</small>{baseline.map(x=><article key={x.id} data-knowledge-id={x.id}><small>{x.category}</small><p>{x.text}</p></article>)}<p><em>Esta guía orienta el análisis y el siguiente paso. No convierte por sí sola una experiencia operativa en una regla automática.</em></p></div>}
   {approved.length>0&&<div data-testid="belen-financial-approved-rules"><small>REGLAS FINANCIERAS APROBADAS</small>{approved.map(x=><article key={x.id} data-knowledge-id={x.id}><small>{x.category||'Criterio financiero aprobado'}</small><p>{x.text}</p>{x.condition&&<em>Aplica cuando: {x.condition}</em>}</article>)}</div>}
   <div className="exp-ana-evidence-line"><ShieldCheck size={15}/><span>Si hay una excepción, una duda financiera material o un criterio bancario que pueda haber cambiado, Ana lo eleva a Belén antes de darlo por válido.</span></div>
 </section>,target);
}
