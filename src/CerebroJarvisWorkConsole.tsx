import {useEffect,useMemo,useState} from 'react';
import {Activity,CheckCircle2,Clock3,ExternalLink,Factory,History,Radio,ShieldAlert} from 'lucide-react';
import CerebroConsoleShell from './CerebroConsoleShell';
import {fetchCerebroActivity,type CerebroActivityRun} from './cerebroActivityApi';
import './cerebro-jarvis-work.css';

type SurfaceName='JARVIS'|'OPERATIVA';
type Props={surface?:SurfaceName};
type WorkFilter='ACTIVE'|'HISTORY'|'FACTORY';

const ACTIVE_STATUSES=new Set(['in_progress']);
const QUEUED_STATUSES=new Set(['queued','waiting','requested','pending']);

function compactAlias(run:CerebroActivityRun){
 if(run.workflow_alias)return run.workflow_alias;
 if(run.engine_id)return run.engine_id;
 const upper=run.workflow_name.toUpperCase();
 if(upper.includes('FACTORY')||upper.includes('FABRICA'))return'FACTORY';
 if(upper.includes('DEPLOY'))return'DEPLOY';
 if(upper.includes('VOICE'))return'VOICE';
 return upper.replace(/\bCEREBRO\b|\bPREPROD\b|\bPROD\b|\bLIVE\b/g,'').replace(/[^A-Z0-9]+/g,' ').trim().slice(0,20)||'WORKFLOW';
}

function physicalRunning(run:CerebroActivityRun){
 if(run.jobs_provenance==='REAL_GITHUB_JOBS'&&run.running_jobs!==null&&run.running_jobs!==undefined)return Math.max(0,Number(run.running_jobs)||0);
 return ACTIVE_STATUSES.has(run.status)?1:0;
}

function physicalQueued(run:CerebroActivityRun){
 if(run.jobs_provenance==='REAL_GITHUB_JOBS'&&run.queued_jobs!==null&&run.queued_jobs!==undefined)return Math.max(0,Number(run.queued_jobs)||0);
 return QUEUED_STATUSES.has(run.status)?1:0;
}

function hasPhysicalActivity(run:CerebroActivityRun){return physicalRunning(run)>0||physicalQueued(run)>0||ACTIVE_STATUSES.has(run.status)||QUEUED_STATUSES.has(run.status)}

function workState(run:CerebroActivityRun){
 if(physicalRunning(run)>0)return{label:'EN CURSO',tone:'running'};
 if(physicalQueued(run)>0)return{label:'EN COLA',tone:'queued'};
 if(run.status==='completed')return run.conclusion==='success'?{label:'COMPLETADO',tone:'ok'}:{label:'INCIDENCIA',tone:'error'};
 if(ACTIVE_STATUSES.has(run.status))return{label:'EN CURSO',tone:'running'};
 return{label:'EN COLA',tone:'queued'};
}

function progressValue(run:CerebroActivityRun){
 if(run.status==='completed')return 100;
 if(run.progress_provenance!=='REAL_GITHUB_JOBS'||run.progress_percent===null)return null;
 const value=Number(run.progress_percent);
 return Number.isFinite(value)?Math.max(0,Math.min(99,Math.round(value))):null;
}

function processPurpose(run:CerebroActivityRun,surface:SurfaceName){
 const text=`${run.workflow_name} ${run.workflow_path}`.toUpperCase();
 if(text.includes('SESSION CONTEXT'))return'Protege identidad, permisos, CORS y acceso autenticado al Gateway de CEREBRO.';
 if(text.includes('CONTINUOUS HUMAN QA'))return'Recorre la App como un humano y detecta degradaciones o mejoras medibles sin tocar negocio PROD.';
 if(text.includes('GOVERNED MAIN INTEGRATION'))return'Comprueba gobernanza y contratos antes de integrar cambios en la rama principal.';
 if(text.includes('PROD LIVE DEPLOY')||text.includes('DEPLOY'))return'Construye o valida la publicación del snapshot gobernado de la App.';
 if(text.includes('FACTORY')||text.includes('FABRICA')||run.engine_id==='FACT-001')return'Ejecuta o valida la Fábrica de Motores CEREBRO y su scaffold estándar.';
 if(run.engine_id)return`Trabajo real del motor ${run.engine_id}. La evidencia detallada procede del workflow enlazado.`;
 return`Workflow real «${run.workflow_name}». ${surface} muestra únicamente el estado y evidencia publicados por su ejecución.`;
}

