import {useEffect,useMemo,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {AudioLines,ChevronDown,ExternalLink,Mic,Send,ShieldCheck,Square,X} from 'lucide-react';
import CerebroConsoleShell from './CerebroConsoleShell';
import CerebroOperativeCockpitV3 from './CerebroOperativeCockpitV3';
import {fetchOwnerUniverseLab,type OwnerUniverseResult} from './cerebroOperativaLabUniverseApi';
import {fetchCerebroActivity,type CerebroActivityRun} from './cerebroActivityApi';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported,type CerebroSpeechRecognition} from './cerebroVoice';
import './cerebro-operative-console.css';

type CoreSnapshot={ready:boolean;sending:boolean;voiceActive:boolean;voiceListening:boolean;voiceSpeaking:boolean};
type CompanyKey='all'|'fenix'|'aion'|'captacasa';
type PowerMode='Suave'|'Normal'|'Alto'|'Máximo';
type QuickView='Ahora'|'Hoy'|'Esta noche'|'Próximamente'|'Terminado';

const EMPTY:CoreSnapshot={ready:false,sending:false,voiceActive:false,voiceListening:false,voiceSpeaking:false};
const ACTIVE_STATUSES=new Set(['in_progress']);
const QUEUED_STATUSES=new Set(['queued','waiting','requested','pending']);
const COMPANY_LABELS:Record<CompanyKey,string>={all:'Todas las empresas',fenix:'Fénix Capital',aion:'AION',captacasa:'CAPTACASA'};

