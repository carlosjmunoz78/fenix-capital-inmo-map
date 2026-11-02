import {useEffect,useMemo,useState} from 'react';
import {Activity,ExternalLink,Radio,Sparkles} from 'lucide-react';
import CerebroConsoleShell from './CerebroConsoleShell';
import {fetchCerebroActivity,type CerebroActivityRun} from './cerebroActivityApi';
import './cerebro-jarvis-work.css';

type SurfaceName='JARVIS'|'OPERATIVA';
type Props={surface?:SurfaceName};

const ACTIVE_STATUSES=new Set(['in_progress','queued','waiting','requested','pending']);

function activityLabel(run:CerebroActivityRun){
 if(run.workflow_alias)return run.workflow_alias;
 if(run.engine_id)return run.engine_id;
 return run.workflow_name.replace(/\bCEREBRO\b|\bPREPROD\b|\bPROD\b|\bLIVE\b/gi,'').replace(/[^A-Za-z0-9áéíóúüñÁÉÍÓÚÜÑ]+/g,' ').trim().slice(0,44)||'Actividad CEREBRO';
}

function activityState(run:CerebroActivityRun){
 if(run.jobs_provenance==='REAL_GITHUB_JOBS'&&Number(run.running_jobs||0)>0)return'EN CURSO';
 if(run.jobs_provenance==='REAL_GITHUB_JOBS'&&Number(run.queued_jobs||0)>0)return'EN COLA';
 if(run.status==='completed')return run.conclusion==='success'?'COMPLETADO':'INCIDENCIA';
 if(run.status==='in_progress')return'EN CURSO';
 if(ACTIVE_STATUSES.has(run.status))return'EN COLA';
 return run.status.toUpperCase();
}

export default function CerebroJarvisWorkConsole({surface='JARVIS'}:Props){
 const[runs,setRuns]=useState<CerebroActivityRun[]>([]);
 const[source,setSource]=useState<'LIVE'|'CACHED'|'UNAVAILABLE'>('UNAVAILABLE');
 const[observedAt,setObservedAt]=useState('');

 useEffect(()=>{
  let cancelled=false;
  const refresh=async()=>{
   const{status,data}=await fetchCerebroActivity();
   if(cancelled)return;
   if(status===200&&data?.status==='OK'){
    setRuns(data.runs||[]);
    setSource(data.source_status);
    setObservedAt(data.observed_at);
   }else{
    setSource('UNAVAILABLE');
   }
  };
  void refresh();
  const timer=window.setInterval(()=>{void refresh()},30_000);
  return()=>{cancelled=true;window.clearInterval(timer)};
 },[]);

 const activeCount=useMemo(()=>runs.filter(run=>ACTIVE_STATUSES.has(run.status)||Number(run.running_jobs||0)>0||Number(run.queued_jobs||0)>0).length,[runs]);
 const recentRuns=useMemo(()=>runs.slice(0,6),[runs]);
 const sourceLabel=source==='LIVE'?'Actividad conectada':source==='CACHED'?'Última actividad disponible':'Actividad no disponible';

 return <main className={`jarvis-work is-${surface.toLowerCase()}`} aria-label={`CEREBRO ${surface}`}>
  <section className="jarvis-primary-shell">
   <header className="jarvis-primary-header">
    <div className="jarvis-primary-title">
     <span className="jarvis-energy-core" aria-hidden="true"><Sparkles size={18}/></span>
     <div><small>CEREBRO OS</small><h1>JARVIS</h1></div>
    </div>
    <div className={`jarvis-evidence-state is-${source.toLowerCase()}`} aria-label={sourceLabel}><Radio size={13}/><span>{sourceLabel}</span>{activeCount>0?<b>{activeCount} activo{activeCount===1?'':'s'}</b>:null}</div>
    <p className="jarvis-primary-subtitle">Conversación, contexto y ejecución en una única superficie. El Gateway conserva autenticación, política y auditoría.</p>
   </header>

   <section className="jarvis-conversation" aria-label="Conversación con JARVIS">
    <CerebroConsoleShell/>
   </section>

   {recentRuns.length>0?<details className="jarvis-activity-drawer">
    <summary><span><Activity size={15}/><strong>Actividad real</strong></span><small>{sourceLabel}{observedAt?` · ${new Date(observedAt).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}`:''}</small></summary>
    <div className="jarvis-activity-list">
     {recentRuns.map(run=><article key={run.run_id} className="jarvis-activity-row">
      <div><strong>{activityLabel(run)}</strong><span>{run.engine_id||'Capacidad no publicada'} · {run.environment}</span></div>
      <span className="jarvis-activity-state">{activityState(run)}</span>
      <a href={run.html_url} target="_blank" rel="noreferrer" aria-label={`Abrir evidencia de ${activityLabel(run)}`}><ExternalLink size={14}/> Evidencia</a>
     </article>)}
    </div>
   </details>:null}
  </section>
 </main>;
}
