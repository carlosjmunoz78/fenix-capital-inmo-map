import {useEffect,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {AudioLines,Mic,Plus,Send,Square} from 'lucide-react';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported,type CerebroSpeechRecognition} from './cerebroVoice';
import './cerebro-operative-console.css';

type Snapshot={ready:boolean;sending:boolean;voiceActive:boolean;voiceListening:boolean;voiceSpeaking:boolean};
const EMPTY:Snapshot={ready:false,sending:false,voiceActive:false,voiceListening:false,voiceSpeaking:false};

function setReactTextareaValue(textarea:HTMLTextAreaElement,value:string){const descriptor=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');descriptor?.set?.call(textarea,value);textarea.dispatchEvent(new Event('input',{bubbles:true}));textarea.dispatchEvent(new Event('change',{bubbles:true}));}

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
  let raf=0;const inspect=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const root=document.querySelector<HTMLElement>('.jarvis-conversation .cerebro-console');if(!root){setSnapshot(EMPTY);return}const title=root.querySelector<HTMLElement>('.cerebro-panel h2')?.textContent?.trim()||'';const send=root.querySelector<HTMLButtonElement>('.cerebro-chat-form button[type="submit"]');const voice=root.querySelector<HTMLButtonElement>('.cerebro-voice-main');const voiceStatus=root.querySelector<HTMLElement>('.cerebro-voice-status')?.textContent?.trim().toLowerCase()||'';setSnapshot({ready:title.includes('Transporte autenticado verificado'),sending:Boolean(send?.textContent?.includes('Enviando')||voiceStatus.includes('procesando')),voiceActive:voice?.getAttribute('aria-pressed')==='true',voiceListening:voiceStatus.includes('escuchando'),voiceSpeaking:voiceStatus.includes('hablando')});});};
  inspect();const observer=new MutationObserver(inspect);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-pressed','class']});const interval=window.setInterval(inspect,1200);return()=>{cancelAnimationFrame(raf);observer.disconnect();window.clearInterval(interval)};
 },[]);
 useEffect(()=>()=>{const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.abort()}catch{/* stopped */}}},[]);

 function sendCommand(raw:string){const clean=raw.trim();if(!clean||!snapshot.ready||snapshot.sending)return false;const core=document.querySelector<HTMLElement>('.jarvis-conversation .cerebro-console');const textarea=core?.querySelector<HTMLTextAreaElement>('.cerebro-chat-form textarea');const form=core?.querySelector<HTMLFormElement>('.cerebro-chat-form');if(!textarea||!form)return false;setReactTextareaValue(textarea,clean);window.setTimeout(()=>form.requestSubmit(),0);return true;}
 function submit(event?:FormEvent){event?.preventDefault();if(sendCommand(composer))setComposer('');}
 function onComposerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit();}}
 function toggleVoice(){if(dictating)return;const button=document.querySelector<HTMLButtonElement>('.jarvis-conversation .cerebro-voice-main');if(button&&!button.disabled)button.click();}
 function stopDictation(){const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.stop()}catch{/* stopped */}}setDictating(false);}
 function toggleDictation(){if(dictating){stopDictation();return}if(!snapshot.ready||snapshot.voiceActive||!voiceRecognitionSupported())return;const recognition=createVoiceRecognition();if(!recognition){setDictationError('El dictado no está disponible ahora.');return}dictationRef.current=recognition;recognition.lang='es-ES';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=3;applyVoiceContextHints(recognition);recognition.onstart=()=>{setDictating(true);setDictationError('')};recognition.onresult=event=>{const result=event.results[event.results.length-1],transcript=String(result?.[0]?.transcript||'').trim();if(transcript){setComposer(current=>`${current}${current.trim()?' ':''}${transcript}`);window.setTimeout(()=>composerRef.current?.focus(),0)}};recognition.onerror=()=>setDictationError('No se pudo completar el dictado.');recognition.onend=()=>{dictationRef.current=null;setDictating(false)};try{recognition.start()}catch{dictationRef.current=null;setDictating(false);setDictationError('No se pudo iniciar el dictado.')}}
 function attach(){const input=document.querySelector<HTMLInputElement>('.jarvis-conversation input[type="file"]');if(input)input.click();else window.dispatchEvent(new CustomEvent('cerebro:attachment-request',{detail:{surface:'jarvis'}}));}

 if(!target)return null;
 return createPortal(<div className="jarvis-operativa-composer-host"><section className="operativa-jarvis-composer" aria-label="Hablar con Jarvis"><button type="button" className="operativa-attach" onClick={attach} aria-label="Añadir archivo" title="Añadir archivo"><Plus size={18}/></button><form onSubmit={submit} className="operativa-composer-form"><textarea ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)} onKeyDown={onComposerKeyDown} disabled={!snapshot.ready||snapshot.sending} rows={1} aria-label="Mensaje para Jarvis" placeholder="Pide, escribe o habla…"/><button type="button" className={`operativa-dictate ${dictating?'is-active':''}`} onClick={toggleDictation} disabled={!snapshot.ready||snapshot.sending||snapshot.voiceActive||!voiceRecognitionSupported()} aria-label={dictating?'Detener dictado':'Dictar'}>{dictating?<Square size={17}/>:<Mic size={19}/>}</button><button type="button" className={`operativa-voice ${snapshot.voiceActive?'is-active':''} ${snapshot.voiceListening?'is-listening':''} ${snapshot.voiceSpeaking?'is-speaking':''}`} onClick={toggleVoice} disabled={!snapshot.ready||snapshot.sending||dictating} aria-label={snapshot.voiceActive?'Finalizar conversación por voz':'Conversación por voz'}><AudioLines size={20}/><span/><span/><span/></button>{composer.trim()?<button type="submit" className="operativa-send" disabled={!snapshot.ready||snapshot.sending} aria-label="Enviar" title="Enviar"><Send size={18}/></button>:null}</form>{dictationError?<small className="operativa-dictation-error" role="status">{dictationError}</small>:null}</section></div>,target);
}
