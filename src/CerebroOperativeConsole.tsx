import {useEffect,useMemo,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {Activity,BrainCircuit,CheckCircle2,CircleDot,ExternalLink,ListTodo,MessageSquareText,Mic,Paperclip,RefreshCw,Send,ShieldCheck,Square} from 'lucide-react';
import {fetchCerebroActivity,type CerebroActivityRun} from './cerebroActivityApi';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported,type CerebroSpeechRecognition} from './cerebroVoice';
import './cerebro-operative-console.css';

type CoreLine={key:string;role:'user'|'cerebro';text:string;observedAt:string};
type CoreSnapshot={ready:boolean;sending:boolean;voiceActive:boolean;voiceListening:boolean;voiceSpeaking:boolean;title:string;detail:string;lines:CoreLine[]};

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
 const hours=Math.floor(total/3600);
 const minutes=Math.floor((total%3600)/60);
 const seconds=total%60;
 if(hours>0)return `${hours}h ${minutes}m`;
 if(minutes>0)return `${minutes}m ${seconds}s`;
 return `${seconds}s`;
}

function startClock(value:string|null|undefined){
 const ms=parseMs(value);
 return ms===null?'—':hhmm(new Date(ms));
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
 if(run.status==='completed'){
  if(run.conclusion==='success')return{label:'OK',className:'is-ok'};
  return{label:'INCIDENCIA',className:'is-error'};
 }
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
 const progress=progressValue(run);
 const started=parseMs(run.run_started_at||run.created_at);
 if(run.status!=='in_progress'||run.progress_provenance!=='REAL_GITHUB_JOBS'||progress===null||progress<5||started===null)return '—';
 const elapsedMs=Math.max(0,now-started);
 const totalEstimate=elapsedMs/(progress/100);
 const finishAt=started+totalEstimate;
 if(!Number.isFinite(finishAt)||finishAt<=now)return '—';
 return `≈ ${hhmm(new Date(finishAt))}`;
}

function ProcessCard({run,now}:{run:CerebroActivityRun;now:number}){
 const state=processState(run);
 const progress=progressValue(run);
 const started=run.run_started_at||run.created_at;
 const isIndeterminate=ACTIVE_STATUSES.has(run.status)&&progress===null;
 const step=run.current_step?.trim()||'';
 const eta=estimatedFinish(run,now);
 return <article className={`cerebro-process-card ${state.className}`} data-run-id={run.run_id} title={run.workflow_name}>
  <div className="cerebro-process-head">
   <div className="cerebro-process-identity"><strong>{compactAlias(run)}</strong><small>{run.environment}</small></div>
   <span className={`cerebro-state-chip ${state.className}`}>{state.label}</span>
  </div>

  <div className="cerebro-live-progress-row">
   <div
    className={`cerebro-live-progress ${isIndeterminate?'is-indeterminate':''}`}
    role="progressbar"
    aria-label={`Progreso de ${compactAlias(run)}`}
    aria-valuemin={progress===null?undefined:0}
    aria-valuemax={progress===null?undefined:100}
    aria-valuenow={progress===null?undefined:progress}
   >
    {progress!==null?<span style={{width:`${progress}%`}}/>:<span/>}
   </div>
   <b className="cerebro-progress-value">{progress!==null?`${progress}%`:isIndeterminate?'LIVE':'—'}</b>
  </div>

  {step?<div className="cerebro-current-step" title={step}>{step}</div>:null}

  <div className="cerebro-process-times">
   <span><small>Inicio</small><b>{run.status==='queued'?'—':startClock(started)}</b></span>
   <span><small>Tiempo</small><b>{run.status==='completed'?'FIN':elapsed(started,now)}</b></span>
   <span title={eta==='—'?'Sin estimación fiable':`DERIVED · pasos reales de GitHub Actions`}><small>Fin est.</small><b>{eta}</b></span>
  </div>

  <div className="cerebro-process-foot">
   <span>{run.progress_provenance==='REAL_GITHUB_JOBS'?'REAL · STEPS':'REAL · RUN'}</span>
   {run.html_url?<a href={run.html_url} target="_blank" rel="noreferrer" aria-label={`Ver evidencia de ${compactAlias(run)}`}><ExternalLink size={15}/></a>:null}
  </div>
 </article>;
}

