import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {Phone,Mail,MessageCircle,ShieldCheck} from 'lucide-react';
import {SUPABASE_URL,supabase} from './supabase';
import {anaAvatar} from './assets/visualAssets';
import './expediente-ana-runtime.css';

type Advice={
 ok?:boolean;status?:number;action?:string|null;why?:string;blocking_reason?:string;
 evidence?:{task_id?:string|null;phase?:string|null;blocking_reason?:string|null};
 human?:{instruction?:string;must_record?:string};
 ana?:{would_do?:string;can_execute?:boolean;blocked_by?:string};
 client?:{name?:string|null;email?:string|null;phone?:string|null};
 channels?:{
  llamada?:{canal?:string;objetivo?:string;guion?:string;preguntas?:string[];resultado_esperado?:string}|null;
  whatsapp?:{canal?:string;texto?:string}|null;
  email?:{canal?:string;asunto?:string;cuerpo?:string}|null;
 };
 execution_modes?:{ana?:boolean;help?:boolean;manual?:boolean};
};

function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}
async function fetchAdvice(id:string){
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null as Advice|null};
 let r:Response;
 try{r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-expediente-assistant-test/expedientes/${encodeURIComponent(id)}/advice`,{headers:{Authorization:`Bearer ${session.access_token}`,apikey:'sb_publishable_uvtiidkBBkFRt2K34so27g_JpCbMUZw'}})}catch{return{status:0,data:null as Advice|null}};
 let data:Advice|null=null;try{data=await r.json()}catch{}
 return{status:r.status,data};
}

export default function ExpedienteAnaRuntimeGuard(){
 const location=useLocation(),navigate=useNavigate();
 const match=location.pathname.match(/^\/expedientes\/([^/]+)$/),id=match?.[1]?decodeURIComponent(match[1]):'';
 const active=Boolean(match&&isNotionId(id));
 const[advice,setAdvice]=useState<Advice|null>(null),[status,setStatus]=useState<number|null>(null),[target,setTarget]=useState<Element|null>(null),[channel,setChannel]=useState<'llamada'|'whatsapp'|'email'>('llamada'),[mode,setMode]=useState<'help'|'manual'|null>(null);

 useEffect(()=>{if(!active){setAdvice(null);setStatus(null);return;}let alive=true;void fetchAdvice(id).then(r=>{if(alive){setStatus(r.status);setAdvice(r.status===200?r.data:null)}});return()=>{alive=false}},[active,id]);
 useEffect(()=>{if(!active)return;const attach=()=>{const el=document.querySelector('.detail-next-action');if(el){setTarget(el);el.classList.toggle('exp-ana-runtime-ready',Boolean(advice&&status===200));}};attach();const obs=new MutationObserver(attach);obs.observe(document.body,{childList:true,subtree:true});return()=>{obs.disconnect();document.querySelector('.detail-next-action')?.classList.remove('exp-ana-runtime-ready')}},[active,advice,status]);
 const usable=active&&status===200&&advice&&target;
 const channelData=useMemo(()=>advice?.channels?.[channel]??null,[advice,channel]);
 if(!usable)return null;
 const action=advice.action||'No existe todavía una siguiente acción canónica.';
 const canAna=Boolean(advice.ana?.can_execute||advice.execution_modes?.ana);
 const canHelp=advice.execution_modes?.help!==false;
 const canManual=advice.execution_modes?.manual!==false;
 function prepareMessage(kind:'whatsapp'|'email'){
  const q=new URLSearchParams({scope_type:'expediente',scope_code:id,channel:kind==='whatsapp'?'WhatsApp':'Email'});
  if(kind==='whatsapp'&&advice?.channels?.whatsapp?.texto)q.set('body',advice.channels.whatsapp.texto);
  if(kind==='email'){
   if(advice?.channels?.email?.asunto)q.set('subject',advice.channels.email.asunto);
   if(advice?.channels?.email?.cuerpo)q.set('body',advice.channels.email.cuerpo);
  }
  navigate(`/comunicaciones/nueva?${q.toString()}`);
 }
 return createPortal(<div className="exp-ana-runtime-content" data-testid="expediente-ana-runtime">
   <img src={anaAvatar} alt="Ana"/>
   <div className="exp-ana-runtime-main">
    <span>ANA · SIGUIENTE MEJOR ACCIÓN · DATOS VIVOS</span>
    <h2>{action}</h2>
    <p><b>Por qué:</b> {advice.why||advice.blocking_reason||'No hay una justificación canónica disponible todavía.'}</p>
    {(advice.evidence?.phase||advice.evidence?.blocking_reason||advice.evidence?.task_id)&&<div className="exp-ana-evidence-line"><ShieldCheck size={15}/><span>{advice.evidence?.phase?`Fase: ${advice.evidence.phase}`:''}{advice.evidence?.blocking_reason?` · Bloqueo: ${advice.evidence.blocking_reason}`:''}{advice.evidence?.task_id?` · Tarea origen vinculada`:''}</span></div>}

    <div className="exp-ana-runtime-modes">
      <button disabled={!canAna} title={canAna?'':advice.ana?.blocked_by||'Ana todavía no tiene autoridad para ejecutar esta acción.'}>Que lo haga Ana</button>
      <button className={mode==='help'?'selected':''} disabled={!canHelp} onClick={()=>setMode('help')}>Ayúdame</button>
      <button className={mode==='manual'?'selected':''} disabled={!canManual} onClick={()=>setMode('manual')}>Lo hago yo</button>
    </div>
    <div className="exp-ana-runtime-explain">
      <article><small>SI LO HACES TÚ</small><p>{advice.human?.instruction||'Realiza una sola acción y registra el resultado real.'}</p><em>Registrar después: {advice.human?.must_record||'resultado real y una sola siguiente acción.'}</em></article>
      <article><small>SI LO HAGO YO</small><p>{advice.ana?.would_do||'Ana revisará el contexto, preparará la ejecución exacta y pedirá la autoridad necesaria antes de actuar.'}</p>{!canAna&&<em>{advice.ana?.blocked_by||'Ejecución autónoma todavía bloqueada.'}</em>}</article>
      <article><small>SI TE AYUDO</small><p>{mode==='help'?'Te guío con este paso sin ejecutarlo: revisa el guion o mensaje, confirma que refleja el caso y registra el resultado cuando termines.':'Pulsa Ayúdame para trabajar este paso guiado sin que Ana lo ejecute.'}</p></article>
    </div>

    <section className="exp-ana-channels" aria-label="Canales preparados por Ana">
      <div className="exp-ana-channel-tabs">
        <button className={channel==='llamada'?'active':''} onClick={()=>setChannel('llamada')}><Phone size={15}/> Llamada</button>
        <button className={channel==='whatsapp'?'active':''} onClick={()=>setChannel('whatsapp')}><MessageCircle size={15}/> WhatsApp</button>
        <button className={channel==='email'?'active':''} onClick={()=>setChannel('email')}><Mail size={15}/> Email</button>
      </div>
      {channel==='llamada'&&advice.channels?.llamada&&<article className="exp-ana-channel-preview"><small>GUION EXACTO</small><p>{advice.channels.llamada.guion}</p>{advice.channels.llamada.preguntas?.length?<ul>{advice.channels.llamada.preguntas.map((x,i)=><li key={i}>{x}</li>)}</ul>:null}<em>Resultado esperado: {advice.channels.llamada.resultado_esperado}</em></article>}
      {channel==='whatsapp'&&advice.channels?.whatsapp&&<article className="exp-ana-channel-preview"><small>WHATSAPP QUE ENVIARÍA ANA</small><p>{advice.channels.whatsapp.texto}</p><button className="primary" onClick={()=>prepareMessage('whatsapp')}>Preparar WhatsApp</button></article>}
      {channel==='email'&&advice.channels?.email&&<article className="exp-ana-channel-preview"><small>EMAIL QUE ENVIARÍA ANA</small><strong>{advice.channels.email.asunto}</strong><p className="preserve-lines">{advice.channels.email.cuerpo}</p><button className="primary" onClick={()=>prepareMessage('email')}>Preparar Email</button></article>}
      {!channelData&&<div className="exp-ana-channel-empty">Este canal no está disponible con la evidencia actual.</div>}
    </section>
   </div>
 </div>,target);
}
