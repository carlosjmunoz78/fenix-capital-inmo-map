import {useContext,useEffect,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {AudioLines,Mic,Plus,Send,Square} from 'lucide-react';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported,voiceRecognitionProblem,type CerebroSpeechRecognition} from './cerebroVoice';
import {JarvisConversationBridgeContext} from './jarvisConversationBridge';
import './cerebro-operative-console.css';

type Snapshot={ready:boolean;sending:boolean;voiceActive:boolean;voiceListening:boolean;voiceSpeaking:boolean;voiceError:string};
const EMPTY:Snapshot={ready:false,sending:false,voiceActive:false,voiceListening:false,voiceSpeaking:false,voiceError:''};

export default function JarvisOperativaComposerPortal(){
 const driverRef=useContext(JarvisConversationBridgeContext);
 const[target,setTarget]=useState<HTMLElement|null>(null);
 const[composer,setComposer]=useState('');
 const[snapshot,setSnapshot]=useState<Snapshot>(EMPTY);
 const[dictating,setDictating]=useState(false);
 const[submitting,setSubmitting]=useState(false);
 const[dictationError,setDictationError]=useState('');
 const composerRef=useRef<HTMLTextAreaElement|null>(null);
 const dictationRef=useRef<CerebroSpeechRecognition|null>(null);
 const dictationBaseRef=useRef('');
 const pendingSubmitRef=useRef(false);

 useEffect(()=>{
  let current:HTMLElement|null=null;
  const sync=()=>{
   const next=document.querySelector<HTMLElement>('.jarvis-center-pane .jarvis-input-tools');
   if(next===current)return;
   if(current)current.classList.remove('is-operativa-composer');
   current=next;
   if(current)current.classList.add('is-operativa-composer');
   setTarget(current);
  };
  sync();
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{subtree:true,childList:true});
  return()=>{observer.disconnect();if(current)current.classList.remove('is-operativa-composer')};
 },[]);
 useEffect(()=>{
  let raf=0;
  const inspect=()=>{
   cancelAnimationFrame(raf);
   raf=requestAnimationFrame(()=>{
    const root=document.querySelector<HTMLElement>('.jarvis-conversation .cerebro-console');
    if(!root){setSnapshot(EMPTY);return}
    const title=root.querySelector<HTMLElement>('.cerebro-panel h2')?.textContent?.trim()||'';
    const send=root.querySelector<HTMLButtonElement>('.cerebro-chat-form button[type="submit"]');
    const voice=root.querySelector<HTMLButtonElement>('.cerebro-voice-main');
    const voiceStatus=root.querySelector<HTMLElement>('.cerebro-voice-status')?.textContent?.trim().toLowerCase()||'';
    setSnapshot({
     ready:title.includes('Transporte autenticado verificado')&&Boolean(driverRef?.current),
     sending:Boolean(send?.textContent?.includes('Enviando')||voiceStatus.includes('procesando')),
     voiceActive:voice?.getAttribute('aria-pressed')==='true',
     voiceListening:voiceStatus.includes('escuchando'),
     voiceSpeaking:voiceStatus.includes('hablando'),
     voiceError:root.querySelector<HTMLElement>('.cerebro-voice-error')?.textContent?.trim()||''
    });
   });
  };
  inspect();
  const observer=new MutationObserver(inspect);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-pressed','class']});
  const interval=window.setInterval(inspect,1200);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();window.clearInterval(interval)};
 },[driverRef]);
 useEffect(()=>()=>{
  const recognition=dictationRef.current;
  dictationRef.current=null;
  if(recognition){try{recognition.abort()}catch{/* stopped */}}
 },[]);

 async function sendCommand(raw:string){
  const clean=raw.trim();
  if(!clean||!snapshot.ready||snapshot.sending||pendingSubmitRef.current)return;
  const driver=driverRef?.current;
  if(!driver){
   setDictationError('JARVIS aún no ha conectado el chat. Tu texto se conserva.');
   return;
  }
  pendingSubmitRef.current=true;
  setSubmitting(true);
  setDictationError('');
  try{
   const accepted=await driver.sendText(clean);
   if(accepted){
    setComposer(current=>current.trim()===clean?'':current);
   }else{
    setDictationError('JARVIS no ha confirmado la respuesta. Tu texto se conserva; comprueba el historial antes de reintentar.');
   }
  }catch{
   setDictationError('No se pudo enviar el mensaje. Tu texto se conserva para reintentarlo.');
  }finally{
   pendingSubmitRef.current=false;
   setSubmitting(false);
  }
 }
 function submit(event?:FormEvent){
  event?.preventDefault();
  void sendCommand(composer);
 }
 function onComposerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){
  if(event.key==='Enter'&&!event.shiftKey){
   event.preventDefault();
   submit();
  }
 }
 function toggleVoice(){
  if(dictating)return;
  const driver=driverRef?.current;
  if(snapshot.ready&&driver){
   setDictationError('');
   driver.toggleVoice();
  }else{
   setDictationError('La conversación por voz necesita el chat autorizado y el micrófono disponible.');
  }
 }
 function stopDictation(){
  const recognition=dictationRef.current;
  dictationRef.current=null;
  if(recognition){try{recognition.stop()}catch{/* stopped */}}
  setDictating(false);
 }
 function toggleDictation(){
  if(dictating){stopDictation();return}
  if(!snapshot.ready||snapshot.voiceActive||submitting)return;
  if(!voiceRecognitionSupported()){
   setDictationError('Este navegador no dispone de reconocimiento de voz compatible. Puedes escribir normalmente.');
   return;
  }
  const recognition=createVoiceRecognition();
  if(!recognition){setDictationError('El dictado no está disponible ahora.');return}
  dictationRef.current=recognition;
  dictationBaseRef.current=composer.trim();
  recognition.lang='es-ES';
  recognition.continuous=false;
  recognition.interimResults=true;
  recognition.maxAlternatives=3;
  applyVoiceContextHints(recognition);
  recognition.onstart=()=>{setDictating(true);setDictationError('')};
  recognition.onresult=event=>{
   if(dictationRef.current!==recognition)return;
   const finals:string[]=[],interim:string[]=[];
   for(let i=0;i<event.results.length;i+=1){
    const result=event.results[i];
    const part=String(result?.[0]?.transcript||'').trim();
    if(!part)continue;
    if(result.isFinal)finals.push(part);else interim.push(part);
   }
   const transcript=[dictationBaseRef.current,...finals,...interim].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
   if(transcript)setComposer(transcript);
  };
  recognition.onerror=event=>{
   setDictationError(voiceRecognitionProblem(String(event.error||'')));
   setDictating(false);
  };
  recognition.onend=()=>{
   if(dictationRef.current===recognition)dictationRef.current=null;
   setDictating(false);
   composerRef.current?.focus();
  };
  try{recognition.start()}catch{
   dictationRef.current=null;
   setDictating(false);
   setDictationError('No se pudo iniciar el dictado. Comprueba los permisos del micrófono.');
  }
 }
 function attach(){
  const input=document.querySelector<HTMLInputElement>('.jarvis-conversation input[type="file"]');
  if(input)input.click();
  else window.dispatchEvent(new CustomEvent('cerebro:attachment-request',{detail:{surface:'jarvis'}}));
 }

 if(!target)return null;
 const busy=snapshot.sending||submitting;
 return createPortal(
  <div className="jarvis-operativa-composer-host">
   <section className="operativa-jarvis-composer" aria-label="Hablar con Jarvis">
    <button type="button" className="operativa-attach" onClick={attach} aria-label="Añadir archivo" title="Añadir archivo"><Plus size={18}/></button>
    <form onSubmit={submit} className="operativa-composer-form">
     <textarea ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)} onKeyDown={onComposerKeyDown}
      disabled={!snapshot.ready||busy||dictating} rows={1} aria-label="Mensaje para Jarvis" placeholder="Escribe aquí tu mensaje…"/>
     <button type="button" className={`operativa-dictate ${dictating?'is-active':''}`}
      onClick={toggleDictation} disabled={!snapshot.ready||busy||snapshot.voiceActive}
      aria-label={dictating?'Detener dictado':'Dictar'}>{dictating?<Square size={17}/>:<Mic size={19}/>}</button>
     <button type="button" className={`operativa-voice ${snapshot.voiceActive?'is-active':''} ${snapshot.voiceListening?'is-listening':''} ${snapshot.voiceSpeaking?'is-speaking':''}`}
      onClick={toggleVoice} disabled={!snapshot.ready||busy||dictating}
      aria-label={snapshot.voiceActive?'Finalizar conversación por voz':'Conversación por voz'}><AudioLines size={20}/><span/><span/><span/></button>
     {composer.trim()?<button type="submit" className="operativa-send" disabled={!snapshot.ready||busy||dictating}
      aria-label={busy?'Enviando mensaje':'Enviar'} title="Enviar"><Send size={18}/></button>:null}
    </form>
    {dictating?<small className="operativa-dictation-status" role="status">Escuchando… puedes ver la transcripción mientras hablas.</small>:null}
    {dictationError?<small className="operativa-dictation-error" role="alert">{dictationError}</small>:null}
    {snapshot.voiceError&&!dictationError?<small className="operativa-dictation-error" role="alert">{snapshot.voiceError}</small>:null}
    {!voiceRecognitionSupported()?<small className="operativa-dictation-error" role="status">El dictado no está disponible en este navegador; el chat escrito sigue funcionando.</small>:null}
   </section>
  </div>,target
 );
}
