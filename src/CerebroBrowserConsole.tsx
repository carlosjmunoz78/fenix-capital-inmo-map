import {useEffect,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {BrainCircuit,CircleDot,Globe2,Hand,MessageSquareText,Mic,Paperclip,RotateCcw,Send,ShieldAlert,Square} from 'lucide-react';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported,type CerebroSpeechRecognition} from './cerebroVoice';
import {CerebroVoiceSettings} from './CerebroVoiceSettings';
import './cerebro-browser-console.css';

type ViewName='V0'|'OPERATIVA'|'NAVEGADOR';
type Props={onViewChange?:(view:ViewName)=>void};
type CoreSnapshot={ready:boolean;sending:boolean;voiceActive:boolean};

const EMPTY:CoreSnapshot={ready:false,sending:false,voiceActive:false};

function setReactTextareaValue(textarea:HTMLTextAreaElement,value:string){
 const descriptor=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
 descriptor?.set?.call(textarea,value);
 textarea.dispatchEvent(new Event('input',{bubbles:true}));
 textarea.dispatchEvent(new Event('change',{bubbles:true}));
}

export default function CerebroBrowserConsole({onViewChange}:Props){
 const[composer,setComposer]=useState('');
 const[snapshot,setSnapshot]=useState<CoreSnapshot>(EMPTY);
 const[dictating,setDictating]=useState(false);
 const[dictationError,setDictationError]=useState('');
 const composerRef=useRef<HTMLTextAreaElement|null>(null);
 const dictationRef=useRef<CerebroSpeechRecognition|null>(null);

 useEffect(()=>{
  let raf=0;
  const inspect=()=>{
   cancelAnimationFrame(raf);
   raf=requestAnimationFrame(()=>{
    const root=document.querySelector<HTMLElement>('.cerebro-host-v0 .cerebro-console');
    if(!root){setSnapshot(EMPTY);return}
    const title=root.querySelector<HTMLElement>('.cerebro-panel h2')?.textContent?.trim()||'';
    const voiceButton=root.querySelector<HTMLButtonElement>('.cerebro-voice-main');
    const voiceStatus=root.querySelector<HTMLElement>('.cerebro-voice-status')?.textContent?.trim().toLowerCase()||'';
    const sendButton=root.querySelector<HTMLButtonElement>('.cerebro-chat-form button[type="submit"]');
    setSnapshot({
     ready:title.includes('Transporte autenticado verificado'),
     sending:Boolean(sendButton?.textContent?.includes('Enviando')||voiceStatus.includes('procesando')),
     voiceActive:voiceButton?.getAttribute('aria-pressed')==='true',
    });
   });
  };
  inspect();
  const observer=new MutationObserver(inspect);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-pressed','class']});
  const interval=window.setInterval(inspect,1200);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();window.clearInterval(interval)};
 },[]);

 useEffect(()=>()=>{
  const recognition=dictationRef.current;
  dictationRef.current=null;
  if(recognition){try{recognition.abort()}catch{/* already stopped */}}
 },[]);

 function submit(event?:FormEvent){
  event?.preventDefault();
  const clean=composer.trim();
  if(!clean||!snapshot.ready||snapshot.sending)return;
  const core=document.querySelector<HTMLElement>('.cerebro-host-v0 .cerebro-console');
  const textarea=core?.querySelector<HTMLTextAreaElement>('.cerebro-chat-form textarea');
  const form=core?.querySelector<HTMLFormElement>('.cerebro-chat-form');
  if(!textarea||!form)return;
  setReactTextareaValue(textarea,clean);
  window.setTimeout(()=>form.requestSubmit(),0);
  setComposer('');
 }

 function toggleVoice(){
  if(dictating)return;
  const button=document.querySelector<HTMLButtonElement>('.cerebro-host-v0 .cerebro-voice-main');
  if(button&&!button.disabled)button.click();
 }

 function stopDictation(){
  const recognition=dictationRef.current;
  dictationRef.current=null;
  if(recognition){try{recognition.stop()}catch{/* already stopped */}}
  setDictating(false);
 }

 function toggleDictation(){
  if(dictating){stopDictation();return}
  if(!snapshot.ready||snapshot.voiceActive||!voiceRecognitionSupported())return;
  const recognition=createVoiceRecognition();
  if(!recognition){setDictationError('Dictado no disponible en este navegador.');return}
  dictationRef.current=recognition;
  recognition.lang='es-ES';
  recognition.continuous=false;
  recognition.interimResults=false;
  recognition.maxAlternatives=3;
  applyVoiceContextHints(recognition);
  recognition.onstart=()=>{setDictating(true);setDictationError('')};
  recognition.onresult=event=>{
   const result=event.results[event.results.length-1];
   const transcript=String(result?.[0]?.transcript||'').trim();
   if(transcript){
    setComposer(current=>`${current}${current.trim()?' ':''}${transcript}`);
    window.setTimeout(()=>composerRef.current?.focus(),0);
   }
  };
  recognition.onerror=()=>setDictationError('No se pudo completar el dictado.');
  recognition.onend=()=>{dictationRef.current=null;setDictating(false)};
  try{recognition.start()}catch{
   dictationRef.current=null;
   setDictating(false);
   setDictationError('No se pudo iniciar el dictado.');
  }
 }

 function onComposerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){
  if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit()}
 }

 return <main className="cerebro-browser-console" aria-label="CEREBRO · Navegador">
  <header className="cerebro-browser-header">
   <div className="cerebro-browser-brand"><span><BrainCircuit size={28}/></span><div><h1>CEREBRO</h1><p>Fénix Capital</p></div></div>
   <nav className="cerebro-browser-view-switch" aria-label="Cambiar vista de CEREBRO">
    <button type="button" onClick={()=>onViewChange?.('V0')}>VISTA 0</button>
    <button type="button" onClick={()=>onViewChange?.('OPERATIVA')}>OPERATIVA</button>
    <button type="button" disabled title="NEURAL permanece pendiente de colocación">NEURAL</button>
    <button type="button" className="is-active"><Globe2 size={14}/> NAVEGADOR</button>
   </nav>
   <div className="cerebro-browser-head-actions">
    <span className="cerebro-browser-core-state"><CircleDot size={13}/>{snapshot.ready?'CEREBRO LISTO':'CEREBRO CONECTANDO'}</span>
    <CerebroVoiceSettings/>
   </div>
  </header>

  <section className="cerebro-browser-sessionbar" aria-label="Estado de Browser 1">
   <div className="cerebro-browser-session-context">
    <span><small>EMPRESA</small><strong>Fénix</strong></span>
    <span><small>ENTORNO</small><strong>PROD</strong></span>
    <span><small>MOTOR</small><strong>Browser 1</strong></span>
    <span><small>CAPACIDAD</small><strong>8 / 4 / 2</strong></span>
   </div>
   <div className="cerebro-browser-controlbar">
    <span className="cerebro-browser-mode"><CircleDot size={12}/> SIN SESIÓN VISUAL</span>
    <button type="button" className="is-danger" disabled title="Se activará con el canal físico de control de Fase 3"><ShieldAlert size={15}/> Parada de emergencia</button>
    <button type="button" className="is-takeover" disabled title="Se activará cuando exista una sesión Browser 1 con takeover gobernado"><Hand size={15}/> Tomar control</button>
    <button type="button" disabled title="Disponible después de un takeover humano activo"><RotateCcw size={15}/> Devolver a CEREBRO</button>
   </div>
  </section>

  <section className="cerebro-browser-frame" aria-label="Visor de navegador">
   <div className="cerebro-browser-tabs" aria-hidden="true">
    <span className="is-active"><Globe2 size={13}/> Browser 1 · visor preparado</span>
   </div>
   <div className="cerebro-browser-address" aria-hidden="true"><span className="cerebro-address-lock">●</span><span>Esperando sesión Browser 1</span></div>
   <div className="cerebro-browser-viewport">
    <div className="cerebro-browser-awaiting">
     <span className="cerebro-browser-awaiting-icon"><Globe2 size={38}/></span>
     <small>FASE 3 · LIVE VIEWER</small>
     <h2>Navegador preparado</h2>
     <p>La interfaz está lista. El vídeo/streaming y el takeover permanecen desconectados hasta integrar y certificar el canal físico de Browser 1.</p>
     <div className="cerebro-browser-awaiting-meta"><span>Sin sesión activa</span><span>No se simula navegación</span><span>Control humano bloqueado</span></div>
    </div>
   </div>
  </section>

  <section className="cerebro-browser-composer" aria-label="Órdenes para CEREBRO">
   <form onSubmit={submit} className="cerebro-browser-form">
    <button type="button" className="cerebro-browser-icon" disabled title="Adjuntar archivo · pendiente de contrato real" aria-label="Adjuntar archivo"><Paperclip size={19}/></button>
    <button type="button" className={`cerebro-browser-action ${dictating?'is-active':''}`} onClick={toggleDictation} disabled={!snapshot.ready||snapshot.sending||snapshot.voiceActive||!voiceRecognitionSupported()}>{dictating?<Square size={16}/>:<Mic size={18}/>}<span>{dictating?'Parar dictado':'Dictar'}</span></button>
    <button type="button" className={`cerebro-browser-action ${snapshot.voiceActive?'is-active':''}`} onClick={toggleVoice} disabled={!snapshot.ready||snapshot.sending||dictating}>{snapshot.voiceActive?<Square size={16}/>:<MessageSquareText size={18}/>}<span>{snapshot.voiceActive?'Finalizar':'Hablar'}</span></button>
    <textarea ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)} onKeyDown={onComposerKeyDown} disabled={!snapshot.ready||snapshot.sending} rows={1} placeholder={snapshot.ready?'Escribe, habla o da una orden a CEREBRO…':'Esperando conexión segura con CEREBRO…'} aria-label="Escribe una orden para CEREBRO"/>
    <button type="submit" className="cerebro-browser-send" disabled={!snapshot.ready||snapshot.sending||!composer.trim()} title="Enviar · Enter" aria-label="Enviar a CEREBRO"><Send size={19}/><span>Enviar</span></button>
   </form>
   {dictationError?<div className="cerebro-browser-dictation-error" role="status">{dictationError}</div>:null}
  </section>
 </main>;
}
