import {useEffect,useMemo,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {Activity,AlertTriangle,ArrowRight,BrainCircuit,CheckCircle2,CircleDot,Clock3,Gauge,Globe2,ListTodo,MessageSquareText,Mic,Paperclip,RefreshCw,Send,ShieldCheck,Square,Target,Zap} from 'lucide-react';
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

function dateTime(value:string|null|undefined){
 if(!value)return '—';
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return '—';
 return new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
}

function elapsed(value:string|null|undefined,now:number){
 if(!value)return '—';
 const started=new Date(value).getTime();
 if(!Number.isFinite(started))return '—';
 const total=Math.max(0,Math.floor((now-started)/1000));
 const hours=Math.floor(total/3600);
 const minutes=Math.floor((total%3600)/60);
 const seconds=total%60;
 if(hours>0)return `${hours} h ${minutes} min`;
 if(minutes>0)return `${minutes} min ${seconds} s`;
 return `${seconds} s`;
}

function setReactTextareaValue(textarea:HTMLTextAreaElement,value:string){
 const descriptor=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
 descriptor?.set?.call(textarea,value);
 textarea.dispatchEvent(new Event('input',{bubbles:true}));
 textarea.dispatchEvent(new Event('change',{bubbles:true}));
}

function short(text:string,limit=170){
 const clean=text.replace(/\s+/g,' ').trim();
 return clean.length>limit?`${clean.slice(0,limit-1)}…`:clean;
}

function processStage(run:CerebroActivityRun){
 if(run.status==='completed')return 2;
 if(ACTIVE_STATUSES.has(run.status))return 1;
 return 0;
}

function processState(run:CerebroActivityRun){
 if(run.status==='completed'){
  if(run.conclusion==='success')return {label:'Completado',className:'is-ok',current:'Finalizado',next:'—'};
  return {label:run.conclusion||'Finalizado',className:'is-error',current:'Finalizado',next:'Revisar evidencia'};
 }
 if(ACTIVE_STATUSES.has(run.status))return {label:'En ejecución',className:'is-running',current:'Ejecución',next:'Finalización'};
 return {label:'En cola',className:'is-queued',current:'Cola',next:'Ejecución'};
}

function ProcessCard({run,now}:{run:CerebroActivityRun;now:number}){
 const state=processState(run);
 const stage=processStage(run);
 const started=run.run_started_at||run.created_at;
 return <article className={`cerebro-process-card ${state.className}`} data-run-id={run.run_id}>
  <div className="cerebro-process-head">
   <div><strong>{run.workflow_name}</strong><small>{run.engine_id||'ENGINE · NO DECLARADO'} · Fénix <em>DERIVED</em> · {run.environment}</small></div>
   <span className={`cerebro-state-chip ${state.className}`}>{state.label}</span>
  </div>
  <div className="cerebro-process-route" aria-label={`Recorrido de ${run.workflow_name}`}>
   {['En cola','En ejecución',run.status==='completed'&&run.conclusion!=='success'?'Finalizado con incidencia':'Finalizado'].map((label,index)=><div key={label} className={`cerebro-route-step ${index<stage?'is-done':index===stage?'is-current':''}`}><span>{index<stage?<CheckCircle2 size={15}/>:<CircleDot size={14}/>}</span><small>{label}</small></div>)}
  </div>
  <dl className="cerebro-process-meta">
   <div><dt>Inicio</dt><dd>{run.status==='queued'?'Pendiente':dateTime(started)}</dd></div>
   <div><dt>Transcurrido</dt><dd>{run.status==='completed'?'Finalizado':elapsed(started,now)}</dd></div>
   <div><dt>Paso actual</dt><dd>{state.current}</dd></div>
   <div><dt>Siguiente</dt><dd>{state.next}</dd></div>
   <div><dt>Fin estimado</dt><dd>Estimación aún no disponible</dd></div>
  </dl>
  <div className="cerebro-process-foot"><span>REAL · GitHub Actions · v{run.version}</span>{run.html_url?<a href={run.html_url} target="_blank" rel="noreferrer">Ver evidencia</a>:null}</div>
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
   }else{
    setActivitySource('UNAVAILABLE');
   }
  };
  void refresh();
  timer=window.setInterval(()=>{void refresh()},60_000);
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
    const lines:CoreLine[]=lineNodes.slice(-12).map((node,index)=>{
     const role=node.classList.contains('cerebro-chat-user')?'user':'cerebro';
     const strong=node.querySelector('strong');
     const clone=node.cloneNode(true) as HTMLElement;
     clone.querySelector('strong')?.remove();
     clone.querySelector('.cerebro-media-link')?.remove();
     const text=(clone.textContent||node.textContent||'').replace(strong?.textContent||'','').trim();
     const key=`${lineNodes.length-12+index}:${role}:${text}`;
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

 const conversationActivity=useMemo(()=>snapshot.lines.slice(-5).map(line=>{
  const lower=line.text.toLowerCase();
  const isError=lower.includes('no he podido contactar')||lower.includes('error');
  const needsHuman=line.role==='cerebro'&&(lower.includes('confirm')||lower.includes('elige el número')||lower.includes('human_required'));
  return{
   ...line,
   kind:isError?'error':needsHuman?'human':line.role==='user'?'user':'response',
   title:isError?'Incidencia comunicada':needsHuman?'CEREBRO necesita tu decisión':line.role==='user'?'Orden enviada':'Respuesta de CEREBRO',
   detail:short(line.text)
  };
 }),[snapshot.lines]);

 const activeRuns=useMemo(()=>runs.filter(run=>ACTIVE_STATUSES.has(run.status)),[runs]);
 const queuedRuns=useMemo(()=>runs.filter(run=>QUEUED_STATUSES.has(run.status)),[runs]);
 const recentRuns=useMemo(()=>runs.filter(run=>run.status==='completed').slice(0,8),[runs]);
 const visibleRuns=useMemo(()=>[...activeRuns,...queuedRuns,...recentRuns],[activeRuns,queuedRuns,recentRuns]);
 const lastLine=snapshot.lines.at(-1);
 const activeCount=activeRuns.length+(snapshot.sending?1:0);
 const statusLabel=activeRuns.length||snapshot.sending?'Trabajando':snapshot.ready?'Listo':'Sin conexión';
 const nextPrimary=!snapshot.ready?'Restablecer conexión segura con CEREBRO Gateway':queuedRuns.length?`Hay ${queuedRuns.length} proceso(s) esperando ejecución`:snapshot.sending?'Esperar el resultado de la ejecución actual':lastLine?.role==='cerebro'?'Continuar la conversación o dar una nueva orden':'Dar una orden a CEREBRO';

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
  recognition.onerror=()=>setDictationError('No se pudo completar el dictado. Puedes escribir o volver a intentarlo.');
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

 return <main className="cerebro-operative" aria-label="CEREBRO · Vista operativa">
  <header className="cerebro-operative-header">
   <div className="cerebro-operative-brand">
    <span className="cerebro-operative-logo"><BrainCircuit size={34}/></span>
    <div><h1>CEREBRO</h1><p>Asistente operativo</p></div>
   </div>
   <div className={`cerebro-work-state ${activeRuns.length||snapshot.sending?'is-working':snapshot.ready?'is-ready':'is-offline'}`}><CircleDot size={18}/><strong>{statusLabel}</strong></div>
   <div className="cerebro-top-metrics" aria-label="Estado operativo">
    <div className="cerebro-metric"><CheckCircle2 size={22}/><span><small>Gateway</small><strong>{snapshot.ready?'Conectado':'Conexión pendiente'}</strong></span></div>
    <div className="cerebro-metric"><ListTodo size={22}/><span><small>En ejecución</small><strong>{activeCount}</strong></span></div>
    <div className="cerebro-metric cerebro-metric-progress"><Gauge size={22}/><span><small>Progreso</small><strong>Sin % fiable</strong></span></div>
    <div className="cerebro-owner-badge" title="Superficie owner autenticada"><ShieldCheck size={20}/><span>OWNER</span></div>
   </div>
  </header>

  <div className="cerebro-operative-grid">
   <section className="cerebro-surface cerebro-timeline" aria-labelledby="cerebro-timeline-title">
    <div className="cerebro-section-title cerebro-section-title-with-action"><Activity size={30}/><div><h2 id="cerebro-timeline-title">Procesos reales de CEREBRO</h2><p>En ejecución, en cola y últimos finalizados. La barra de recorrido usa estados reales; no inventa porcentajes ni ETA.</p></div><button type="button" className="cerebro-refresh" onClick={()=>{void refreshActivity()}} title="Actualizar actividad"><RefreshCw size={18}/>Actualizar</button></div>
    <div className="cerebro-source-line"><span className={`cerebro-source-dot is-${activitySource.toLowerCase()}`}/><strong>{activitySource==='LIVE'?'REAL · GitHub Actions en vivo':activitySource==='CACHED'?'REAL · GitHub Actions · caché reciente':'POR AUDITAR · fuente de actividad no disponible'}</strong>{activityObservedAt?<small>Observado {dateTime(activityObservedAt)}</small>:null}</div>

    <div className="cerebro-process-summary" aria-label="Resumen de procesos"><span><b>{activeRuns.length}</b> ejecutando</span><span><b>{queuedRuns.length}</b> en cola</span><span><b>{recentRuns.length}</b> finalizados recientes</span></div>
    <div className="cerebro-process-list" aria-live="polite">
     {visibleRuns.length===0?<div className="cerebro-empty-state"><Clock3 size={24}/><div><strong>{activitySource==='UNAVAILABLE'?'Todavía no hay actividad de motores verificable desde la Console.':'No hay procesos activos ni recientes en la proyección recibida.'}</strong><span>{activitySource==='UNAVAILABLE'?'La conversación sigue operativa; no mostraré trabajos inventados.':'La fuente está conectada y no reporta trabajo que mostrar.'}</span></div></div>:visibleRuns.map(run=><ProcessCard key={run.run_id} run={run} now={now}/>) }
    </div>

    <div className="cerebro-conversation-activity">
     <div className="cerebro-section-title compact"><MessageSquareText size={24}/><h3>Actividad de conversación</h3></div>
     <div className="cerebro-timeline-list">
      {conversationActivity.length===0?<div className="cerebro-empty-inline">Sin órdenes o respuestas observadas todavía.</div>:conversationActivity.map((item,index)=><article key={item.key} className={`cerebro-event is-${item.kind}`}>
       <time>{item.observedAt}</time>
       <span className="cerebro-event-node">{item.kind==='error'?<AlertTriangle size={20}/>:item.kind==='human'?<ShieldCheck size={20}/>:item.role==='user'?<Zap size={20}/>:<BrainCircuit size={20}/>}</span>
       <div className="cerebro-event-card"><div className="cerebro-event-meta"><strong>{item.title}</strong><small>{item.role==='user'?'REAL · orden observada':'DERIVED · evento observado'}</small></div><p>{item.detail}</p></div>
       {index<conversationActivity.length-1?<span className="cerebro-event-line"/>:null}
      </article>)}
      {snapshot.sending?<div className="cerebro-working-tail"><span className="cerebro-pulse-dots"><i/><i/><i/></span>CEREBRO sigue trabajando en tu petición…</div>:null}
     </div>
    </div>
   </section>

   <aside className="cerebro-operative-side">
    <section className="cerebro-surface cerebro-now" aria-labelledby="cerebro-now-title">
     <div className="cerebro-section-title compact"><Target size={28}/><h2 id="cerebro-now-title">En marcha ahora</h2></div>
     {activeRuns.map(run=><div className="cerebro-now-row is-running" key={run.run_id}><span className="cerebro-now-icon"><BrainCircuit size={22}/></span><div><strong>{run.engine_id||run.workflow_name}</strong><small>{run.workflow_name}</small></div><span className="cerebro-state-chip is-running">En curso</span></div>)}
     {activeRuns.length===0&&!snapshot.sending&&!snapshot.voiceActive?<div className="cerebro-empty-side"><CircleDot size={24}/><div><strong>Sin ejecución activa verificada</strong><span>No afirmaré que CEREBRO trabaja si la fuente real no lo acredita.</span></div></div>:null}
     {snapshot.sending?<div className="cerebro-now-row is-running"><span className="cerebro-now-icon"><MessageSquareText size={22}/></span><div><strong>Procesando tu petición</strong><small>REAL · petición de Console en curso</small></div><span className="cerebro-state-chip is-running">En curso</span></div>:null}
     {snapshot.voiceActive?<div className="cerebro-now-row"><span className="cerebro-now-icon"><Mic size={22}/></span><div><strong>Conversación por voz activa</strong><small>{snapshot.voiceListening?'Escuchando':snapshot.voiceSpeaking?'Respondiendo':'Preparada'}</small></div><span className="cerebro-state-chip">Activa</span></div>:null}
     <div className="cerebro-now-row"><span className="cerebro-now-icon"><Globe2 size={22}/></span><div><strong>CEREBRO Gateway</strong><small>{snapshot.ready?'Transporte autenticado verificado':'No disponible'}</small></div><span className={`cerebro-state-chip ${snapshot.ready?'is-ok':'is-error'}`}>{snapshot.ready?'Conectado':'Bloqueado'}</span></div>
    </section>

    <section className="cerebro-surface cerebro-next" aria-labelledby="cerebro-next-title">
     <div className="cerebro-section-title compact"><ArrowRight size={28}/><h2 id="cerebro-next-title">Siguiente</h2></div>
     <ol>
      <li><span>1</span><strong>{nextPrimary}</strong></li>
      <li><span>2</span><strong>Las acciones sensibles conservarán propuesta y confirmación humana</strong></li>
     </ol>
    </section>

    <section className="cerebro-surface cerebro-reality" aria-label="Contrato de datos de la vista">
     <div><ShieldCheck size={20}/><strong>Sin datos ficticios</strong></div>
     <p>REAL identifica ejecuciones observadas en su fuente. DERIVED identifica contexto inferido de un origen real. Cuando la fuente no ofrece porcentaje o ETA, se muestra expresamente como no disponible.</p>
    </section>
   </aside>
  </div>

  <section className="cerebro-composer-shell" aria-label="Compositor de órdenes">
   <form onSubmit={submit} className="cerebro-operative-form">
    <div className="cerebro-composer-main">
     <button type="button" className="cerebro-icon-button" disabled title="Adjuntar archivo · POR AUDITAR: todavía no existe contrato real de subida" aria-label="Adjuntar archivo"><Paperclip size={20}/></button>
     <button type="button" className={`cerebro-icon-button ${dictating?'is-active':''}`} onClick={toggleDictation} disabled={!snapshot.ready||snapshot.sending||snapshot.voiceActive||!voiceRecognitionSupported()} title={dictating?'Detener dictado':'Dictar al campo de texto'} aria-label={dictating?'Detener dictado':'Dictar'}>{dictating?<Square size={18}/>:<Mic size={20}/>}</button>
     <button type="button" className={`cerebro-talk-button ${snapshot.voiceActive?'is-active':''}`} onClick={toggleVoice} disabled={!snapshot.ready||snapshot.sending||dictating} title={snapshot.voiceActive?'Finalizar conversación por voz':'Hablar con CEREBRO'} aria-label={snapshot.voiceActive?'Finalizar conversación por voz':'Hablar con CEREBRO'}>{snapshot.voiceActive?<Square size={17}/>:<MessageSquareText size={18}/>}<span>{snapshot.voiceActive?'Finalizar':'Hablar'}</span></button>
     <textarea ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)} onKeyDown={onComposerKeyDown} disabled={!snapshot.ready||snapshot.sending} rows={1} placeholder={snapshot.ready?'Escribe, habla o da una orden a CEREBRO…':'Esperando conexión segura con CEREBRO…'} aria-label="Escribe una orden para CEREBRO"/>
     <button type="submit" className="cerebro-send-button" disabled={!snapshot.ready||snapshot.sending||!composer.trim()} title="Enviar a CEREBRO · Enter" aria-label="Enviar a CEREBRO"><Send size={22}/></button>
    </div>
    {dictationError?<div className="cerebro-dictation-error" role="status">{dictationError}</div>:null}
   </form>
  </section>
 </main>;
}
