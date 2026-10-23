import {useEffect,useRef,useState,type FormEvent,type KeyboardEvent,type MouseEvent,type WheelEvent} from 'react';
import {ArrowLeft,ArrowRight,BrainCircuit,CircleDot,Globe2,Hand,LockKeyhole,MessageSquareText,Mic,Paperclip,Play,Plus,RefreshCw,RotateCcw,Send,ShieldAlert,Square,X} from 'lucide-react';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported,type CerebroSpeechRecognition} from './cerebroVoice';
import {CerebroVoiceSettings} from './CerebroVoiceSettings';
import {decryptBrowserFrame,encryptBrowserInput,fetchBrowserInteractiveApi,importBrowserSessionKey,type BrowserSessionV3} from './cerebroBrowserInteractive';
import './cerebro-browser-console.css';

type ViewName='V0'|'OPERATIVA'|'NAVEGADOR';
type Props={onViewChange?:(view:ViewName)=>void};
type CoreSnapshot={ready:boolean;sending:boolean;voiceActive:boolean};
type BrowserStatusResponse={ok:boolean;session:BrowserSessionV3|null;error?:string};
type BrowserKeyResponse={ok:boolean;key_b64?:string;error?:string};
type BrowserActionResponse={ok:boolean;error?:string};

const EMPTY:CoreSnapshot={ready:false,sending:false,voiceActive:false};
const TERMINAL=new Set(['STOPPED','ERROR','CLOSED']);

