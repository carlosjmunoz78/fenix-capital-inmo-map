import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {Phone,Mail,MessageCircle,ShieldCheck,Users,Brain,CheckCircle2} from 'lucide-react';
import {SUPABASE_URL,supabase,fetchMemoryApi} from './supabase';
import {anaAvatar} from './assets/visualAssets';
import './expediente-ana-runtime.css';

type Advice={
 ok?:boolean;status?:number;action?:string|null;why?:string;blocking_reason?:string;
 evidence?:{task_id?:string|null;phase?:string|null;blocking_reason?:string|null};
 human?:{instruction?:string;must_record?:string};
 ana?:{would_do?:string;can_execute?:boolean;blocked_by?:string;execution_kind?:string};
 client?:{name?:string|null;email?:string|null;phone?:string|null};
 people?:{count?:number;titulares?:number;avalistas?:number;missing_docs?:number;items?:Array<{id:string;name:string;role?:string|null;docs_complete?:boolean|null;reviewed?:boolean|null}>};
 channels?:{
  llamada?:{canal?:string;objetivo?:string;guion?:string;preguntas?:string[];resultado_esperado?:string}|null;
  whatsapp?:{canal?:string;texto?:string}|null;
  email?:{canal?:string;asunto?:string;cuerpo?:string}|null;
 };
 execution_modes?:{ana?:boolean;help?:boolean;manual?:boolean};
};
type MemoryItem={id:string;detail:string;memory_class?:string;source_actor?:string;created_at?:string;evidence_count?:number};
type MemoryEnvelope={ok?:boolean;status?:number;items?:MemoryItem[]};
type ExecResult={ok?:boolean;status?:number;reused?:boolean;no_op?:boolean;communication_page_id?:string;channel?:string;external_sent?:boolean;requires_approval?:boolean;error?:string};

