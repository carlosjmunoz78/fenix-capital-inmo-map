import {useEffect,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {AudioLines,Mic,Plus,Send,Square} from 'lucide-react';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported,type CerebroSpeechRecognition} from './cerebroVoice';
import {sendJarvisComposerMessage,JARVIS_COMPOSER_PRIME_EVENT,type JarvisComposerPrimeDetail} from './jarvisComposerBridge';
import JarvisGatewayCapabilityPanel from './JarvisGatewayCapabilityPanel';
import {jarvisDictationProblem} from './jarvisVoicePolicy';
import {getJarvisOmniState,JARVIS_OMNI_EVENT} from './jarvisOmniSession';
import './cerebro-operative-console.css';
import './jarvis-composer-presence.css';

type Snapshot={ready:boolean;connecting:boolean;sending:boolean;voiceActive:boolean;voiceListening:boolean;voiceSpeaking:boolean;voiceError:string};
const EMPTY:Snapshot={ready:false,connecting:true,sending:false,voiceActive:false,voiceListening:false,voiceSpeaking:false,voiceError:''};

export default function JarvisOperativaComposerPortal(){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 const[composer,setComposer]=useState('');
 const[snapshot,setSnapshot]=useState<Snapshot>(EMPTY);
 const[dictating,setDictating]=useState(false);
 const[dictationError,setDictationError]=useState('');
 const composerRef=useRef<HTMLTextAreaElement|null>(null);
 const dictationRef=useRef<CerebroSpeechRecognition|null>(null);

 useEffect(()=>{
  let current:HTMLElement|null=null;
  const sync=()=>{const next=document.querySelector<HTMLElement>('.jarvis-center-pane .jarvis-input-tools');if(next===current)return;if(current)current.classList.remove('is-operativa-composer');current=next;if(current)current.classList.add('is-operativa-composer');setTarget(current);};
  sync();const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,childList:true});return()=>{observer.disconnect();if(current)current.classList.remove('is-operativa-composer')};
 },[]);
 useEffect(()=>{
  let raf=0;
  const inspect=()=>{
   cancelAnimationFrame(raf);
   raf=requestAnimationFrame(()=>{
    const root=document.querySelector<HTMLElement>('.jarvis-conversation .cerebro-console');
    if(!root){setSnapshot(current=>current.ready||!current.connecting?EMPTY:current);return}
    // An editable offline draft is NOT evidence of Gateway authentication.
    const shared=getJarvisOmniState();
    const title=root.querySelector<HTMLElement>('.cerebro-panel h2')?.textContent?.trim().toLowerCase()||'';
    const send=root.querySelector<HTMLButtonElement>('.cerebro-chat-form button[type="submit"]');
    const voice=root.querySelector<HTMLButtonElement>('.cerebro-voice-main');
    const voiceStatus=root.querySelector<HTMLElement>('.cerebro-voice-status')?.textContent?.trim().toLowerCase()||'';
    const sending=Boolean(send?.textContent?.includes('Enviando')||voiceStatus.includes('procesando'));
    const next:Snapshot={
     ready:shared.ready===true,
     connecting:title.includes('verificando'),
     sending,
     voiceActive:voice?.getAttribute('aria-pressed')==='true',
     voiceListening:voiceStatus.includes('escuchando'),
     voiceSpeaking:voiceStatus.includes('hablando'),
     voiceError:root.querySelector<HTMLElement>('.cerebro-voice-error')?.textContent?.trim()||''
    };
    setSnapshot(current=>current.ready===next.ready&&current.connecting===next.connecting&&
     current.sending===next.sending&&current.voiceActive===next.voiceActive&&
     current.voiceListening===next.voiceListening&&current.voiceSpeaking===next.voiceSpeaking&&
     current.voiceError===next.voiceError?current:next);
   });
  };
  inspect();
  const observer=new MutationObserver(inspect);
  observer.observe(document.querySelector('.jarvis-core-mounted')||document.body,{subtree:true,childList:true,characterData:true,attributes:true,
   attributeFilter:['disabled','aria-pressed','class']});
  const interval=window.setInterval(inspect,4000);
  window.addEventListener(JARVIS_OMNI_EVENT,inspect);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();window.clearInterval(interval);window.removeEventListener(JARVIS_OMNI_EVENT,inspect)};
 },[]);
 useEffect(()=>()=>{const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.abort()}catch{/* stopped */}}},[]);
 useEffect(()=>{
  const onPrime=(event:Event)=>{
   const detail=(event as CustomEvent<JarvisComposerPrimeDetail>).detail;
   if(!detail||typeof detail.message!=='string'||detail.message.length>4000)return;
   detail.accepted=true;
   setComposer(detail.message);
   window.requestAnimationFrame(()=>composerRef.current?.focus());
  };
  window.addEventListener(JARVIS_COMPOSER_PRIME_EVENT,onPrime);
  return()=>window.removeEventListener(JARVIS_COMPOSER_PRIME_EVENT,onPrime);
 },[]);


 function sendCommand(raw:string){const clean=raw.trim();if(!clean||!snapshot.ready||snapshot.sending)return false;return sendJarvisComposerMessage(clean);}
 function submit(event?:FormEvent){event?.preventDefault();if(sendCommand(composer))setComposer('');}
 function onComposerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit();}}
 function toggleVoice(){if(dictating)return;const button=document.querySelector<HTMLButtonElement>('.jarvis-conversation .cerebro-voice-main');if(button&&!button.disabled){setDictationError('');button.click();}else setDictationError(!voiceRecognitionSupported()?'Este navegador no ofrece reconocimiento de voz. Puede utilizar el dictado del teclado del dispositivo.':'La conversación por voz necesita un Gateway conectado y reconocimiento de voz disponible.');}
 function stopDictation(){const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.stop()}catch{/* stopped */}}setDictating(false);}
 function toggleDictation(){if(dictating){stopDictation();return}if(snapshot.sending||snapshot.voiceActive)return;if(!voiceRecognitionSupported()){setDictationError('El navegador no dispone de reconocimiento de voz. Utilice el dictado del teclado o escriba normalmente.');return;}const recognition=createVoiceRecognition();if(!recognition){setDictationError('El dictado no está disponible ahora.');return}dictationRef.current=recognition;recognition.lang='es-ES';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=3;applyVoiceContextHints(recognition);recognition.onstart=()=>{setDictating(true);setDictationError('')};recognition.onresult=event=>{const result=event.results[event.results.length-1],transcript=String(result?.[0]?.transcript||'').trim();if(transcript){setComposer(current=>`${current}${current.trim()?' ':''}${transcript}`);window.setTimeout(()=>composerRef.current?.focus(),0)}};recognition.onerror=event=>setDictationError(jarvisDictationProblem(String(event.error||'')));recognition.onend=()=>{dictationRef.current=null;setDictating(false)};try{recognition.start()}catch{dictationRef.current=null;setDictating(false);setDictationError('No se pudo iniciar el dictado.')}}
 function attach(){const input=document.querySelector<HTMLInputElement>('.jarvis-conversation input[type="file"]');if(input)input.click();else window.dispatchEvent(new CustomEvent('cerebro:attachment-request',{detail:{surface:'jarvis'}}));}

 if(!target)return null;
 const currentState=snapshot.ready?'ready':snapshot.connecting?'connecting':'offline';
 const presence=snapshot.ready
  ?'A su disposición, señor. Puede escribir, dictar o conversar.'
  :snapshot.connecting
   ?'Señor, estoy comprobando la conexión con el Gateway.'
   :'Señor, el Gateway no responde. Puede dejar el mensaje preparado; el envío permanecerá bloqueado hasta recuperar la conexión.';
 return createPortal(<div className="jarvis-operativa-composer-host" data-jarvis-state={currentState}>
  <section className="operativa-jarvis-composer" aria-label="Hablar con Jarvis">
   <div className="jarvis-composer-presence" role="status" aria-live="polite">
    <span className={`jarvis-presence-dot is-${currentState}`} aria-hidden="true"/>
    <strong>JARVIS</strong>
    <span>{presence}</span>
   </div>
   <button type="button" className="operativa-attach" onClick={attach} aria-label="Añadir archivo" title="Añadir archivo"><Plus size={18}/></button>
   <form onSubmit={submit} className="operativa-composer-form">
    <textarea ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)}
     onKeyDown={onComposerKeyDown} rows={1} maxLength={4000} aria-label="Mensaje para Jarvis"
     placeholder="Escribe aquí a JARVIS…"/>
    <button type="button" className={`operativa-dictate ${dictating?'is-active':''}`}
     onClick={toggleDictation} disabled={snapshot.sending||snapshot.voiceActive}
     aria-label={dictating?'Detener dictado':'Dictar'} title={dictating?'Detener dictado':'Dictar un mensaje'}>
     {dictating?<Square size={17}/>:<Mic size={19}/>}
    </button>
    <button type="button" className={`operativa-voice ${snapshot.voiceActive?'is-active':''} ${snapshot.voiceListening?'is-listening':''} ${snapshot.voiceSpeaking?'is-speaking':''}`}
     onClick={toggleVoice} disabled={!snapshot.ready||snapshot.sending||dictating}
     aria-label={snapshot.voiceActive?'Finalizar conversación por voz':'Conversación por voz'}
     title={snapshot.ready?'Iniciar o terminar conversación con JARVIS':'Conversación por voz disponible cuando el Gateway conecte'}>
     <AudioLines size={20}/><span/><span/><span/>
    </button>
    {composer.trim()?<button type="submit" className="operativa-send"
      disabled={!snapshot.ready||snapshot.sending} aria-label="Enviar" title="Enviar a JARVIS">
      <Send size={18}/>
     </button>:null}
   </form>
   {dictationError?<small className="operativa-dictation-error" role="alert">{dictationError}</small>:null}
   {snapshot.voiceError&&!dictationError?<small className="operativa-dictation-error" role="alert">{snapshot.voiceError}</small>:null}
   {!voiceRecognitionSupported()?<small className="operativa-dictation-error" role="status">
    El reconocimiento de voz no está disponible en este navegador; puedes escribir igualmente.
   </small>:null}
   <JarvisGatewayCapabilityPanel ready={snapshot.ready}/>
  </section>
 </div>,target);
}
