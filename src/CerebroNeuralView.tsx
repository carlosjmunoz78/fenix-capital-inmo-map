import {useEffect,useMemo,useRef,useState} from 'react';
import {
 Activity,BrainCircuit,Clock3,ExternalLink,Maximize2,Minimize2,
 Pause,Play,Radio,RefreshCw,ShieldCheck,X
} from 'lucide-react';
import {fetchCerebroActivity,type CerebroActivityRun} from './cerebroActivityApi';
import './cerebro-neural-view.css';

type FeedState='LIVE'|'CACHED'|'UNAVAILABLE';
type NodeState='running'|'queued'|'finished';
type Position={x:number;y:number};
const RUNNING=new Set(['in_progress']);
const QUEUED=new Set(['queued','waiting','requested','pending']);

// An organic, bilateral neural field: positions are presentation only.
// No point is rendered unless backed by an observed GitHub Actions run.
const POSITIONS:readonly Position[]=[
 {x:166,y:130},{x:835,y:132},{x:310,y:68},{x:686,y:78},
 {x:120,y:256},{x:876,y:262},{x:290,y:400},{x:707,y:398},
 {x:165,y:382},{x:840,y:394},{x:379,y:170},{x:617,y:360}
];
const CENTER={x:500,y:264};
function runLabel(run:CerebroActivityRun){
 return String(run.engine_id||run.workflow_alias||run.workflow_name||'Trabajo observado').slice(0,100);
}
function stateOf(run:CerebroActivityRun):NodeState{
 if(RUNNING.has(run.status))return 'running';
 if(QUEUED.has(run.status))return 'queued';
 return 'finished';
}
function stateLabel(state:NodeState){
 return state==='running'?'En ejecución':state==='queued'?'En cola':'Finalizada';
}
function observedDate(value:string){
 const time=Date.parse(value);
 return Number.isFinite(time)?new Date(time).toLocaleString('es-ES',{
  day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'
 }):'Sin fecha verificable';
}
function safeGithubRunUrl(run:CerebroActivityRun){
 try{
  if(!Number.isSafeInteger(run.run_id)||run.run_id<=0)return null;
  const url=new URL(run.html_url);
  const path='/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/'+run.run_id;
  return url.protocol==='https:'&&url.hostname==='github.com'&&url.pathname===path?url.href:null;
 }catch{return null}
}
function connector(pos:Position){
 const a=CENTER.x+(pos.x-CENTER.x)*.22;
 const b=CENTER.y+(pos.y-CENTER.y)*.12;
 const c=CENTER.x+(pos.x-CENTER.x)*.79;
 const d=pos.y+(CENTER.y-pos.y)*.16;
 return 'M '+CENTER.x+' '+CENTER.y+' C '+a+' '+b+', '+c+' '+d+', '+pos.x+' '+pos.y;
}

