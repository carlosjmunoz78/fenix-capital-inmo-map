import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {Brain} from 'lucide-react';
import {fetchAnaCanonicalApi} from './supabase';

type Rule={id:string;rule:string;domain:string};
type Envelope={ok?:boolean;items?:Rule[];precedents?:Rule[]};

function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}

export default function ExpedienteKnowledgeGuard(){
 const location=useLocation();
 const match=location.pathname.match(/^\/expedientes\/([^/]+)$/);
 const id=match?.[1]?decodeURIComponent(match[1]):'';
 const active=Boolean(match&&isNotionId(id));
 const[target,setTarget]=useState<Element|null>(null);
 const[rules,setRules]=useState<Rule[]>([]);

 useEffect(()=>{
  setRules([]);
  if(!active)return;
  let alive=true;
  void fetchAnaCanonicalApi<Envelope>('/rules?domain=Hipotecas').then(r=>{
   if(!alive)return;
   setRules(r.status===200?(r.data?.items??[]).filter(x=>Boolean(x.rule?.trim())).slice(0,3):[]);
  });
  return()=>{alive=false};
 },[active,id]);

 useEffect(()=>{
  if(!active){setTarget(null);return;}
  const attach=()=>setTarget(document.querySelector('.exp-ana-runtime-main'));
  attach();
  const observer=new MutationObserver(attach);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[active,id]);

 if(!active||!target||rules.length===0)return null;
 return createPortal(
  <section
   className="exp-ana-memory"
   data-testid="expediente-ana-learned-criteria"
   data-knowledge-domain="Hipotecas"
   data-knowledge-ids={rules.map(rule=>rule.id).join(',')}
   aria-label="Criterios aprendidos por Ana"
  >
   <div className="exp-ana-memory-head"><Brain size={16}/><strong>Criterios aprendidos por Ana</strong></div>
   {rules.map(rule=><article key={rule.id}><p>{rule.rule}</p></article>)}
  </section>,
  target
 );
}