function isFactory(run:CerebroActivityRun){return run.engine_id==='FACT-001'||/FACTORY|FABRICA|FÁBRICA/i.test(`${run.workflow_name} ${run.workflow_alias}`)}

function WorkCard({run,selected,onSelect}:{run:CerebroActivityRun;selected:boolean;onSelect:(run:CerebroActivityRun)=>void}){
 const state=workState(run),progress=progressValue(run),running=physicalRunning(run),queued=physicalQueued(run);
 const physical=run.jobs_provenance==='REAL_GITHUB_JOBS';
 return <button type="button" className={`jarvis-work-card is-${state.tone} ${selected?'is-selected':''}`} onClick={()=>onSelect(run)}>
  <span className="jarvis-work-card-top"><strong>{compactAlias(run)}</strong><small>{state.label}</small></span>
  <span className="jarvis-work-card-name">{run.workflow_name}</span>
  <span className="jarvis-work-progress" aria-label={`Progreso ${compactAlias(run)}`}><i className={progress===null&&running>0?'is-live':''} style={progress===null?undefined:{width:`${progress}%`}}/></span>
  <span className="jarvis-work-card-foot"><b>{physical?`${running} trabajando · ${queued} cola`:progress===null?(run.status==='in_progress'?'LIVE':'—'):`${progress}%`}</b><em>{run.environment}</em></span>
 </button>;
}

