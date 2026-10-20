import {useEffect,useMemo,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {Activity,BrainCircuit,Check,CircleDot,ExternalLink,Info,MessageSquareText,Mic,PanelLeftClose,PanelLeftOpen,Paperclip,Pencil,Plus,Send,Square,X} from 'lucide-react';
import {fetchCerebroActivity,type CerebroActivityRun} from './cerebroActivityApi';
import {CEREBRO_CONVERSATIONS_CHANGED,createCerebroConversation,ensureActiveCerebroConversation,getActiveCerebroConversationId,listCerebroConversations,renameCerebroConversation,selectCerebroConversation,type CerebroStoredConversation} from './cerebroConversationHistory';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported,type CerebroSpeechRecognition} from './cerebroVoice';
import {CerebroVoiceSettings} from './CerebroVoiceSettings';
import './cerebro-operative-console.css';
import './cerebro-conversation-history.css';

type CoreLine={key:string;role:'user'|'cerebro';text:string;observedAt:string};
type CoreSnapshot={ready:boolean;sending:boolean;voiceActive:boolean;voiceListening:boolean;voiceSpeaking:boolean;title:string;detail:string;lines:CoreLine[]};
type ViewName='V0'|'OPERATIVA';
type Props={onViewChange?:(view:ViewName)=>void};

const EMPTY:CoreSnapshot={ready:false,sending:false,voiceActive:false,voiceListening:false,voiceSpeaking:false,title:'Verificando CEREBRO Gateway…',detail:'Esperando evidencia del transporte autenticado.',lines:[]};
const ACTIVE_STATUSES=new Set(['in_progress']);
const QUEUED_STATUSES=new Set(['queued','waiting','requested','pending']);