function setReactTextareaValue(textarea:HTMLTextAreaElement,value:string){
 const descriptor=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
 descriptor?.set?.call(textarea,value);
 textarea.dispatchEvent(new Event('input',{bubbles:true}));
 textarea.dispatchEvent(new Event('change',{bubbles:true}));
}
function stateLabel(session:BrowserSessionV3|null){
 if(!session)return'SIN SESIÓN VISUAL';
 if(session.state==='CONNECTING')return'CONECTANDO BROWSER 1';
 if(session.state==='CEREBRO_CONTROLLED')return'CEREBRO EN CONTROL';
 if(session.state==='HUMAN_REQUIRED')return'INTERVENCIÓN HUMANA REQUERIDA';
 if(session.state==='TAKEOVER_PENDING')return'TOMA DE CONTROL PENDIENTE';
 if(session.state==='HUMAN_CONTROLLED')return'CONTROL HUMANO';
 if(session.state==='HANDBACK_PENDING')return'DEVOLVIENDO A CEREBRO';
 if(session.state==='AI_RESUMING')return'CEREBRO REANUDANDO';
 if(session.state==='STOPPED')return'PARADA DE EMERGENCIA';
 if(session.state==='ERROR')return'ERROR DE SESIÓN';
 if(session.state==='CLOSED')return'SESIÓN CERRADA';
 return session.state.replaceAll('_',' ');
}
function normalizeAddress(value:string){
 const clean=value.trim();if(!clean)return'';
 if(clean==='about:blank')return clean;
 try{const parsed=new URL(clean);return ['http:','https:'].includes(parsed.protocol)?parsed.toString():''}catch{/* continue */}
 if(/^localhost(?::\d+)?(?:\/|$)/i.test(clean)||/^127\.0\.0\.1(?::\d+)?(?:\/|$)/.test(clean))return `http://${clean}`;
 if(/^[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:\/.*)?$/i.test(clean))return `https://${clean}`;
 return `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
}
function tabLabel(tab:{title?:string;url?:string},index:number){
 const title=String(tab.title||'').trim();if(title)return title.slice(0,34);
 try{const url=new URL(String(tab.url||''));return url.hostname.replace(/^www\./,'')||`Pestaña ${index+1}`}catch{return index===0?'Browser 1':`Pestaña ${index+1}`}
}

export default function CerebroBrowserConsole({onViewChange}:Props){
 const[composer,setComposer]=useState('');
 const[snapshot,setSnapshot]=useState<CoreSnapshot>(EMPTY);
 const[dictating,setDictating]=useState(false);
 const[dictationError,setDictationError]=useState('');
 const[browserSession,setBrowserSession]=useState<BrowserSessionV3|null>(null);
 const[browserError,setBrowserError]=useState('');
 const[browserBusy,setBrowserBusy]=useState(false);
 const[frameUrl,setFrameUrl]=useState('');
 const[addressDraft,setAddressDraft]=useState('');
 const composerRef=useRef<HTMLTextAreaElement|null>(null);
 const addressRef=useRef<HTMLInputElement|null>(null);
 const viewportRef=useRef<HTMLDivElement|null>(null);
 const dictationRef=useRef<CerebroSpeechRecognition|null>(null);
 const keyRef=useRef<CryptoKey|null>(null);
 const keySessionRef=useRef('');
 const frameSeqRef=useRef(-1);
 const frameUrlRef=useRef('');

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
    setSnapshot({ready:title.includes('Transporte autenticado verificado'),sending:Boolean(sendButton?.textContent?.includes('Enviando')||voiceStatus.includes('procesando')),voiceActive:voiceButton?.getAttribute('aria-pressed')==='true'});
   });
  };
  inspect();
  const observer=new MutationObserver(inspect);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-pressed','class']});
  const interval=window.setInterval(inspect,1200);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();window.clearInterval(interval)};
 },[]);

 useEffect(()=>()=>{
  const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.abort()}catch{/* already stopped */}}
  if(frameUrlRef.current)URL.revokeObjectURL(frameUrlRef.current);
 },[]);

 useEffect(()=>{
  let cancelled=false;
  const ensureKey=async(sessionId:string)=>{
   if(keyRef.current&&keySessionRef.current===sessionId)return keyRef.current;
   const result=await fetchBrowserInteractiveApi<BrowserKeyResponse>('/owner/key',{session_id:sessionId});
   if(result.status!==200||!result.data?.ok||!result.data.key_b64)throw new Error(result.data?.error||'No se pudo abrir la clave visual');
   const key=await importBrowserSessionKey(result.data.key_b64);keyRef.current=key;keySessionRef.current=sessionId;return key;
  };
  const refresh=async()=>{
   const result=await fetchBrowserInteractiveApi<BrowserStatusResponse>('/owner/status',{});
   if(cancelled)return;
   if(result.status!==200||!result.data?.ok){if(result.status!==0)setBrowserError(result.data?.error||'No se pudo leer Browser 1');return}
   const session=result.data.session;setBrowserSession(session);setBrowserError('');
   if(document.activeElement!==addressRef.current)setAddressDraft(session?.current_url||'');
   if(!session||TERMINAL.has(session.state)){
    if(!session||session.session_id!==keySessionRef.current){keyRef.current=null;keySessionRef.current='';frameSeqRef.current=-1;}
    return;
   }
   if(session.frame_ciphertext&&session.frame_iv&&session.frame_seq!==frameSeqRef.current){
    try{
     const key=await ensureKey(session.session_id);
     const next=await decryptBrowserFrame(key,session.frame_ciphertext,session.frame_iv,session.frame_mime||'image/png');
     if(cancelled){URL.revokeObjectURL(next);return}
     if(frameUrlRef.current)URL.revokeObjectURL(frameUrlRef.current);
     frameUrlRef.current=next;frameSeqRef.current=session.frame_seq;setFrameUrl(next);
    }catch(error){if(!cancelled)setBrowserError(String((error as Error)?.message||error));}
   }
  };
  void refresh();
  const interval=window.setInterval(()=>{void refresh()},900);
  return()=>{cancelled=true;window.clearInterval(interval)};
 },[]);

 function submit(event?:FormEvent){
  event?.preventDefault();const clean=composer.trim();if(!clean||!snapshot.ready||snapshot.sending)return;
  const core=document.querySelector<HTMLElement>('.cerebro-host-v0 .cerebro-console');
  const textarea=core?.querySelector<HTMLTextAreaElement>('.cerebro-chat-form textarea');const form=core?.querySelector<HTMLFormElement>('.cerebro-chat-form');if(!textarea||!form)return;
  setReactTextareaValue(textarea,clean);window.setTimeout(()=>form.requestSubmit(),0);setComposer('');
 }
 function toggleVoice(){if(dictating)return;const button=document.querySelector<HTMLButtonElement>('.cerebro-host-v0 .cerebro-voice-main');if(button&&!button.disabled)button.click();}
 function stopDictation(){const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.stop()}catch{/* already stopped */}}setDictating(false);}
 function toggleDictation(){
  if(dictating){stopDictation();return}if(!snapshot.ready||snapshot.voiceActive||!voiceRecognitionSupported())return;
  const recognition=createVoiceRecognition();if(!recognition){setDictationError('Dictado no disponible en este navegador.');return}
  dictationRef.current=recognition;recognition.lang='es-ES';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=3;applyVoiceContextHints(recognition);
  recognition.onstart=()=>{setDictating(true);setDictationError('')};recognition.onresult=event=>{const result=event.results[event.results.length-1];const transcript=String(result?.[0]?.transcript||'').trim();if(transcript){setComposer(current=>`${current}${current.trim()?' ':''}${transcript}`);window.setTimeout(()=>composerRef.current?.focus(),0)}};
  recognition.onerror=()=>setDictationError('No se pudo completar el dictado.');recognition.onend=()=>{dictationRef.current=null;setDictating(false)};
  try{recognition.start()}catch{dictationRef.current=null;setDictating(false);setDictationError('No se pudo iniciar el dictado.')}
 }
 function onComposerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit()}}

 async function browserAction(path:string,body:Record<string,unknown>){
  setBrowserBusy(true);setBrowserError('');
  try{const result=await fetchBrowserInteractiveApi<BrowserActionResponse>(path,body);if(result.status!==200||!result.data?.ok)throw new Error(result.data?.error||`Browser 1 respondió ${result.status}`);return true}
  catch(error){setBrowserError(String((error as Error)?.message||error));return false}finally{setBrowserBusy(false)}
 }
 async function startBrowser(){await browserAction('/owner/start',{});}
 async function takeover(){if(browserSession)await browserAction('/owner/takeover',{session_id:browserSession.session_id});}
 async function handback(){if(browserSession?.human_lease_id)await browserAction('/owner/handback',{session_id:browserSession.session_id,lease_id:browserSession.human_lease_id});}
 async function emergencyStop(){if(browserSession)await browserAction('/owner/stop',{session_id:browserSession.session_id});}

 async function humanInput(command_type:string,payload:Record<string,unknown>){
  const session=browserSession;if(!session||session.state!=='HUMAN_CONTROLLED'||session.control_owner!=='HUMAN'||!session.human_lease_id)return;
  try{
   let key=keyRef.current;if(!key||keySessionRef.current!==session.session_id){const k=await fetchBrowserInteractiveApi<BrowserKeyResponse>('/owner/key',{session_id:session.session_id});if(k.status!==200||!k.data?.key_b64)throw new Error(k.data?.error||'Clave de control no disponible');key=await importBrowserSessionKey(k.data.key_b64);keyRef.current=key;keySessionRef.current=session.session_id;}
   const encrypted=await encryptBrowserInput(key,payload);
   const r=await fetchBrowserInteractiveApi<BrowserActionResponse>('/owner/input',{session_id:session.session_id,lease_id:session.human_lease_id,command_type,...encrypted});
   if(r.status!==200||!r.data?.ok)throw new Error(r.data?.error||'Entrada humana rechazada');
  }catch(error){setBrowserError(String((error as Error)?.message||error));}
 }
 function viewerPoint(event:MouseEvent<HTMLImageElement>){
  const session=browserSession;if(!session?.viewport_width||!session.viewport_height)return null;
  const rect=event.currentTarget.getBoundingClientRect();return{x:Math.max(0,Math.min(session.viewport_width,(event.clientX-rect.left)*session.viewport_width/rect.width)),y:Math.max(0,Math.min(session.viewport_height,(event.clientY-rect.top)*session.viewport_height/rect.height))};
 }
 function onViewerClick(event:MouseEvent<HTMLImageElement>){viewportRef.current?.focus();const p=viewerPoint(event);if(p)void humanInput('CLICK_POINT',p)}
 function onViewerWheel(event:WheelEvent<HTMLDivElement>){if(browserSession?.state!=='HUMAN_CONTROLLED')return;event.preventDefault();void humanInput('SCROLL',{delta_x:event.deltaX,delta_y:event.deltaY})}
 function onViewerKeyDown(event:KeyboardEvent<HTMLDivElement>){if(browserSession?.state!=='HUMAN_CONTROLLED')return;event.preventDefault();if(event.key.length===1&&!event.ctrlKey&&!event.metaKey)void humanInput('KEYBOARD_TYPE',{value:event.key});else void humanInput('KEYBOARD_PRESS',{key:event.key})}
 function onAddressKeyDown(event:KeyboardEvent<HTMLInputElement>){if(event.key==='Enter'){event.preventDefault();const url=normalizeAddress(addressDraft);if(url)void humanInput('NAVIGATE',{url})}}

 const live=Boolean(browserSession?.worker_alive&&frameUrl&&!TERMINAL.has(browserSession.state));
 const canTakeover=Boolean(browserSession?.worker_alive&&browserSession.state==='CEREBRO_CONTROLLED'&&browserSession.control_owner==='CEREBRO'&&!browserSession.emergency_stop);
 const humanControl=Boolean(browserSession?.worker_alive&&browserSession.state==='HUMAN_CONTROLLED'&&browserSession.control_owner==='HUMAN'&&browserSession.human_lease_id);
 const canStop=Boolean(browserSession?.worker_alive&&!TERMINAL.has(browserSession.state));
 const canStart=!browserSession||TERMINAL.has(browserSession.state);
 const tabs=browserSession?.tabs?.length?browserSession.tabs:[{index:0,url:browserSession?.current_url||'',active:true,title:browserSession?.current_title||''}];
 const activeTab=Math.max(0,Math.min(browserSession?.active_tab_index??0,tabs.length-1));
 const leaseSeconds=humanControl&&browserSession?.human_lease_expires_at?Math.max(0,Math.ceil((Date.parse(browserSession.human_lease_expires_at)-Date.now())/1000)):0;
 const companyLabel=browserSession?.company_id==='fenix'?'Fénix':browserSession?.company_id||'Fénix';
 const environmentLabel=browserSession?.environment||'PROD';

 return <main className="cerebro-browser-console" aria-label="CEREBRO · Navegador">
  <header className="cerebro-browser-header">
   <div className="cerebro-browser-brand"><span><BrainCircuit size={28}/></span><div><h1>CEREBRO</h1><p>Fénix Capital</p></div></div>
   <nav className="cerebro-browser-view-switch" aria-label="Cambiar vista de CEREBRO"><button type="button" onClick={()=>onViewChange?.('V0')}>VISTA 0</button><button type="button" onClick={()=>onViewChange?.('OPERATIVA')}>OPERATIVA</button><button type="button" disabled title="NEURAL permanece pendiente de colocación">NEURAL</button><button type="button" className="is-active"><Globe2 size={14}/> NAVEGADOR</button></nav>
   <div className="cerebro-browser-head-actions"><span className="cerebro-browser-core-state"><CircleDot size={13}/>{snapshot.ready?'CEREBRO LISTO':'CEREBRO CONECTANDO'}</span><CerebroVoiceSettings/></div>
  </header>

  <section className="cerebro-browser-sessionbar" aria-label="Estado de Browser 1">
   <div className="cerebro-browser-session-context"><span><small>EMPRESA</small><strong>{companyLabel}</strong></span><span><small>ENTORNO</small><strong>{environmentLabel}</strong></span><span><small>MOTOR</small><strong>Browser 1</strong></span><span><small>PESTAÑAS</small><strong>{tabs.length} / 8</strong></span></div>
   <div className="cerebro-browser-controlbar">
    <span className={`cerebro-browser-mode ${humanControl?'is-human':''}`}><CircleDot size={12}/>{stateLabel(browserSession)}{humanControl&&leaseSeconds>0?<small>{Math.floor(leaseSeconds/60)}:{String(leaseSeconds%60).padStart(2,'0')}</small>:null}</span>
    {canStart?<button type="button" className="is-takeover" onClick={startBrowser} disabled={browserBusy}><Play size={15}/> Iniciar Browser 1</button>:null}
    <button type="button" className="is-danger" onClick={emergencyStop} disabled={!canStop||browserBusy} title="Detiene inmediatamente la sesión interactiva"><ShieldAlert size={15}/> Parada de emergencia</button>
    <button type="button" className="is-takeover" onClick={takeover} disabled={!canTakeover||browserBusy}><Hand size={15}/> Tomar control</button>
    <button type="button" onClick={handback} disabled={!humanControl||browserBusy}><RotateCcw size={15}/> Devolver a CEREBRO</button>
   </div>
  </section>

  <section className="cerebro-browser-frame" aria-label="Visor de navegador">
   <div className="cerebro-browser-tabs" role="tablist" aria-label="Pestañas de Browser 1">
    <div className="cerebro-browser-tabstrip">{tabs.map((tab,index)=><button key={`${index}:${tab.url||''}`} type="button" role="tab" aria-selected={index===activeTab} className={index===activeTab?'is-active':''} disabled={!humanControl} onClick={()=>{if(index!==activeTab)void humanInput('SWITCH_TAB',{index})}} title={tab.url||`Pestaña ${index+1}`}><Globe2 size={13}/><span>{tabLabel(tab,index)}</span>{index===activeTab&&humanControl?<X size={12} onClick={event=>{event.stopPropagation();void humanInput('CLOSE_TAB',{})}}/>:null}</button>)}</div>
    <button type="button" className="cerebro-browser-new-tab" disabled={!humanControl||tabs.length>=8} onClick={()=>void humanInput('OPEN_TAB',{url:'about:blank'})} title="Nueva pestaña"><Plus size={15}/></button>
   </div>
   <div className="cerebro-browser-toolbar">
    <div className="cerebro-browser-nav-buttons">
     <button type="button" disabled={!humanControl} onClick={()=>void humanInput('BACK',{})} title="Atrás"><ArrowLeft size={16}/></button>
     <button type="button" disabled={!humanControl} onClick={()=>void humanInput('FORWARD',{})} title="Adelante"><ArrowRight size={16}/></button>
     <button type="button" disabled={!humanControl} onClick={()=>void humanInput('RELOAD',{})} title="Recargar"><RefreshCw size={15}/></button>
    </div>
    <label className={`cerebro-browser-address ${humanControl?'is-editable':''}`}><LockKeyhole size={13}/><input ref={addressRef} value={addressDraft} onChange={event=>setAddressDraft(event.target.value)} onKeyDown={onAddressKeyDown} readOnly={!humanControl} aria-label="Dirección del navegador" placeholder={browserSession?.current_url||'Esperando sesión Browser 1'}/></label>
    <span className={`cerebro-browser-live ${live?'is-live':''}`}><CircleDot size={11}/>{live?'LIVE':'STANDBY'}</span>
   </div>
   <div ref={viewportRef} className={`cerebro-browser-viewport ${humanControl?'is-human-control':''}`} tabIndex={humanControl?0:-1} onWheel={onViewerWheel} onKeyDown={onViewerKeyDown}>
    {live?<img src={frameUrl} alt="Vista en vivo de Browser 1" onClick={onViewerClick} draggable={false}/>:<div className="cerebro-browser-awaiting"><span className="cerebro-browser-awaiting-icon"><Globe2 size={38}/></span><small>FASE 3 · LIVE VIEWER</small><h2>{browserSession?.state==='CONNECTING'?'Arrancando Browser 1':'Navegador preparado'}</h2><p>{browserSession?.state==='CONNECTING'?'La sesión está en la cola gobernada y espera al worker autorizado.':'La interfaz está lista para abrir una sesión Browser 1 real. No se simula navegación.'}</p><div className="cerebro-browser-awaiting-meta"><span>{browserSession?stateLabel(browserSession):'Sin sesión activa'}</span><span>{browserSession?.session_id?`ID ${browserSession.session_id.slice(0,8)}…`:'Misma sesión Browser 1'}</span><span>{humanControl?'Ratón y teclado habilitados':'Observación segura'}</span></div></div>}
   </div>
   {browserError?<div className="cerebro-browser-error" role="status">{browserError}</div>:null}
  </section>

  <section className="cerebro-browser-composer" aria-label="Órdenes para CEREBRO">
   <form onSubmit={submit} className="cerebro-browser-form">
    <button type="button" className="cerebro-browser-icon" disabled title="Adjuntos: contrato de chat aún no habilitado; no se simula" aria-label="Adjuntar archivo"><Paperclip size={19}/></button>
    <button type="button" className={`cerebro-browser-action ${dictating?'is-active':''}`} onClick={toggleDictation} disabled={!snapshot.ready||snapshot.sending||snapshot.voiceActive||!voiceRecognitionSupported()}>{dictating?<Square size={16}/>:<Mic size={18}/>}<span>{dictating?'Parar dictado':'Dictar'}</span></button>
    <button type="button" className={`cerebro-browser-action ${snapshot.voiceActive?'is-active':''}`} onClick={toggleVoice} disabled={!snapshot.ready||snapshot.sending||dictating}>{snapshot.voiceActive?<Square size={16}/>:<MessageSquareText size={18}/>}<span>{snapshot.voiceActive?'Finalizar':'Hablar'}</span></button>
    <textarea ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)} onKeyDown={onComposerKeyDown} disabled={!snapshot.ready||snapshot.sending} rows={1} placeholder={snapshot.ready?'Escribe, habla o da una orden a CEREBRO…':'Esperando conexión segura con CEREBRO…'} aria-label="Escribe una orden para CEREBRO"/>
    <button type="submit" className="cerebro-browser-send" disabled={!snapshot.ready||snapshot.sending||!composer.trim()} title="Enviar · Enter" aria-label="Enviar a CEREBRO"><Send size={19}/><span>Enviar</span></button>
   </form>
   {dictationError?<div className="cerebro-browser-dictation-error" role="status">{dictationError}</div>:null}
  </section>
 </main>;
}
