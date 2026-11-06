import {useEffect,useRef,useState,type FormEvent} from 'react';
import {AudioLines,Mic,Send,Square,MessageSquareText} from 'lucide-react';
import {sendJarvisComposerMessage} from './jarvisComposerBridge';
import JarvisGatewayCapabilityPanel from './JarvisGatewayCapabilityPanel';
import JarvisOwnerDialogueCheck from './JarvisOwnerDialogueCheck';
import JarvisAudioDeviceCheck from './JarvisAudioDeviceCheck';
import JarvisPhysicalVoiceCheck from './JarvisPhysicalVoiceCheck';
import {getJarvisOmniState,getJarvisActiveInterface,JARVIS_OMNI_EVENT,
 JARVIS_OMNI_INTERFACE_EVENT,type JarvisOmniState} from './jarvisOmniSession';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported,type CerebroSpeechRecognition} from './cerebroVoice';
import {jarvisDictationProblem} from './jarvisVoicePolicy';
import './jarvis-omni-dock.css';

export default function JarvisOmniDock({onOpenJarvis}:{onOpenJarvis:()=>void}){
 const [open,setOpen]=useState(false);
 const [state,setState]=useState<JarvisOmniState>(getJarvisOmniState);
 const [active,setActive]=useState(getJarvisActiveInterface);
 const [text,setText]=useState('');
 const [listening,setListening]=useState(false);
 const [error,setError]=useState('');
 const mic=useRef<CerebroSpeechRecognition|null>(null);
 const cancelDictation=()=>{
  const recognition=mic.current;
  mic.current=null;
  if(recognition){
   recognition.onstart=null;recognition.onresult=null;recognition.onerror=null;recognition.onend=null;
   try{recognition.abort()}catch{/* already stopped */}
  }
  setListening(false);
 };
 // Closing the panel, sending a message or entering voice conversation MUST
 // release speech recognition. No hidden background listening after close.
 useEffect(()=>{if(!open||state.voiceActive||state.sending)cancelDictation()},
  [open,state.voiceActive,state.sending]);
 useEffect(()=>{
  const sync=()=>setState(getJarvisOmniState()),view=()=>setActive(getJarvisActiveInterface());
  window.addEventListener(JARVIS_OMNI_EVENT,sync);
  window.addEventListener(JARVIS_OMNI_INTERFACE_EVENT,view);
  // State may have been published before React attached listeners.
  // Re-read the current authenticated projection on mount.
  sync();view();
  return()=>{window.removeEventListener(JARVIS_OMNI_EVENT,sync);
   window.removeEventListener(JARVIS_OMNI_INTERFACE_EVENT,view)};
 },[]);
 useEffect(()=>()=>{const recognition=mic.current;mic.current=null;if(recognition){
  recognition.onstart=null;recognition.onresult=null;recognition.onerror=null;recognition.onend=null;
  try{recognition.abort()}catch{/* already stopped */}
 }},[]);
 const send=(event:FormEvent)=>{event.preventDefault();if(!state.ready||state.sending||!text.trim())return;
  if(sendJarvisComposerMessage(text)){setText('');setError('')}
  else setError('No se pudo enviar al Gateway. Conservo el mensaje.')};
 const voice=()=>{
  const control=document.querySelector<HTMLButtonElement>('.jarvis-core-mounted .cerebro-voice-main');
  if(control&&!control.disabled){control.click();setError('')}
  else setError(!voiceRecognitionSupported()?'El navegador no dispone de reconocimiento de voz. Puede utilizar el dictado del teclado o escribir.':'La conversación por voz requiere conexión autenticada con el Gateway y permiso de micrófono.');
 };
 const dictation=()=>{
  if(mic.current){cancelDictation();return}
  if(!voiceRecognitionSupported()){setError('Este navegador no dispone de reconocimiento de voz. Puede dictar con el teclado del dispositivo o escribir.');return}
  const recognition=createVoiceRecognition();if(!recognition){setError('El motor de dictado no está disponible; puede escribir.');return}
  mic.current=recognition;recognition.lang='es-ES';recognition.continuous=false;
  recognition.interimResults=false;recognition.maxAlternatives=3;applyVoiceContextHints(recognition);
  recognition.onstart=()=>{if(mic.current!==recognition)return;setListening(true);setError('')};
  recognition.onresult=event=>{if(mic.current!==recognition)return;const result=event.results[event.results.length-1];
   const phrase=String(result?.[0]?.transcript||'').trim();
   if(phrase)setText(prev=>prev+(prev.trim()?' ':'')+phrase)};
  recognition.onerror=event=>{if(mic.current===recognition)setError(jarvisDictationProblem(String(event.error||'')))};
  recognition.onend=()=>{if(mic.current!==recognition)return;mic.current=null;setListening(false)};
  try{recognition.start()}catch{mic.current=null;setListening(false);setError('No se ha podido iniciar el micrófono. Revise el permiso del sitio o utilice el teclado.')}
 };
 return <aside className="jarvis-omni-dock" data-jarvis-omni-interface={active}
  aria-label="JARVIS presente en todas las interfaces">
  <button type="button" className="jarvis-omni-launch" aria-expanded={open}
   onClick={()=>setOpen(value=>!value)} aria-label="Hablar con JARVIS desde esta interfaz">
   <span className={'jarvis-omni-light'+(state.ready?' is-connected':'')}/>
   <strong>JARVIS</strong><span>{state.voiceActive?'Conversando':state.ready?'Conectado':'Conexión pendiente'}</span>
   <MessageSquareText size={16}/>
  </button>
  {open?<section className="jarvis-omni-panel" aria-label="Conversación compartida">
   <div className="jarvis-omni-heading"><div><strong>JARVIS</strong><small>Interfaz: {active}</small></div>
    <button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar conversación">Cerrar</button></div>
   <div className="jarvis-omni-transcript" role="log" aria-live="polite">
    {state.turns.slice(-12).map((turn,i)=><p key={i} className={turn.role==='user'?'is-user':'is-jarvis'}>
     <b>{turn.role==='user'?'Tú':'JARVIS'}</b><span>{turn.text}</span></p>)}
   </div>
   <form className="jarvis-omni-entry" onSubmit={send}>
    <textarea aria-label="Escribir a JARVIS" maxLength={4000} rows={2}
     value={text} onChange={e=>setText(e.target.value)} placeholder="Escribe a JARVIS..."/>
    <div className="jarvis-omni-actions">
     <button type="button" onClick={dictation} disabled={state.voiceActive||state.sending}
      aria-label="Dictar a JARVIS">{listening?<Square size={17}/>:<Mic size={17}/>} Dictar</button>
     <button type="button" onClick={voice} disabled={!state.ready||state.sending||listening}
      aria-label="Conversación por voz con JARVIS"><AudioLines size={17}/> Hablar</button>
     <button type="submit" disabled={!state.ready||state.sending||!text.trim()}
      aria-label="Enviar a JARVIS"><Send size={17}/> Enviar</button>
    </div>
   </form>
   {error?<p className="jarvis-omni-error" role="alert">{error}</p>:null}
   {!state.ready?<small className="jarvis-omni-error">Puedes escribir mientras se comprueba la conexión; el envío permanecerá bloqueado hasta entonces.</small>:null}
   <JarvisGatewayCapabilityPanel ready={state.ready}/>
   <JarvisOwnerDialogueCheck ready={state.ready}/>
   <JarvisAudioDeviceCheck disabled={state.voiceActive||state.sending||listening}/>
   <JarvisPhysicalVoiceCheck disabled={state.voiceActive||state.sending||listening}/>
   <button type="button" className="jarvis-omni-open" onClick={onOpenJarvis}>Abrir JARVIS completo</button>
  </section>:null}
 </aside>;
}