function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}
async function edgeJson<T>(path:string,init?:RequestInit){
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null as T|null};
 let r:Response;try{r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-expediente-assistant-test${path}`,{...init,headers:{'content-type':'application/json',...(init?.headers||{}),Authorization:`Bearer ${session.access_token}`,apikey:'sb_publishable_uvtiidkBBkFRt2K34so27g_JpCbMUZw'}})}catch{return{status:0,data:null as T|null}};
 let data:T|null=null;try{data=await r.json()}catch{}return{status:r.status,data};
}
async function fetchAdvice(id:string){return edgeJson<Advice>(`/expedientes/${encodeURIComponent(id)}/advice`);}

export default function ExpedienteAnaRuntimeGuard(){
 const location=useLocation(),navigate=useNavigate();
 const match=location.pathname.match(/^\/expedientes\/([^/]+)$/),id=match?.[1]?decodeURIComponent(match[1]):'';
 const active=Boolean(match&&isNotionId(id));
 const[advice,setAdvice]=useState<Advice|null>(null),[status,setStatus]=useState<number|null>(null),[target,setTarget]=useState<Element|null>(null),[channel,setChannel]=useState<'llamada'|'whatsapp'|'email'>('llamada'),[mode,setMode]=useState<'help'|'manual'|null>(null),[memory,setMemory]=useState<MemoryItem[]>([]),[execBusy,setExecBusy]=useState(false),[execMsg,setExecMsg]=useState('');

 useEffect(()=>{if(!active){setAdvice(null);setStatus(null);setMemory([]);setExecMsg('');return;}let alive=true;void Promise.all([fetchAdvice(id),fetchMemoryApi<MemoryEnvelope>('/context',{method:'POST',body:JSON.stringify({origin_type:'expediente',origin_code:id})})]).then(([r,m])=>{if(!alive)return;setStatus(r.status);setAdvice(r.status===200?r.data:null);setMemory(m.status===200?(m.data?.items??[]).slice(0,3):[]);});return()=>{alive=false}},[active,id]);
 useEffect(()=>{if(!active)return;const attach=()=>{const el=document.querySelector('.detail-next-action');if(el){setTarget(el);el.classList.toggle('exp-ana-runtime-ready',Boolean(advice&&status===200));}};attach();const obs=new MutationObserver(attach);obs.observe(document.body,{childList:true,subtree:true});return()=>{obs.disconnect();document.querySelector('.detail-next-action')?.classList.remove('exp-ana-runtime-ready')}},[active,advice,status]);
 const usable=active&&status===200&&advice&&target;
 const channelData=useMemo(()=>advice?.channels?.[channel]??null,[advice,channel]);
 if(!usable)return null;
 const action=advice.action||'No existe todavía una siguiente acción canónica.';
 const canAna=Boolean(advice.ana?.can_execute||advice.execution_modes?.ana);
 const canHelp=advice.execution_modes?.help!==false;
 const canManual=advice.execution_modes?.manual!==false;
 const people=advice.people;
 function prepareMessage(kind:'whatsapp'|'email'){
  const q=new URLSearchParams({scope_type:'expediente',scope_code:id,channel:kind==='whatsapp'?'WhatsApp':'Email'});
  if(kind==='whatsapp'&&advice?.channels?.whatsapp?.texto)q.set('body',advice.channels.whatsapp.texto);
  if(kind==='email'){
   if(advice?.channels?.email?.asunto)q.set('subject',advice.channels.email.asunto);
   if(advice?.channels?.email?.cuerpo)q.set('body',advice.channels.email.cuerpo);
  }
  navigate(`/comunicaciones/nueva?${q.toString()}`);
 }
 function goPeople(){document.querySelector('.exp-people')?.scrollIntoView({behavior:'smooth',block:'start'});}
 function executionChannel(){if(channelData)return channel==='email'?'Email':channel==='whatsapp'?'WhatsApp':'Llamada';if(advice?.channels?.email)return'Email';if(advice?.channels?.whatsapp)return'WhatsApp';if(advice?.channels?.llamada)return'Llamada';return null;}
 async function letAnaDoIt(){const ch=executionChannel();if(!canAna||!ch||execBusy)return;setExecBusy(true);setExecMsg('');const r=await edgeJson<ExecResult>(`/expedientes/${encodeURIComponent(id)}/prepare-contact`,{method:'POST',body:JSON.stringify({channel:ch})});setExecBusy(false);if((r.status===200||r.status===201)&&r.data?.ok){setExecMsg(r.data.reused?'Ana ya había preparado esta comunicación; no la he duplicado.':'Ana ha preparado la comunicación en Fénix Uno. No se ha enviado: queda pendiente del gate correspondiente.');}else if(r.data?.error==='no_contact_gate')setExecMsg('No puedo preparar contacto: el cliente figura como No contactar.');else if(r.data?.error==='channel_recipient_missing')setExecMsg('Ese canal no tiene destinatario disponible.');else setExecMsg('No he ejecutado nada porque el gate de seguridad no se pudo validar.');}
 return createPortal(<div className="exp-ana-runtime-content" data-testid="expediente-ana-runtime">
   <img src={anaAvatar} alt="Ana"/>
   <div className="exp-ana-runtime-main">
    <span>ANA · SIGUIENTE MEJOR ACCIÓN · DATOS VIVOS</span>
    <h2>{action}</h2>
    <p><b>Por qué:</b> {advice.why||advice.blocking_reason||'No hay una justificación canónica disponible todavía.'}</p>
    {(advice.evidence?.phase||advice.evidence?.blocking_reason||advice.evidence?.task_id)&&<div className="exp-ana-evidence-line"><ShieldCheck size={15}/><span>{advice.evidence?.phase?`Fase: ${advice.evidence.phase}`:''}{advice.evidence?.blocking_reason?` · Bloqueo: ${advice.evidence.blocking_reason}`:''}{advice.evidence?.task_id?` · Tarea origen vinculada`:''}</span></div>}
    {people&&<div className="exp-ana-people-line"><Users size={16}/><div><strong>{people.count??0} interviniente{(people.count??0)===1?'':'s'}</strong><span>{people.titulares??0} titular{(people.titulares??0)===1?'':'es'} · {people.avalistas??0} avalista{(people.avalistas??0)===1?'':'s'} · {people.missing_docs??0} con documentación pendiente</span></div><button onClick={goPeople}>Ver personas</button></div>}
    {memory.length>0&&<section className="exp-ana-memory" aria-label="Contexto recordado por Ana"><div className="exp-ana-memory-head"><Brain size={16}/><strong>Lo que recuerdo de este expediente</strong></div>{memory.map(x=><article key={x.id}><small>{x.memory_class||'Contexto'}{x.source_actor?` · ${x.source_actor}`:''}</small><p>{x.detail}</p></article>)}</section>}

    <div className="exp-ana-runtime-modes">
      <button disabled={!canAna||execBusy} onClick={()=>void letAnaDoIt()} title={canAna?'Ana preparará una comunicación idempotente y no la enviará sin el gate posterior.':advice.ana?.blocked_by||'Ana todavía no tiene autoridad para ejecutar esta acción.'}>{execBusy?'Ana está preparando…':'Que lo haga Ana'}</button>
      <button className={mode==='help'?'selected':''} disabled={!canHelp} onClick={()=>setMode('help')}>Ayúdame</button>
      <button className={mode==='manual'?'selected':''} disabled={!canManual} onClick={()=>setMode('manual')}>Lo hago yo</button>
    </div>
    {execMsg&&<div className="exp-ana-exec-result" role="status"><CheckCircle2 size={16}/><strong>{execMsg}</strong></div>}
    <div className="exp-ana-runtime-explain">
      <article><small>SI LO HACES TÚ</small><p>{advice.human?.instruction||'Realiza una sola acción y registra el resultado real.'}</p><em>Registrar después: {advice.human?.must_record||'resultado real y una sola siguiente acción.'}</em></article>
      <article><small>SI LO HAGO YO</small><p>{advice.ana?.would_do||'Ana revisará el contexto, preparará la ejecución exacta y pedirá la autoridad necesaria antes de actuar.'}</p>{!canAna&&<em>{advice.ana?.blocked_by||'Ejecución autónoma todavía bloqueada.'}</em>}{canAna&&<em>En esta fase “hacerlo” significa preparar y registrar la acción segura; no enviar ni cerrar resultados que todavía dependen del cliente.</em>}</article>
      <article><small>SI TE AYUDO</small><p>{mode==='help'?'Te guío con este paso sin ejecutarlo: revisa el guion o mensaje, confirma que refleja el caso y registra el resultado cuando termines.':'Pulsa Ayúdame para trabajar este paso guiado sin que Ana lo ejecute.'}</p></article>
    </div>

    <section className="exp-ana-channels" aria-label="Canales preparados por Ana">
      <div className="exp-ana-channel-tabs">
        <button className={channel==='llamada'?'active':''} disabled={!advice.channels?.llamada} onClick={()=>setChannel('llamada')}><Phone size={15}/> Llamada</button>
        <button className={channel==='whatsapp'?'active':''} disabled={!advice.channels?.whatsapp} onClick={()=>setChannel('whatsapp')}><MessageCircle size={15}/> WhatsApp</button>
        <button className={channel==='email'?'active':''} disabled={!advice.channels?.email} onClick={()=>setChannel('email')}><Mail size={15}/> Email</button>
      </div>
      {channel==='llamada'&&advice.channels?.llamada&&<article className="exp-ana-channel-preview"><small>GUION EXACTO</small><p>{advice.channels.llamada.guion}</p>{advice.channels.llamada.preguntas?.length?<ul>{advice.channels.llamada.preguntas.map((x,i)=><li key={i}>{x}</li>)}</ul>:null}<em>Resultado esperado: {advice.channels.llamada.resultado_esperado}</em></article>}
      {channel==='whatsapp'&&advice.channels?.whatsapp&&<article className="exp-ana-channel-preview"><small>WHATSAPP QUE ENVIARÍA ANA</small><p>{advice.channels.whatsapp.texto}</p><button className="primary" onClick={()=>prepareMessage('whatsapp')}>Preparar WhatsApp manualmente</button></article>}
      {channel==='email'&&advice.channels?.email&&<article className="exp-ana-channel-preview"><small>EMAIL QUE ENVIARÍA ANA</small><strong>{advice.channels.email.asunto}</strong><p className="preserve-lines">{advice.channels.email.cuerpo}</p><button className="primary" onClick={()=>prepareMessage('email')}>Preparar Email manualmente</button></article>}
      {!channelData&&<div className="exp-ana-channel-empty">Este canal no está disponible con la evidencia actual.</div>}
    </section>
   </div>
 </div>,target);
}
