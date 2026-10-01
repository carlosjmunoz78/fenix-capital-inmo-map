import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {BrainCircuit,ChevronLeft,Mic,MicOff,Send,ShieldCheck,Square} from 'lucide-react';
import {cerebroConsoleLinkEnabled} from './cerebroConsoleAccess';
import {fetchAppApi,supabase} from './supabase';
import {fetchCerebroConsoleHealth,fetchCerebroConsolePreferences,postCerebroConsoleChat,type CerebroConsoleHealth,type CerebroLearningCandidate,type CerebroPendingAction,type CerebroPreferences,type CerebroReadContext} from './cerebroConsoleApi';
import {applyVoiceContextHints,createVoiceRecognition,spanishVoices,speechSynthesisSupported,speechText,voiceNeedsManualConfirmation,voiceRecognitionSupported,voiceSpeechProfile,type CerebroSpeechRecognition} from './cerebroVoice';
import './cerebro-console.css';

const CONTEXTS=['GENERAL','EMPRESA','ENGINE','CRM','APP','SEO','MARKETING','TRAINING','AUTOMATION'];
const DEFAULT_VOICE_PREFERENCES:CerebroPreferences={tone:'warm_close_caring',response_length:'concise',speech_rate:'0.96',speech_pitch:'1.04'};
type GatewayState='closed'|'checking'|'ready'|'error';
type ChatLine={role:'user'|'cerebro';text:string;mediaUrl?:string|null};
type OwnerAccess='checking'|'allowed'|'denied';
type SessionContext={actor_code?:string;role?:string};