export default function CerebroJarvisWorkConsole({surface='JARVIS'}:Props){
 const[runs,setRuns]=useState<CerebroActivityRun[]>([]);
 const[source,setSource]=useState<'LIVE'|'CACHED'|'UNAVAILABLE'>('UNAVAILABLE');
 const[observedAt,setObservedAt]=useState('');
 const[filter,setFilter]=useState<WorkFilter>('ACTIVE');
 const[selectedRun,setSelectedRun]=useState<CerebroActivityRun|null>(null);
 useEffect(()=>{
  let cancelled=false;
  const refresh=async()=>{const{status,data}=await fetchCerebroActivity();if(cancelled)return;if(status===200&&data?.status==='OK'){const next=data.runs||[];setRuns(next);setSource(data.source_status);setObservedAt(data.observed_at);setSelectedRun(current=>current?next.find(run=>run.run_id===current.run_id)??current:next.find(run=>physicalRunning(run)>0)??next.find(hasPhysicalActivity)??next[0]??null)}else setSource('UNAVAILABLE')};
  void refresh();const timer=window.setInterval(()=>{void refresh()},30_000);return()=>{cancelled=true;window.clearInterval(timer)};
 },[]);
 const activeRuns=useMemo(()=>runs.filter(hasPhysicalActivity),[runs]);
 const historyRuns=useMemo(()=>runs.filter(run=>run.status==='completed'&&!hasPhysicalActivity(run)).slice(0,18),[runs]);
 const factoryRuns=useMemo(()=>runs.filter(isFactory).slice(0,18),[runs]);
 const visibleRuns=filter==='ACTIVE'?activeRuns:filter==='FACTORY'?factoryRuns:historyRuns;
 const runningCount=useMemo(()=>runs.reduce((sum,run)=>sum+physicalRunning(run),0),[runs]);
 const queuedCount=useMemo(()=>runs.reduce((sum,run)=>sum+physicalQueued(run),0),[runs]);
 const selectedState=selectedRun?workState(selectedRun):null;
 const selectedProgress=selectedRun?progressValue(selectedRun):null;
 const selectedRunning=selectedRun?physicalRunning(selectedRun):0;
 const selectedQueued=selectedRun?physicalQueued(selectedRun):0;
 const surfaceTitle=surface==='OPERATIVA'?'OPERATIVA · CONTROL':'JARVIS · WORK';
 return <main className={`jarvis-work is-${surface.toLowerCase()}`} aria-label={`CEREBRO ${surface}`}>
  <div className="jarvis-work-statusbar" aria-label={`Estado ${surface}`}><strong>{surfaceTitle}</strong><span className={`is-${source.toLowerCase()}`}><Radio size={12}/>{source}</span><span>{runningCount} trabajando</span><span>{queuedCount} en cola</span></div>
  <div className="jarvis-work-grid">
   <aside className="jarvis-work-rail" aria-label="Trabajo de CEREBRO">
    <div className="jarvis-work-rail-title"><div><small>TRABAJO</small><h2>Procesos reales</h2></div><Activity size={18}/></div>
    <div className="jarvis-work-tabs"><button type="button" className={filter==='ACTIVE'?'is-active':''} onClick={()=>setFilter('ACTIVE')}><Radio size={13}/> Activo <b>{activeRuns.length}</b></button><button type="button" className={filter==='HISTORY'?'is-active':''} onClick={()=>setFilter('HISTORY')}><History size={13}/> Historial</button><button type="button" className={filter==='FACTORY'?'is-active':''} onClick={()=>setFilter('FACTORY')}><Factory size={13}/> Fábrica</button></div>
    <div className="jarvis-work-list">{visibleRuns.length?visibleRuns.map(run=><WorkCard key={run.run_id} run={run} selected={selectedRun?.run_id===run.run_id} onSelect={setSelectedRun}/>):<div className="jarvis-work-empty"><Clock3 size={19}/><strong>{filter==='ACTIVE'?'Sin trabajos activos':filter==='FACTORY'?'Sin ejecuciones FACT-001 visibles':'Sin historial disponible'}</strong><span>No se inventan trabajos ni estados.</span></div>}</div>
    <div className="jarvis-work-rail-footer"><span><i className="is-running"/> {runningCount} en curso</span><span><i className="is-queued"/> {queuedCount} en cola</span></div>
   </aside>
   <section className="jarvis-work-core" aria-label="Conversación con CEREBRO"><div className="jarvis-work-corebar"><div><small>{surface}</small><strong>{surface==='JARVIS'?'Conversación y trabajo':'Control operativo y ejecución'}</strong></div><span>FÉNIX · GENERAL</span></div><div className="jarvis-work-core-shell"><CerebroConsoleShell/></div></section>
   <aside className="jarvis-work-inspector" aria-label="Inspector de trabajo"><div className="jarvis-work-inspector-title"><div><small>EVIDENCIA</small><h2>Inspector</h2></div><ShieldAlert size={18}/></div>{selectedRun&&selectedState?<div className="jarvis-work-inspector-body"><div className="jarvis-work-run-title"><span className={`is-${selectedState.tone}`}>{selectedState.label}</span><h3>{compactAlias(selectedRun)}</h3><p>{selectedRun.workflow_name}</p></div><div className="jarvis-work-big-progress"><div><span>PROGRESO REAL</span><strong>{selectedProgress===null?(selectedRunning>0?'LIVE':'—'):`${selectedProgress}%`}</strong></div><i><b className={selectedProgress===null&&selectedRunning>0?'is-live':''} style={selectedProgress===null?undefined:{width:`${selectedProgress}%`}}/></i><small>{selectedRun.progress_provenance==='REAL_GITHUB_JOBS'?'GitHub Jobs · pasos reales':selectedRun.progress_provenance==='TERMINAL_STATUS'?'Estado terminal confirmado':'Sin porcentaje verificable'}</small></div><div className="jarvis-work-purpose"><small>QUÉ ESTÁ HACIENDO</small><p>{processPurpose(selectedRun,surface)}</p></div><dl className="jarvis-work-facts"><div><dt>Empresa</dt><dd>{selectedRun.company_id}</dd></div><div><dt>Motor</dt><dd>{selectedRun.engine_id||'—'}</dd></div><div><dt>Entorno</dt><dd>{selectedRun.environment}</dd></div><div><dt>Versión</dt><dd title={selectedRun.version}>{selectedRun.version.slice(0,10)}</dd></div><div><dt>Trabajando</dt><dd>{selectedRun.jobs_provenance==='REAL_GITHUB_JOBS'?selectedRunning:'—'}</dd></div><div><dt>En cola</dt><dd>{selectedRun.jobs_provenance==='REAL_GITHUB_JOBS'?selectedQueued:'—'}</dd></div></dl><div className="jarvis-work-step"><small>PASO ACTUAL</small><strong>{selectedRun.current_step||'No publicado'}</strong></div><div className="jarvis-work-step"><small>SIGUIENTE</small><strong>{selectedRun.next_step||'No publicado'}</strong></div><a className="jarvis-work-evidence" href={selectedRun.html_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Abrir evidencia real</a></div>:<div className="jarvis-work-inspector-empty"><CheckCircle2 size={28}/><strong>Selecciona un trabajo</strong><span>Aquí aparecerán sus pasos, procedencia y evidencia real.</span></div>}<div className="jarvis-work-policy"><ShieldAlert size={15}/><div><strong>HUMAN_REQUIRED</strong><span>Solo se eleva cuando el Gateway o un motor publica una excepción válida. Esta vista no fabrica alertas.</span></div></div><div className="jarvis-work-observed">Última observación: {observedAt?new Date(observedAt).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'—'}</div></aside>
  </div>
 </main>;
}