export default function CerebroNeuralView(){
 const[runs,setRuns]=useState<CerebroActivityRun[]>([]);
 const[source,setSource]=useState<FeedState>('UNAVAILABLE');
 const[observedAt,setObservedAt]=useState('');
 const[refreshKey,setRefreshKey]=useState(0);
 const[loading,setLoading]=useState(false);
 const[animated,setAnimated]=useState(true);
 const[selectedId,setSelectedId]=useState<number|null>(null);
 const[fullscreen,setFullscreen]=useState(false);
 const stageRef=useRef<HTMLDivElement|null>(null);

 useEffect(()=>{
  let mounted=true;
  const refresh=async()=>{
   if(mounted)setLoading(true);
   try{
    const{status,data}=await fetchCerebroActivity();
    if(!mounted)return;
    if(status===200&&data?.status==='OK'&&
       (data.source_status==='LIVE'||data.source_status==='CACHED')&&
       Array.isArray(data.runs)){
     setRuns(data.runs.filter(run=>run.company_id==='fenix'&&
       Number.isSafeInteger(run.run_id)&&run.run_id>0));
     setSource(data.source_status);
     setObservedAt(data.observed_at||'');
    }else{
     // A failed poll must not keep yesterday's activity lit as if current.
     setRuns([]);setSource('UNAVAILABLE');setObservedAt('');
    }
   }catch{
    if(mounted){setRuns([]);setSource('UNAVAILABLE');setObservedAt('')}
   }finally{if(mounted)setLoading(false)}
  };
  void refresh();
  const timer=window.setInterval(()=>{void refresh()},30_000);
  return()=>{mounted=false;window.clearInterval(timer)};
 },[refreshKey]);

 useEffect(()=>{
  const sync=()=>setFullscreen(document.fullscreenElement===stageRef.current);
  document.addEventListener('fullscreenchange',sync);
  return()=>document.removeEventListener('fullscreenchange',sync);
 },[]);

 const running=useMemo(()=>runs.filter(run=>RUNNING.has(run.status)),[runs]);
 const queued=useMemo(()=>runs.filter(run=>QUEUED.has(run.status)),[runs]);
 const completed=useMemo(()=>runs.filter(run=>run.status==='completed'),[runs]);
 const nodes=useMemo(()=>[...running,...queued,...completed].slice(0,12)
  .map((run,index)=>({run,position:POSITIONS[index],state:stateOf(run)})),
 [running,queued,completed]);
 const selected=nodes.find(node=>node.run.run_id===selectedId)||null;
 const validSource=source!=='UNAVAILABLE';
 const sourceDescription=source==='LIVE'?'Lectura reciente de GitHub Actions':
  source==='CACHED'?'Última captura guardada: no demuestra actividad actual':
  'Sin datos verificables de actividad';
 const currentLabel=source==='CACHED'?'EN EJECUCIÓN · CAPTURA':'EN EJECUCIÓN';
 const currentText=source==='CACHED'?'Observado anteriormente':'Ejecuciones observadas';

 async function toggleFullscreen(){
  try{
   if(document.fullscreenElement===stageRef.current)await document.exitFullscreen();
   else await stageRef.current?.requestFullscreen();
  }catch{/* Fullscreen remains optional and browser-controlled. */}
 }

 return <main className={'cerebro-neural-view is-'+source.toLowerCase()+(animated?'':' motion-paused')} aria-label="CEREBRO · Neuronal">
  <section className="cerebro-neural-hero">
   <div>
    <span className="cerebro-neural-kicker"><BrainCircuit size={17}/> CEREBRO OS / NEURONAL</span>
    <h1>El tejido vivo de CEREBRO</h1>
    <p>Mapa interactivo de ejecuciones observadas. Las conexiones representan una vista de actividad, no comunicaciones neuronales ni aprendizaje demostrado.</p>
   </div>
   <div className="cerebro-neural-actions">
    <span className={'cerebro-neural-source is-'+source.toLowerCase()} role="status"><Radio size={14}/>{source==='LIVE'?'Fuente reciente':source==='CACHED'?'En caché':'Sin conexión'}</span>
    <button type="button" onClick={()=>setRefreshKey(current=>current+1)} disabled={loading} aria-label="Actualizar actividad"><RefreshCw size={16} className={loading?'is-spinning':''}/>Actualizar</button>
   </div>
  </section>

  <section className="cerebro-neural-metrics" aria-label="Actividad de GitHub observada">
   <article><small>{currentLabel}</small><strong>{validSource?running.length:'—'}</strong><span>{currentText}</span></article>
   <article><small>EN COLA {source==='CACHED'?'· CAPTURA':''}</small><strong>{validSource?queued.length:'—'}</strong><span>En la muestra recibida</span></article>
   <article><small>COMPLETADAS</small><strong>{validSource?completed.length:'—'}</strong><span>En la ventana recibida</span></article>
   <article><small>LRN-001 · APRENDIZAJE</small><strong className="is-partial">PARCIAL</strong><span>Autonomía no acreditada</span></article>
  </section>

  <section className="cerebro-neural-stage" ref={stageRef} aria-label="Mapa neuronal de actividad">
   <header className="cerebro-neural-stage-head">
    <div><span>MAPA NEURONAL / LAB</span><h2>Conexiones observables</h2><p>{sourceDescription}</p></div>
    <div className="cerebro-neural-stage-controls">
     <button type="button" onClick={()=>setAnimated(value=>!value)} aria-pressed={!animated} title="Detener o reanudar efectos visuales">{animated?<Pause size={16}/>:<Play size={16}/>}<span>{animated?'Pausar efectos':'Activar efectos'}</span></button>
     <button type="button" onClick={()=>{void toggleFullscreen()}} aria-pressed={fullscreen} title="Ampliar el mapa">{fullscreen?<Minimize2 size={16}/>:<Maximize2 size={16}/>}<span>{fullscreen?'Salir':'Ampliar'}</span></button>
    </div>
   </header>
   <div className="cerebro-neural-cortex">
    <svg className="cerebro-neural-wiring" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
     <defs>
      <linearGradient id="neural-connection-v053" x1="0%" x2="100%" y1="0%" y2="25%">
       <stop offset="0%" stopColor="#3e8bdf" stopOpacity=".16"/>
       <stop offset="50%" stopColor="#8beaff" stopOpacity=".78"/>
       <stop offset="100%" stopColor="#3a8df2" stopOpacity=".2"/>
      </linearGradient>
     </defs>
     <path className="cerebro-neural-outline" d="M498 109 C414 17 288 29 223 66 C111 47 61 121 76 208 C31 294 98 393 180 410 C238 477 353 476 426 431 C475 454 494 422 500 390 C516 429 537 449 583 430 C662 480 778 466 827 411 C912 402 962 309 923 214 C941 125 882 52 777 66 C701 26 582 18 502 109"/>
     <path className="cerebro-neural-axis" d="M500 110 Q477 205 500 264 Q521 333 500 395"/>
     {nodes.map(({run,position,state})=><path key={run.run_id} className={'cerebro-neural-wire is-'+state+(selectedId===run.run_id?' is-selected':'')} d={connector(position)}/>)}
    </svg>
    <div className={'cerebro-neural-heart'+(nodes.length===0?' is-idle':'')} aria-hidden="true">
     <i className="cerebro-neural-heart-halo"/><i className="cerebro-neural-heart-corona"/>
     <i className="cerebro-neural-heart-fragment frag-one"/><i className="cerebro-neural-heart-fragment frag-two"/><i className="cerebro-neural-heart-fragment frag-three"/>
     <i className="cerebro-neural-heart-core"/><i className="cerebro-neural-heart-spark"/>
    </div>
    {nodes.map(({run,position,state})=><button
      key={run.run_id} type="button"
      className={'cerebro-neural-node is-'+state+(selectedId===run.run_id?' is-selected':'')+(position.x>CENTER.x?' is-right':'')}
      style={{left:String(position.x/10)+'%',top:String(position.y/5.2)+'%'}}
      onClick={()=>setSelectedId(id=>id===run.run_id?null:run.run_id)}
      aria-pressed={selectedId===run.run_id}
      aria-label={runLabel(run)+' · '+stateLabel(state)+(source==='CACHED'?' (captura)':'')}
      title={runLabel(run)}>
      <span className="cerebro-neural-node-core"/><span className="cerebro-neural-node-label">{runLabel(run)}</span>
     </button>)}
    <div className="cerebro-neural-watermark" aria-hidden="true">CEREBRO / 001</div>
    {!nodes.length?<div className="cerebro-neural-no-data" role="status"><Clock3 size={19}/><strong>{source==='UNAVAILABLE'?'Sin conexión verificable':'Sin ejecuciones en la muestra'}</strong><span>No se generan nodos ficticios.</span></div>:null}
   </div>
   <footer className="cerebro-neural-stage-foot"><span><span className="cerebro-neural-key is-running"/> EN EJECUCIÓN</span><span><span className="cerebro-neural-key is-queued"/> EN COLA</span><span><span className="cerebro-neural-key is-finished"/> FINALIZADA</span><span className="cerebro-neural-provenance">{nodes.length} nodos vinculados a ejecuciones · máximo 12</span></footer>
  </section>

  <section className="cerebro-neural-grid" aria-label="Inspector y seguridad">
   <article className="cerebro-neural-panel cerebro-neural-inspector">
    <header><div><small>INSPECTOR DE SEÑAL</small><h2>{selected?runLabel(selected.run):'Selecciona una neurona'}</h2></div>{selected?<button type="button" aria-label="Cerrar detalle" onClick={()=>setSelectedId(null)}><X size={18}/></button>:<Activity size={18}/>}</header>
    {selected?<div className="cerebro-neural-detail">
     <dl><div><dt>Origen</dt><dd>GitHub Actions</dd></div><div><dt>Estado {source==='CACHED'?'de la captura':'observado'}</dt><dd>{stateLabel(selected.state)}</dd></div><div><dt>Resultado</dt><dd>{selected.run.conclusion||'No publicado'}</dd></div><div><dt>Última observación</dt><dd>{observedDate(observedAt)}</dd></div><div><dt>Motor</dt><dd>{selected.run.engine_id||'No identificado'}</dd></div><div><dt>Paso publicado</dt><dd>{selected.run.current_step||'No informado'}</dd></div></dl>
     {safeGithubRunUrl(selected.run)?<a href={safeGithubRunUrl(selected.run)||undefined} target="_blank" rel="noopener noreferrer">Abrir ejecución en GitHub <ExternalLink size={14}/></a>:<span className="cerebro-neural-link-disabled">Enlace externo no verificado</span>}
    </div>:<div className="cerebro-neural-inspector-empty"><BrainCircuit size={26}/><p>Cada núcleo representa una ejecución de GitHub registrada. Pulsa un núcleo para consultar procedencia, resultado y evidencia.</p></div>}
   </article>
   <aside className="cerebro-neural-panel cerebro-neural-policy">
    <header><div><small>SEGURIDAD Y APRENDIZAJE</small><h2>Gobierno, antes que autonomía</h2></div><ShieldCheck size={19}/></header>
    <p>Este mapa es de solo lectura. GitHub Actions no certifica por sí mismo los motores JOB-001, el aprendizaje LRN-001, ni la ejecución de los 179 motores definidos.</p>
    <dl><div><dt>Estado de fuente</dt><dd>{source}</dd></div><div><dt>Observado</dt><dd>{validSource?observedDate(observedAt):'No disponible'}</dd></div><div><dt>Staging WordPress</dt><dd>SUSPENDIDA · SIN SONDEOS</dd></div><div><dt>Aprendizaje LRN-001</dt><dd>PARCIAL / POR AUDITAR</dd></div><div><dt>Acciones desde este mapa</dt><dd>NINGUNA</dd></div></dl>
   </aside>
  </section>
 </main>;
}
