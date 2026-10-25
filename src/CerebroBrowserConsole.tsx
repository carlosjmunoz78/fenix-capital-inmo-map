import {useEffect,useMemo,useRef,useState,type ClipboardEvent,type FormEvent,type KeyboardEvent,type MouseEvent,type WheelEvent} from 'react';
import {ArrowLeft,ArrowRight,BrainCircuit,CircleDot,Globe2,Hand,MessageSquareText,Mic,Paperclip,Play,Plus,RefreshCw,RotateCcw,Send,ShieldAlert,Square,X} from 'lucide-react';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported,type CerebroSpeechRecognition} from './cerebroVoice';
import {CerebroVoiceSettings} from './CerebroVoiceSettings';
import {decryptBrowserFrame,encryptBrowserInput,fetchBrowserInteractiveApi,importBrowserSessionKey,type BrowserCompanyV3,type BrowserSessionV3} from './cerebroBrowserInteractive';
import {evaluateBrowserPostcondition,parseBrowserCommand,type BrowserPostcondition} from '../cerebro/runtime/browser-command-parser-v3';
import './cerebro-browser-console.css';

type ViewName='V0'|'OPERATIVA'|'NAVEGADOR';
type Props={onViewChange?:(view:ViewName)=>void};
type CoreSnapshot={ready:boolean;sending:boolean;voiceActive:boolean};
type BrowserStatusResponse={ok:boolean;session:BrowserSessionV3|null;error?:string};
type BrowserKeyResponse={ok:boolean;key_b64?:string;error?:string};
type BrowserActionResponse={ok:boolean;error?:string;command?:{command_id:string;status:string}};
type BrowserCommandStatusResponse={ok:boolean;command?:{command_id:string;status:string;error_code?:string|null};error?:string};
type VisibleCommand={text:string;status:'ENVIADA'|'INICIANDO'|'EJECUTANDO'|'COMPLETADA'|'ERROR';error?:string};
type BrowserCompaniesResponse={ok:boolean;companies:BrowserCompanyV3[];error?:string};
type BrowserSessionSummary={session_id:string;state:string;control_owner:string;worker_alive:boolean;current_url:string|null;current_title:string|null;opened_at:string;last_heartbeat_at:string|null;closed_at:string|null;updated_at:string};
type BrowserSessionsResponse={ok:boolean;sessions:BrowserSessionSummary[];error?:string};

const EMPTY:CoreSnapshot={ready:false,sending:false,voiceActive:false};
const TERMINAL=new Set(['STOPPED','ERROR','CLOSED','HIBERNATED']);
const HUMAN_TYPING_DEBOUNCE_MS=55;

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
function readableId(value:string|null|undefined,fallback='—'){if(!value)return fallback;return value.length>20?`${value.slice(0,8)}…${value.slice(-5)}`:value;}
function formatTime(value:string|null|undefined){if(!value)return'—';const date=new Date(value);if(Number.isNaN(date.getTime()))return'—';return new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(date);}
function humanRequiredLabel(value:unknown){if(!value)return'';if(typeof value==='string')return value;if(typeof value==='object'){const record=value as Record<string,unknown>;const code=record.code||record.reason||record.type||record.status;if(typeof code==='string')return code;}return'HUMAN_REQUIRED';}

