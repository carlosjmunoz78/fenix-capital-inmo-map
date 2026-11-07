import {useEffect,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {AudioLines,Mic,Plus,Send,Square} from 'lucide-react';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported,voiceRecognitionProblem,type CerebroSpeechRecognition} from './cerebroVoice';
import './cerebro-operative-console.css';

type Snapshot={ready:boolean;sending:boolean;voiceActive:boolean;voiceListening:boolean;voiceSpeaking:boolean;voiceError:string};
const EMPTY:Snapshot={ready:false,sending:false,voiceActive:false,voiceListening:false,voiceSpeaking:false,voiceError:''};


function setReactTextareaValue(textarea:HTMLTextAreaElement,value:string){
 const nativeSetter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')?.set;
 if(!nativeSetter)return false;
 nativeSetter.call(textarea,value);
 textarea.dispatchEvent(new Event('input',{bubbles:true}));
 return true;
}

async function waitForUI(check:()=>boolean,timeoutMs=2600){
 const start=performance.now();
 while(performance.now()-start<timeoutMs){
  if(check())return true;
  await new Promise<void>(resolve=>window.requestAnimationFrame(()=>resolve()));
 }
 return check();
}

export default function JarvisOperativaComposerPortal(){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 const[composer,setComposer]=useState('');
 const[snapshot,setSnapshot]=useState<Snapshot>(EMPTY);
 const[dictating,setDictating]=useState(false);
 const[dictationError,setDictationError]=useState('');
 const composerRef=useRef<HTMLTextAreaElement|null>(null);
 const dictationRef=useRef<CerebroSpeechRecognition|null>(null);
 const dictationBaseRef=useRef('');
 const submittingRef=useRef(false);

 useEffect(()=>{
  let current:HTMLElement|null=null;
  const sync=()=>{const next=document.querySelector<HTMLElement>('.jarvis-center-pane .jarvis-input-tools');if(next===current)return;if(current)current.classList.remove('is-operativa-composer');current=next;if(current)current.classList.add('is-operativa-composer');setTarget(current);};
  sync();const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,childList:true});return()=>{observer.disconnect();if(current)current.classList.remove('is-operativa-composer')};
 },[]);
 useEffect(()=>{
  let raf=0;const inspect=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const root=document.querySelector<HTMLElement>('.jarvis-conversation .cerebro-console');if(!root){setSnapshot(EMPTY);return}const coreInput=root.querySelector<HTMLTextAreaElement>('.cerebro-chat-form textarea');const send=root.querySelector<HTMLButtonElement>('.cerebro-chat-form button[type="submit"]');const voice=root.querySelector<HTMLButtonElement>('.cerebro-voice-main');const voiceStatus=root.querySelector<HTMLElement>('.cerebro-voice-status')?.textContent?.trim().toLowerCase()||'';setSnapshot({ready:Boolean(coreInput&&!coreInput.disabled),sending:Boolean(send?.textContent?.includes('Enviando')||voiceStatus.includes('procesando')),voiceActive:voice?.getAttribute('aria-pressed')==='true',voiceListening:voiceStatus.includes('escuchando'),voiceSpeaking:voiceStatus.includes('hablando'),voiceError:root.querySelector<HTMLElement>('.cerebro-voice-error')?.textContent?.trim()||''});});};
  inspect();const observer=new MutationObserver(inspect);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-pressed','class']});const interval=window.setInterval(inspect,1200);return()=>{cancelAnimationFrame(raf);observer.disconnect();window.clearInterval(interval)};
 },[]);
 useEffect(()=>()=>{const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.abort()}catch{/* stopped */}}},[]);

 async function sendCommand(raw:string){
  const clean=raw.trim();
  if(!clean||!snapshot.ready||snapshot.sending||submittingRef.current)return false;
  const root=document.querySelector<HTMLElement>('.jarvis-conversation .cerebro-console');
  const textarea=root?.querySelector<HTMLTextAreaElement>('.cerebro-chat-form textarea');
  const form=root?.querySelector<HTMLFormElement>('.cerebro-chat-form');
  const sendButton=form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  if(!root||!textarea||!form||!sendButton){
   setDictationError('No encuentro el chat de JARVIS. Tu mensaje se conserva para reintentarlo.');
   return false;
  }
  submittingRef.current=true;
  const previousUserMessages=root.querySelectorAll('.cerebro-chat-line.cerebro-chat-user').length;
  try{
   if(!setReactTextareaValue(textarea,clean)){
    setDictationError('No puedo preparar el mensaje en el chat. Tu texto se conserva.');
    return false;
   }
   // Wait until React has accepted the value, rather than submitting on a blind timer.
   const ready=await waitForUI(()=>!textarea.disabled&&!sendButton.disabled&&textarea.value===clean);
   if(!ready){
    setDictationError('El chat no ha preparado el envío. Tu mensaje sigue aquí; vuelve a intentarlo.');
    return false;
   }
   form.requestSubmit();
   // Clear only when the canonical chat itself displays the submitted user message.
   const delivered=await waitForUI(()=>root.querySelectorAll('.cerebro-chat-line.cerebro-chat-user').length>previousUserMessages);
   if(!delivered){
    setDictationError('No puedo confirmar que JARVIS haya recibido el mensaje. Lo conservo para reintentarlo.');
    return false;
   }
   setDictationError('');
   return true;
  }finally{submittingRef.current=false;}
 }
 function submit(event?:FormEvent){
  event?.preventDefault();
  const draft=composer;
  void sendCommand(draft).then(accepted=>{
   if(accepted)setComposer(current=>current===draft?'':current);
  });
 }
 function onComposerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit();}}
 function toggleVoice(){if(dictating)return;const button=document.querySelector<HTMLButtonElement>('.jarvis-conversation .cerebro-voice-main');if(button&&!button.disabled){setDictationError('');button.click();}else setDictationError(!voiceRecognitionSupported()?'Chrome no ofrece reconocimiento de voz. Comprueba el micrófono y los permisos de este sitio.':'La conversación por voz necesita un Gateway conectado y reconocimiento de voz disponible.');}
 function stopDictation(){const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.stop()}catch{/* stopped */}}setDictating(false);}
 function toggleDictation(){if(dictating){stopDictation();return}if(!snapshot.ready||snapshot.voiceActive)return;if(!voiceRecognitionSupported()){setDictationError('El navegador no ofrece reconocimiento de voz. Comprueba que usas Chrome actualizado y que el micrófono está permitido para esta página.');return;}const recognition=createVoiceRecognition();if(!recognition){setDictationError('El dictado no está disponible ahora.');return}dictationRef.current=recognition;dictationBaseRef.current=composer.trim();recognition.lang='es-ES';recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=3;applyVoiceContextHints(recognition);recognition.onstart=()=>{setDictating(true);setDictationError('')};recognition.onresult=event=>{const parts:string[]=[];for(let index=0;index<event.results.length;index++){const spoken=String(event.results[index]?.[0]?.transcript||'').trim();if(spoken)parts.push(spoken)}if(parts.length){const prefix=dictationBaseRef.current;setComposer(`${prefix}${prefix?' ':''}${parts.join(' ')}`)}};recognition.onerror=event=>setDictationError(voiceRecognitionProblem(String(event.error||'')));recognition.onend=()=>{dictationRef.current=null;setDictating(false)};try{recognition.start()}catch{dictationRef.current=null;setDictating(false);setDictationError('No se pudo iniciar el dictado.')}}
 function attach(){const input=document.querySelector<HTMLInputElement>('.jarvis-conversation input[type="file"]');if(input)input.click();else window.dispatchEvent(new CustomEvent('cerebro:attachment-request',{detail:{surface:'jarvis'}}));}

 if(!target)return null;
 return createPortal(<div className="jarvis-operativa-composer-host"><section className="operativa-jarvis-composer" aria-label="Hablar con Jarvis"><button type="button" className="operativa-attach" onClick={attach} aria-label="Añadir archivo" title="Añadir archivo"><Plus size={18}/></button><form onSubmit={submit} className="operativa-composer-form"><textarea ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)} onKeyDown={onComposerKeyDown} disabled={!snapshot.ready||snapshot.sending} rows={1} aria-label="Mensaje para Jarvis" placeholder=""/><button type="button" className={`operativa-dictate ${dictating?'is-active':''}`} onClick={toggleDictation} disabled={!snapshot.ready||snapshot.sending||snapshot.voiceActive} aria-label={dictating?'Detener dictado':'Dictar'} title="Dictado: escribe mientras hablas; pulsa Enviar para recibir respuesta">{dictating?<Square size={17}/>:<Mic size={19}/>}</button><button type="button" className={`operativa-voice ${snapshot.voiceActive?'is-active':''} ${snapshot.voiceListening?'is-listening':''} ${snapshot.voiceSpeaking?'is-speaking':''}`} onClick={toggleVoice} disabled={!snapshot.ready||snapshot.sending||dictating} aria-label={snapshot.voiceActive?'Finalizar conversación por voz':'Conversación por voz'} title="Conversación por voz: JARVIS escucha, envía y responde"><AudioLines size={20}/><span/><span/><span/></button>{composer.trim()?<button type="submit" className="operativa-send" disabled={!snapshot.ready||snapshot.sending} aria-label="Enviar" title="Enviar"><Send size={18}/></button>:null}</form>{dictationError?<small className="operativa-dictation-error" role="alert">{dictationError}</small>:null}{snapshot.voiceError&&!dictationError?<small className="operativa-dictation-error" role="alert">{snapshot.voiceError}</small>:null}{!voiceRecognitionSupported()?<small className="operativa-dictation-error" role="status">El reconocimiento de voz no está disponible en este navegador; el chat escrito sigue funcionando.</small>:null}</section></div>,target);
}