function hhmm(date=new Date()){
 return new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
}
function parseMs(value:string|null|undefined){
 if(!value)return null;
 const ms=new Date(value).getTime();
 return Number.isFinite(ms)?ms:null;
}
function elapsed(value:string|null|undefined,now:number){
 const started=parseMs(value);
 if(started===null)return '—';
 const total=Math.max(0,Math.floor((now-started)/1000));
 const hours=Math.floor(total/3600),minutes=Math.floor((total%3600)/60),seconds=total%60;
 if(hours>0)return `${hours}h ${minutes}m`;
 if(minutes>0)return `${minutes}m ${seconds}s`;
 return `${seconds}s`;
}
function startClock(value:string|null|undefined){
 const ms=parseMs(value);
 return ms===null?'—':hhmm(new Date(ms));
}
function conversationStamp(value:string){
 const ms=parseMs(value);
 if(ms===null)return 'Sin fecha';
 const date=new Date(ms),today=new Date();
 const sameDay=date.getFullYear()===today.getFullYear()&&date.getMonth()===today.getMonth()&&date.getDate()===today.getDate();
 return sameDay?`Hoy · ${hhmm(date)}`:new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
}
function setReactTextareaValue(textarea:HTMLTextAreaElement,value:string){
 const descriptor=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
 descriptor?.set?.call(textarea,value);
 textarea.dispatchEvent(new Event('input',{bubbles:true}));
 textarea.dispatchEvent(new Event('change',{bubbles:true}));
}
function compactAlias(run:CerebroActivityRun){
 if(run.workflow_alias)return run.workflow_alias;
 if(run.engine_id)return run.engine_id;
 const upper=run.workflow_name.toUpperCase();
 if(upper.includes('OPERATIVA'))return 'OPERATIVA';
 if(upper.includes('PROD LIVE DEPLOY'))return 'DEPLOY';
 if(upper.includes('RUNTIME')&&upper.includes('SMOKE'))return 'SMOKE';
 if(upper.includes('VOICE'))return 'VOICE';
 if(upper.includes('FACTORY'))return 'FACTORY';
 return upper.replace(/\bCEREBRO\b|\bPREPROD\b|\bPROD\b|\bLIVE\b/g,'').replace(/[^A-Z0-9]+/g,' ').trim().slice(0,18)||'WORKFLOW';
}
function processState(run:CerebroActivityRun){
 if(run.status==='completed')return run.conclusion==='success'?{label:'OK',className:'is-ok'}:{label:'INCIDENCIA',className:'is-error'};
 if(ACTIVE_STATUSES.has(run.status))return{label:'EN CURSO',className:'is-running'};
 return{label:'EN COLA',className:'is-queued'};
}
function progressValue(run:CerebroActivityRun){
 if(run.status==='completed')return 100;
 const value=Number(run.progress_percent);
 if(run.progress_percent!==null&&run.progress_percent!==undefined&&Number.isFinite(value))return Math.max(0,Math.min(99,Math.round(value)));
 return null;
}
function estimatedFinish(run:CerebroActivityRun,now:number){
 const progress=progressValue(run),started=parseMs(run.run_started_at||run.created_at);
 if(run.status!=='in_progress'||run.progress_provenance!=='REAL_GITHUB_JOBS'||progress===null||progress<5||started===null)return null;
 const elapsedMs=Math.max(0,now-started),finishAt=started+(elapsedMs/(progress/100));
 if(!Number.isFinite(finishAt)||finishAt<=now)return null;
 return `≈ ${hhmm(new Date(finishAt))}`;
}
function processPurpose(run:CerebroActivityRun){
 const text=`${run.workflow_name} ${run.workflow_path}`.toUpperCase();
 if(text.includes('OPERATIVA'))return 'Valida la interfaz operativa de CEREBRO: contratos, progreso real, ausencia de métricas inventadas y build antes de promover cambios.';
 if(text.includes('SESSION CONTEXT'))return 'Protege la autenticación y el contexto de sesión de CEREBRO para evitar regresiones de identidad, permisos, CORS y acceso al Gateway.';
 if(text.includes('CONTINUOUS HUMAN QA'))return 'Ejecuta controles recurrentes de calidad humana y funcional sobre CEREBRO para detectar degradaciones antes de que lleguen a producción.';
 if(text.includes('GOVERNED MAIN INTEGRATION'))return 'Controla que la integración en main respete los gates y la gobernanza de CEREBRO antes de continuar el ciclo de entrega.';
 if(text.includes('PROD LIVE DEPLOY'))return 'Construye y publica el snapshot validado de la App Fénix en producción mediante el pipeline oficial de despliegue.';
 if(text.includes('RUNTIME')&&text.includes('SMOKE'))return 'Comprueba después del despliegue que el runtime de producción responde y que los contratos críticos siguen operativos.';
 if(text.includes('FACTORY')||text.includes('FABRICA'))return 'Ejecuta la Fábrica de Motores CEREBRO para generar o validar el scaffold estándar de motores bajo los contratos de la plataforma.';
 if(run.engine_id)return `Ejecuta el motor ${run.engine_id}. La finalidad detallada se toma del workflow real y su evidencia enlazada; esta vista no inventa funciones adicionales.`;
 return `Ejecuta el workflow real «${run.workflow_name}». La finalidad exacta disponible aquí procede de su nombre, pasos y evidencia de GitHub Actions.`;
}

