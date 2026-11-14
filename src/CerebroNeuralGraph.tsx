import {useMemo,useState} from 'react';
import type {CerebroActivityRun} from './cerebroActivityApi';
import './cerebro-neural-graph.css';

type Props={runs:CerebroActivityRun[];source:'LIVE'|'CACHED'|'UNAVAILABLE'};
type N={id:string;name:string;state:'running'|'queued'|'done'|'error';url:string};
const cap=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
function runState(r:CerebroActivityRun):N['state']{
 if(r.status==='in_progress')return'running';
 if(['queued','waiting','requested','pending'].includes(r.status))return'queued';
 return r.conclusion==='success'?'done':'error';
}
function verifiedUrl(raw:string){try{const u=new URL(raw);return u.protocol==='https:'&&u.hostname==='github.com'&&/^\/[^/]+\/[^/]+\/actions\/runs\/\d+\/?$/.test(u.pathname)?u.href:null}catch{return null}}
export default function CerebroNeuralGraph({runs,source}:Props){
 const[chosen,setChosen]=useState<string|null>(null);
 const[depth,setDepth]=useState(1);
 const[quiet,setQuiet]=useState(false);
 const nodes=useMemo<N[]>(()=>source==='UNAVAILABLE'?[]:runs.filter(r=>r.provenance==='REAL').slice(0,28).map(r=>({id:String(r.run_id),name:r.engine_id||r.workflow_alias||r.workflow_name,state:runState(r),url:r.html_url})),[runs,source]);
 const selected=nodes.find(n=>n.id===chosen)||null;
 const radius=depth===0?110:depth===1?145:178;
 const coords=nodes.map((n,i)=>{const theta=(i/nodes.length)*Math.PI*2-Math.PI/2;const offset=radius+(i%3)*13;return{x:300+Math.cos(theta)*offset,y:215+Math.sin(theta)*offset,n};});
 return <section className={'cerebro-neural-graph'+(quiet||source!=='LIVE'?' is-quiet':'')} aria-label="Red neuronal de actividad comprobada">
  <div className="cerebro-neural-graph-top"><div><span>RED DE EJECUCIÓN · VISTA EXPLORABLE</span><h2>Núcleo de actividad</h2><p>{source==='LIVE'?'Datos observados en la fuente conectada':source==='CACHED'?'Última información disponible; no representa actividad en directo':'Sin conexión verificable; actividad en vivo no disponible'}</p></div>
   <div className="cerebro-neural-graph-actions"><button type="button" onClick={()=>setDepth(d=>cap(d-1,0,2))} aria-label="Alejar red" disabled={depth===0}>−</button><output aria-label="Nivel de profundidad">{['Global','Motores','Detalle'][depth]}</output><button type="button" onClick={()=>setDepth(d=>cap(d+1,0,2))} aria-label="Acercar red" disabled={depth===2}>+</button><button type="button" onClick={()=>setQuiet(v=>!v)} aria-pressed={quiet}>{quiet?'Activar movimiento':'Reducir movimiento'}</button></div>
  </div>
  <div className="cerebro-neural-graph-stage">
   <svg viewBox="0 0 600 430" role="group" aria-label={nodes.length?('Red de '+nodes.length+' ejecuciones observadas'):'Núcleo en reposo sin ejecuciones verificadas'}>
    <defs><radialGradient id="ngcore"><stop offset="0" stopColor="#fff"/><stop offset=".2" stopColor="#baffff"/><stop offset=".54" stopColor="#16bafc"/><stop offset="1" stopColor="#075c99" stopOpacity=".08"/></radialGradient><filter id="ngglow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter></defs>
    <g className="ng-background">{Array.from({length:5},(_,i)=><ellipse key={i} cx="300" cy="215" rx={90+i*45} ry={58+i*28} fill="none" stroke="#25b5f3" strokeWidth=".7" strokeOpacity={.1+i*.018}/>)}</g>
    {coords.map(({x,y,n})=><line key={'edge-'+n.id} x1="300" y1="215" x2={x} y2={y} className={'ng-link ng-'+n.state} stroke="#38c8ff" strokeWidth={n.state==='running'?1.7:.85} strokeOpacity={n.state==='running'?.8:.21}/>)}
    <circle cx="300" cy="215" r="66" fill="#0caef8" opacity=".12" filter="url(#ngglow)"/><circle cx="300" cy="215" r="38" fill="url(#ngcore)" opacity=".76"/><circle cx="300" cy="215" r="12" fill="#d6ffff"/><circle cx="300" cy="215" r="4" fill="#fff"/>
    {coords.map(({x,y,n})=><g key={n.id} className={'ng-node ng-'+n.state+(chosen===n.id?' is-selected':'')}><circle cx={x} cy={y} r="20" fill="#17bff8" opacity=".16" filter="url(#ngglow)"/><circle cx={x} cy={y} r="11" fill="url(#ngcore)"/><circle cx={x} cy={y} r="3.5" fill="#fff"/><circle cx={x} cy={y} r="17" fill="none" stroke={n.state==='error'?'#f28d9a':n.state==='queued'?'#f6c56b':'#56ddff'} strokeOpacity={chosen===n.id?1:.5} strokeWidth="1"/><foreignObject x={x-20} y={y-20} width="40" height="40"><button type="button" className="ng-hit" aria-label={'Inspeccionar '+n.name} onClick={()=>setChosen(n.id)} title={n.name}/></foreignObject></g>)}
   </svg>
   <div className="ng-legend"><span><i className="ng-live-dot"/>En curso</span><span><i className="ng-queued-dot"/>En cola</span><span><i className="ng-idle-dot"/>Terminada</span><span><i className="ng-error-dot"/>Incidencia</span></div>
  </div>
  <div className="cerebro-neural-graph-footer"><span>{nodes.length} ejecuciones observadas · {source} · Las conexiones son una representación visual, no dependencias demostradas</span>{selected?<div className="ng-selection"><strong>{selected.name}</strong><span>{source==='LIVE'?'':'Último estado: '}{selected.state==='running'?'En curso':selected.state==='queued'?'En cola':selected.state==='done'?'Terminada':'Incidencia'}</span>{verifiedUrl(selected.url)?<a href={verifiedUrl(selected.url)!} target="_blank" rel="noopener noreferrer">Ver ejecución original</a>:<span>Enlace de evidencia no validado</span>}<button type="button" onClick={()=>setChosen(null)}>Cerrar detalle</button></div>:<span>Selecciona una neurona para inspeccionar su ejecución</span>}</div>
 {nodes.length>0?<details className="ng-directory"><summary>Explorar ejecuciones por nombre ({nodes.length})</summary><div className="ng-directory-grid">{nodes.map(n=><button type="button" key={n.id} onClick={()=>setChosen(n.id)} aria-pressed={chosen===n.id}><span className={'ng-directory-state ng-'+n.state}/>{n.name}</button>)}</div></details>:null}
 </section>;
}
