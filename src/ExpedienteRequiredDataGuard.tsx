import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {ClipboardList} from 'lucide-react';
import {fetchNotionRuntime} from './notionRuntime';
import ExpedientePeopleProdGuard from './ExpedientePeopleProdGuard';
import ExpedientePeopleAccordionGuard from './ExpedientePeopleAccordionGuard';

type Row=Record<string,unknown>;
function first(row:Row|undefined,keys:string[]){if(!row)return'';for(const k of keys){const v=row[k];if(typeof v==='string'&&v.trim())return v.trim();if(typeof v==='number'&&Number.isFinite(v))return String(v);if(Array.isArray(v)&&v.length)return v.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(', ');}return'';}
const show=(v:string)=>v||'No informado';

export default function ExpedienteRequiredDataGuard(){
 const location=useLocation();
 const match=location.pathname.match(/^\/expedientes\/([^/]+)$/);const id=match?.[1]?decodeURIComponent(match[1]):'';const active=Boolean(match&&id&&id!=='nuevo');
 const[host,setHost]=useState<HTMLElement|null>(null),[row,setRow]=useState<Row|null>(null),[status,setStatus]=useState<number|null>(null);
 useEffect(()=>{if(!active){setHost(null);return;}const place=()=>{const root=document.querySelector('.detail-exp-content') as HTMLElement|null;if(!root)return;let node=root.querySelector(':scope > .exp-required-data-host') as HTMLElement|null;if(!node){node=document.createElement('section');node.className='exp-required-data-host';const grid=root.querySelector('.detail-summary-grid');grid?.insertAdjacentElement('afterend',node);if(!grid)root.prepend(node)}setHost(node)};place();const obs=new MutationObserver(place);obs.observe(document.body,{childList:true,subtree:true});return()=>{obs.disconnect();document.querySelector('.exp-required-data-host')?.remove();setHost(null)}},[active,id]);
 useEffect(()=>{if(!active)return;let alive=true;setRow(null);setStatus(null);void fetchNotionRuntime<any>(`/expedientes/${encodeURIComponent(id)}`).then(r=>{if(!alive)return;setStatus(r.status);setRow(r.status===200?(r.data?.item||r.data?.expediente||null):null)});return()=>{alive=false}},[active,id]);
 if(!active||!host)return null;
 const fields=row?[
 ['Cliente/s',show(first(row,['cliente','clientes','cliente_nombre','nombre_cliente']))],
 ['Origen',show(first(row,['origen','procedencia','fuente','canal']))],
 ['Inmobiliaria',show(first(row,['inmobiliaria','inmobiliaria_nombre','agencia']))],
 ['Financiero',show(first(row,['financiero','financiero_nombre','responsable','id_trabajador_operativo']))],
 ['Visitador',show(first(row,['visitador','visitador_nombre']))],
 ['Precio',show(first(row,['precio','precio_compra','precio_vivienda','importe_compra']))],
 ['Financiación solicitada',show(first(row,['financiacion_solicitada','importe_financiacion','importe_solicitado','importe_hipoteca']))],
 ['Aportación',show(first(row,['aportacion','aportacion_cliente','fondos_propios']))],
 ['Ratio',show(first(row,['ratio','ratio_endeudamiento','ratio_financiero']))],
 ['Ahorro',show(first(row,['ahorro','ahorros','ahorro_disponible']))],
 ['Banco',show(first(row,['banco','banco_nombre','entidad']))],
 ['Estado',show(first(row,['estado','fase','status']))],
 ['Riesgos',show(first(row,['riesgos','riesgo','alertas']))],
 ['Próxima acción',show(first(row,['proxima_accion','próxima_accion','siguiente_accion','next_action']))],
 ['Documentación',show(first(row,['documentacion','estado_documentacion','documentos']))],
 ['Historial',show(first(row,['historial','historico','history']))]
 ]:[];
 return <>
  {createPortal(<section className="exp-ana-memory" data-testid="expediente-required-data" style={{marginTop:14}}><div className="exp-ana-memory-head"><ClipboardList size={16}/><strong>Datos completos del expediente</strong></div>{status===null?<p>Cargando datos…</p>:status!==200||!row?<p>No se pudieron cargar los datos canónicos del expediente.</p>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>{fields.map(([label,value])=><article key={label} style={{border:'1px solid var(--border,#e5e7eb)',borderRadius:12,padding:'10px 12px'}}><small>{label}</small><p style={{margin:'4px 0 0'}}><strong>{value}</strong></p></article>)}</div>}</section>,host)}
  <ExpedientePeopleProdGuard/>
  <ExpedientePeopleAccordionGuard/>
 </>
}
