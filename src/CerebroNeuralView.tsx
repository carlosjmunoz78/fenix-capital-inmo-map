import {useEffect,useMemo,useState} from 'react';
import {Activity,BrainCircuit,Clock3,Radio,ShieldCheck} from 'lucide-react';
import {fetchCerebroActivity,type CerebroActivityRun} from './cerebroActivityApi';
import './cerebro-neural-view.css';

const ACTIVE=new Set(['in_progress']);
const QUEUED=new Set(['queued','waiting','requested','pending']);

function label(run:CerebroActivityRun){return run.engine_id||run.workflow_alias||run.workflow_name}

export default function CerebroNeuralView(){
 const[runs,setRuns]=useState<CerebroActivityRun[]>([]);
 const[source,setSource]=useState<'LIVE'|'CACHED'|'UNAVAILABLE'>('UNAVAILABLE');
 const[observedAt,setObservedAt]=useState('');
 useEffect(()=>{
  let cancelled=false;
  const refresh=async()=>{
   const{status,data}=await fetchCerebroActivity();
   if(cancelled)return;
   if(status===200&&data?.status==='OK'){setRuns(data.runs||[]);setSource(data.source_status);setObservedAt(data.observed_at)}else setSource('UNAVAILABLE');
  };
  void refresh();const timer=window.setInterval(()=>{void refresh()},30_000);return()=>{cancelled=true;window.clearInterval(timer)};
 },[]);
 const running=useMemo(()=>runs.filter(run=>ACTIVE.has(run.status)),[runs]);
 const queued=useMemo(()=>runs.filter(run=>QUEUED.has(run.status)),[runs]);
 const completed=useMemo(()=>runs.filter(run=>run.status==='completed'),[runs]);
 const visible=useMemo(()=>[...running,...queued].slice(0,12),[running,queued]);
 return <main className="cerebro-neural-view" aria-label="CEREBRO · Neuronal">
  <section className="cerebro-neural-hero">
   <div><span className="cerebro-neural-kicker"><BrainCircuit size={16}/> CEREBRO · NEURONAL</span><h1>Aprendizaje y actividad observable</h1><p>Vista nativa. Solo representa señales verificables; no reutiliza la visualización histórica ni fabrica estados de aprendizaje.</p></div>
   <span className={`cerebro-neural-source is-${source.toLowerCase()}`}><Radio size={13}/>{source}</span>
  </section>
  <section className="cerebro-neural-metrics" aria-label="Resumen neuronal verificable">
   <article><small>EN CURSO</small><strong>{running.length}</strong><span>ejecuciones observadas</span></article>
   <article><small>EN COLA</small><strong>{queued.length}</strong><span>trabajo observable</span></article>
   <article><small>COMPLETADAS</small><strong>{completed.length}</strong><span>en la ventana actual</span></article>
   <article><small>LRN-001</small><strong>PARCIAL</strong><span>sin fabricar métricas neuronales</span></article>
  </section>
  <section className="cerebro-neural-grid">
   <article className="cerebro-neural-panel">
    <header><div><small>SEÑALES</small><h2>Trabajo que alimenta CEREBRO</h2></div><Activity size={18}/></header>
    <div className="cerebro-neural-list">{visible.length?visible.map(run=><a key={run.run_id} href={run.html_url} target="_blank" rel="noreferrer"><span className={ACTIVE.has(run.status)?'is-running':'is-queued'}/><div><strong>{label(run)}</strong><small>{run.current_step||run.workflow_name}</small></div><em>{ACTIVE.has(run.status)?'EN CURSO':'EN COLA'}</em></a>):<div className="cerebro-neural-empty"><Clock3 size={20}/><strong>Sin señales activas visibles</strong><span>La vista no inventa trabajo para llenar el panel.</span></div>}</div>
   </article>
   <aside className="cerebro-neural-panel cerebro-neural-policy"><header><div><small>GOBERNANZA</small><h2>Aprender sin romper</h2></div><ShieldCheck size={18}/></header><p>Los resultados observados pueden alimentar aprendizaje, pero cualquier mutación debe seguir contratos, tests, Tribunal, rollback y límites de coste.</p><dl><div><dt>Fuente visible</dt><dd>{source}</dd></div><div><dt>Observado</dt><dd>{observedAt?new Date(observedAt).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'—'}</dd></div><div><dt>Estado de puente LRN</dt><dd>POR AUDITAR / PARCIAL</dd></div></dl></aside>
  </section>
 </main>;
}