export default function CerebroBrowserConsole({onViewChange}:Props){
 const[address,setAddress]=useState('');
 const[composer,setComposer]=useState('');
 const[snapshot,setSnapshot]=useState<CoreSnapshot>(EMPTY);
 const[dictating,setDictating]=useState(false);
 const[dictationError,setDictationError]=useState('');
 const[browserSession,setBrowserSession]=useState<BrowserSessionV3|null>(null);
 const[browserError,setBrowserError]=useState('');
 const[browserBusy,setBrowserBusy]=useState(false);
 const[commandBusy,setCommandBusy]=useState(false);
 const[visibleCommand,setVisibleCommand]=useState<VisibleCommand|null>(null);
 const[frameUrl,setFrameUrl]=useState('');
 const[companies,setCompanies]=useState<BrowserCompanyV3[]>([]);
 const[selectedCompany,setSelectedCompany]=useState('');
 const[sessionOptions,setSessionOptions]=useState<BrowserSessionSummary[]>([]);
 const[selectedSessionId,setSelectedSessionId]=useState('');
 const viewportRef=useRef<HTMLDivElement|null>(null);
 const composerRef=useRef<HTMLTextAreaElement|null>(null);
 const dictationRef=useRef<CerebroSpeechRecognition|null>(null);
 const keyRef=useRef<CryptoKey|null>(null);
 const keySessionRef=useRef('');
 const frameSeqRef=useRef(-1);
 const frameUrlRef=useRef('');
 const commandLockRef=useRef(false);
 const humanTextBufferRef=useRef('');
 const humanTextTimerRef=useRef<number|null>(null);
 const humanInputQueueRef=useRef<Promise<boolean>>(Promise.resolve(true));
 const pendingTextRef=useRef<{value:string;started:boolean;scope:string;promise:Promise<boolean>}|null>(null);

 useEffect(()=>{
  let raf=0;
  const inspect=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const root=document.querySelector<HTMLElement>('.cerebro-host-v0 .cerebro-console');if(!root){setSnapshot(EMPTY);return}const title=root.querySelector<HTMLElement>('.cerebro-panel h2')?.textContent?.trim()||'';const voiceButton=root.querySelector<HTMLButtonElement>('.cerebro-voice-main');const voiceStatus=root.querySelector<HTMLElement>('.cerebro-voice-status')?.textContent?.trim().toLowerCase()||'';const sendButton=root.querySelector<HTMLButtonElement>('.cerebro-chat-form button[type="submit"]');setSnapshot({ready:title.includes('Transporte autenticado verificado'),sending:Boolean(sendButton?.textContent?.includes('Enviando')||voiceStatus.includes('procesando')),voiceActive:voiceButton?.getAttribute('aria-pressed')==='true'});});};
  inspect();const observer=new MutationObserver(inspect);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-pressed','class']});const interval=window.setInterval(inspect,1200);return()=>{cancelAnimationFrame(raf);observer.disconnect();window.clearInterval(interval)};
 },[]);

 useEffect(()=>()=>{const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.abort()}catch{/* already stopped */}}if(frameUrlRef.current)URL.revokeObjectURL(frameUrlRef.current);if(humanTextTimerRef.current!==null)window.clearTimeout(humanTextTimerRef.current);humanTextBufferRef.current='';},[]);

 useEffect(()=>{
  let cancelled=false;
  void fetchBrowserInteractiveApi<BrowserCompaniesResponse>('/owner/companies',{}).then(result=>{
   if(cancelled)return;
   if(result.status!==200||!result.data?.ok){setBrowserError(result.data?.error||'No se pudo cargar el registro de empresas');return;}
   const list=Array.isArray(result.data.companies)?result.data.companies:[];setCompanies(list);
   setSelectedCompany(current=>current&&list.some(item=>item.company_id===current)?current:(list[0]?.company_id||''));
  });
  return()=>{cancelled=true};
 },[]);

 useEffect(()=>{
  if(!selectedCompany){setSessionOptions([]);setSelectedSessionId('');return;}
  let cancelled=false;
  const refreshSessions=async()=>{
   const result=await fetchBrowserInteractiveApi<BrowserSessionsResponse>('/owner/status',{company_id:selectedCompany,list:true});
   if(cancelled||result.status===0)return;
   if(result.status!==200||!result.data?.ok){setBrowserError(result.data?.error||'No se pudo cargar el historial de sesiones');return;}
   const list=Array.isArray(result.data.sessions)?result.data.sessions:[];setSessionOptions(list);
   setSelectedSessionId(current=>current&&list.some(item=>item.session_id===current)?current:(list.find(item=>!TERMINAL.has(item.state))?.session_id||list[0]?.session_id||''));
  };
  void refreshSessions();const interval=window.setInterval(()=>{void refreshSessions()},2500);return()=>{cancelled=true;window.clearInterval(interval)};
 },[selectedCompany]);

 useEffect(()=>{
  if(!selectedCompany)return;
  let cancelled=false;
  const ensureKey=async(sessionId:string)=>{
   if(keyRef.current&&keySessionRef.current===sessionId)return keyRef.current;
   const result=await fetchBrowserInteractiveApi<BrowserKeyResponse>('/owner/key',{company_id:selectedCompany,session_id:sessionId});
   if(result.status!==200||!result.data?.ok||!result.data.key_b64)throw new Error(result.data?.error||'No se pudo abrir la clave visual');
   const key=await importBrowserSessionKey(result.data.key_b64);keyRef.current=key;keySessionRef.current=sessionId;return key;
  };
  const refresh=async()=>{
   const result=await fetchBrowserInteractiveApi<BrowserStatusResponse>('/owner/status',{company_id:selectedCompany,...(selectedSessionId?{session_id:selectedSessionId}:{})});
   if(cancelled)return;
   if(result.status!==200||!result.data?.ok){if(result.status!==0)setBrowserError(result.data?.error||'No se pudo leer Browser 1');return}
   const session=result.data.session;setBrowserSession(session);setBrowserError('');
   if(!session||TERMINAL.has(session.state)){if(!session||session.session_id!==keySessionRef.current){keyRef.current=null;keySessionRef.current='';frameSeqRef.current=-1;}return;}
   if(session.frame_ciphertext&&session.frame_iv&&session.frame_seq!==frameSeqRef.current){try{const key=await ensureKey(session.session_id);const next=await decryptBrowserFrame(key,session.frame_ciphertext,session.frame_iv,session.frame_mime||'image/png');if(cancelled){URL.revokeObjectURL(next);return}if(frameUrlRef.current)URL.revokeObjectURL(frameUrlRef.current);frameUrlRef.current=next;frameSeqRef.current=session.frame_seq;setFrameUrl(next);}catch(error){if(!cancelled)setBrowserError(String((error as Error)?.message||error));}}
  };
  void refresh();const interval=window.setInterval(()=>{void refresh()},900);return()=>{cancelled=true;window.clearInterval(interval)};
 },[selectedCompany,selectedSessionId]);

 useEffect(()=>{const listener=(event:Event)=>{const id=(event as CustomEvent<string>).detail;if(id)setSelectedSessionId(id);};window.addEventListener('cerebro:browser-session-selected',listener);return()=>window.removeEventListener('cerebro:browser-session-selected',listener);},[]);
 useEffect(()=>{const tab=browserSession?.tabs.find(item=>item.active)||browserSession?.tabs.find(item=>item.index===browserSession?.active_tab_index);setAddress(tab?.url||browserSession?.current_url||'');},[browserSession?.current_url,browserSession?.active_tab_index,browserSession?.session_id]);
 async function navigateAddress(event:FormEvent){event.preventDefault();if(!humanControl)return;try{const raw=address.trim();const url=new URL(/^[a-z][a-z\d+.-]*:/i.test(raw)?raw:`https://${raw}`);if(!['https:','http:','about:'].includes(url.protocol)||url.username||url.password)throw new Error('Introduce una URL http o https sin credenciales');drainHumanTextBuffer();await queueHumanInput('NAVIGATE',{url:url.href});viewportRef.current?.focus();}catch(error){setBrowserError(String((error as Error).message));}}
 function resetVisualSession(){setBrowserSession(null);keyRef.current=null;keySessionRef.current='';frameSeqRef.current=-1;humanTextBufferRef.current='';if(humanTextTimerRef.current!==null){window.clearTimeout(humanTextTimerRef.current);humanTextTimerRef.current=null;}if(frameUrlRef.current){URL.revokeObjectURL(frameUrlRef.current);frameUrlRef.current='';setFrameUrl('');}}
 function changeCompany(value:string){if(hasActiveSession)return;setSelectedCompany(value);setSelectedSessionId('');setSessionOptions([]);setBrowserError('');resetVisualSession();}
 function changeSession(value:string){if(value===selectedSessionId)return;setSelectedSessionId(value);setBrowserError('');resetVisualSession();}
 async function waitForCerebroSession(){for(let attempt=0;attempt<40;attempt++){const r=await fetchBrowserInteractiveApi<BrowserStatusResponse>('/owner/status',{company_id:selectedCompany});const s=r.data?.session;if(r.status===200&&r.data?.ok&&s?.worker_alive&&s.state==='CEREBRO_CONTROLLED'&&s.control_owner==='CEREBRO'&&!s.emergency_stop)return s;await new Promise(resolve=>window.setTimeout(resolve,500));}throw new Error('BROWSER_WORKER_NO_QUEDO_LISTO');}
 async function waitForCommand(sessionId:string,commandId:string){for(let attempt=0;attempt<60;attempt++){const r=await fetchBrowserInteractiveApi<BrowserCommandStatusResponse>('/owner/command-status',{company_id:selectedCompany,session_id:sessionId,command_id:commandId});const c=r.data?.command;if(r.status!==200||!r.data?.ok)throw new Error(r.data?.error||'No se pudo consultar la orden');if(c?.status==='COMPLETED')return;if(c?.status==='FAILED')throw new Error(c.error_code||'La orden del navegador falló');await new Promise(resolve=>window.setTimeout(resolve,250));}throw new Error('TIMEOUT_EJECUTANDO_ORDEN');}
 async function waitForPostcondition(sessionId:string,postcondition:BrowserPostcondition|undefined){if(!postcondition)return;for(let attempt=0;attempt<24;attempt++){const r=await fetchBrowserInteractiveApi<BrowserStatusResponse>('/owner/status',{company_id:selectedCompany,session_id:sessionId});if(r.status!==200||!r.data?.ok)throw new Error(r.data?.error||'No se pudo verificar el resultado de la orden');const result=evaluateBrowserPostcondition(postcondition,r.data.session||{});if(result.state==='SATISFIED')return;if(result.state==='FAILED')throw new Error(result.error||'POSTCONDITION_FAILED');await new Promise(resolve=>window.setTimeout(resolve,250));}throw new Error('POSTCONDITION_NOT_MET');}
 async function submit(event?:FormEvent){event?.preventDefault();const clean=composer.trim();if(!clean||commandLockRef.current)return;const parsed=parseBrowserCommand(clean);setVisibleCommand({text:clean,status:'ENVIADA'});setComposer('');if(!parsed.ok){setVisibleCommand({text:clean,status:'ERROR',error:parsed.error});return;}commandLockRef.current=true;setCommandBusy(true);setBrowserError('');try{let session=browserSession;if(session?.worker_alive&&['HUMAN_CONTROLLED','HUMAN_REQUIRED','TAKEOVER_PENDING','HANDBACK_PENDING'].includes(session.state))throw new Error('Devuelve el control a CEREBRO antes de enviar una orden');if(!session?.worker_alive||session.state!=='CEREBRO_CONTROLLED'||session.control_owner!=='CEREBRO'||session.emergency_stop){setVisibleCommand({text:clean,status:'INICIANDO'});const start=await fetchBrowserInteractiveApi<BrowserActionResponse>('/owner/start',{company_id:selectedCompany,idempotency_key:`ui-start-${crypto.randomUUID()}`});if(start.status!==200||!start.data?.ok)throw new Error(start.data?.error||'No se pudo iniciar Browser 1');session=await waitForCerebroSession();setSelectedSessionId(session.session_id);}const keyResponse=await fetchBrowserInteractiveApi<BrowserKeyResponse>('/owner/key',{company_id:selectedCompany,session_id:session.session_id});if(keyResponse.status!==200||!keyResponse.data?.ok||!keyResponse.data.key_b64)throw new Error(keyResponse.data?.error||'Clave de ejecución no disponible');const key=await importBrowserSessionKey(keyResponse.data.key_b64);for(const action of parsed.commands){setVisibleCommand({text:clean,status:'EJECUTANDO'});const encrypted=await encryptBrowserInput(key,action.payload);const queued=await fetchBrowserInteractiveApi<BrowserActionResponse>('/owner/command',{company_id:selectedCompany,session_id:session.session_id,command_type:action.command_type,idempotency_key:crypto.randomUUID(),...encrypted});if(queued.status!==200||!queued.data?.ok||!queued.data.command?.command_id)throw new Error(queued.data?.error||'La orden no entró en Browser 1');await waitForCommand(session.session_id,queued.data.command.command_id);}await waitForPostcondition(session.session_id,parsed.postcondition);setVisibleCommand({text:clean,status:'COMPLETADA'});}catch(error){const message=String((error as Error)?.message||error);setVisibleCommand({text:clean,status:'ERROR',error:message});setBrowserError(message);}finally{commandLockRef.current=false;setCommandBusy(false);}}

 function toggleVoice(){if(dictating)return;const button=document.querySelector<HTMLButtonElement>('.cerebro-host-v0 .cerebro-voice-main');if(button&&!button.disabled)button.click();}
 function stopDictation(){const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.stop()}catch{/* already stopped */}}setDictating(false);}
 function toggleDictation(){if(dictating){stopDictation();return}if(!snapshot.ready||snapshot.voiceActive||!voiceRecognitionSupported())return;const recognition=createVoiceRecognition();if(!recognition){setDictationError('Dictado no disponible en este navegador.');return}dictationRef.current=recognition;recognition.lang='es-ES';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=3;applyVoiceContextHints(recognition);recognition.onstart=()=>{setDictating(true);setDictationError('')};recognition.onresult=event=>{const result=event.results[event.results.length-1];const transcript=String(result?.[0]?.transcript||'').trim();if(transcript){setComposer(current=>`${current}${current.trim()?' ':''}${transcript}`);window.setTimeout(()=>composerRef.current?.focus(),0)}};recognition.onerror=()=>setDictationError('No se pudo completar el dictado.');recognition.onend=()=>{dictationRef.current=null;setDictating(false)};try{recognition.start()}catch{dictationRef.current=null;setDictating(false);setDictationError('No se pudo iniciar el dictado.')}}
 function onComposerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit()}}
 async function browserAction(path:string,body:Record<string,unknown>={}){if(!selectedCompany){setBrowserError('No hay empresa autorizada disponible');return false}setBrowserBusy(true);setBrowserError('');try{const result=await fetchBrowserInteractiveApi<BrowserActionResponse>(path,{company_id:selectedCompany,...body});if(result.status!==200||!result.data?.ok)throw new Error(result.data?.error||`Browser 1 respondió ${result.status}`);return true}catch(error){setBrowserError(String((error as Error)?.message||error));return false}finally{setBrowserBusy(false)}}
 async function startBrowser(){const ok=await browserAction('/owner/start');if(ok){setSelectedSessionId('');resetVisualSession();}}
 async function takeover(){if(browserSession)await browserAction('/owner/takeover',{session_id:browserSession.session_id});}
 async function handback(){if(browserSession?.human_lease_id){drainHumanTextBuffer();await humanInputQueueRef.current;await browserAction('/owner/handback',{session_id:browserSession.session_id,lease_id:browserSession.human_lease_id});}}
 async function emergencyStop(){humanTextBufferRef.current='';if(humanTextTimerRef.current!==null){window.clearTimeout(humanTextTimerRef.current);humanTextTimerRef.current=null;}if(browserSession)await browserAction('/owner/stop',{session_id:browserSession.session_id});}
 async function humanInput(command_type:string,payload:Record<string,unknown>){const session=browserSession;if(!session||session.state!=='HUMAN_CONTROLLED'||session.control_owner!=='HUMAN'||!session.human_lease_id)return false;try{let key=keyRef.current;if(!key||keySessionRef.current!==session.session_id){const k=await fetchBrowserInteractiveApi<BrowserKeyResponse>('/owner/key',{company_id:selectedCompany,session_id:session.session_id});if(k.status!==200||!k.data?.key_b64)throw new Error(k.data?.error||'Clave de control no disponible');key=await importBrowserSessionKey(k.data.key_b64);keyRef.current=key;keySessionRef.current=session.session_id;}const encrypted=await encryptBrowserInput(key,payload);const r=await fetchBrowserInteractiveApi<BrowserActionResponse>('/owner/input',{company_id:selectedCompany,session_id:session.session_id,lease_id:session.human_lease_id,command_type,...encrypted});if(r.status!==200||!r.data?.ok)throw new Error(r.data?.error||'Entrada humana rechazada');if(r.data.command?.command_id)await waitForCommand(session.session_id,r.data.command.command_id);return true;}catch(error){setBrowserError(String((error as Error)?.message||error));return false;}}
 function queueHumanInput(command_type:string,payload:Record<string,unknown>){
  const scope=`${browserSession?.session_id}|${browserSession?.human_lease_id}`;
  const value=String(payload.value??'');const tail=pendingTextRef.current;
  if(command_type==='KEYBOARD_TYPE'&&tail&&!tail.started&&tail.scope===scope&&tail.value.length+value.length<=4000){tail.value+=value;return tail.promise;}
  pendingTextRef.current=null;
  const batch=command_type==='KEYBOARD_TYPE'?{value,started:false,scope,promise:Promise.resolve(false)}:null;
  const run=()=>{if(batch){batch.started=true;if(pendingTextRef.current===batch)pendingTextRef.current=null;}return humanInput(command_type,batch?{...payload,value:batch.value}:payload);};
  const next=humanInputQueueRef.current.then(run,run);if(batch){batch.promise=next;pendingTextRef.current=batch;}humanInputQueueRef.current=next.catch(()=>false);return next;
 }
 function clearHumanTextTimer(){if(humanTextTimerRef.current!==null){window.clearTimeout(humanTextTimerRef.current);humanTextTimerRef.current=null;}}
 function drainHumanTextBuffer(){clearHumanTextTimer();const value=humanTextBufferRef.current;humanTextBufferRef.current='';if(value)void queueHumanInput('KEYBOARD_TYPE',{value,delay_ms:0});return value;}
 function scheduleHumanTextFlush(){clearHumanTextTimer();humanTextTimerRef.current=window.setTimeout(()=>{humanTextTimerRef.current=null;const value=humanTextBufferRef.current;humanTextBufferRef.current='';if(value)void queueHumanInput('KEYBOARD_TYPE',{value,delay_ms:0});},HUMAN_TYPING_DEBOUNCE_MS);}
 function viewerPoint(event:MouseEvent<HTMLImageElement>){const session=browserSession;if(!session?.viewport_width||!session.viewport_height)return null;const rect=event.currentTarget.getBoundingClientRect();const scale=Math.min(rect.width/session.viewport_width,rect.height/session.viewport_height);const left=rect.left+(rect.width-session.viewport_width*scale)/2;const top=rect.top+(rect.height-session.viewport_height*scale)/2;const x=(event.clientX-left)/scale,y=(event.clientY-top)/scale;if(x<0||y<0||x>session.viewport_width||y>session.viewport_height)return null;return{x,y};}
 function onViewerClick(event:MouseEvent<HTMLImageElement>){viewportRef.current?.focus();drainHumanTextBuffer();const p=viewerPoint(event);if(p)void queueHumanInput('CLICK_POINT',p)}
 function onViewerDoubleClick(event:MouseEvent<HTMLImageElement>){drainHumanTextBuffer();const p=viewerPoint(event);if(p)void queueHumanInput('DOUBLE_CLICK_POINT',p)}
 function onViewerWheel(event:WheelEvent<HTMLDivElement>){if(browserSession?.state!=='HUMAN_CONTROLLED')return;event.preventDefault();drainHumanTextBuffer();void queueHumanInput('SCROLL',{delta_x:event.deltaX,delta_y:event.deltaY})}
 function onViewerKeyDown(event:KeyboardEvent<HTMLDivElement>){if(!humanControl||event.nativeEvent.isComposing||['Shift','Control','Alt','Meta','CapsLock'].includes(event.key))return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='v')return;event.preventDefault();if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){humanTextBufferRef.current=`${humanTextBufferRef.current}${event.key}`.slice(0,4000);scheduleHumanTextFlush();return;}drainHumanTextBuffer();const key=[event.ctrlKey?'Control':null,event.metaKey?'Meta':null,event.altKey?'Alt':null,event.shiftKey?'Shift':null,event.key===' '?'Space':event.key].filter(Boolean).join('+');void queueHumanInput('KEYBOARD_PRESS',{key});}
 function onViewerPaste(event:ClipboardEvent<HTMLDivElement>){if(browserSession?.state!=='HUMAN_CONTROLLED')return;const pasted=event.clipboardData.getData('text');if(!pasted)return;event.preventDefault();clearHumanTextTimer();const value=`${humanTextBufferRef.current}${pasted}`.slice(0,4000);humanTextBufferRef.current='';if(value)void queueHumanInput('KEYBOARD_TYPE',{value,delay_ms:0});}
 function switchTab(index:number){if(humanControl){drainHumanTextBuffer();void queueHumanInput('SWITCH_TAB',{index});}}
 function onTabKeyDown(event:KeyboardEvent<HTMLSpanElement>,index:number){if(!humanControl)return;if(event.key==='Enter'||event.key===' '){event.preventDefault();switchTab(index)}}
 function navigateBack(){if(humanControl){drainHumanTextBuffer();void queueHumanInput('BACK',{});}}
 function navigateForward(){if(humanControl){drainHumanTextBuffer();void queueHumanInput('FORWARD',{});}}
 function reloadPage(){if(humanControl){drainHumanTextBuffer();void queueHumanInput('RELOAD',{});}}
 function openTab(){if(humanControl&&tabs.length<8){drainHumanTextBuffer();void queueHumanInput('OPEN_TAB',{url:'about:blank'});}}
 function closeTab(){if(humanControl&&tabs.length>1){drainHumanTextBuffer();void queueHumanInput('CLOSE_TAB',{});}}

 const live=Boolean(browserSession?.worker_alive&&frameUrl&&!TERMINAL.has(browserSession.state));
 const canTakeover=Boolean(browserSession?.worker_alive&&((browserSession.state==='CEREBRO_CONTROLLED'&&browserSession.control_owner==='CEREBRO')||(browserSession.state==='HUMAN_REQUIRED'&&browserSession.control_owner==='NONE'))&&!browserSession.emergency_stop);
 const humanControl=Boolean(browserSession?.worker_alive&&browserSession.state==='HUMAN_CONTROLLED'&&browserSession.control_owner==='HUMAN'&&browserSession.human_lease_id);
 const canStop=Boolean(browserSession?.worker_alive&&!TERMINAL.has(browserSession.state));
 const hasActiveSession=sessionOptions.some(item=>!TERMINAL.has(item.state));
 const canStart=Boolean(selectedCompany)&&!hasActiveSession;
 const tabs=browserSession?.tabs||[];
 const activeTab=tabs.find(tab=>tab.active)||tabs.find(tab=>tab.index===browserSession?.active_tab_index)||tabs[0];
 const companyLabel=browserSession?.company_id||selectedCompany||'SIN EMPRESA';
 const environmentLabel=browserSession?.environment||(selectedCompany?'PREPROD':'SIN SESIÓN');
 const humanRequired=humanRequiredLabel(browserSession?.human_required);
 const sessionHealth=browserSession?.worker_alive?'WORKER ONLINE':browserSession?'WORKER OFFLINE':'ESPERANDO';
 const viewport=browserSession?.viewport_width&&browserSession?.viewport_height?`${browserSession.viewport_width}×${browserSession.viewport_height}`:'—';
 const freshness=useMemo(()=>formatTime(browserSession?.last_heartbeat_at),[browserSession?.last_heartbeat_at]);
 const selectedSessionValue=selectedSessionId||browserSession?.session_id||'';
 const navButtonStyle={display:'inline-flex',alignItems:'center',justifyContent:'center',width:24,height:24,border:0,borderRadius:7,background:'transparent',color:humanControl?'#cbe5ef':'#54717c',cursor:humanControl?'pointer':'not-allowed',padding:0,flex:'none'} as const;
 const boundedBarStyle={minWidth:0,maxWidth:'100%',width:'100%',flexWrap:'wrap',overflow:'hidden'} as const;
 const selectorStyle={marginTop:2,width:'100%',minWidth:0,maxWidth:'100%',border:0,outline:0,background:'transparent',color:'#cbe5ef',fontSize:10,fontWeight:700} as const;

 return <main className="cerebro-browser-console" aria-label="CEREBRO · Navegador">
  <header className="cerebro-browser-header"><strong>CEREBRO</strong><span>{companyLabel.toUpperCase()}</span><span>{environmentLabel}</span><span role="status">{stateLabel(browserSession)}</span></header>


  <section className="cerebro-browser-frame" aria-label="Visor de navegador" style={{position:'relative',minWidth:0,maxWidth:'100%'}}>
   <div className="cerebro-browser-tabs" aria-label="Pestañas de la sesión" style={{gap:5,overflowX:'auto',minWidth:0,maxWidth:'100%'}}>{tabs.length?tabs.map((tab,index)=>{const tabIndex=Number.isInteger(tab.index)?Number(tab.index):index;const isActive=tab.active||tab.index===browserSession?.active_tab_index;return <span key={`${tabIndex}-${tab.url??tab.title??index}`} className={isActive?'is-active':''} title={humanControl?`${tab.url||tab.title||`Pestaña ${index+1}`} · Cambiar a esta pestaña`:`${tab.url||tab.title||`Pestaña ${index+1}`} · Toma el control para cambiar`} role="button" aria-current={isActive?'page':undefined} aria-disabled={!humanControl} tabIndex={humanControl?0:-1} onClick={()=>switchTab(tabIndex)} onKeyDown={event=>onTabKeyDown(event,tabIndex)} style={{minWidth:150,maxWidth:260,overflow:'hidden',cursor:humanControl?'pointer':'default',opacity:humanControl||isActive?1:.78}}><Globe2 size={13}/><b style={{fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tab.title||`Pestaña ${index+1}`}</b></span>}):<span className="is-active"><Globe2 size={13}/><b>{live?'Sesión física viva':'Visor preparado'}</b></span>}</div>
   <form onSubmit={navigateAddress} className="cerebro-browser-address" aria-label="Controles del navegador" style={{minWidth:0,maxWidth:'100%',overflow:'hidden'}}>
    <button type="button" style={navButtonStyle} onClick={navigateBack} disabled={!humanControl} title="Atrás" aria-label="Atrás"><ArrowLeft size={14}/></button>
    <button type="button" style={navButtonStyle} onClick={navigateForward} disabled={!humanControl} title="Adelante" aria-label="Adelante"><ArrowRight size={14}/></button>
    <button type="button" style={navButtonStyle} onClick={reloadPage} disabled={!humanControl} title="Recargar" aria-label="Recargar"><RefreshCw size={13}/></button>
    <span className="cerebro-address-lock" style={{color:'#4ce3a2'}}>●</span>
    <input aria-label="Dirección URL" placeholder="Escribe o pega una URL" value={address} onChange={event=>setAddress(event.target.value)} disabled={!humanControl} autoComplete="off" spellCheck={false}/>
    <button type="submit" disabled={!humanControl}>Ir</button>
    <button type="button" style={navButtonStyle} onClick={openTab} disabled={!humanControl||tabs.length>=8} title={tabs.length>=8?'Límite de 8 pestañas alcanzado':'Nueva pestaña'} aria-label="Nueva pestaña"><Plus size={14}/></button>
    <button type="button" style={navButtonStyle} onClick={closeTab} disabled={!humanControl||tabs.length<=1} title={tabs.length<=1?'Debe quedar al menos una pestaña':'Cerrar pestaña activa'} aria-label="Cerrar pestaña activa"><X size={14}/></button>
    <span style={{flex:'none',paddingLeft:10,borderLeft:'1px solid rgba(77,184,255,.12)',fontSize:7,fontWeight:900,letterSpacing:'.08em'}}>{sessionHealth}</span>
   </form>
   <div ref={viewportRef} data-browser-native-input="true" className="cerebro-browser-viewport" tabIndex={humanControl?0:-1} onWheel={onViewerWheel} onKeyDown={onViewerKeyDown} onPaste={onViewerPaste} style={humanControl?{boxShadow:'inset 0 0 0 2px rgba(255,183,66,.46), inset 0 0 50px rgba(255,172,55,.03)'}:undefined}>
    {live?<img src={frameUrl} alt="Vista en vivo de Browser 1" onClick={onViewerClick} onDoubleClick={onViewerDoubleClick} draggable={false} style={{position:'relative',zIndex:1,display:'block',width:'100%',height:'100%',objectFit:'contain',userSelect:'none',cursor:humanControl?'crosshair':'default'}}/>:<div className="cerebro-browser-awaiting"><span className="cerebro-browser-awaiting-icon"><Globe2 size={38}/></span><small>LIVE VIEWER · GOVERNED CONTROL</small><h2>{browserSession?.state==='CONNECTING'?'Arrancando navegador':'Navegador preparado'}</h2><p>{browserSession?.state==='CONNECTING'?'La sesión espera al worker gobernado.':'La consola está preparada para una sesión física real; no se simula navegación ni estado.'}</p><div className="cerebro-browser-awaiting-meta"><span>{stateLabel(browserSession)}</span><span>{browserSession?.session_id?`ID ${readableId(browserSession.session_id)}`:'Sin sesión activa'}</span><span>{humanControl?'Entrada humana habilitada':'Control gobernado por CEREBRO'}</span></div></div>}
   </div>
  </section>

  <section className="cerebro-browser-bottom">   <div className="cerebro-browser-controlbar" style={boundedBarStyle}>
    <span className="cerebro-browser-mode" style={humanControl?{borderColor:'rgba(255,183,66,.34)',color:'#ffd78a',background:'rgba(158,101,19,.1)'}:undefined}><CircleDot size={12}/>{stateLabel(browserSession)}</span>
    <button type="button" className="is-takeover" onClick={takeover} disabled={!canTakeover||browserBusy}><Hand size={15}/> Tomar control</button>
    <button type="button" onClick={handback} disabled={!humanControl||browserBusy}><RotateCcw size={15}/> Devolver a CEREBRO</button>
    <button type="button" className="is-danger" onClick={emergencyStop} disabled={!canStop||browserBusy} title="Detiene inmediatamente la sesión interactiva"><ShieldAlert size={15}/> Parada</button>
   </div>
   {humanRequired&&browserSession?.worker_alive&&!TERMINAL.has(browserSession.state)?<p className="cerebro-browser-notice" role="status">{humanRequired==='ACCOUNT_IDENTITY_UNVERIFIED'?'Cuenta sin autenticar. Toma control para iniciar sesión.':humanRequired}</p>:null}
   {browserError?<p className="cerebro-browser-notice" role="status">{browserError}</p>:null}

  <section className="cerebro-browser-composer" aria-label="Órdenes para CEREBRO" style={{position:'relative',minWidth:0,maxWidth:'100%',overflow:'hidden'}}>
   {visibleCommand?<div role="status" aria-live="polite" data-browser-command-status={visibleCommand.status} style={{margin:'0 0 7px',padding:'8px 10px',border:'1px solid rgba(77,184,255,.16)',borderRadius:9,background:'rgba(4,18,25,.72)',fontSize:8,color:visibleCommand.status==='ERROR'?'#ff9b80':visibleCommand.status==='COMPLETADA'?'#95efc7':'#bcd7e2'}}><strong style={{marginRight:8}}>{visibleCommand.status}</strong><span>{visibleCommand.text}</span>{visibleCommand.error?<span style={{display:'block',marginTop:4}}>{visibleCommand.error}</span>:null}</div>:null}
   <label htmlFor="browser-order">¿Qué quieres que haga?</label>
   <form onSubmit={submit} className="cerebro-browser-form" style={{minWidth:0,maxWidth:'100%'}}>
    <button type="button" className="cerebro-browser-icon" disabled title="Adjuntos permanecen bloqueados hasta contrato de transferencia verificado" aria-label="Adjuntar archivo"><Paperclip size={19}/></button>
    <button type="button" className={`cerebro-browser-action ${dictating?'is-active':''}`} onClick={toggleDictation} disabled={!snapshot.ready||snapshot.sending||snapshot.voiceActive||!voiceRecognitionSupported()}>{dictating?<Square size={16}/>:<Mic size={18}/>}<span>{dictating?'Parar dictado':'Dictar'}</span></button>
    <button type="button" className={`cerebro-browser-action ${snapshot.voiceActive?'is-active':''}`} onClick={toggleVoice} disabled={!snapshot.ready||snapshot.sending||dictating}>{snapshot.voiceActive?<Square size={16}/>:<MessageSquareText size={18}/>}<span>{snapshot.voiceActive?'Finalizar':'Hablar'}</span></button>
    <textarea id="browser-order" ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)} onKeyDown={onComposerKeyDown} disabled={commandBusy} rows={1} placeholder={snapshot.ready?'Escribe, habla o da una orden a CEREBRO…':'Esperando conexión segura con CEREBRO…'} aria-label="Escribe una orden para CEREBRO"/>
    <button type="submit" className="cerebro-browser-send" disabled={commandBusy||!composer.trim()} title="Enviar · Enter" aria-label="Enviar a CEREBRO"><Send size={19}/><span>Enviar</span></button>
   </form>
   {dictationError?<div className="cerebro-browser-dictation-error" role="status">{dictationError}</div>:null}
  </section>
  <details className="cerebro-browser-details"><summary>Detalles técnicos y perfiles</summary>   <nav className="cerebro-browser-view-switch" aria-label="Cambiar vista de CEREBRO"><button type="button" onClick={()=>onViewChange?.('V0')}>VISTA 0</button><button type="button" onClick={()=>onViewChange?.('OPERATIVA')}>OPERATIVA</button><button type="button" disabled title="NEURAL permanece pendiente de colocación">NEURAL</button><button type="button" className="is-active"><Globe2 size={14}/> NAVEGADOR</button></nav><CerebroVoiceSettings/>  <section className="cerebro-browser-sessionbar" aria-label="Estado de Browser 1" style={{minWidth:0,maxWidth:'100%',overflow:'hidden'}}>
   <div className="cerebro-browser-session-context" style={boundedBarStyle}>
    <span style={{minWidth:92,maxWidth:'100%',overflow:'hidden'}}><small>EMPRESA</small>{companies.length>1?<select aria-label="Seleccionar empresa" value={selectedCompany} disabled={hasActiveSession} onChange={event=>changeCompany(event.target.value)} style={selectorStyle}>{companies.map(company=><option key={company.company_id} value={company.company_id}>{company.company_id.toUpperCase()}</option>)}</select>:<strong style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{companyLabel.toUpperCase()}</strong>}</span>
    <span><small>ENTORNO</small><strong>{environmentLabel}</strong></span>
    <span style={{minWidth:112,maxWidth:190,overflow:'hidden'}}><small>SESIÓN</small>{sessionOptions.length>1?<select aria-label="Seleccionar sesión" value={selectedSessionValue} onChange={event=>changeSession(event.target.value)} style={selectorStyle}>{sessionOptions.map(item=><option key={item.session_id} value={item.session_id}>{readableId(item.session_id)} · {item.state}</option>)}</select>:<strong title={browserSession?.session_id||''}>{readableId(browserSession?.session_id,'SIN SESIÓN')}</strong>}</span>
    <span><small>RUNTIME</small><strong>Browser 1 · V3</strong></span>
    <span><small>PESTAÑAS</small><strong>{tabs.length}/8</strong></span>
    <span><small>CONTROL</small><strong>{browserSession?.control_owner||'NONE'}</strong></span>
    <span><small>VIEWPORT</small><strong>{viewport}</strong></span>
    <span><small>HEARTBEAT</small><strong>{freshness}</strong></span>
   </div>

   {canStart?<button type="button" onClick={startBrowser} disabled={browserBusy}>Iniciar sesión de prueba</button>:null}
  </section>
</details>
  </section>
 </main>;
}