export default function CerebroOperativeConsole(){
 const [composer,setComposer]=useState('');
 const [snapshot,setSnapshot]=useState<CoreSnapshot>(EMPTY);
 const [runs,setRuns]=useState<CerebroActivityRun[]>([]);
 const [activitySource,setActivitySource]=useState<'LIVE'|'CACHED'|'UNAVAILABLE'>('UNAVAILABLE');
 const [activityObservedAt,setActivityObservedAt]=useState('');
 const [dictating,setDictating]=useState(false);
 const [dictationError,setDictationError]=useState('');
 const [now,setNow]=useState(()=>Date.now());
 const observedAtRef=useRef(new Map<string,string>());
 const composerRef=useRef<HTMLTextAreaElement|null>(null);
 const dictationRef=useRef<CerebroSpeechRecognition|null>(null);

 useEffect(()=>{
  const timer=window.setInterval(()=>setNow(Date.now()),1000);
  return()=>window.clearInterval(timer);
 },[]);

 useEffect(()=>{
  let cancelled=false;
  let timer=0;
  const refresh=async()=>{
   const {status,data}=await fetchCerebroActivity();
   if(cancelled)return;
   if(status===200&&data?.status==='OK'){
    setRuns(data.runs||[]);
    setActivitySource(data.source_status);
    setActivityObservedAt(data.observed_at);
   }else setActivitySource('UNAVAILABLE');
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
    const voiceActive=voiceButton?.getAttribute('aria-pressed')==='true';
    const voiceListening=voiceStatus.includes('escuchando');
    const voiceSpeaking=voiceStatus.includes('hablando');
    const lineNodes=Array.from(root.querySelectorAll<HTMLElement>('.cerebro-chat-line'));
    const lines:CoreLine[]=lineNodes.slice(-10).map((node,index)=>{
     const role=node.classList.contains('cerebro-chat-user')?'user':'cerebro';
     const strong=node.querySelector('strong');
     const clone=node.cloneNode(true) as HTMLElement;
     clone.querySelector('strong')?.remove();
     clone.querySelector('.cerebro-media-link')?.remove();
     const text=(clone.textContent||node.textContent||'').replace(strong?.textContent||'','').trim();
     const key=`${lineNodes.length-10+index}:${role}:${text}`;
     if(!observedAtRef.current.has(key))observedAtRef.current.set(key,hhmm());
     return{key,role,text,observedAt:observedAtRef.current.get(key)||hhmm()};
    });
    setSnapshot({ready,sending,voiceActive,voiceListening,voiceSpeaking,title,detail,lines});
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

 const activeRuns=useMemo(()=>runs.filter(run=>ACTIVE_STATUSES.has(run.status)),[runs]);
 const queuedRuns=useMemo(()=>runs.filter(run=>QUEUED_STATUSES.has(run.status)),[runs]);
 const recentRuns=useMemo(()=>runs.filter(run=>run.status==='completed').slice(0,8),[runs]);
 const visibleRuns=useMemo(()=>[...activeRuns,...queuedRuns,...recentRuns],[activeRuns,queuedRuns,recentRuns]);
 const activeCount=activeRuns.length+(snapshot.sending?1:0);
 const statusLabel=activeRuns.length||snapshot.sending?'Trabajando':snapshot.ready?'Listo':'Sin conexión';

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
  try{recognition.start()}catch{dictationRef.current=null;setDictating(false);setDictationError('No se pudo iniciar el dictado.')}
 }

 function onComposerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){
  if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit()}
 }

 async function refreshActivity(){
  const {status,data}=await fetchCerebroActivity();
  if(status===200&&data?.status==='OK'){
   setRuns(data.runs||[]);
   setActivitySource(data.source_status);
   setActivityObservedAt(data.observed_at);
  }else setActivitySource('UNAVAILABLE');
 }

 return <main className="cerebro-operative cerebro-operative-compact" aria-label="CEREBRO · Vista operativa">
  <header className="cerebro-operative-header">
   <div className="cerebro-operative-brand">
    <span className="cerebro-operative-logo"><BrainCircuit size={30}/></span>
    <div><h1>CEREBRO</h1><p>Fénix Capital</p></div>
   </div>
   <div className={`cerebro-work-state ${activeRuns.length||snapshot.sending?'is-working':snapshot.ready?'is-ready':'is-offline'}`}><CircleDot size={17}/><strong>{statusLabel}</strong></div>
   <div className="cerebro-top-metrics" aria-label="Estado operativo">
    <div className="cerebro-metric"><CheckCircle2 size={20}/><span><small>Gateway</small><strong>{snapshot.ready?'ON':'PENDIENTE'}</strong></span></div>
    <div className="cerebro-metric"><ListTodo size={20}/><span><small>Procesos</small><strong>{activeCount} activos</strong></span></div>
    <div className="cerebro-owner-badge"><ShieldCheck size={18}/><span>OWNER</span></div>
   </div>
  </header>

  <section className="cerebro-process-zone" aria-labelledby="cerebro-process-title">
   <div className="cerebro-process-zone-head">
    <div className="cerebro-section-title compact"><Activity size={23}/><div><h2 id="cerebro-process-title">Procesos</h2><small className={`cerebro-source-inline is-${activitySource.toLowerCase()}`}>{activitySource==='LIVE'?'LIVE':activitySource==='CACHED'?'CACHÉ':'SIN FUENTE'}{activityObservedAt?` · ${startClock(activityObservedAt)}`:''}</small></div></div>
    <div className="cerebro-process-counts"><span>{activeRuns.length} curso</span><span>{queuedRuns.length} cola</span><span>{recentRuns.length} recientes</span><button type="button" className="cerebro-refresh" onClick={()=>{void refreshActivity()}} aria-label="Actualizar procesos"><RefreshCw size={17}/></button></div>
   </div>

   <div className="cerebro-process-strip" aria-live="polite" aria-label="Procesos de CEREBRO; desplazamiento horizontal">
    {visibleRuns.length===0?<div className="cerebro-empty-process"><CircleDot size={20}/><strong>{activitySource==='UNAVAILABLE'?'Sin actividad verificable':'Sin procesos que mostrar'}</strong></div>:visibleRuns.map(run=><ProcessCard key={run.run_id} run={run} now={now}/>) }
   </div>
  </section>

  <section className="cerebro-chat-zone" aria-label="Conversación con CEREBRO">
   <div className="cerebro-chat-stream">
    {snapshot.lines.length===0?<div className="cerebro-chat-empty">{snapshot.ready?'Da una orden a CEREBRO.':'Esperando conexión segura con CEREBRO…'}</div>:snapshot.lines.map(line=><div key={line.key} className={`cerebro-chat-bubble is-${line.role}`}><small>{line.role==='user'?'TÚ':'CEREBRO'} · {line.observedAt}</small><p>{line.text}</p></div>)}
    {snapshot.sending?<div className="cerebro-chat-working"><span/><span/><span/> CEREBRO trabajando…</div>:null}
   </div>
  </section>

  <section className="cerebro-composer-shell" aria-label="Compositor de órdenes">
   <form onSubmit={submit} className="cerebro-operative-form">
    <div className="cerebro-composer-main">
     <button type="button" className="cerebro-icon-button" disabled title="Adjuntar archivo · pendiente de contrato real" aria-label="Adjuntar archivo"><Paperclip size={20}/></button>
     <button type="button" className={`cerebro-icon-button ${dictating?'is-active':''}`} onClick={toggleDictation} disabled={!snapshot.ready||snapshot.sending||snapshot.voiceActive||!voiceRecognitionSupported()} title={dictating?'Detener dictado':'Dictar'} aria-label={dictating?'Detener dictado':'Dictar'}>{dictating?<Square size={18}/>:<Mic size={20}/>}</button>
     <button type="button" className={`cerebro-talk-button ${snapshot.voiceActive?'is-active':''}`} onClick={toggleVoice} disabled={!snapshot.ready||snapshot.sending||dictating} title={snapshot.voiceActive?'Finalizar conversación por voz':'Hablar con CEREBRO'} aria-label={snapshot.voiceActive?'Finalizar conversación por voz':'Hablar con CEREBRO'}>{snapshot.voiceActive?<Square size={17}/>:<MessageSquareText size={18}/>}<span>{snapshot.voiceActive?'Finalizar':'Hablar'}</span></button>
     <textarea ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)} onKeyDown={onComposerKeyDown} disabled={!snapshot.ready||snapshot.sending} rows={1} placeholder={snapshot.ready?'Escribe, habla o da una orden a CEREBRO…':'Esperando conexión segura con CEREBRO…'} aria-label="Escribe una orden para CEREBRO"/>
     <button type="submit" className="cerebro-send-button" disabled={!snapshot.ready||snapshot.sending||!composer.trim()} title="Enviar · Enter" aria-label="Enviar a CEREBRO"><Send size={21}/></button>
    </div>
    {dictationError?<div className="cerebro-dictation-error" role="status">{dictationError}</div>:null}
   </form>
  </section>
 </main>;
}