function ProcessCard({run,now,onOpen}:{run:CerebroActivityRun;now:number;onOpen:(run:CerebroActivityRun)=>void}){
 const state=processState(run),progress=progressValue(run),started=run.run_started_at||run.created_at;
 const isIndeterminate=ACTIVE_STATUSES.has(run.status)&&progress===null;
 const step=run.current_step?.trim()||'';
 const eta=estimatedFinish(run,now);
 return <article className={`cerebro-process-card ${state.className}`} data-run-id={run.run_id} title={`Abrir detalle de ${run.workflow_name}`} role="button" tabIndex={0} onClick={()=>onOpen(run)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onOpen(run)}}}>
  <div className="cerebro-process-head">
   <div className="cerebro-process-identity"><strong>{compactAlias(run)}</strong><small>{run.environment}</small></div>
   <span className={`cerebro-state-chip ${state.className}`}>{state.label}</span>
  </div>
  <div className="cerebro-live-progress-row">
   <div className={`cerebro-live-progress ${isIndeterminate?'is-indeterminate':''}`} role="progressbar" aria-label={`Progreso de ${compactAlias(run)}`} aria-valuemin={progress===null?undefined:0} aria-valuemax={progress===null?undefined:100} aria-valuenow={progress===null?undefined:progress}>
    {progress!==null?<span style={{width:`${progress}%`}}/>:<span/>}
   </div>
   <b className="cerebro-progress-value">{progress!==null?`${progress}%`:isIndeterminate?'LIVE':'—'}</b>
  </div>
  {step?<div className="cerebro-current-step" title={step}>{step}</div>:<div className="cerebro-current-step is-muted">Sin paso publicado</div>}
  <div className="cerebro-process-meta"><span>{run.status==='queued'?'EN ESPERA':`Inicio ${startClock(started)}`}</span><span>{run.status==='completed'?'FINALIZADO':elapsed(started,now)}</span></div>
  <div className="cerebro-process-foot"><span><Info size={13}/> Toca para saber qué hace</span><span>{eta??'Estimación aún no disponible'}</span></div>
 </article>;
}

