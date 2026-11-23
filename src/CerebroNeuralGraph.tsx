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
 const hemi:[[number,number],...Array<[number,number]>]=[[212,93],[163,100],[116,137],[213,151],[164,169],[100,204],[205,218],[149,237],[111,277],[180,300],[238,308],[242,264],[251,116],[155,335]];
 const positions=[...hemi,...hemi.map(([x,y])=>[600-x,y] as [number,number])];
 const spread=depth===0?.76:depth===1?.9:1;
 const coords=nodes.map((n,i)=>{const [px,py]=positions[i];return{x:300+(px-300)*spread,y:215+(py-215)*spread,n};});
 return <section className={'cerebro-neural-graph'+(quiet||source!=='LIVE'?' is-quiet':'')} aria-label="Red neuronal de actividad comprobada">
  <div className="cerebro-neural-graph-top"><div><span>RED DE EJECUCIÓN · VISTA EXPLORABLE</span><h2>Núcleo de actividad</h2><p>{source==='LIVE'?'Datos observados en la fuente conectada':source==='CACHED'?'Última información disponible; no representa actividad en directo':'Sin conexión verificable; actividad en vivo no disponible'}</p></div>
   <div className="cerebro-neural-graph-actions"><button type="button" onClick={()=>setDepth(d=>cap(d-1,0,2))} aria-label="Alejar red" disabled={depth===0}>−</button><output aria-label="Nivel de profundidad">{['Global','Motores','Detalle'][depth]}</output><button type="button" onClick={()=>setDepth(d=>cap(d+1,0,2))} aria-label="Acercar red" disabled={depth===2}>+</button><button type="button" onClick={()=>setQuiet(v=>!v)} aria-pressed={quiet}>{quiet?'Activar movimiento':'Reducir movimiento'}</button></div>
  </div>
  <div className="cerebro-neural-graph-stage">
   <svg viewBox="0 0 600 430" role="group" aria-label={nodes.length?('Red de '+nodes.length+' ejecuciones observadas'):'Núcleo en reposo sin ejecuciones verificadas'}>
    <defs><radialGradient id="ngcore"><stop offset="0" stopColor="#fff"/><stop offset=".2" stopColor="#baffff"/><stop offset=".54" stopColor="#16bafc"/><stop offset="1" stopColor="#075c99" stopOpacity=".08"/></radialGradient><filter id="ngglow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter></defs>
    <g className="ng-background" fill="none" strokeLinecap="round" strokeLinejoin="round">
     <path d="M298 83 C278 54 245 61 222 73 C199 52 170 64 156 87 C125 80 108 101 105 124 C77 127 69 157 82 177 C61 198 70 226 88 240 C78 270 98 293 121 301 C134 329 163 337 187 326 C211 347 242 348 258 325 C281 341 294 314 298 291" stroke="#33bdf4" strokeOpacity=".57" strokeWidth="1.7"/>
     <path d="M302 83 C322 54 355 61 378 73 C401 52 430 64 444 87 C475 80 492 101 495 124 C523 127 531 157 518 177 C539 198 530 226 512 240 C522 270 502 293 479 301 C466 329 437 337 413 326 C389 347 358 348 342 325 C319 341 306 314 302 291" stroke="#33bdf4" strokeOpacity=".57" strokeWidth="1.7"/>
     <path d="M298 83 Q285 122 301 156 Q283 184 298 217 Q282 252 298 291 M302 83 Q315 122 299 156 Q317 184 302 217 Q318 252 302 291" stroke="#4edcff" strokeOpacity=".18" strokeWidth="1.4"/>
     <path d="M142 116 Q176 125 180 154 Q151 174 168 205 Q126 233 148 261 Q164 284 191 279 M210 83 Q225 113 213 145 Q253 180 225 212 Q258 246 238 284 M117 200 Q141 195 161 213 M174 299 Q201 280 228 305" stroke="#2ca9e2" strokeOpacity=".24" strokeWidth="1.5"/>
     <path d="M458 116 Q424 125 420 154 Q449 174 432 205 Q474 233 452 261 Q436 284 409 279 M390 83 Q375 113 387 145 Q347 180 375 212 Q342 246 362 284 M483 200 Q459 195 439 213 M426 299 Q399 280 372 305" stroke="#2ca9e2" strokeOpacity=".24" strokeWidth="1.5"/>
    </g>
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
