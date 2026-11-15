import {useMemo,useState} from 'react';
import evidence from '../cerebro/universal/v0/provider-cloudflare/observations/cloudflare-queues-2026-11-15.json';
import './cerebro-cloudflare-fleet.css';
const format=(s:string)=>Number.isFinite(Date.parse(s))?new Date(s).toLocaleString('es-ES'):s;
export default function CerebroCloudflareQueuesPanel(){
 const[term,setTerm]=useState(''),[all,setAll]=useState(false),[chosen,setChosen]=useState<string|null>(null);
 const filtered=useMemo(()=>evidence.queues.filter(q=>
  (q.queue_name+' '+q.consumers.map(c=>c.script_name||'').join(' ')).toLowerCase().includes(term.trim().toLowerCase())),[term]);
 const rows=all?filtered:filtered.slice(0,6);
 const detail=chosen?evidence.queues.find(q=>q.queue_id===chosen):null;
 const workerConsumerCount=evidence.queues.filter(q=>q.consumers.some(c=>c.type==='worker')).length;
 return <section className="op4-cf op4-cf-queues" aria-label="Cloudflare Queues · mapa de consumidores">
  <div className="op4-cf-head"><div>
   <h4>Cloudflare Queues · trabajos pendientes y conexiones</h4>
   <p>Mapa de colas y consumidores verificado directamente en Cloudflare. Archivo fechado, no telemetría en tiempo real.</p>
  </div></div>
  <p className="op4-cf-status" role="status">ARCHIVO, NO EN VIVO · observado {format(evidence.observed_at)} · consumidores {evidence.consumer_verified_count}/{evidence.queue_count} · métricas {evidence.metric_verified_count}/{evidence.queue_count}</p>
  <div className="op4-cf-stats">
   <div><strong>{evidence.queue_count}</strong><small>Colas registradas</small></div>
   <div><strong>{workerConsumerCount}</strong><small>Colas con Worker consumidor</small></div>
   <div><strong>{evidence.known_backlog_count}</strong><small>Mensajes pendientes observados</small></div>
   <div><strong>{evidence.unknown_backlog_queues}</strong><small>Colas sin métricas</small></div>
  </div>
  <p className="op4-cf-note">El backlog es una estimación puntual del proveedor; cero mensajes pendientes NO demuestra que los trabajos se hayan completado correctamente. Consumidor configurado NO equivale a agente activo.</p>
  <label className="op4-cf-filter">Buscar cola o consumidor
   <input aria-label="Filtrar colas Cloudflare" value={term} onChange={e=>{setTerm(e.target.value);setAll(false)}} placeholder="Instagram, FACT, UMS, social…"/>
  </label>
  <div className="op4-cf-list" role="list">
   {rows.map(q=><div role="listitem" className="op4-cf-worker" key={q.queue_id}>
    <div><strong>{q.queue_name}</strong>
     <small>{q.consumers.length} consumidor(es): {q.consumers.map(c=>c.script_name||c.type).join(', ')||'sin consumidor verificado'}</small>
     <small>Pendientes: {q.backlog_count===null?'NO VERIFICADO':q.backlog_count+' (dato aproximado)'} · jurisdicción {q.jurisdiction||'sin verificar'}</small>
    </div>
    <button type="button" onClick={()=>setChosen(q.queue_id===chosen?null:q.queue_id)} aria-label={'Examinar cola '+q.queue_name}>Examinar</button>
   </div>)}
  </div>
  {!all&&filtered.length>6?<button type="button" onClick={()=>setAll(true)}>Ver las {filtered.length} colas filtradas</button>:null}
  {all&&filtered.length>6?<button type="button" onClick={()=>setAll(false)}>Mostrar menos</button>:null}
  {detail?<div className="op4-cf-detail" role="status"><strong>{detail.queue_name}</strong>
   <p>Cola Cloudflare {detail.jurisdiction||'jurisdicción no verificada'} · consumidor(es): {detail.consumers.map(c=>(c.script_name||c.type)+' (batch '+(c.settings?.batch_size??'?')+')').join('; ')||'ninguno'}</p>
   <p>Backlog observado {detail.backlog_count===null?'desconocido':detail.backlog_count}. Configuración de cron o permisos de publicación: no inferidos.</p>
   <p>Acciones pausar, reanudar, priorizar y enviar trabajos desde Operativa: <b>NO CONECTADAS</b>.</p>
  </div>:null}
 </section>;
}
