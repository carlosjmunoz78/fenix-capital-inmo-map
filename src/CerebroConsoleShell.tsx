import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {BrainCircuit,ChevronLeft,Mic,MicOff,Send,ShieldCheck,Square,Volume2} from 'lucide-react';
import {cerebroConsoleLinkEnabled} from './cerebroConsoleAccess';
import {fetchAppApi,supabase} from './supabase';
import {fetchCerebroConsoleHealth,postCerebroConsoleChat,type CerebroConsoleHealth,type CerebroPendingAction,type CerebroReadContext} from './cerebroConsoleApi';
import {createVoiceRecognition,spanishVoices,speechSynthesisSupported,speechText,voiceNeedsManualConfirmation,voiceRecognitionSupported,type CerebroSpeechRecognition} from './cerebroVoice';
import './cerebro-console.css';

const CONTEXTS=['GENERAL','EMPRESA','ENGINE','CRM','APP','SEO','MARKETING','TRAINING','AUTOMATION'];
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
 const [voiceOutputEnabled,setVoiceOutputEnabled]=useState(false);
 const [voiceListening,setVoiceListening]=useState(false);
 const [voiceError,setVoiceError]=useState('');
 const [voiceSupport,setVoiceSupport]=useState({stt:false,tts:false});
 const [voiceChoices,setVoiceChoices]=useState<SpeechSynthesisVoice[]>([]);
 const [selectedVoiceUri,setSelectedVoiceUri]=useState('');
 const [voiceTranscript,setVoiceTranscript]=useState<{text:string;confidence:number|null}|null>(null);
 const recognitionRef=useRef<CerebroSpeechRecognition|null>(null);

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
  const stt=voiceRecognitionSupported();
  const tts=speechSynthesisSupported();
  setVoiceSupport({stt,tts});
  const refreshVoices=()=>{
   if(!tts)return;
   const choices=spanishVoices();
   setVoiceChoices(choices);
   setSelectedVoiceUri(current=>{
    if(current&&choices.some(voice=>voice.voiceURI===current))return current;
    return (choices.find(voice=>voice.lang.toLowerCase()==='es-es')||choices[0])?.voiceURI||'';
   });
  };
  refreshVoices();
  if(tts)window.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
  return()=>{
   recognitionRef.current?.abort();
   recognitionRef.current=null;
   if(tts){
    window.speechSynthesis.removeEventListener('voiceschanged',refreshVoices);
    window.speechSynthesis.cancel();
   }
  };
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

 if(!isCerebroPath||ownerAccess!=='allowed')return null;
 const ready=gatewayState==='ready';
 const chatReady=Boolean(ready&&health?.chat_available&&['DETERMINISTIC_READ_ONLY','OWNER_DECISION_BY_EXCEPTION_V1'].includes(health?.chat_mode||''));
 const title=ready?'Transporte autenticado verificado':gatewayState==='checking'?'Verificando CEREBRO Gateway…':'Superficie preparada, conexión cerrada';
 const detail=chatReady
  ?'CEREBRO móvil aplica decisión humana por excepción: puedes consultar sin activar cambios y las acciones requieren una propuesta exacta seguida de tu confirmación explícita.'
  :ready
   ?`CEREBRO Gateway responde por HTTPS autenticado (${health?.environment||'LAB'} · ${health?.version||'V0'}). Las escrituras continúan cerradas hasta superar sus gates.`
   :'Esta pantalla reserva la interfaz propia de CEREBRO dentro de Fénix. La comunicación permanece cerrada hasta disponer de una URL HTTPS desplegada y autenticada delante de CEREBRO Gateway.';

 function stopSpeaking(){
  if(voiceSupport.tts)window.speechSynthesis.cancel();
 }

 function speakResponse(text:string){
  if(!voiceOutputEnabled||!voiceSupport.tts)return;
  const spoken=speechText(text);
  if(!spoken)return;
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(spoken);
  const selected=voiceChoices.find(voice=>voice.voiceURI===selectedVoiceUri);
  if(selected){utterance.voice=selected;utterance.lang=selected.lang}
  else utterance.lang='es-ES';
  window.speechSynthesis.speak(utterance);
 }

 function toggleListening(){
  if(voiceListening){
   recognitionRef.current?.stop();
   return;
  }
  const recognition=createVoiceRecognition();
  if(!recognition){
   setVoiceError('El dictado por voz no está disponible en este navegador. Puedes seguir usando el teclado.');
   return;
  }
  setVoiceError('');
  recognition.lang='es-ES';
  recognition.continuous=false;
  recognition.interimResults=false;
  recognition.maxAlternatives=1;
  recognition.onstart=()=>setVoiceListening(true);
  recognition.onresult=event=>{
   let transcript='';
   let confidence:number|null=null;
   for(let index=0;index<event.results.length;index+=1){
    const alternative=event.results[index]?.[0];
    if(!alternative?.transcript)continue;
    transcript=alternative.transcript.trim();
    confidence=typeof alternative.confidence==='number'&&Number.isFinite(alternative.confidence)?alternative.confidence:null;
   }
   if(transcript){
    setMessage(transcript);
    setVoiceTranscript({text:transcript,confidence});
    setVoiceError('');
   }
  };
  recognition.onerror=event=>{
   const reason=event.error?' ('+event.error+')':'';
   setVoiceError('No he podido transcribir el audio'+reason+'. El teclado sigue disponible.');
  };
  recognition.onend=()=>{
   setVoiceListening(false);
   recognitionRef.current=null;
  };
  recognitionRef.current=recognition;
  try{recognition.start()}catch{
   recognitionRef.current=null;
   setVoiceListening(false);
   setVoiceError('No he podido iniciar el micrófono. Revisa el permiso del navegador o usa el teclado.');
  }
 }

 async function submit(event:FormEvent){
  event.preventDefault();
  const text=message.trim();
  if(!text||!chatReady||sending)return;
  const voiceMatches=Boolean(voiceTranscript&&voiceTranscript.text.trim()===text);
  if(voiceMatches&&voiceNeedsManualConfirmation(text,voiceTranscript?.confidence??null,Boolean(pendingAction))){
   setVoiceError('No voy a usar una transcripción de baja confianza para confirmar una acción. Escribe «Sí» manualmente o vuelve a dictarlo con claridad.');
   return;
  }
  setVoiceError('');
  setVoiceTranscript(null);
  setLines(current=>[...current,{role:'user',text}]);
  setMessage('');
  setSending(true);
  const {status,data}=await postCerebroConsoleChat(text,pendingAction,readContext);
  const response=status>0&&data?.message?data.message:'No he podido contactar con CEREBRO Gateway.';
  if(data?.read_context)setReadContext(data.read_context);
  if(data?.status==='CANCELED'||data?.status==='ACTION_ACCEPTED'||(data?.status==='ACTION_CONFIRMED'&&!data?.action))setPendingAction(null);
  else if(data?.action)setPendingAction(data.action);
  const mediaUrl=data?.media?.public_media_url||data?.read_context?.public_media_url||null;
  setLines(current=>[...current,{role:'cerebro',text:response,mediaUrl}]);
  speakResponse(response);
  setSending(false);
 }

 return <main className="cerebro-console">
  <header className="cerebro-header"><button className="cerebro-back" onClick={()=>navigate('/perfil')}><ChevronLeft size={18}/> Mi perfil</button><div><small>CEREBRO OS · CONSOLE V0</small><h1><BrainCircuit size={25}/> CEREBRO</h1></div><span className="cerebro-lab"><ShieldCheck size={16}/> LAB</span></header>
  <section className="cerebro-panel">
   <h2>{title}</h2>
   <p>{detail}</p>
   <div className="cerebro-fields"><label>Empresa<select disabled><option>Fénix · sesión autenticada</option></select></label><label>Contexto<select disabled>{CONTEXTS.map(item=><option key={item}>{item}</option>)}</select></label></div>
   <div className="cerebro-chat-log" aria-live="polite">
    {lines.length===0?<div className="cerebro-chat-empty">Pregunta lo que necesites o pide una acción. CEREBRO separará lectura de ejecución.</div>:lines.map((line,index)=><div key={index} className={`cerebro-chat-line cerebro-chat-${line.role}`}><strong>{line.role==='user'?'Tú':'CEREBRO'}</strong><span>{renderMessage(line.text)}</span>{line.role==='cerebro'&&line.mediaUrl?<a className="cerebro-media-link" href={line.mediaUrl} target="_blank" rel="noreferrer"><img className="cerebro-media-preview" src={line.mediaUrl} alt="Imagen asociada a la publicación"/><span>Abrir imagen</span></a>:null}</div>)}
   </div>
   <div className="cerebro-voice-bar" aria-label="Controles de voz">
    <button type="button" onClick={toggleListening} disabled={!chatReady||sending||!voiceSupport.stt} aria-pressed={voiceListening} title={voiceSupport.stt?'Dictar en español':'Dictado no disponible en este navegador'}>
     {voiceListening?<MicOff size={17}/>:<Mic size={17}/>} {voiceListening?'Parar dictado':'Dictar'}
    </button>
    <label className="cerebro-voice-toggle"><input type="checkbox" checked={voiceOutputEnabled} disabled={!voiceSupport.tts} onChange={event=>{setVoiceOutputEnabled(event.target.checked);if(!event.target.checked)stopSpeaking()}}/><Volume2 size={16}/> Leer respuestas</label>
    {voiceOutputEnabled&&voiceChoices.length>0?<select aria-label="Voz española" value={selectedVoiceUri} onChange={event=>setSelectedVoiceUri(event.target.value)}>{voiceChoices.map(voice=><option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}</select>:null}
    {voiceOutputEnabled?<button type="button" onClick={stopSpeaking} disabled={!voiceSupport.tts}><Square size={15}/> Parar voz</button>:null}
    <span className="cerebro-voice-status">{voiceListening?'Escuchando… La transcripción aparecerá antes de enviarse.':voiceSupport.stt?'Pulsa Dictar y revisa el texto antes de enviarlo.':'Dictado no disponible; el teclado permanece activo.'}</span>
   </div>
   {voiceError?<div className="cerebro-voice-error" role="alert">{voiceError}</div>:null}
   <form className="cerebro-chat-form" onSubmit={submit}>
    <textarea value={message} onChange={event=>{setMessage(event.target.value);setVoiceTranscript(null);setVoiceError('')}} disabled={!chatReady||sending} rows={3} placeholder={chatReady?'Escribe o dicta a CEREBRO…':'Chat disponible cuando el Gateway confirme el modo seguro.'}/>
    <button type="submit" disabled={!chatReady||sending||!message.trim()}><Send size={17}/>{sending?'Enviando…':'Enviar'}</button>
   </form>
   <div className="cerebro-audit-note"><strong>Decisión humana por excepción</strong><span>Las consultas no requieren confirmación. Una acción requiere propuesta exacta + un «sí». Preguntar o pedir explicación no ejecuta nada. Los ejecutores reales siguen sujetos a sus gates y a evidencia viva.</span></div>
   <button onClick={()=>navigate('/perfil')}>Volver a mi perfil</button>
  </section>
 </main>;
}