function renderMessage(text:string){
 const parts=text.split(/(https?:\/\/[^\s]+)/g);
 return parts.map((part,index)=>/^https?:\/\//.test(part)?<a key={index} href={part} target="_blank" rel="noreferrer">{part}</a>:part);
}

export default function CerebroConsoleShell(){
 const location=useLocation(),navigate=useNavigate();
 const isCerebroPath=location.pathname.replace(/\/+$/,'')==='/cerebro';
 const configured=cerebroConsoleLinkEnabled();
 const [ownerAccess,setOwnerAccess]=useState<OwnerAccess>('checking');
 const [gatewayState,setGatewayState]=useState<GatewayState>('closed');
 const [health,setHealth]=useState<CerebroConsoleHealth|null>(null);
 const [message,setMessage]=useState('');
 const [sending,setSending]=useState(false);
 const [lines,setLines]=useState<ChatLine[]>([]);
 const [pendingAction,setPendingAction]=useState<CerebroPendingAction|null>(null);
 const [readContext,setReadContext]=useState<CerebroReadContext|null>(null);
 const [voiceSessionActive,setVoiceSessionActive]=useState(false);
 const [voiceListening,setVoiceListening]=useState(false);
 const [voiceSpeaking,setVoiceSpeaking]=useState(false);
 const [voiceError,setVoiceError]=useState('');
 const [voiceSupport,setVoiceSupport]=useState({stt:false,tts:false});
 const [voicePreferences,setVoicePreferences]=useState<CerebroPreferences>(DEFAULT_VOICE_PREFERENCES);
 const [learningCandidate,setLearningCandidate]=useState<CerebroLearningCandidate|null>(null);

 const recognitionRef=useRef<CerebroSpeechRecognition|null>(null);
 const voiceSessionRef=useRef(false);
 const voiceSpeakingRef=useRef(false);
 const sendingRef=useRef(false);
 const pendingActionRef=useRef<CerebroPendingAction|null>(null);
 const readContextRef=useRef<CerebroReadContext|null>(null);
 const voicePreferencesRef=useRef<CerebroPreferences>(DEFAULT_VOICE_PREFERENCES);
 const learningCandidateRef=useRef<CerebroLearningCandidate|null>(null);
 const restartTimerRef=useRef<number|null>(null);
 const startListeningRef=useRef<()=>void>(()=>{});
 const sendVoiceTextRef=useRef<(text:string,confidence:number|null)=>void>(()=>{});

 useEffect(()=>{pendingActionRef.current=pendingAction},[pendingAction]);
 useEffect(()=>{readContextRef.current=readContext},[readContext]);
 useEffect(()=>{voicePreferencesRef.current=voicePreferences},[voicePreferences]);
 useEffect(()=>{learningCandidateRef.current=learningCandidate},[learningCandidate]);

 useEffect(()=>{
  let cancelled=false;
  if(!isCerebroPath){setOwnerAccess('checking');return}
  const check=async()=>{
   const {data:{session}}=await supabase.auth.getSession();
   if(cancelled)return;
   if(!session){setOwnerAccess('checking');return}
   const {status,data}=await fetchAppApi<SessionContext>('/session/context');
   if(cancelled)return;
   const allowed=Boolean(status===200&&data?.actor_code==='CARLOS-ADMIN');
   setOwnerAccess(allowed?'allowed':'denied');
   if(!allowed)navigate('/inicio',{replace:true});
  };
  void check();
  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{void check()});
  return()=>{cancelled=true;subscription.unsubscribe()};
 },[isCerebroPath,navigate]);

 useEffect(()=>{
  if(!isCerebroPath||ownerAccess!=='allowed')return;
  document.documentElement.dataset.cerebroConsole='1';
  return()=>{delete document.documentElement.dataset.cerebroConsole};
 },[isCerebroPath,ownerAccess]);

 useEffect(()=>{
  if(!isCerebroPath||ownerAccess!=='allowed')return;
  setVoiceSupport({stt:voiceRecognitionSupported(),tts:speechSynthesisSupported()});
 },[isCerebroPath,ownerAccess]);

 useEffect(()=>{
  let cancelled=false;
  if(!isCerebroPath||ownerAccess!=='allowed'||!configured){setGatewayState('closed');setHealth(null);return}
  setGatewayState('checking');
  fetchCerebroConsoleHealth().then(({status,data})=>{
   if(cancelled)return;
   const safe=Boolean(status===200&&data?.status==='ok'&&data.authenticated_transport===true&&data.direct_model_access===false&&data.prod_execution_enabled===false&&data.live_writes===false);
   setHealth(safe?data:null);
   setGatewayState(safe?'ready':'error');
  });
  return()=>{cancelled=true};
 },[configured,isCerebroPath,ownerAccess]);

 const ready=gatewayState==='ready';
 const chatReady=Boolean(ready&&health?.chat_available&&['DETERMINISTIC_READ_ONLY','OWNER_DECISION_BY_EXCEPTION_V1'].includes(health?.chat_mode||''));

 useEffect(()=>{
  let cancelled=false;
  if(!chatReady)return;
  fetchCerebroConsolePreferences().then(({status,data})=>{
   if(cancelled||status!==200||!data?.preferences)return;
   setVoicePreferences({...DEFAULT_VOICE_PREFERENCES,...data.preferences});
  });
  return()=>{cancelled=true};
 },[chatReady]);

 function clearRestartTimer(){
  if(restartTimerRef.current!==null){
   window.clearTimeout(restartTimerRef.current);
   restartTimerRef.current=null;
  }
 }

 function scheduleListening(delay=350){
  clearRestartTimer();
  if(!voiceSessionRef.current||sendingRef.current||voiceSpeakingRef.current)return;
  restartTimerRef.current=window.setTimeout(()=>{
   restartTimerRef.current=null;
   startListeningRef.current();
  },delay);
 }

 function stopRecognition(){
  const recognition=recognitionRef.current;
  recognitionRef.current=null;
  if(recognition){
   recognition.onend=null;
   try{recognition.abort()}catch{/* browser may already have stopped */}
  }
  setVoiceListening(false);
 }

 function endVoiceSession(){
  voiceSessionRef.current=false;
  setVoiceSessionActive(false);
  clearRestartTimer();
  stopRecognition();
  if(voiceSupport.tts)window.speechSynthesis.cancel();
  voiceSpeakingRef.current=false;
  setVoiceSpeaking(false);
  setVoiceError('');
 }

 function speakAndResume(text:string,fullDetail=false){
  if(!voiceSessionRef.current)return;
  const maxChars=fullDetail?1600:(voicePreferencesRef.current.response_length==='concise'?700:1200);
  const spoken=speechText(text,maxChars);
  if(!spoken){scheduleListening();return}
  stopRecognition();
  if(!voiceSupport.tts){
   scheduleListening(150);
   return;
  }
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(spoken);
  const profile=voiceSpeechProfile(voicePreferencesRef.current);
  utterance.rate=profile.rate;
  utterance.pitch=profile.pitch;
  const voices=spanishVoices();
  const selected=voices.find(voice=>voice.lang.toLowerCase()==='es-es')||voices[0];
  if(selected){utterance.voice=selected;utterance.lang=selected.lang}
  else utterance.lang='es-ES';
  voiceSpeakingRef.current=true;
  setVoiceSpeaking(true);
  const finish=()=>{
   voiceSpeakingRef.current=false;
   setVoiceSpeaking(false);
   scheduleListening(300);
  };
  utterance.onend=finish;
  utterance.onerror=finish;
  window.speechSynthesis.speak(utterance);
 }

 function interruptSpeech(){
  if(!voiceSpeakingRef.current)return;
  clearRestartTimer();
  if(voiceSupport.tts)window.speechSynthesis.cancel();
  voiceSpeakingRef.current=false;
  setVoiceSpeaking(false);
  setVoiceError('');
  scheduleListening(80);
 }

 async function sendText(text:string,voiceConfidence:number|null=null,fromVoice=false){
  const clean=text.trim();
  if(!clean||!chatReady||sendingRef.current)return;
  if(fromVoice&&voiceNeedsManualConfirmation(clean,voiceConfidence,Boolean(pendingActionRef.current))){
   const warning='No voy a usar una transcripción de baja confianza para confirmar una acción. Di «sí» otra vez con claridad o escríbelo manualmente.';
   setVoiceError(warning);
   setLines(current=>[...current,{role:'user',text:clean},{role:'cerebro',text:warning}]);
   setMessage('');
   speakAndResume(warning);
   return;
  }
  setVoiceError('');
  setLines(current=>[...current,{role:'user',text:clean}]);
  setMessage('');
  sendingRef.current=true;
  setSending(true);
  stopRecognition();
  try{
   const {status,data}=await postCerebroConsoleChat(clean,pendingActionRef.current,readContextRef.current,learningCandidateRef.current);
   const response=status>0&&data?.message?data.message:'No he podido contactar con CEREBRO Gateway.';
   if(data?.read_context){
    readContextRef.current=data.read_context;
    setReadContext(data.read_context);
   }
   if(data?.preferences)setVoicePreferences({...DEFAULT_VOICE_PREFERENCES,...data.preferences});
   if(Object.prototype.hasOwnProperty.call(data??{},'learning_candidate')){
    const next=data?.learning_candidate??null;
    learningCandidateRef.current=next;
    setLearningCandidate(next);
   }
   if(data?.status==='CANCELED'||data?.status==='ACTION_ACCEPTED'||(data?.status==='ACTION_CONFIRMED'&&!data?.action)){
    pendingActionRef.current=null;
    setPendingAction(null);
   }else if(data?.action){
    pendingActionRef.current=data.action;
    setPendingAction(data.action);
   }
   const mediaUrl=data?.media?.public_media_url||data?.read_context?.public_media_url||null;
   setLines(current=>[...current,{role:'cerebro',text:response,mediaUrl}]);
   sendingRef.current=false;
   setSending(false);
   if(voiceSessionRef.current)speakAndResume(response,Boolean(data?.status?.startsWith('ACTION_')));
  }catch{
   const response='No he podido contactar con CEREBRO Gateway.';
   setLines(current=>[...current,{role:'cerebro',text:response}]);
   sendingRef.current=false;
   setSending(false);
   if(voiceSessionRef.current)speakAndResume(response);
  }
 }

 function startListening(){
  if(!voiceSessionRef.current||!chatReady||sendingRef.current||voiceSpeakingRef.current||recognitionRef.current)return;
  const recognition=createVoiceRecognition();
  if(!recognition){
   setVoiceError('El dictado por voz no está disponible en este navegador. Puedes seguir usando el teclado.');
   endVoiceSession();
   return;
  }
  recognition.lang='es-ES';
  recognition.continuous=false;
  recognition.interimResults=false;
  recognition.maxAlternatives=3;
  applyVoiceContextHints(recognition);
  recognition.onstart=()=>setVoiceListening(true);
  recognition.onresult=event=>{
   const chunks:string[]=[];
   const segmentConfidences:Array<number|null>=[];
   for(let index=0;index<event.results.length;index+=1){
    const result=event.results[index];
    if(!result?.length)continue;
    let best=result[0];
    for(let alternativeIndex=1;alternativeIndex<result.length;alternativeIndex+=1){
     const candidate=result[alternativeIndex];
     if(!candidate?.transcript)continue;
     const candidateConfidence=typeof candidate.confidence==='number'&&Number.isFinite(candidate.confidence)?candidate.confidence:-1;
     const bestConfidence=typeof best?.confidence==='number'&&Number.isFinite(best.confidence)?best.confidence:-1;
     if(candidateConfidence>bestConfidence)best=candidate;
    }
    const piece=best?.transcript?.trim();
    if(!piece)continue;
    chunks.push(piece);
    segmentConfidences.push(typeof best.confidence==='number'&&Number.isFinite(best.confidence)?best.confidence:null);
   }
   const transcript=chunks.join(' ').replace(/\s+/g,' ').trim();
   const confidence=segmentConfidences.length>0&&segmentConfidences.every(value=>value!==null)
    ?Math.min(...segmentConfidences as number[])
    :null;
   if(transcript){
    setMessage(transcript);
    setVoiceError('');
    sendVoiceTextRef.current(transcript,confidence);
   }
  };
  recognition.onerror=event=>{
   const reason=String(event.error||'');
   if(reason==='no-speech'||reason==='aborted')return;
   if(['not-allowed','service-not-allowed','audio-capture'].includes(reason)){
    voiceSessionRef.current=false;
    setVoiceSessionActive(false);
    setVoiceError('No puedo mantener la conversación de voz porque el navegador no tiene acceso al micrófono. Revisa el permiso y vuelve a pulsar «Hablar con CEREBRO».');
    return;
   }
   setVoiceError(reason?('Problema de voz: '+reason+'. Reintentaré automáticamente cuando sea posible.'):'No he podido transcribir el audio. Reintentaré automáticamente.');
  };
  recognition.onend=()=>{
   recognitionRef.current=null;
   setVoiceListening(false);
   scheduleListening(400);
  };
  recognitionRef.current=recognition;
  try{recognition.start()}catch{
   recognitionRef.current=null;
   setVoiceListening(false);
   scheduleListening(700);
  }
 }
 startListeningRef.current=startListening;
 sendVoiceTextRef.current=(text,confidence)=>{void sendText(text,confidence,true)};

 function toggleVoiceSession(){
  if(voiceSessionRef.current){endVoiceSession();return}
  if(!chatReady||!voiceSupport.stt){
   setVoiceError('La conversación por voz necesita el Gateway disponible y reconocimiento de voz en el navegador. El teclado sigue funcionando.');
   return;
  }
  voiceSessionRef.current=true;
  setVoiceSessionActive(true);
  setVoiceError(voiceSupport.tts?'':'Tu navegador puede escuchar, pero no ofrece voz de salida. CEREBRO responderá por texto.');
  scheduleListening(50);
 }

 async function submit(event:FormEvent){
  event.preventDefault();
  await sendText(message,null,false);
 }

 useEffect(()=>{
  return()=>{
   voiceSessionRef.current=false;
   clearRestartTimer();
   const recognition=recognitionRef.current;
   recognitionRef.current=null;
   if(recognition){try{recognition.abort()}catch{/* no-op */}}
   if(speechSynthesisSupported())window.speechSynthesis.cancel();
  };
 },[]);

 if(!isCerebroPath||ownerAccess!=='allowed')return null;
 const title=ready?'Transporte autenticado verificado':gatewayState==='checking'?'Verificando CEREBRO Gateway…':'Superficie preparada, conexión cerrada';
 const detail=chatReady
  ?'CEREBRO aplica decisión humana por excepción: puedes consultar libremente y las acciones reales conservan propuesta exacta, confirmación y auditoría.'
  :ready
   ?`CEREBRO Gateway responde por HTTPS autenticado (${health?.environment||'LAB'} · ${health?.version||'V0'}). Las escrituras continúan cerradas hasta superar sus gates.`
   :'Esta pantalla reserva la interfaz propia de CEREBRO dentro de Fénix. La comunicación permanece cerrada hasta disponer de una URL HTTPS desplegada y autenticada delante de CEREBRO Gateway.';

 const voiceStatus=voiceSpeaking
  ?'CEREBRO está hablando. Cuando termine volverá a escucharte automáticamente.'
  :sending
   ?'CEREBRO está procesando tu petición.'
   :voiceListening
    ?'CEREBRO está escuchando… habla con normalidad.'
    :voiceSessionActive
     ?'Conversación activa. Reanudando escucha automáticamente…'
     :'Un toque inicia una conversación continua: hablas, CEREBRO responde y vuelve a escuchar.';

 return <main className="cerebro-console">
  <header className="cerebro-header"><button className="cerebro-back" onClick={()=>navigate('/perfil')}><ChevronLeft size={18}/> Mi perfil</button><div><small>CEREBRO OS · CONSOLE V0</small><h1><BrainCircuit size={25}/> CEREBRO</h1></div><span className="cerebro-lab"><ShieldCheck size={16}/> LAB</span></header>
  <section className="cerebro-panel">
   <h2>{title}</h2>
   <p>{detail}</p>
   <div className="cerebro-fields"><label>Empresa<select disabled><option>Fénix · sesión autenticada</option></select></label><label>Contexto<select disabled>{CONTEXTS.map(item=><option key={item}>{item}</option>)}</select></label></div>
   <div className="cerebro-chat-log" aria-live="polite">
    {lines.length===0?<div className="cerebro-chat-empty">Pregunta lo que necesites o pide una acción. CEREBRO separará lectura de ejecución.</div>:lines.map((line,index)=><div key={index} className={`cerebro-chat-line cerebro-chat-${line.role}`}><strong>{line.role==='user'?'Tú':'CEREBRO'}</strong><span>{renderMessage(line.text)}</span>{line.role==='cerebro'&&line.mediaUrl?<a className="cerebro-media-link" href={line.mediaUrl} target="_blank" rel="noreferrer"><img className="cerebro-media-preview" src={line.mediaUrl} alt="Imagen asociada a la publicación"/><span>Abrir imagen</span></a>:null}</div>)}
   </div>
   <div className={`cerebro-voice-session ${voiceSessionActive?'is-active':''} ${voiceListening?'is-listening':''} ${voiceSpeaking?'is-speaking':''}`}>
    <button type="button" className="cerebro-voice-main" onClick={toggleVoiceSession} disabled={!chatReady||!voiceSupport.stt} aria-pressed={voiceSessionActive}>
     {voiceSessionActive?<MicOff size={21}/>:<Mic size={21}/>}
     {voiceSessionActive?'Finalizar conversación':'Hablar con CEREBRO'}
    </button>
    {voiceSpeaking?<button type="button" className="cerebro-voice-interrupt" onClick={interruptSpeech}><Square size={18}/> Parar respuesta y hablar</button>:null}
    <span className="cerebro-voice-status">{voiceStatus}</span>
   </div>
   {voiceError?<div className="cerebro-voice-error" role="alert">{voiceError}</div>:null}
   <form className="cerebro-chat-form" onSubmit={submit}>
    <textarea value={message} onChange={event=>{setMessage(event.target.value);setVoiceError('')}} disabled={!chatReady||sending} rows={3} placeholder={chatReady?'También puedes escribir a CEREBRO…':'Chat disponible cuando el Gateway confirme el modo seguro.'}/>
    <button type="submit" disabled={!chatReady||sending||!message.trim()}><Send size={17}/>{sending?'Enviando…':'Enviar'}</button>
   </form>
   <div className="cerebro-audit-note"><strong>Decisión humana por excepción</strong><span>La conversación de voz no amplía permisos. Las consultas fluyen sin confirmaciones innecesarias; una acción sensible mantiene propuesta exacta y un «sí» válido. Una transcripción de baja confianza nunca confirma por sí sola.</span></div>
   <button onClick={()=>navigate('/perfil')}>Volver a mi perfil</button>
  </section>
 </main>;
}