export default function CerebroOperativeConsole({onViewChange}:Props){
 const [composer,setComposer]=useState('');
 const [snapshot,setSnapshot]=useState<CoreSnapshot>(EMPTY);
 const [runs,setRuns]=useState<CerebroActivityRun[]>([]);
 const [activitySource,setActivitySource]=useState<'LIVE'|'CACHED'|'UNAVAILABLE'>('UNAVAILABLE');
 const [activityObservedAt,setActivityObservedAt]=useState('');
 const [dictating,setDictating]=useState(false);
 const [dictationError,setDictationError]=useState('');
 const [selectedRun,setSelectedRun]=useState<CerebroActivityRun|null>(null);
 const [historyOpen,setHistoryOpen]=useState(false);
 const [conversations,setConversations]=useState<CerebroStoredConversation[]>(()=>listCerebroConversations());
 const [activeConversationId,setActiveConversationId]=useState(()=>getActiveCerebroConversationId()||ensureActiveCerebroConversation().id);
 const [editingConversationId,setEditingConversationId]=useState('');
 const [editingTitle,setEditingTitle]=useState('');
 const [now,setNow]=useState(()=>Date.now());
 const observedAtRef=useRef(new Map<string,string>()),composerRef=useRef<HTMLTextAreaElement|null>(null),dictationRef=useRef<CerebroSpeechRecognition|null>(null);

 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
 useEffect(()=>{
  const refresh=()=>{
   const active=ensureActiveCerebroConversation();
   setActiveConversationId(getActiveCerebroConversationId()||active.id);
   setConversations(listCerebroConversations());
  };
  refresh();
  window.addEventListener(CEREBRO_CONVERSATIONS_CHANGED,refresh);
  window.addEventListener('storage',refresh);
  return()=>{window.removeEventListener(CEREBRO_CONVERSATIONS_CHANGED,refresh);window.removeEventListener('storage',refresh)};
 },[]);
 useEffect(()=>{
  let cancelled=false,timer=0;
  const refresh=async()=>{
   const {status,data}=await fetchCerebroActivity();
   if(cancelled)return;
   if(status===200&&data?.status==='OK'){setRuns(data.runs||[]);setActivitySource(data.source_status);setActivityObservedAt(data.observed_at)}
   else setActivitySource('UNAVAILABLE');
  };
  void refresh();
  timer=window.setInterval(()=>{void refresh()},30_000);
  return()=>{cancelled=true;window.clearInterval(timer)};
 },[]);
 useEffect(()=>{
  let raf=0;
  const inspect=()=>{
   cancelAnimationFrame(raf);
   raf=requestAnimationFrame(()=>{
    const root=document.querySelector<HTMLElement>('.cerebro-host-v0 .cerebro-console');
    if(!root){setSnapshot(EMPTY);return}
    const title=root.querySelector<HTMLElement>('.cerebro-panel h2')?.textContent?.trim()||'CEREBRO';
    const detail=root.querySelector<HTMLElement>('.cerebro-panel > p')?.textContent?.trim()||'';
    const ready=title.includes('Transporte autenticado verificado');
    const sendButton=root.querySelector<HTMLButtonElement>('.cerebro-chat-form button[type="submit"]');
    const voiceButton=root.querySelector<HTMLButtonElement>('.cerebro-voice-main');
    const voiceStatus=root.querySelector<HTMLElement>('.cerebro-voice-status')?.textContent?.trim().toLowerCase()||'';
    const sending=Boolean(sendButton?.textContent?.includes('Enviando')||voiceStatus.includes('procesando'));
    const voiceActive=voiceButton?.getAttribute('aria-pressed')==='true',voiceListening=voiceStatus.includes('escuchando'),voiceSpeaking=voiceStatus.includes('hablando');
    const lineNodes=Array.from(root.querySelectorAll<HTMLElement>('.cerebro-chat-line'));
    const visibleNodes=lineNodes.slice(-80),offset=Math.max(0,lineNodes.length-visibleNodes.length);
    const lines:CoreLine[]=visibleNodes.map((node,index)=>{
     const role=node.classList.contains('cerebro-chat-user')?'user':'cerebro',strong=node.querySelector('strong'),clone=node.cloneNode(true) as HTMLElement;
     clone.querySelector('strong')?.remove();clone.querySelector('.cerebro-media-link')?.remove();
     const text=(clone.textContent||node.textContent||'').replace(strong?.textContent||'','').trim(),key=`${offset+index}:${role}:${text}`;
     if(!observedAtRef.current.has(key))observedAtRef.current.set(key,hhmm());
     return{key,role,text,observedAt:observedAtRef.current.get(key)||hhmm()};
    });
    setSnapshot({ready,sending,voiceActive,voiceListening,voiceSpeaking,title,detail,lines});
   });
  };
  inspect();
  const observer=new MutationObserver(inspect);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-pressed','class','data-conversation-id']});
  const interval=window.setInterval(inspect,1200);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();window.clearInterval(interval)};
 },[]);
 useEffect(()=>{if(!selectedRun)return;const close=(event:globalThis.KeyboardEvent)=>{if(event.key==='Escape')setSelectedRun(null)};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[selectedRun]);
 useEffect(()=>()=>{const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.abort()}catch{/* already stopped */}}},[]);

 const activeRuns=useMemo(()=>runs.filter(run=>ACTIVE_STATUSES.has(run.status)),[runs]);
 const queuedRuns=useMemo(()=>runs.filter(run=>QUEUED_STATUSES.has(run.status)),[runs]);
 const recentRuns=useMemo(()=>runs.filter(run=>run.status==='completed').slice(0,8),[runs]);
 const visibleRuns=useMemo(()=>[...activeRuns,...queuedRuns,...recentRuns],[activeRuns,queuedRuns,recentRuns]);
 const statusLabel=activeRuns.length||snapshot.sending?'Trabajando':snapshot.ready?'Listo':'Sin conexión';

 function submit(event?:FormEvent){
  event?.preventDefault();
  const clean=composer.trim();if(!clean||!snapshot.ready||snapshot.sending)return;
  const core=document.querySelector<HTMLElement>('.cerebro-host-v0 .cerebro-console'),textarea=core?.querySelector<HTMLTextAreaElement>('.cerebro-chat-form textarea'),form=core?.querySelector<HTMLFormElement>('.cerebro-chat-form');
  if(!textarea||!form)return;setReactTextareaValue(textarea,clean);window.setTimeout(()=>form.requestSubmit(),0);setComposer('');
 }
 function toggleVoice(){if(dictating)return;const button=document.querySelector<HTMLButtonElement>('.cerebro-host-v0 .cerebro-voice-main');if(button&&!button.disabled)button.click()}
 function stopDictation(){const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.stop()}catch{/* already stopped */}}setDictating(false)}
 function toggleDictation(){
  if(dictating){stopDictation();return}
  if(!snapshot.ready||snapshot.voiceActive||!voiceRecognitionSupported())return;
  const recognition=createVoiceRecognition();if(!recognition){setDictationError('Dictado no disponible en este navegador.');return}
  dictationRef.current=recognition;recognition.lang='es-ES';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=3;applyVoiceContextHints(recognition);
  recognition.onstart=()=>{setDictating(true);setDictationError('')};
  recognition.onresult=event=>{const result=event.results[event.results.length-1],transcript=String(result?.[0]?.transcript||'').trim();if(transcript){setComposer(current=>`${current}${current.trim()?' ':''}${transcript}`);window.setTimeout(()=>composerRef.current?.focus(),0)}};
  recognition.onerror=()=>setDictationError('No se pudo completar el dictado.');recognition.onend=()=>{dictationRef.current=null;setDictating(false)};
  try{recognition.start()}catch{dictationRef.current=null;setDictating(false);setDictationError('No se pudo iniciar el dictado.')}
 }
 function onComposerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit()}}
 function openConversation(id:string){
  const selected=selectCerebroConversation(id);
  if(selected){setActiveConversationId(selected.id);setEditingConversationId('');setEditingTitle('')}
 }
 function newConversation(){
  const created=createCerebroConversation();
  setActiveConversationId(created.id);setEditingConversationId('');setEditingTitle('');
 }
 function beginRename(conversation:CerebroStoredConversation){setEditingConversationId(conversation.id);setEditingTitle(conversation.title)}
 function saveRename(event?:FormEvent){
  event?.preventDefault();
  if(!editingConversationId)return;
  const renamed=renameCerebroConversation(editingConversationId,editingTitle);
  if(renamed){setEditingConversationId('');setEditingTitle('')}
 }

 return <main className="cerebro-operative cerebro-operative-compact cerebro-hud-glass" aria-label="CEREBRO · Vista operativa">
  <header className="cerebro-operative-header">
   <div className="cerebro-operative-brand"><span className="cerebro-operative-logo"><BrainCircuit size={27}/></span><div><h1>CEREBRO</h1><p>Fénix Capital</p></div></div>
   <div className={`cerebro-work-state ${activeRuns.length||snapshot.sending?'is-working':snapshot.ready?'is-ready':'is-offline'}`}><CircleDot size={14}/><strong>{statusLabel}</strong><small>{activeRuns.length} activos</small></div>
   <div className="cerebro-head-actions">
    <nav className="cerebro-inline-view-switch" aria-label="Cambiar vista de CEREBRO"><button type="button" onClick={()=>onViewChange?.('V0')}>VISTA 0</button><button type="button" className="is-active">OPERATIVA</button><button type="button" disabled title="NEURAL se recuperará desde los artefactos existentes">NEURAL</button></nav>
    <CerebroVoiceSettings/>
   </div>
  </header>

  <section className="cerebro-process-zone" aria-labelledby="cerebro-process-title">
   <div className="cerebro-process-zone-head"><div className="cerebro-section-title compact"><Activity size={19}/><div><h2 id="cerebro-process-title">Actividad</h2><small className={`cerebro-source-inline is-${activitySource.toLowerCase()}`}>{activitySource==='LIVE'?'LIVE':activitySource==='CACHED'?'CACHÉ':'SIN FUENTE'}{activityObservedAt?` · ${startClock(activityObservedAt)}`:''}</small></div></div><div className="cerebro-process-counts"><span><b>{activeRuns.length}</b> curso</span><span><b>{queuedRuns.length}</b> cola</span><span><b>{recentRuns.length}</b> recientes</span></div></div>
   <div className="cerebro-process-strip" aria-live="polite" aria-label="Procesos de CEREBRO; desplazamiento horizontal">
    {visibleRuns.length===0?<div className="cerebro-empty-process"><CircleDot size={18}/><strong>{activitySource==='UNAVAILABLE'?'Sin actividad verificable':'Sin procesos que mostrar'}</strong></div>:visibleRuns.map(run=><ProcessCard key={run.run_id} run={run} now={now} onOpen={setSelectedRun}/>)}
   </div>
  </section>

  <section className={`cerebro-conversation-stage ${historyOpen?'is-history-open':''}`} aria-label="Conversación con CEREBRO">
   <button type="button" className="cerebro-history-rail-toggle" onClick={()=>setHistoryOpen(current=>!current)} aria-label={historyOpen?'Cerrar conversaciones':'Abrir conversaciones'} title={historyOpen?'Cerrar conversaciones':'Conversaciones'}>{historyOpen?<PanelLeftClose size={16}/>:<PanelLeftOpen size={16}/>}</button>
   <aside className="cerebro-history-drawer" aria-label="Conversaciones" aria-hidden={!historyOpen}>
    <div className="cerebro-history-head"><div><strong>Conversaciones</strong><small>{conversations.length} guardadas en este dispositivo</small></div><button type="button" className="cerebro-history-new" onClick={newConversation} aria-label="Nueva conversación" title="Nueva conversación"><Plus size={16}/></button><button type="button" className="cerebro-history-close" onClick={()=>setHistoryOpen(false)} aria-label="Cerrar historial"><X size={15}/></button></div>
    <div className="cerebro-history-list">
     {conversations.length===0?<div className="cerebro-history-empty">Todavía no hay conversaciones guardadas.</div>:conversations.map(conversation=><div key={conversation.id} className={`cerebro-history-row ${conversation.id===activeConversationId?'is-active':''}`}>
      {editingConversationId===conversation.id?<form className="cerebro-history-rename" onSubmit={saveRename}><input autoFocus value={editingTitle} onChange={event=>setEditingTitle(event.target.value)} onKeyDown={event=>{if(event.key==='Escape'){setEditingConversationId('');setEditingTitle('')}}} maxLength={72} aria-label="Nombre de la conversación"/><button type="submit" className="cerebro-history-save" aria-label="Guardar nombre"><Check size={14}/></button></form>:<><button type="button" className="cerebro-history-select" onClick={()=>openConversation(conversation.id)} aria-current={conversation.id===activeConversationId?'page':undefined}><strong>{conversation.title}</strong><small>{conversationStamp(conversation.updated_at)}</small></button><button type="button" className="cerebro-history-edit" onClick={()=>beginRename(conversation)} aria-label={`Cambiar nombre de ${conversation.title}`} title="Cambiar nombre"><Pencil size={12}/></button></>}
     </div>)}
    </div>
   </aside>
   <div className="cerebro-chat-zone"><div className="cerebro-chat-stream">
    {snapshot.lines.length===0?<div className="cerebro-chat-empty">{snapshot.ready?'Da una orden a CEREBRO.':'Esperando conexión segura con CEREBRO…'}</div>:snapshot.lines.map(line=><div key={line.key} className={`cerebro-chat-bubble is-${line.role}`}><small>{line.role==='user'?'TÚ':'CEREBRO'} · {line.observedAt}</small><p>{line.text}</p></div>)}
    {snapshot.sending?<div className="cerebro-chat-working"><span/><span/><span/> CEREBRO trabajando…</div>:null}
   </div></div>
  </section>

  <section className="cerebro-composer-shell" aria-label="Compositor de órdenes"><form onSubmit={submit} className="cerebro-operative-form"><div className="cerebro-composer-main">
   <button type="button" className="cerebro-icon-button" disabled title="Adjuntar archivo · pendiente de contrato real" aria-label="Adjuntar archivo"><Paperclip size={20}/></button>
   <button type="button" className={`cerebro-icon-button ${dictating?'is-active':''}`} onClick={toggleDictation} disabled={!snapshot.ready||snapshot.sending||snapshot.voiceActive||!voiceRecognitionSupported()} title={dictating?'Detener dictado':'Dictar'} aria-label={dictating?'Detener dictado':'Dictar'}>{dictating?<Square size={18}/>:<Mic size={20}/>}</button>
   <button type="button" className={`cerebro-talk-button ${snapshot.voiceActive?'is-active':''}`} onClick={toggleVoice} disabled={!snapshot.ready||snapshot.sending||dictating} title={snapshot.voiceActive?'Finalizar conversación por voz':'Hablar con CEREBRO'} aria-label={snapshot.voiceActive?'Finalizar conversación por voz':'Hablar con CEREBRO'}>{snapshot.voiceActive?<Square size={16}/>:<MessageSquareText size={18}/>}<span>{snapshot.voiceActive?'Finalizar':'Hablar'}</span></button>
   <textarea ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)} onKeyDown={onComposerKeyDown} disabled={!snapshot.ready||snapshot.sending} rows={1} placeholder={snapshot.ready?'Escribe, habla o da una orden a CEREBRO…':'Esperando conexión segura con CEREBRO…'} aria-label="Escribe una orden para CEREBRO"/>
   <button type="submit" className="cerebro-send-button" disabled={!snapshot.ready||snapshot.sending||!composer.trim()} title="Enviar · Enter" aria-label="Enviar a CEREBRO"><Send size={20}/></button>
  </div>{dictationError?<div className="cerebro-dictation-error" role="status">{dictationError}</div>:null}</form></section>

  {selectedRun?<div className="cerebro-process-inspector-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setSelectedRun(null)}}><aside className="cerebro-process-inspector" role="dialog" aria-modal="true" aria-label={`Detalle de ${compactAlias(selectedRun)}`}>
   <div className="cerebro-inspector-head"><div><small>PROCESO REAL</small><h3>{compactAlias(selectedRun)}</h3><p>{selectedRun.workflow_name}</p></div><button type="button" onClick={()=>setSelectedRun(null)} aria-label="Cerrar detalle"><X size={19}/></button></div>
   <div className="cerebro-inspector-purpose"><span>¿Para qué sirve?</span><p>{processPurpose(selectedRun)}</p></div>
   <div className="cerebro-inspector-grid"><div><small>Estado</small><strong>{processState(selectedRun).label}</strong></div><div><small>Entorno</small><strong>{selectedRun.environment}</strong></div><div><small>Inicio</small><strong>{startClock(selectedRun.run_started_at||selectedRun.created_at)}</strong></div><div><small>Tiempo</small><strong>{selectedRun.status==='completed'?'Finalizado':elapsed(selectedRun.run_started_at||selectedRun.created_at,now)}</strong></div></div>
   <div className="cerebro-inspector-flow"><div><small>Ahora</small><strong>{selectedRun.current_step||'Sin paso publicado'}</strong></div><div><small>Siguiente</small><strong>{selectedRun.next_step||'Sin siguiente paso publicado'}</strong></div><div><small>Fin estimado</small><strong>{estimatedFinish(selectedRun,now)??'Estimación aún no disponible'}</strong></div></div>
   <div className="cerebro-inspector-foot"><span>{selectedRun.progress_provenance==='REAL_GITHUB_JOBS'?'REAL · pasos GitHub Actions':'REAL · ejecución GitHub Actions'}</span>{selectedRun.html_url?<a href={selectedRun.html_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Ver evidencia</a>:null}</div>
  </aside></div>:null}
 </main>;
}
