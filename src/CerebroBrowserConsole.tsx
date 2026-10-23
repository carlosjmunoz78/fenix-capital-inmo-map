import {useEffect,useMemo,useRef,useState,type FormEvent,type KeyboardEvent,type MouseEvent,type WheelEvent} from 'react';
import {BrainCircuit,CircleDot,Globe2,Hand,MessageSquareText,Mic,Paperclip,Play,RotateCcw,Send,ShieldAlert,Square} from 'lucide-react';
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
 if(session.state==='CONNECTING')return'CONECTANDO';
 if(session.state==='CEREBRO_CONTROLLED')return'CEREBRO EN CONTROL';
 if(session.state==='TAKEOVER_PENDING')return'TOMA DE CONTROL PENDIENTE';
 if(session.state==='HUMAN_CONTROLLED')return'CONTROL HUMANO';
 if(session.state==='HANDBACK_PENDING')return'DEVOLVIENDO A CEREBRO';
 if(session.state==='STOPPED')return'PARADA DE EMERGENCIA';
 if(session.state==='ERROR')return'ERROR DE SESIÓN';
 if(session.state==='CLOSED')return'SESIÓN CERRADA';
 return session.state.replaceAll('_',' ');
}
function readableId(value:string|null|undefined,fallback='—'){
 if(!value)return fallback;
 return value.length>20?`${value.slice(0,8)}…${value.slice(-5)}`:value;
}
function formatTime(value:string|null|undefined){
 if(!value)return'—';
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return'—';
 return new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(date);
}
function humanRequiredLabel(value:unknown){
 if(!value)return'';
 if(typeof value==='string')return value;
 if(typeof value==='object'){
  const record=value as Record<string,unknown>;
  const code=record.code||record.reason||record.type||record.status;
  if(typeof code==='string')return code;
 }
 return'HUMAN_REQUIRED';
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
 const composerRef=useRef<HTMLTextAreaElement|null>(null);
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
  const recognition=dictationRef.current;dictationRef.current=null;
  if(recognition){try{recognition.abort()}catch{/* already stopped */}}
  if(frameUrlRef.current)URL.revokeObjectURL(frameUrlRef.current);
 },[]);

 useEffect(()=>{
  let cancelled=false;
  const ensureKey=async(sessionId:string)=>{
   if(keyRef.current&&keySessionRef.current===sessionId)return keyRef.current;
   const result=await fetchBrowserInteractiveApi<BrowserKeyResponse>('/owner/key',{session_id:sessionId});
   if(result.status!==200||!result.data?.ok||!result.data.key_b64)throw new Error(result.data?.error||'No se pudo abrir la clave visual');
   const key=await importBrowserSessionKey(result.data.key_b64);
   keyRef.current=key;keySessionRef.current=sessionId;return key;
  };
  const refresh=async()=>{
   const result=await fetchBrowserInteractiveApi<BrowserStatusResponse>('/owner/status',{});
   if(cancelled)return;
   if(result.status!==200||!result.data?.ok){if(result.status!==0)setBrowserError(result.data?.error||'No se pudo leer Browser 1');return}
   const session=result.data.session;setBrowserSession(session);setBrowserError('');
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
  const textarea=core?.querySelector<HTMLTextAreaElement>('.cerebro-chat-form textarea');
  const form=core?.querySelector<HTMLFormElement>('.cerebro-chat-form');
  if(!textarea||!form)return;
  setReactTextareaValue(textarea,clean);window.setTimeout(()=>form.requestSubmit(),0);setComposer('');
 }
 function toggleVoice(){if(dictating)return;const button=document.querySelector<HTMLButtonElement>('.cerebro-host-v0 .cerebro-voice-main');if(button&&!button.disabled)button.click();}
 function stopDictation(){const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.stop()}catch{/* already stopped */}}setDictating(false);}
 function toggleDictation(){
  if(dictating){stopDictation();return}if(!snapshot.ready||snapshot.voiceActive||!voiceRecognitionSupported())return;
  const recognition=createVoiceRecognition();if(!recognition){setDictationError('Dictado no disponible en este navegador.');return}
  dictationRef.current=recognition;recognition.lang='es-ES';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=3;applyVoiceContextHints(recognition);
  recognition.onstart=()=>{setDictating(true);setDictationError('')};
  recognition.onresult=event=>{const result=event.results[event.results.length-1];const transcript=String(result?.[0]?.transcript||'').trim();if(transcript){setComposer(current=>`${current}${current.trim()?' ':''}${transcript}`);window.setTimeout(()=>composerRef.current?.focus(),0)}};
  recognition.onerror=()=>setDictationError('No se pudo completar el dictado.');
  recognition.onend=()=>{dictationRef.current=null;setDictating(false)};
  try{recognition.start()}catch{dictationRef.current=null;setDictating(false);setDictationError('No se pudo iniciar el dictado.')}
 }
 function onComposerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit()}}

 async function browserAction(path:string,body:Record<string,unknown>){
  setBrowserBusy(true);setBrowserError('');
  try{const result=await fetchBrowserInteractiveApi<BrowserActionResponse>(path,body);if(result.status!==200||!result.data?.ok)throw new Error(result.data?.error||`Browser 1 respondió ${result.status}`);return true}
  catch(error){setBrowserError(String((error as Error)?.message||error));return false}
  finally{setBrowserBusy(false)}
 }
 async function startBrowser(){await browserAction('/owner/start',{});}
 async function takeover(){if(browserSession)await browserAction('/owner/takeover',{session_id:browserSession.session_id});}
 async function handback(){if(browserSession?.human_lease_id)await browserAction('/owner/handback',{session_id:browserSession.session_id,lease_id:browserSession.human_lease_id});}
 async function emergencyStop(){if(browserSession)await browserAction('/owner/stop',{session_id:browserSession.session_id});}

 async function humanInput(command_type:string,payload:Record<string,unknown>){
  const session=browserSession;if(!session||session.state!=='HUMAN_CONTROLLED'||session.control_owner!=='HUMAN'||!session.human_lease_id)return;
  try{
   let key=keyRef.current;
   if(!key||keySessionRef.current!==session.session_id){
    const k=await fetchBrowserInteractiveApi<BrowserKeyResponse>('/owner/key',{session_id:session.session_id});
    if(k.status!==200||!k.data?.key_b64)throw new Error(k.data?.error||'Clave de control no disponible');
    key=await importBrowserSessionKey(k.data.key_b64);keyRef.current=key;keySessionRef.current=session.session_id;
   }
   const encrypted=await encryptBrowserInput(key,payload);
   const r=await fetchBrowserInteractiveApi<BrowserActionResponse>('/owner/input',{session_id:session.session_id,lease_id:session.human_lease_id,command_type,...encrypted});
   if(r.status!==200||!r.data?.ok)throw new Error(r.data?.error||'Entrada humana rechazada');
  }catch(error){setBrowserError(String((error as Error)?.message||error));}
 }
 function viewerPoint(event:MouseEvent<HTMLImageElement>){
  const session=browserSession;if(!session?.viewport_width||!session.viewport_height)return null;
  const rect=event.currentTarget.getBoundingClientRect();
  return{x:Math.max(0,Math.min(session.viewport_width,(event.clientX-rect.left)*session.viewport_width/rect.width)),y:Math.max(0,Math.min(session.viewport_height,(event.clientY-rect.top)*session.viewport_height/rect.height))};
 }
 function onViewerClick(event:MouseEvent<HTMLImageElement>){const p=viewerPoint(event);if(p)void humanInput('CLICK_POINT',p)}
 function onViewerWheel(event:WheelEvent<HTMLDivElement>){if(browserSession?.state!=='HUMAN_CONTROLLED')return;event.preventDefault();void humanInput('SCROLL',{delta_x:event.deltaX,delta_y:event.deltaY})}
 function onViewerKeyDown(event:KeyboardEvent<HTMLDivElement>){if(browserSession?.state!=='HUMAN_CONTROLLED')return;event.preventDefault();if(event.key.length===1&&!event.ctrlKey&&!event.metaKey)void humanInput('KEYBOARD_TYPE',{value:event.key});else void humanInput('KEYBOARD_PRESS',{key:event.key})}

 const live=Boolean(browserSession?.worker_alive&&frameUrl&&!TERMINAL.has(browserSession.state));
 const canTakeover=Boolean(browserSession?.worker_alive&&browserSession.state==='CEREBRO_CONTROLLED'&&browserSession.control_owner==='CEREBRO'&&!browserSession.emergency_stop);
 const humanControl=Boolean(browserSession?.worker_alive&&browserSession.state==='HUMAN_CONTROLLED'&&browserSession.control_owner==='HUMAN'&&browserSession.human_lease_id);
 const canStop=Boolean(browserSession?.worker_alive&&!TERMINAL.has(browserSession.state));
 const canStart=!browserSession||TERMINAL.has(browserSession.state);
 const tabs=browserSession?.tabs||[];
 const activeTab=tabs.find(tab=>tab.active)||tabs.find(tab=>tab.index===browserSession?.active_tab_index)||tabs[0];
 const companyLabel=browserSession?.company_id||'SIN EMPRESA';
 const environmentLabel=browserSession?.environment||'SIN SESIÓN';
 const humanRequired=humanRequiredLabel(browserSession?.human_required);
 const sessionHealth=browserSession?.worker_alive?'WORKER ONLINE':browserSession?'WORKER OFFLINE':'ESPERANDO';
 const viewport=browserSession?.viewport_width&&browserSession?.viewport_height?`${browserSession.viewport_width}×${browserSession.viewport_height}`:'—';
 const freshness=useMemo(()=>formatTime(browserSession?.last_heartbeat_at),[browserSession?.last_heartbeat_at]);

 return <main className="cerebro-browser-console" aria-label="CEREBRO · Navegador">
  <header className="cerebro-browser-header">
   <div className="cerebro-browser-brand"><span><BrainCircuit size={28}/></span><div><h1>CEREBRO</h1><p>Navegador gobernado</p></div></div>
   <nav className="cerebro-browser-view-switch" aria-label="Cambiar vista de CEREBRO"><button type="button" onClick={()=>onViewChange?.('V0')}>VISTA 0</button><button type="button" onClick={()=>onViewChange?.('OPERATIVA')}>OPERATIVA</button><button type="button" disabled title="NEURAL permanece pendiente de colocación">NEURAL</button><button type="button" className="is-active"><Globe2 size={14}/> NAVEGADOR</button></nav>
   <div className="cerebro-browser-head-actions"><span className="cerebro-browser-core-state" style={snapshot.ready?{borderColor:'rgba(76,227,162,.28)',color:'#95efc7',background:'rgba(34,139,94,.08)'}:undefined}><CircleDot size={13}/>{snapshot.ready?'CEREBRO LISTO':'CEREBRO CONECTANDO'}</span><CerebroVoiceSettings/></div>
  </header>

  <section className="cerebro-browser-sessionbar" aria-label="Estado de Browser 1">
   <div className="cerebro-browser-session-context">
    <span><small>EMPRESA</small><strong>{companyLabel}</strong></span>
    <span><small>ENTORNO</small><strong>{environmentLabel}</strong></span>
    <span><small>RUNTIME</small><strong>Browser 1 · V3</strong></span>
    <span><small>PESTAÑAS</small><strong>{tabs.length}</strong></span>
    <span><small>CONTROL</small><strong>{browserSession?.control_owner||'NONE'}</strong></span>
    <span><small>VIEWPORT</small><strong>{viewport}</strong></span>
    <span><small>HEARTBEAT</small><strong>{freshness}</strong></span>
   </div>
   <div className="cerebro-browser-controlbar">
    <span className="cerebro-browser-mode" style={humanControl?{borderColor:'rgba(255,183,66,.34)',color:'#ffd78a',background:'rgba(158,101,19,.1)'}:undefined}><CircleDot size={12}/>{stateLabel(browserSession)}</span>
    {canStart?<button type="button" className="is-takeover" onClick={startBrowser} disabled={browserBusy}><Play size={15}/> Iniciar</button>:null}
    <button type="button" className="is-takeover" onClick={takeover} disabled={!canTakeover||browserBusy}><Hand size={15}/> Tomar control</button>
    <button type="button" onClick={handback} disabled={!humanControl||browserBusy}><RotateCcw size={15}/> Devolver a CEREBRO</button>
    <button type="button" className="is-danger" onClick={emergencyStop} disabled={!canStop||browserBusy} title="Detiene inmediatamente la sesión interactiva"><ShieldAlert size={15}/> Parada</button>
   </div>
  </section>

  <section className="cerebro-browser-frame" aria-label="Visor de navegador" style={{position:'relative'}}>
   <div className="cerebro-browser-tabs" aria-label="Pestañas de la sesión" style={{gap:5,overflowX:'auto'}}>
    {tabs.length?tabs.map((tab,index)=><span key={`${tab.index??index}-${tab.url??tab.title??index}`} className={tab.active||tab.index===browserSession?.active_tab_index?'is-active':''} title={tab.url||tab.title||`Pestaña ${index+1}`} style={{minWidth:150,maxWidth:260,overflow:'hidden'}}><Globe2 size={13}/><b style={{fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tab.title||`Pestaña ${index+1}`}</b></span>):<span className="is-active"><Globe2 size={13}/><b>{live?'Sesión física viva':'Visor preparado'}</b></span>}
   </div>
   <div className="cerebro-browser-address"><span className="cerebro-address-lock" style={{color:'#4ce3a2'}}>●</span><span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeTab?.url||browserSession?.current_url||'Esperando sesión gobernada'}</span><span style={{flex:'none',paddingLeft:10,borderLeft:'1px solid rgba(77,184,255,.12)',fontSize:7,fontWeight:900,letterSpacing:'.08em'}}>{sessionHealth}</span></div>
   <div className="cerebro-browser-viewport" tabIndex={humanControl?0:-1} onWheel={onViewerWheel} onKeyDown={onViewerKeyDown} style={humanControl?{boxShadow:'inset 0 0 0 2px rgba(255,183,66,.46), inset 0 0 50px rgba(255,172,55,.03)'}:undefined}>
    {live?<img src={frameUrl} alt="Vista en vivo de Browser 1" onClick={onViewerClick} draggable={false} style={{position:'relative',zIndex:1,display:'block',width:'100%',height:'100%',objectFit:'contain',userSelect:'none',cursor:humanControl?'crosshair':'default'}}/>:<div className="cerebro-browser-awaiting"><span className="cerebro-browser-awaiting-icon"><Globe2 size={38}/></span><small>LIVE VIEWER · GOVERNED CONTROL</small><h2>{browserSession?.state==='CONNECTING'?'Arrancando navegador':'Navegador preparado'}</h2><p>{browserSession?.state==='CONNECTING'?'La sesión espera al worker gobernado.':'La consola está preparada para una sesión física real; no se simula navegación ni estado.'}</p><div className="cerebro-browser-awaiting-meta"><span>{stateLabel(browserSession)}</span><span>{browserSession?.session_id?`ID ${readableId(browserSession.session_id)}`:'Sin sesión activa'}</span><span>{humanControl?'Entrada humana habilitada':'Control gobernado por CEREBRO'}</span></div></div>}
    {humanRequired?<div role="alert" style={{position:'absolute',zIndex:4,right:12,top:12,display:'flex',alignItems:'center',gap:9,padding:'9px 11px',border:'1px solid rgba(255,106,66,.3)',borderRadius:11,background:'rgba(44,18,13,.88)',color:'#ff9c83',boxShadow:'0 10px 30px rgba(0,0,0,.25)'}}><ShieldAlert size={14}/><div style={{display:'flex',flexDirection:'column',gap:2}}><small style={{fontSize:6,fontWeight:900,letterSpacing:'.13em'}}>HUMAN_REQUIRED</small><strong style={{fontSize:9}}>{humanRequired}</strong></div></div>:null}
   </div>
   {browserError?<div role="status" style={{position:'absolute',right:14,bottom:12,zIndex:6,maxWidth:'min(620px,80%)',color:'#ff9b80',background:'#24110d',border:'1px solid rgba(255,106,66,.2)',borderRadius:9,padding:'7px 10px',fontSize:8,boxShadow:'0 10px 30px rgba(0,0,0,.3)'}}>{browserError}</div>:null}
  </section>

  <section className="cerebro-browser-composer" aria-label="Órdenes para CEREBRO" style={{position:'relative'}}>
   <form onSubmit={submit} className="cerebro-browser-form">
    <button type="button" className="cerebro-browser-icon" disabled title="Adjuntos permanecen bloqueados hasta contrato de transferencia verificado" aria-label="Adjuntar archivo"><Paperclip size={19}/></button>
    <button type="button" className={`cerebro-browser-action ${dictating?'is-active':''}`} onClick={toggleDictation} disabled={!snapshot.ready||snapshot.sending||snapshot.voiceActive||!voiceRecognitionSupported()}>{dictating?<Square size={16}/>:<Mic size={18}/>}<span>{dictating?'Parar dictado':'Dictar'}</span></button>
    <button type="button" className={`cerebro-browser-action ${snapshot.voiceActive?'is-active':''}`} onClick={toggleVoice} disabled={!snapshot.ready||snapshot.sending||dictating}>{snapshot.voiceActive?<Square size={16}/>:<MessageSquareText size={18}/>}<span>{snapshot.voiceActive?'Finalizar':'Hablar'}</span></button>
    <textarea ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)} onKeyDown={onComposerKeyDown} disabled={!snapshot.ready||snapshot.sending} rows={1} placeholder={snapshot.ready?'Escribe, habla o da una orden a CEREBRO…':'Esperando conexión segura con CEREBRO…'} aria-label="Escribe una orden para CEREBRO"/>
    <button type="submit" className="cerebro-browser-send" disabled={!snapshot.ready||snapshot.sending||!composer.trim()} title="Enviar · Enter" aria-label="Enviar a CEREBRO"><Send size={19}/><span>Enviar</span></button>
   </form>
   {dictationError?<div className="cerebro-browser-dictation-error" role="status">{dictationError}</div>:null}
  </section>
 </main>;
}
