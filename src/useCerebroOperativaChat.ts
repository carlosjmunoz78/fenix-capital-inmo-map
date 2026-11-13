import {useEffect,useRef,useState} from 'react';
import {fetchCerebroConsoleHealth,postCerebroConsoleChat,type CerebroConversationTurn,type CerebroPendingAction,type CerebroReadContext,type CerebroLearningCandidate} from './cerebroConsoleApi';
import {createVoiceRecognition,preferredSpanishVoice,spanishVoices,speechSynthesisSupported,speechText,voiceNeedsClarification,voiceNeedsManualConfirmation,voiceRecognitionSupported,voiceInterruptRequested,type CerebroSpeechRecognition} from './cerebroVoice';

/** Dedicated Operativa UI client. The existing owner-only CEREBRO Gateway is the sole authority.
 * Browser STT/TTS are provisional and do not use the future JARVIS V2 voice.
 * Neither this hook nor the UI expands company rights or executes actions directly.
 */
export type OperativaTurn={role:'user'|'cerebro';text:string};
export function useCerebroOperativaChat(){
 const [ready,setReady]=useState(false);
 const [sending,setSending]=useState(false);
 const [voiceActive,setVoiceActive]=useState(false);
 const [voiceListening,setVoiceListening]=useState(false);
 const [voiceSpeaking,setVoiceSpeaking]=useState(false);
 const [lines,setLines]=useState<OperativaTurn[]>([]);
 const [statusMessage,setStatusMessage]=useState('Comprobando el Gateway de CEREBRO…');
 const readyRef=useRef(false);
 const sendingRef=useRef(false);
 const voiceEnabledRef=useRef(false);
 const voiceSpeakingRef=useRef(false);
 const listeningRef=useRef<CerebroSpeechRecognition|null>(null);
 const interruptRef=useRef<CerebroSpeechRecognition|null>(null);
 const restartTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const linesRef=useRef<OperativaTurn[]>([]);
 const actionRef=useRef<CerebroPendingAction|null>(null);
 const readContextRef=useRef<CerebroReadContext|null>(null);
 const learningRef=useRef<CerebroLearningCandidate|null>(null);
 const speechSenderRef=useRef<(text:string,confidence:number|null)=>Promise<boolean>>(async()=>false);
 const listenRef=useRef<()=>void>(()=>{});

 useEffect(()=>{linesRef.current=lines},[lines]);
 useEffect(()=>{
  let cancelled=false;
  void fetchCerebroConsoleHealth().then(({status,data})=>{
   if(cancelled)return;
   const safe=Boolean(status===200&&data?.status==='ok'&&data.authenticated_transport===true&&data.direct_model_access===false&&data.prod_execution_enabled===false&&data.live_writes===false&&data.chat_available===true&&['OWNER_DECISION_BY_EXCEPTION_V1','DETERMINISTIC_READ_ONLY'].includes(data.chat_mode||''));
   readyRef.current=safe;
   setReady(safe);
   setStatusMessage(safe?'CEREBRO conectado con transporte autenticado.':status===401||status===403?'Sesión no autorizada. Vuelve a iniciar sesión como propietario.':'No se ha verificado el Gateway. Se conserva el texto; no se envían órdenes sin autorización.');
  }).catch(()=>{if(cancelled)return;readyRef.current=false;setReady(false);setStatusMessage('No se ha podido comprobar el Gateway.')});
  return()=>{cancelled=true;readyRef.current=false;voiceEnabledRef.current=false;
   if(restartTimerRef.current)clearTimeout(restartTimerRef.current);
   try{listeningRef.current?.abort()}catch{/* denied */}
   listeningRef.current=null;
   try{interruptRef.current?.abort()}catch{/* already stopped */}
   interruptRef.current=null;
   if(speechSynthesisSupported())window.speechSynthesis.cancel();
  };
 },[]);

 function scheduleListen(){
  if(!voiceEnabledRef.current)return;
  if(restartTimerRef.current)clearTimeout(restartTimerRef.current);
  restartTimerRef.current=setTimeout(()=>{restartTimerRef.current=null;listenRef.current()},350);
 }
 function stopRecognition(){
  const recognition=listeningRef.current;
  listeningRef.current=null;
  if(recognition){try{recognition.abort()}catch{/* stopped */}}
  setVoiceListening(false);
 }
 function stopInterruptRecognition(){
  const recognition=interruptRef.current;interruptRef.current=null;
  if(recognition){try{recognition.abort()}catch{/* stopped */}}
 }
 function stopVoice(){
  voiceEnabledRef.current=false;
  setVoiceActive(false);
  if(restartTimerRef.current){clearTimeout(restartTimerRef.current);restartTimerRef.current=null}
  stopRecognition();
  stopInterruptRecognition();
  if(speechSynthesisSupported())window.speechSynthesis.cancel();
  voiceSpeakingRef.current=false;
  setVoiceSpeaking(false);
  setStatusMessage('Voz detenida. Puedes continuar escribiendo o volver a hablar.');
 }
 // Best-effort spoken barge-in during browser TTS; never sends interruption text to Gateway.
 // Chrome may refuse parallel recognition: the visible STOP button / Escape remain reliable.
 function listenForStopWhileSpeaking(){
  if(!voiceEnabledRef.current||!voiceSpeakingRef.current||!voiceRecognitionSupported())return;
  stopInterruptRecognition();
  const recognizer=createVoiceRecognition();if(!recognizer)return;
  interruptRef.current=recognizer;
  recognizer.lang='es-ES';recognizer.continuous=true;recognizer.interimResults=true;recognizer.maxAlternatives=1;
  recognizer.onresult=event=>{
   if(interruptRef.current!==recognizer)return;
   const result=event.results[event.results.length-1];
   const transcript=String(result?.[0]?.transcript||'').trim();
   if(voiceInterruptRequested(transcript))stopVoice();
  };
  recognizer.onerror=()=>{if(interruptRef.current===recognizer)interruptRef.current=null};
  recognizer.onend=()=>{if(interruptRef.current===recognizer)interruptRef.current=null};
  try{recognizer.start()}catch{interruptRef.current=null}
 }
 function speakResponse(text:string){
  if(!voiceEnabledRef.current||!speechSynthesisSupported()){scheduleListen();return}
  const spoken=speechText(text,550);
  if(!spoken){scheduleListen();return}
  try{
   const utterance=new SpeechSynthesisUtterance(spoken);
   utterance.lang='es-ES';
   utterance.rate=1.15;
   utterance.pitch=1;
   utterance.voice=preferredSpanishVoice(spanishVoices())||null;
   utterance.onend=()=>{stopInterruptRecognition();voiceSpeakingRef.current=false;setVoiceSpeaking(false);scheduleListen()};
   utterance.onerror=()=>{stopInterruptRecognition();voiceSpeakingRef.current=false;setVoiceSpeaking(false);if(voiceEnabledRef.current)setStatusMessage('No se pudo reproducir el audio. La respuesta escrita sigue disponible.');scheduleListen()};
   voiceSpeakingRef.current=true;
   setVoiceSpeaking(true);
   window.speechSynthesis.cancel();
   window.speechSynthesis.speak(utterance);
   listenForStopWhileSpeaking();
  }catch{voiceSpeakingRef.current=false;setVoiceSpeaking(false);scheduleListen()}
 }

 async function sendText(text:string,confidence:number|null=null,fromVoice=false):Promise<boolean>{
  const clean=text.trim();
  if(!clean||clean.length>4000||!readyRef.current||sendingRef.current)return false;
  if(fromVoice&&(voiceNeedsManualConfirmation(clean,confidence,Boolean(actionRef.current))||voiceNeedsClarification(clean,confidence))){
   setStatusMessage('No usaré un dictado incierto para confirmar acciones. Repítelo claramente o escribe tu respuesta.');
   scheduleListen();
   return false;
  }
  sendingRef.current=true;
  setSending(true);
  stopRecognition();
  const context:CerebroConversationTurn[]=linesRef.current.slice(-10).map(line=>({role:line.role,text:line.text.slice(0,1200)}));
  const added:OperativaTurn={role:'user',text:clean};
  const prepared=[...linesRef.current,added].slice(-24);
  linesRef.current=prepared;
  setLines(prepared);
  try{
   const {status,data}=await postCerebroConsoleChat(clean,actionRef.current,readContextRef.current,learningRef.current,context);
   const ok=status>=200&&status<300&&typeof data?.message==='string'&&data.message.length>0;
   const reply=ok?data!.message:status===401||status===403?'La sesión no está autorizada para hablar con CEREBRO.':'No se pudo obtener una respuesta confirmada del Gateway.';
   if(!ok&&[401,403].includes(status)){readyRef.current=false;setReady(false)}
   if(ok){
    if(data?.read_context)readContextRef.current=data.read_context;
    if(Object.prototype.hasOwnProperty.call(data??{},'learning_candidate'))learningRef.current=data?.learning_candidate??null;
    if(data?.status==='CANCELED'||data?.status==='ACTION_ACCEPTED'||(data?.status==='ACTION_CONFIRMED'&&!data?.action))actionRef.current=null;
    else if(data?.action)actionRef.current=data.action;
   }
   const next=[...linesRef.current,{role:'cerebro' as const,text:reply}].slice(-24);
   linesRef.current=next;
   setLines(next);
   sendingRef.current=false;
   setSending(false);
   setStatusMessage(ok?'Respuesta recibida del Gateway.':'Error de conexión. No se atribuye ninguna ejecución a CEREBRO.');
   if(fromVoice&&voiceEnabledRef.current&&ok)speakResponse(reply);
   else if(voiceEnabledRef.current)scheduleListen();
   return ok;
  }catch{
   const next=[...linesRef.current,{role:'cerebro' as const,text:'Fallo de conexión: no hay respuesta verificada.'}].slice(-24);
   linesRef.current=next;setLines(next);
   sendingRef.current=false;setSending(false);
   setStatusMessage('Fallo de red. No se ha verificado ninguna ejecución.');
   if(voiceEnabledRef.current)scheduleListen();
   return false;
  }
 }
 speechSenderRef.current=(text,confidence)=>sendText(text,confidence,true);
 function beginListening(){
  if(!voiceEnabledRef.current||!readyRef.current||sendingRef.current||voiceSpeakingRef.current||listeningRef.current)return;
  const recognition=createVoiceRecognition();
  if(!recognition){stopVoice();setStatusMessage('Este navegador no ofrece reconocimiento de voz. Usa el chat escrito.');return}
  listeningRef.current=recognition;
  recognition.lang='es-ES';
  recognition.continuous=false;
  recognition.interimResults=false;
  recognition.maxAlternatives=3;
  /* No contextual phrase list: Chrome can expose SpeechRecognitionPhrase but reject it with phrases-not-supported. */
  recognition.onstart=()=>setVoiceListening(true);
  recognition.onresult=event=>{
   const result=event.results[event.results.length-1];
   const transcript=String(result?.[0]?.transcript||'').trim();
   const confidence=typeof result?.[0]?.confidence==='number'?result[0].confidence:null;
   if(transcript&&voiceInterruptRequested(transcript)){stopVoice();return}
   if(transcript)void speechSenderRef.current(transcript,confidence);
  };
  recognition.onerror=event=>{
   const code=String(event.error||'error desconocido');
   if(code==='phrases-not-supported'){
    // Defensive compatibility guard for stale/browser-specific recognition providers.
    stopVoice();
    setStatusMessage('Este servicio rechaza el vocabulario opcional del reconocimiento. Recarga la App y vuelve a probar la voz.');
    return;
   }
   setStatusMessage('El reconocimiento de voz no ha funcionado: '+code+'. Puedes seguir escribiendo.');
   if(['not-allowed','service-not-allowed','audio-capture','language-not-supported'].includes(code))stopVoice();
  };
  recognition.onend=()=>{if(listeningRef.current===recognition){listeningRef.current=null;setVoiceListening(false);scheduleListen()}};
  try{recognition.start()}catch{listeningRef.current=null;setVoiceListening(false);setStatusMessage('El navegador no ha permitido iniciar el micrófono.');stopVoice()}
 }
 listenRef.current=beginListening;
 function toggleVoice(){
  if(voiceEnabledRef.current){stopVoice();return}
  if(!readyRef.current){setStatusMessage('Necesitas un Gateway verificado antes de hablar por voz.');return}
  if(!voiceRecognitionSupported()){setStatusMessage('El dictado de voz no está disponible en este navegador. Usa el chat escrito.');return}
  voiceEnabledRef.current=true;
  setVoiceActive(true);
  beginListening();
 }
 return {ready,sending,voiceActive,voiceListening,voiceSpeaking,lines,statusMessage,sendText,toggleVoice,stopVoice};
}
