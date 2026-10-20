import {useEffect,useMemo,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {Activity,BrainCircuit,CircleDot,ExternalLink,MessageSquareText,Mic,Paperclip,Send,Square,X} from 'lucide-react';
import {fetchCerebroActivity,type CerebroActivityRun} from './cerebroActivityApi';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported,type CerebroSpeechRecognition} from './cerebroVoice';
import {CerebroVoiceSettings} from './CerebroVoiceSettings';
import './cerebro-operative-console.css';

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
function formatDurationMs(value:number){
 const total=Math.max(0,Math.floor(value/1000));
 const hours=Math.floor(total/3600),minutes=Math.floor((total%3600)/60),seconds=total%60;
 if(hours>0)return `${hours}h ${minutes}m`;
 if(minutes>0)return `${minutes}m ${seconds}s`;
 return `${seconds}s`;
}
function elapsed(value:string|null|undefined,now:number){
 const started=parseMs(value);
 return started===null?'—':formatDurationMs(now-started);
}
function startClock(value:string|null|undefined){
 const ms=parseMs(value);
 return ms===null?'—':hhmm(new Date(ms));
}
function processStartedAt(run:CerebroActivityRun){
 return run.run_started_at||run.created_at;
}
function observedFinish(run:CerebroActivityRun){
 return run.status==='completed'?run.updated_at:null;
}
function processDuration(run:CerebroActivityRun,now:number){
 if(QUEUED_STATUSES.has(run.status))return '—';
 const started=parseMs(processStartedAt(run));
 if(started===null)return '—';
 const ended=run.status==='completed'?parseMs(observedFinish(run)):now;
 return ended===null?'—':formatDurationMs(Math.max(0,ended-started));
}
function processKind(run:CerebroActivityRun){
 const text=`${run.workflow_name} ${run.workflow_path}`.toUpperCase();
 if(text.includes('FACTORY')||text.includes('FABRICA'))return 'FÁBRICA';
 if(text.includes('EVALUATION')||text.includes('EVA-')||text.includes('JUDGE')||text.includes('TRIBUNAL'))return 'EVALUACIÓN';
 if(text.includes('DEPLOY'))return 'DESPLIEGUE';
 if(text.includes('SMOKE')||text.includes(' QA')||text.includes('TEST'))return 'VERIFICACIÓN';
 if(text.includes('SESSION CONTEXT')||text.includes('GATE'))return 'GATE';
 if(run.engine_id)return 'MOTOR';
 return 'WORKFLOW';
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
 const progress=progressValue(run),started=parseMs(processStartedAt(run));
 if(run.status!=='in_progress'||run.progress_provenance!=='REAL_GITHUB_JOBS'||progress===null||progress<5||started===null)return null;
 const elapsedMs=Math.max(0,now-started),finishAt=started+(elapsedMs/(progress/100));
 if(!Number.isFinite(finishAt)||finishAt<=now)return null;
 return `≈ ${hhmm(new Date(finishAt))}`;
}
function finishDisplay(run:CerebroActivityRun,now:number){
 if(run.status==='completed')return startClock(observedFinish(run));
 return estimatedFinish(run,now)??'—';
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

function ProcessRow({run,now,onOpen}:{run:CerebroActivityRun;now:number;onOpen:(run:CerebroActivityRun)=>void}){
 const state=processState(run),progress=progressValue(run),started=processStartedAt(run);
 const indeterminate=ACTIVE_STATUSES.has(run.status)&&progress===null;
 const endTitle=run.status==='completed'?'Fin observado: hora de updated_at publicada por GitHub Actions.':'ETA solo cuando existe progreso real por pasos.';
 return <button type="button" className={`cerebro-process-row ${state.className}`} data-run-id={run.run_id} onClick={()=>onOpen(run)} title={`Abrir HUD de ${run.workflow_name}`}>
  <span className="cerebro-process-primary"><b>{compactAlias(run)}</b><small title={run.workflow_name}>{run.workflow_name}</small></span>
  <span className="cerebro-process-kind">{processKind(run)}</span>
  <span className="cerebro-process-engine">{run.engine_id??'—'}</span>
  <span><i className={`cerebro-state-dot ${state.className}`}/><strong className={`cerebro-state-text ${state.className}`}>{state.label}</strong></span>
  <span className="cerebro-time-cell"><small>INICIO</small><b>{startClock(started)}</b></span>
  <span className="cerebro-time-cell" title={endTitle}><small>{run.status==='completed'?'FIN OBS.':'FIN / ETA'}</small><b>{finishDisplay(run,now)}</b></span>
  <span className="cerebro-time-cell"><small>DURACIÓN</small><b>{processDuration(run,now)}</b></span>
  <span className="cerebro-row-progress"><span className={`cerebro-live-progress ${indeterminate?'is-indeterminate':''}`} role="progressbar" aria-label={`Progreso de ${compactAlias(run)}`} aria-valuemin={progress===null?undefined:0} aria-valuemax={progress===null?undefined:100} aria-valuenow={progress===null?undefined:progress}>{progress!==null?<i style={{width:`${progress}%`}}/>:<i/>}</span><b>{progress!==null?`${progress}%`:indeterminate?'LIVE':'—'}</b></span>
 </button>;
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
 const [now,setNow]=useState(()=>Date.now());
 const observedAtRef=useRef(new Map<string,string>()),composerRef=useRef<HTMLTextAreaElement|null>(null),dictationRef=useRef<CerebroSpeechRecognition|null>(null);

 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
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
    const lines:CoreLine[]=lineNodes.slice(-10).map((node,index)=>{
     const role=node.classList.contains('cerebro-chat-user')?'user':'cerebro',strong=node.querySelector('strong'),clone=node.cloneNode(true) as HTMLElement;
     clone.querySelector('strong')?.remove();clone.querySelector('.cerebro-media-link')?.remove();
     const text=(clone.textContent||node.textContent||'').replace(strong?.textContent||'','').trim(),key=`${lineNodes.length-10+index}:${role}:${text}`;
     if(!observedAtRef.current.has(key))observedAtRef.current.set(key,hhmm());
     return{key,role,text,observedAt:observedAtRef.current.get(key)||hhmm()};
    });
    setSnapshot({ready,sending,voiceActive,voiceListening,voiceSpeaking,title,detail,lines});
   });
  };
  inspect();
  const observer=new MutationObserver(inspect);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-pressed','class']});
  const interval=window.setInterval(inspect,1200);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();window.clearInterval(interval)};
 },[]);
 useEffect(()=>{if(!selectedRun)return;const close=(event:globalThis.KeyboardEvent)=>{if(event.key==='Escape')setSelectedRun(null)};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[selectedRun]);
 useEffect(()=>()=>{const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.abort()}catch{/* already stopped */}}},[]);

 const activeRuns=useMemo(()=>runs.filter(run=>ACTIVE_STATUSES.has(run.status)),[runs]);
 const queuedRuns=useMemo(()=>runs.filter(run=>QUEUED_STATUSES.has(run.status)),[runs]);
 const recentRuns=useMemo(()=>runs.filter(run=>run.status==='completed').slice(0,8),[runs]);
 const visibleRuns=useMemo(()=>[...activeRuns,...queuedRuns,...recentRuns],[activeRuns,queuedRuns,recentRuns]);
 const incidentRuns=useMemo(()=>runs.filter(run=>run.status==='completed'&&run.conclusion!=='success'),[runs]);
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

 return <main className="cerebro-operative cerebro-operative-compact cerebro-hud-glass cerebro-technical-v3" aria-label="CEREBRO · Vista técnica">
  <header className="cerebro-operative-header">
   <div className="cerebro-operative-brand"><span className="cerebro-operative-logo"><BrainCircuit size={27}/></span><div><h1>CEREBRO</h1><p>Control técnico · Fénix Capital</p></div></div>
   <div className={`cerebro-work-state ${activeRuns.length||snapshot.sending?'is-working':snapshot.ready?'is-ready':'is-offline'}`}><CircleDot size={14}/><strong>{statusLabel}</strong><small>{activeRuns.length} activos</small></div>
   <div className="cerebro-head-actions">
    <nav className="cerebro-inline-view-switch" aria-label="Cambiar interfaz de CEREBRO"><button type="button" onClick={()=>onViewChange?.('V0')}>HABLAR</button><button type="button" className="is-active">TÉCNICA</button><button type="button" disabled title="NEURAL se recuperará desde los artefactos existentes">NEURAL</button></nav>
    <CerebroVoiceSettings/>
   </div>
  </header>

  <section className="cerebro-process-zone cerebro-control-plane" aria-labelledby="cerebro-process-title">
   <div className="cerebro-process-zone-head">
    <div className="cerebro-section-title compact"><Activity size={19}/><div><h2 id="cerebro-process-title">PROCESOS AHORA</h2><small className={`cerebro-source-inline is-${activitySource.toLowerCase()}`}>{activitySource==='LIVE'?'FUENTE REAL · LIVE':activitySource==='CACHED'?'FUENTE REAL · CACHÉ':'SIN FUENTE VERIFICABLE'}{activityObservedAt?` · ${startClock(activityObservedAt)}`:''}</small></div></div>
    <div className="cerebro-process-counts"><span><b>{activeRuns.length}</b> ejecutando</span><span><b>{queuedRuns.length}</b> en cola</span><span className={incidentRuns.length?'has-incidents':''}><b>{incidentRuns.length}</b> incidencias</span></div>
   </div>
   <div className="cerebro-process-table" aria-live="polite" aria-label="Control de procesos reales de CEREBRO">
    <div className="cerebro-process-table-head" aria-hidden="true"><span>PROCESO</span><span>TIPO</span><span>MOTOR</span><span>ESTADO</span><span>INICIO</span><span>FIN / ETA</span><span>DURACIÓN</span><span>PROGRESO</span></div>
    <div className="cerebro-process-table-body">
     {visibleRuns.length===0?<div className="cerebro-empty-process"><CircleDot size={18}/><strong>{activitySource==='UNAVAILABLE'?'Sin actividad verificable':'Sin procesos que mostrar'}</strong></div>:visibleRuns.map(run=><ProcessRow key={run.run_id} run={run} now={now} onOpen={setSelectedRun}/>)}
    </div>
   </div>
   <div className="cerebro-process-truth"><span>FIN OBS. = última actualización terminal publicada por GitHub Actions</span><span>ETA solo aparece con progreso real por pasos</span><span>Sin dato = —</span></div>
  </section>

  <section className="cerebro-chat-zone" aria-label="Conversación con CEREBRO"><div className="cerebro-chat-stream">
   {snapshot.lines.length===0?<div className="cerebro-chat-empty">{snapshot.ready?'Puedes dar una orden sin salir de la vista técnica.':'Esperando conexión segura con CEREBRO…'}</div>:snapshot.lines.map(line=><div key={line.key} className={`cerebro-chat-bubble is-${line.role}`}><small>{line.role==='user'?'TÚ':'CEREBRO'} · {line.observedAt}</small><p>{line.text}</p></div>)}
   {snapshot.sending?<div className="cerebro-chat-working"><span/><span/><span/> CEREBRO trabajando…</div>:null}
  </div></section>

  <section className="cerebro-composer-shell" aria-label="Compositor de órdenes"><form onSubmit={submit} className="cerebro-operative-form"><div className="cerebro-composer-main">
   <button type="button" className="cerebro-icon-button" disabled title="Adjuntar archivo · pendiente de contrato real" aria-label="Adjuntar archivo"><Paperclip size={20}/></button>
   <button type="button" className={`cerebro-icon-button ${dictating?'is-active':''}`} onClick={toggleDictation} disabled={!snapshot.ready||snapshot.sending||snapshot.voiceActive||!voiceRecognitionSupported()} title={dictating?'Detener dictado':'Dictar'} aria-label={dictating?'Detener dictado':'Dictar'}>{dictating?<Square size={18}/>:<Mic size={20}/>}</button>
   <button type="button" className={`cerebro-talk-button ${snapshot.voiceActive?'is-active':''}`} onClick={toggleVoice} disabled={!snapshot.ready||snapshot.sending||dictating} title={snapshot.voiceActive?'Finalizar conversación por voz':'Hablar con CEREBRO'} aria-label={snapshot.voiceActive?'Finalizar conversación por voz':'Hablar con CEREBRO'}>{snapshot.voiceActive?<Square size={16}/>:<MessageSquareText size={18}/>}<span>{snapshot.voiceActive?'Finalizar':'Hablar'}</span></button>
   <textarea ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)} onKeyDown={onComposerKeyDown} disabled={!snapshot.ready||snapshot.sending} rows={1} placeholder={snapshot.ready?'Pide cualquier cosa a CEREBRO…':'Esperando conexión segura con CEREBRO…'} aria-label="Escribe una orden para CEREBRO"/>
   <button type="submit" className="cerebro-send-button" disabled={!snapshot.ready||snapshot.sending||!composer.trim()} title="Enviar · Enter" aria-label="Enviar a CEREBRO"><Send size={20}/></button>
  </div>{dictationError?<div className="cerebro-dictation-error" role="status">{dictationError}</div>:null}</form></section>

  {selectedRun?<div className="cerebro-process-inspector-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setSelectedRun(null)}}><aside className="cerebro-process-inspector" role="dialog" aria-modal="true" aria-label={`Detalle de ${compactAlias(selectedRun)}`}>
   <div className="cerebro-inspector-head"><div><small>HUD · PROCESO REAL</small><h3>{compactAlias(selectedRun)}</h3><p>{selectedRun.workflow_name}</p></div><button type="button" onClick={()=>setSelectedRun(null)} aria-label="Cerrar detalle"><X size={19}/></button></div>
   <div className="cerebro-inspector-purpose"><span>FUNCIÓN</span><p>{processPurpose(selectedRun)}</p></div>
   <div className="cerebro-inspector-grid cerebro-inspector-grid-v3"><div><small>Tipo</small><strong>{processKind(selectedRun)}</strong></div><div><small>Motor</small><strong>{selectedRun.engine_id??'—'}</strong></div><div><small>Estado</small><strong>{processState(selectedRun).label}</strong></div><div><small>Entorno</small><strong>{selectedRun.environment}</strong></div><div><small>Inicio</small><strong>{startClock(processStartedAt(selectedRun))}</strong></div><div title="Para procesos completados, el fin observado usa updated_at de GitHub Actions."><small>Fin observado / ETA</small><strong>{finishDisplay(selectedRun,now)}</strong></div><div><small>Duración</small><strong>{processDuration(selectedRun,now)}</strong></div><div><small>Versión</small><strong>{selectedRun.version||'—'}</strong></div></div>
   <div className="cerebro-inspector-flow"><div><small>Ahora</small><strong>{selectedRun.current_step||'Sin paso publicado'}</strong></div><div><small>Siguiente</small><strong>{selectedRun.next_step||'Sin siguiente paso publicado'}</strong></div><div><small>Progreso</small><strong>{progressValue(selectedRun)!==null?`${progressValue(selectedRun)}%`:(ACTIVE_STATUSES.has(selectedRun.status)?'LIVE · sin porcentaje verificable':'—')}</strong></div></div>
   <div className="cerebro-inspector-foot"><span>{selectedRun.progress_provenance==='REAL_GITHUB_JOBS'?'REAL · pasos GitHub Actions':'REAL · ejecución GitHub Actions'}</span>{selectedRun.html_url?<a href={selectedRun.html_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Ver evidencia</a>:null}</div>
  </aside></div>:null}
 </main>;
}