function hhmm(date=new Date()){return new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',hour12:false}).format(date)}
function parseMs(value:string|null|undefined){if(!value)return null;const ms=new Date(value).getTime();return Number.isFinite(ms)?ms:null}
function elapsed(value:string|null|undefined,now:number){const started=parseMs(value);if(started===null)return'—';const total=Math.max(0,Math.floor((now-started)/1000));const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;if(h>0)return`${h}h ${m}m`;if(m>0)return`${m}m ${s}s`;return`${s}s`}
function setReactTextareaValue(textarea:HTMLTextAreaElement,value:string){const descriptor=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');descriptor?.set?.call(textarea,value);textarea.dispatchEvent(new Event('input',{bubbles:true}));textarea.dispatchEvent(new Event('change',{bubbles:true}))}
function progressValue(run:CerebroActivityRun){if(run.status==='completed')return 100;if(run.progress_provenance!=='REAL_GITHUB_JOBS'||run.progress_percent===null)return null;const value=Number(run.progress_percent);return Number.isFinite(value)?Math.max(0,Math.min(99,Math.round(value))):null}
function physicalRunning(run:CerebroActivityRun){if(run.jobs_provenance==='REAL_GITHUB_JOBS'&&run.running_jobs!==null&&run.running_jobs!==undefined)return Math.max(0,Number(run.running_jobs)||0);return ACTIVE_STATUSES.has(run.status)?1:0}
function physicalQueued(run:CerebroActivityRun){if(run.jobs_provenance==='REAL_GITHUB_JOBS'&&run.queued_jobs!==null&&run.queued_jobs!==undefined)return Math.max(0,Number(run.queued_jobs)||0);return QUEUED_STATUSES.has(run.status)?1:0}
function companyKey(run:CerebroActivityRun):CompanyKey{const value=(run.company_id||'').toLowerCase();if(value.includes('aion'))return'aion';if(value.includes('capta'))return'captacasa';return'fenix'}
function humanState(run:CerebroActivityRun){if(physicalRunning(run)>0||ACTIVE_STATUSES.has(run.status))return{label:'Trabajando ahora',tone:'live'};if(physicalQueued(run)>0||QUEUED_STATUSES.has(run.status))return{label:'Esperando turno',tone:'wait'};if(run.status==='completed'&&run.conclusion==='success')return{label:'Terminado',tone:'done'};if(run.status==='completed')return{label:'Necesita revisión',tone:'bad'};return{label:'Preparando',tone:'check'}}
function humanName(run:CerebroActivityRun){const text=`${run.workflow_alias||''} ${run.workflow_name||''}`.toUpperCase();if(text.includes('SESSION CONTEXT'))return'Comprobar acceso y sesión';if(text.includes('CONTINUOUS HUMAN QA'))return'Revisar la experiencia real';if(text.includes('GOVERNED MAIN INTEGRATION'))return'Preparar una integración segura';if(text.includes('PROD LIVE DEPLOY')||text.includes('DEPLOY'))return'Preparar publicación';if(text.includes('RUNTIME')&&text.includes('SMOKE'))return'Comprobar que todo responde';if(text.includes('FACTORY')||text.includes('FABRICA')||text.includes('FÁBRICA'))return'Construir y validar capacidades';if(text.includes('VOICE'))return'Revisar voz y conversación';if(text.includes('OPERATIVA'))return'Mejorar Operativa';return'Trabajo en curso'}
function humanDetail(run:CerebroActivityRun){const text=`${run.workflow_name} ${run.workflow_path}`.toUpperCase();if(text.includes('SESSION CONTEXT'))return'Reviso que tu identidad, permisos y acceso sigan funcionando correctamente.';if(text.includes('CONTINUOUS HUMAN QA'))return'Recorro la aplicación como un usuario real para detectar fallos antes de que te afecten.';if(text.includes('GOVERNED MAIN INTEGRATION'))return'Compruebo que los cambios sean compatibles antes de incorporarlos.';if(text.includes('DEPLOY'))return'Preparo y verifico una versión antes de publicarla.';if(text.includes('FACTORY')||text.includes('FABRICA')||text.includes('FÁBRICA'))return'Creo o verifico las piezas necesarias y compruebo que cumplen las reglas.';if(text.includes('VOICE'))return'Compruebo que hablar, dictar y responder por voz funcionen como deben.';return'Estoy ejecutando un trabajo real y conservaré su resultado y sus comprobaciones.'}
function humanStep(value:string|null|undefined,fallback:string){const raw=(value||'').trim();if(!raw)return fallback;const text=raw.toUpperCase();if(text.includes('SCAFFOLD')||text.includes('CONTRACT'))return'Preparando estructura y reglas';if(text.includes('TRIBUNAL')||text.includes('EVALUAT')||text.includes('VERIFY'))return'Revisión independiente';if(text.includes('TEST'))return'Comprobando que todo funciona';if(text.includes('BUILD'))return'Construyendo la nueva versión';if(text.includes('DEPLOY')||text.includes('PREPROD'))return'Preparando la prueba antes de publicar';if(text.includes('ROLLBACK'))return'Comprobando que se puede volver atrás';if(text.includes('BACKUP'))return'Preparando una copia segura';if(text.includes('QUEU'))return'Esperando su turno';if(text.includes('DONE')||text.includes('FINAL'))return'Últimas comprobaciones';return fallback}

function WorkRow({run,now,onOpen}:{run:CerebroActivityRun;now:number;onOpen:(run:CerebroActivityRun)=>void}){
 const state=humanState(run),progress=progressValue(run);
 return <article className={`operativa-work-row is-${state.tone}`}>
  <button type="button" className="operativa-work-main" onClick={()=>onOpen(run)}>
   <span className={`operativa-work-signal is-${state.tone}`} aria-hidden="true"/>
   <span className="operativa-work-copy"><strong>{humanName(run)}</strong><small>{humanStep(run.current_step,humanDetail(run))}</small></span>
   <span className="operativa-work-state">{state.label}</span><ChevronDown size={17} aria-hidden="true"/>
  </button>
  {progress!==null?<div className="operativa-work-progress" aria-label={`Progreso real ${progress}%`}><i style={{width:`${progress}%`}}/><span>{progress}%</span></div>:null}
  {(physicalRunning(run)>0||physicalQueued(run)>0)?<div className="operativa-work-meta"><span>{physicalRunning(run)} trabajando</span><span>{physicalQueued(run)} esperando</span><span>{run.status==='completed'?'Finalizado':elapsed(run.run_started_at||run.created_at,now)}</span></div>:null}
 </article>;
}

export default function CerebroOperativeConsole({visualPreview=false}:{visualPreview?:boolean}={}){
 const[composer,setComposer]=useState('');
 const[snapshot,setSnapshot]=useState<CoreSnapshot>(EMPTY);
 const[runs,setRuns]=useState<CerebroActivityRun[]>([]);
 const[source,setSource]=useState<'LIVE'|'CACHED'|'UNAVAILABLE'>('UNAVAILABLE');
 const[observedAt,setObservedAt]=useState('');
 const[company,setCompany]=useState<CompanyKey>('all');
 const[quickView,setQuickView]=useState<QuickView>('Ahora');
 const[power,setPower]=useState<PowerMode>('Normal');
 const[dictating,setDictating]=useState(false);
 const[dictationError,setDictationError]=useState('');
 const[universeRecord,setUniverseRecord]=useState<{company:CompanyKey;result:OwnerUniverseResult}|null>(null);
 const[selectedRun,setSelectedRun]=useState<CerebroActivityRun|null>(null);
 const[now,setNow]=useState(()=>Date.now());
 const composerRef=useRef<HTMLTextAreaElement|null>(null);
 const dictationRef=useRef<CerebroSpeechRecognition|null>(null);

 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
 useEffect(()=>{let cancelled=false;const refresh=async()=>{const{status,data}=await fetchCerebroActivity();if(cancelled)return;if(status===200&&data?.status==='OK'){setRuns(data.runs||[]);setSource(data.source_status);setObservedAt(data.observed_at)}else setSource('UNAVAILABLE')};void refresh();const timer=window.setInterval(()=>{void refresh()},30_000);return()=>{cancelled=true;window.clearInterval(timer)}},[]);
 useEffect(()=>{let raf=0;const inspect=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const root=document.querySelector<HTMLElement>('.operativa-core-bridge .cerebro-console');if(!root){setSnapshot(EMPTY);return}const title=root.querySelector<HTMLElement>('.cerebro-panel h2')?.textContent?.trim()||'';const ready=title.includes('Transporte autenticado verificado');const sendButton=root.querySelector<HTMLButtonElement>('.cerebro-chat-form button[type="submit"]');const voiceButton=root.querySelector<HTMLButtonElement>('.cerebro-voice-main');const voiceStatus=root.querySelector<HTMLElement>('.cerebro-voice-status')?.textContent?.trim().toLowerCase()||'';setSnapshot({ready,sending:Boolean(sendButton?.textContent?.includes('Enviando')||voiceStatus.includes('procesando')),voiceActive:voiceButton?.getAttribute('aria-pressed')==='true',voiceListening:voiceStatus.includes('escuchando'),voiceSpeaking:voiceStatus.includes('hablando')})})};inspect();const observer=new MutationObserver(inspect);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-pressed','class']});const interval=window.setInterval(inspect,1200);return()=>{cancelAnimationFrame(raf);observer.disconnect();window.clearInterval(interval)}},[]);
 useEffect(()=>()=>{const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.abort()}catch{/* stopped */}}},[]);
 useEffect(()=>{try{window.sessionStorage.setItem('operativa_power_mode',power)}catch{/* optional */}},[power]);
 // LAB preview only: no new reads in the existing production/default interface.
 useEffect(()=>{
  if(!visualPreview)return;
  let alive=true;
  const controller=new AbortController();
  const refresh=async()=>{
   const result=await fetchOwnerUniverseLab(company,controller.signal);
   if(alive)setUniverseRecord({company,result});
  };
  void refresh();
  const timer=window.setInterval(()=>{void refresh()},60_000);
  return()=>{alive=false;controller.abort();window.clearInterval(timer)};
 },[company,visualPreview]);

 const filteredRuns=useMemo(()=>company==='all'?runs:runs.filter(run=>companyKey(run)===company),[runs,company]);
 const activeRuns=useMemo(()=>filteredRuns.filter(run=>physicalRunning(run)>0||ACTIVE_STATUSES.has(run.status)),[filteredRuns]);
 const queuedRuns=useMemo(()=>filteredRuns.filter(run=>physicalQueued(run)>0||QUEUED_STATUSES.has(run.status)),[filteredRuns]);
 const completedRuns=useMemo(()=>filteredRuns.filter(run=>run.status==='completed').slice(0,12),[filteredRuns]);
 const visibleRuns=useMemo(()=>quickView==='Terminado'?completedRuns:quickView==='Próximamente'?queuedRuns:[...activeRuns,...queuedRuns,...completedRuns.slice(0,4)],[quickView,activeRuns,queuedRuns,completedRuns]);
 const runningCount=useMemo(()=>filteredRuns.reduce((sum,run)=>sum+physicalRunning(run),0),[filteredRuns]);
 const queuedCount=useMemo(()=>filteredRuns.reduce((sum,run)=>sum+physicalQueued(run),0),[filteredRuns]);
 const nextRun=queuedRuns[0]||null,latestResult=completedRuns[0]||null;

 function sendCommand(raw:string){const clean=raw.trim();if(!clean||!snapshot.ready||snapshot.sending)return false;const core=document.querySelector<HTMLElement>('.operativa-core-bridge .cerebro-console'),textarea=core?.querySelector<HTMLTextAreaElement>('.cerebro-chat-form textarea'),form=core?.querySelector<HTMLFormElement>('.cerebro-chat-form');if(!textarea||!form)return false;const prefix=company==='all'?'':`Contexto de empresa: ${COMPANY_LABELS[company]}. `;setReactTextareaValue(textarea,`${prefix}${clean}`);window.setTimeout(()=>form.requestSubmit(),0);return true}
 function submit(event?:FormEvent){event?.preventDefault();if(sendCommand(composer))setComposer('')}
 function changePower(next:PowerMode){setPower(next);sendCommand(`Ajusta el ritmo operativo a ${next}. Mantén todas las protecciones, no generes gasto no autorizado y no publiques nada saltándote controles. Confirma solo cuando el cambio esté realmente aplicado.`)}
 function activateMode(mode:'Concentración'|'Esta noche'|'Emergencia'){const prompts={Concentración:'Activa modo concentración: prioriza el trabajo seleccionado o más importante y reduce el resto sin detener obligaciones críticas.','Esta noche':'Organiza el trabajo de esta noche para avanzar todo lo seguro posible sin publicar cambios reales salvo que ya estén autorizados.',Emergencia:'Activa modo emergencia: contiene lo no esencial y prioriza únicamente lo crítico y seguro. No desactives controles de seguridad.'};sendCommand(prompts[mode])}
 function toggleVoice(){if(dictating)return;const button=document.querySelector<HTMLButtonElement>('.operativa-core-bridge .cerebro-voice-main');if(button&&!button.disabled)button.click()}
 function stopDictation(){const recognition=dictationRef.current;dictationRef.current=null;if(recognition){try{recognition.stop()}catch{/* stopped */}}setDictating(false)}
 function toggleDictation(){if(dictating){stopDictation();return}if(!snapshot.ready||snapshot.voiceActive||!voiceRecognitionSupported())return;const recognition=createVoiceRecognition();if(!recognition){setDictationError('El dictado no está disponible ahora.');return}dictationRef.current=recognition;recognition.lang='es-ES';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=3;applyVoiceContextHints(recognition);recognition.onstart=()=>{setDictating(true);setDictationError('')};recognition.onresult=event=>{const result=event.results[event.results.length-1],transcript=String(result?.[0]?.transcript||'').trim();if(transcript){setComposer(current=>`${current}${current.trim()?' ':''}${transcript}`);window.setTimeout(()=>composerRef.current?.focus(),0)}};recognition.onerror=()=>setDictationError('No se pudo completar el dictado.');recognition.onend=()=>{dictationRef.current=null;setDictating(false)};try{recognition.start()}catch{dictationRef.current=null;setDictating(false);setDictationError('No se pudo iniciar el dictado.')}}
 function onComposerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit()}}

 if(visualPreview)return <CerebroOperativeCockpitV3
   snapshot={snapshot} composer={composer} onComposerChange={setComposer}
   onSubmit={()=>submit()} onToggleVoice={toggleVoice} onToggleDictation={toggleDictation}
   dictating={dictating} dictationSupported={voiceRecognitionSupported()}
   dictationError={dictationError} composerRef={composerRef}
   source={source} observedAt={observedAt} company={company} onCompanyChange={setCompany}
   runs={filteredRuns} onOpenRun={setSelectedRun}
   ownerUniverse={universeRecord?.company===company?universeRecord.result:{kind:'loading',data:null}}
  >
  {selectedRun?<div className="operativa-inspector-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSelectedRun(null)}}><aside className="operativa-inspector" role="dialog" aria-modal="true" aria-label="Detalle del trabajo"><header><div><span>Detalle</span><h2>{humanName(selectedRun)}</h2></div><button type="button" onClick={()=>setSelectedRun(null)} aria-label="Cerrar"><X size={18}/></button></header><div className="operativa-inspector-status"><i className={`is-${humanState(selectedRun).tone}`}/><strong>{humanState(selectedRun).label}</strong></div><section><span>Qué está haciendo</span><p>{humanDetail(selectedRun)}</p></section><section><span>Ahora</span><p>{humanStep(selectedRun.current_step,'No hay un paso concreto publicado.')}</p></section><section><span>Después</span><p>{humanStep(selectedRun.next_step,'No hay un siguiente paso publicado.')}</p></section><div className="operativa-inspector-facts"><div><span>Tiempo</span><strong>{selectedRun.status==='completed'?'Finalizado':elapsed(selectedRun.run_started_at||selectedRun.created_at,now)}</strong></div><div><span>Progreso</span><strong>{progressValue(selectedRun)!==null?`${progressValue(selectedRun)}%`:'Sin porcentaje fiable'}</strong></div></div>{selectedRun.html_url?<a href={selectedRun.html_url} target="_blank" rel="noreferrer"><ShieldCheck size={15}/> Ver comprobaciones</a>:null}</aside></div>:null}
   <div className="operativa-core-bridge" aria-hidden="true"><CerebroConsoleShell/></div>
  </CerebroOperativeCockpitV3>;

 return <main className="operativa-premium" aria-label="Operativa">
  <div className="operativa-hud-grid" aria-hidden="true"/>
  <section className="operativa-contextbar">
   <div className="operativa-context-selectors"><label><span className="sr-only">Empresa</span><select value={company} onChange={event=>setCompany(event.target.value as CompanyKey)} aria-label="Empresa">{Object.entries(COMPANY_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><span>/</span><button type="button" className="operativa-project">General</button></div>
   <div className={`operativa-live-state is-${source.toLowerCase()}`}><i/>{source==='LIVE'?'Conectado':source==='CACHED'?'Últimos datos disponibles':'Sin datos en directo'}{observedAt?<small>{hhmm(new Date(observedAt))}</small>:null}</div>
  </section>

  <section className="operativa-command-deck">
   <div className="operativa-deck-main">
    <div className="operativa-eyebrow-row"><span>Ahora</span><nav aria-label="Vistas rápidas">{(['Ahora','Hoy','Esta noche','Próximamente','Terminado'] as QuickView[]).map(item=><button key={item} type="button" className={quickView===item?'is-active':''} onClick={()=>setQuickView(item)}>{item}</button>)}</nav></div>
    <h1>{runningCount>0?'Hay trabajo en marcha.':'Todo bajo control.'}</h1>
    <div className="operativa-summary"><span className={runningCount>0?'is-active':''}/><div><strong>{runningCount>0?`${runningCount} ${runningCount===1?'trabajo avanzando':'trabajos avanzando'}`:'No hay trabajos activos publicados'}</strong><p>{queuedCount>0?`${queuedCount} ${queuedCount===1?'trabajo espera su turno':'trabajos esperan su turno'}.`:'No hay cola visible ahora mismo.'}</p></div></div>
    <div className="operativa-modes"><button type="button" onClick={()=>activateMode('Concentración')}>Concentración</button><button type="button" onClick={()=>activateMode('Esta noche')}>Esta noche</button><button type="button" className="is-danger" onClick={()=>activateMode('Emergencia')}>Emergencia</button></div>
   </div>
   <aside className="operativa-reactor" aria-label="Potencia"><span>Potencia</span><div className={`operativa-reactor-shell power-${power.toLowerCase().replace('á','a')}`}><i/><b/><em/></div><div className="operativa-power-options" role="radiogroup" aria-label="Potencia">{(['Suave','Normal','Alto','Máximo'] as PowerMode[]).map(item=><button key={item} type="button" role="radio" aria-checked={power===item} className={power===item?'is-active':''} onClick={()=>changePower(item)}>{item}</button>)}</div></aside>
  </section>

  <section className="operativa-stage">
   <div className="operativa-work-column"><div className="operativa-section-head"><div><span>Trabajos</span><h2>En movimiento</h2></div><small>{visibleRuns.length?`${visibleRuns.length} visibles`:'Sin actividad verificable'}</small></div><div className="operativa-work-stack">{visibleRuns.length?visibleRuns.map(run=><WorkRow key={run.run_id} run={run} now={now} onOpen={setSelectedRun}/>):<div className="operativa-empty"><i/><strong>No hay nada que enseñarte aquí.</strong><span>No voy a inventar trabajos ni porcentajes.</span></div>}</div></div>
   <aside className="operativa-side-signal"><section><div className="operativa-side-title"><span>Para ti</span><b>0</b></div><p>No hay decisiones tuyas publicadas por la fuente actual.</p></section><section><span>Lo siguiente</span>{nextRun?<><h3>{humanName(nextRun)}</h3><p>{humanStep(nextRun.next_step,humanDetail(nextRun))}</p></>:<p>No hay un siguiente trabajo publicado.</p>}</section><section><span>Resultado reciente</span>{latestResult?<><h3>{humanName(latestResult)}</h3><p>{latestResult.conclusion==='success'?'Terminó correctamente.':'Terminó y necesita revisión.'}</p>{latestResult.html_url?<a href={latestResult.html_url} target="_blank" rel="noreferrer">Abrir resultado <ExternalLink size={13}/></a>:null}</>:<p>Todavía no hay resultados recientes visibles.</p>}</section></aside>
  </section>

  <section className="operativa-jarvis-composer" aria-label="Hablar con Jarvis"><button type="button" className="operativa-attach" aria-label="Añadir archivo" title="Añadir archivo"><span>+</span></button><form onSubmit={submit} className="operativa-composer-form"><textarea ref={composerRef} value={composer} onChange={event=>setComposer(event.target.value)} onKeyDown={onComposerKeyDown} disabled={!snapshot.ready||snapshot.sending} rows={1} aria-label="Mensaje para Jarvis"/><button type="button" className={`operativa-dictate ${dictating?'is-active':''}`} onClick={toggleDictation} disabled={!snapshot.ready||snapshot.sending||snapshot.voiceActive||!voiceRecognitionSupported()} aria-label={dictating?'Detener dictado':'Dictar'}>{dictating?<Square size={17}/>:<Mic size={19}/>}</button><button type="button" className={`operativa-voice ${snapshot.voiceActive?'is-active':''} ${snapshot.voiceListening?'is-listening':''} ${snapshot.voiceSpeaking?'is-speaking':''}`} onClick={toggleVoice} disabled={!snapshot.ready||snapshot.sending||dictating} aria-label={snapshot.voiceActive?'Finalizar conversación por voz':'Conversación por voz'}><AudioLines size={20}/><span/><span/><span/></button>{composer.trim()?<button type="submit" className="operativa-send" disabled={!snapshot.ready||snapshot.sending}><Send size={18}/></button>:null}</form>{dictationError?<small className="operativa-dictation-error" role="status">{dictationError}</small>:null}</section>

  {selectedRun?<div className="operativa-inspector-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSelectedRun(null)}}><aside className="operativa-inspector" role="dialog" aria-modal="true" aria-label="Detalle del trabajo"><header><div><span>Detalle</span><h2>{humanName(selectedRun)}</h2></div><button type="button" onClick={()=>setSelectedRun(null)} aria-label="Cerrar"><X size={18}/></button></header><div className="operativa-inspector-status"><i className={`is-${humanState(selectedRun).tone}`}/><strong>{humanState(selectedRun).label}</strong></div><section><span>Qué está haciendo</span><p>{humanDetail(selectedRun)}</p></section><section><span>Ahora</span><p>{humanStep(selectedRun.current_step,'No hay un paso concreto publicado.')}</p></section><section><span>Después</span><p>{humanStep(selectedRun.next_step,'No hay un siguiente paso publicado.')}</p></section><div className="operativa-inspector-facts"><div><span>Tiempo</span><strong>{selectedRun.status==='completed'?'Finalizado':elapsed(selectedRun.run_started_at||selectedRun.created_at,now)}</strong></div><div><span>Progreso</span><strong>{progressValue(selectedRun)!==null?`${progressValue(selectedRun)}%`:'Sin porcentaje fiable'}</strong></div></div>{selectedRun.html_url?<a href={selectedRun.html_url} target="_blank" rel="noreferrer"><ShieldCheck size={15}/> Ver comprobaciones</a>:null}</aside></div>:null}
  <div className="operativa-core-bridge" aria-hidden="true"><CerebroConsoleShell/></div>
 </main>;
}
