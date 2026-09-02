import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {FileText,FolderOpen} from 'lucide-react';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchNotionRuntime} from './notionRuntime';

type Row=Record<string,unknown>;
type RuntimeResponse={items?:Row[]};

const css=`
.exp-docs-host{margin:18px 0}.exp-docs-panel{border:1px solid var(--border,#e5e7eb);border-radius:22px;background:var(--surface,#fff);padding:20px;color:inherit}.exp-docs-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:15px}.exp-docs-head>div{display:flex;gap:11px;align-items:flex-start}.exp-docs-icon{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:rgba(244,116,31,.12);color:#f4741f;flex:0 0 auto}.exp-docs-head small{display:block;color:#f4741f;font-size:10px;font-weight:850;letter-spacing:.13em}.exp-docs-head h2{margin:4px 0 4px;font-size:19px}.exp-docs-head p{margin:0;color:var(--muted,#667085);font-size:12px;line-height:1.45}.exp-docs-count{border:1px solid var(--border,#e5e7eb);border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800;white-space:nowrap}.exp-docs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:11px}.exp-doc-card{border:1px solid var(--border,#e5e7eb);border-radius:16px;background:var(--surface,#fff);padding:15px;display:grid;gap:8px;text-align:left;color:inherit;cursor:pointer}.exp-doc-card:hover{border-color:#f4741f;box-shadow:0 7px 18px rgba(244,116,31,.08)}.exp-doc-card small{color:#f4741f;font-size:9.5px;font-weight:800;letter-spacing:.08em}.exp-doc-card strong{font-size:14px}.exp-doc-card span{font-size:11px;color:var(--muted,#667085)}.exp-doc-empty{border:1px dashed var(--border,#d0d5dd);border-radius:16px;padding:18px;display:flex;gap:10px;align-items:center;color:var(--muted,#667085);font-size:12px}.exp-docs-panel[data-state='error'] .exp-doc-empty{border-style:solid}.detail-exp-root[data-theme='dark'] .exp-docs-panel,.detail-exp-root[data-theme='dark'] .exp-doc-card{background:#202023;border-color:#39393e;color:#f4f4f5}.detail-exp-root[data-theme='dark'] .exp-docs-count{border-color:#39393e}@media(max-width:760px){.exp-docs-head{flex-direction:column}.exp-docs-grid{grid-template-columns:1fr}}
`;

function normalizeId(value:string){return value.replaceAll('-','').trim().toLowerCase();}
function relationContains(value:unknown,target:string):boolean{
 const wanted=normalizeId(target);if(!wanted)return false;
 if(typeof value==='string')return normalizeId(value)===wanted;
 if(Array.isArray(value))return value.some(v=>relationContains(v,target));
 if(value&&typeof value==='object'){
  const o=value as Record<string,unknown>;
  for(const key of ['id','page_id','expediente_id','value'])if(relationContains(o[key],target))return true;
 }
 return false;
}
function belongsToExpediente(row:Row,target:string){
 if(relationContains(row.expediente_id,target))return true;
 const scopeType=typeof row.scope_type==='string'?row.scope_type.trim().toLowerCase():'';
 return scopeType==='expediente'&&relationContains(row.scope_code,target);
}
function rowsFrom(data:unknown):Row[]{if(!data||typeof data!=='object')return[];const d=data as RuntimeResponse;return Array.isArray(d.items)?d.items:[];}
function text(row:Row,keys:string[]){for(const key of keys){const v=row[key];if(typeof v==='string'&&v.trim())return v.trim();}return'';}
function idOf(row:Row){return text(row,['document_id','id','documento_id','document_code','code']);}
function nameOf(row:Row){return text(row,['title','documento','nombre','titulo','título'])||'Documento sin nombre';}
function typeOf(row:Row){return text(row,['tipo_canónico','tipo_canónico','tipo','categoria','categoría'])||'Documento';}
function stateOf(row:Row){return text(row,['estado','status'])||'Estado no disponible';}

export default function ExpedienteDocumentsGuard(){
 const location=useLocation(),navigate=useNavigate();
 const match=location.pathname.match(/^\/expedientes\/([^/]+)$/);const code=match?.[1]?decodeURIComponent(match[1]):'';const active=Boolean(match)&&code!=='nuevo';
 const[host,setHost]=useState<HTMLElement|null>(null),[rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(false),[status,setStatus]=useState<number|null>(null);
 useEffect(()=>{
  if(!active){setHost(null);return;}
  const place=()=>{
   const root=document.querySelector('.detail-exp-content');if(!root){setHost(null);return;}
   let node=root.querySelector(':scope > .exp-docs-host') as HTMLElement|null;
   if(!node){node=document.createElement('section');node.className='exp-docs-host';node.id='expediente-documentacion';const tabs=root.querySelector(':scope > .detail-tabs');tabs?.insertAdjacentElement('afterend',node);if(!tabs)root.appendChild(node);}
   setHost(node);
  };
  place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true});
  const onClick=(event:Event)=>{const button=(event.target as Element|null)?.closest('button');if(!button||!button.closest('.detail-exp-root'))return;const label=(button.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();if(label==='documentación'||label.includes('revisar bloqueos')){event.preventDefault();event.stopPropagation();document.getElementById('expediente-documentacion')?.scrollIntoView({behavior:'smooth',block:'start'});}else if(label.includes('subir documentación')){const launcher=document.querySelector<HTMLButtonElement>('[data-testid="context-evidence-open"]');if(launcher){event.preventDefault();event.stopPropagation();launcher.click();}}
  };
  document.addEventListener('click',onClick,true);
  return()=>{observer.disconnect();document.removeEventListener('click',onClick,true);document.querySelector('.exp-docs-host')?.remove();};
 },[active,code]);
 useEffect(()=>{if(!active)return;let alive=true;(async()=>{setLoading(true);setStatus(null);setRows([]);try{const r=await fetchNotionRuntime<unknown>('/documentos');if(!alive)return;setStatus(r.status);if(r.status===200)setRows(rowsFrom(r.data).filter(row=>belongsToExpediente(row,code)));}catch{if(alive)setStatus(0);}finally{if(alive)setLoading(false);}})();return()=>{alive=false};},[active,code]);
 const visible=useMemo(()=>rows.filter(r=>Boolean(idOf(r))),[rows]);
 if(!active||!host)return null;
 const returnTo=location.pathname+location.search;
 return createPortal(<><style>{css}</style><article className="exp-docs-panel" data-testid="expediente-documents" data-state={status===200?'ok':status===null?'loading':'error'}><div className="exp-docs-head"><div><div className="exp-docs-icon"><FolderOpen size={19}/></div><div><small>DOCUMENTACIÓN DEL EXPEDIENTE</small><h2>Archivos ya vinculados a este expediente</h2><p>Solo se muestran documentos cuya relación canónica corresponde exactamente a este expediente. Al abrir uno, verás únicamente ese documento.</p></div></div><span className="exp-docs-count">{loading?'Cargando…':`${visible.length} documento${visible.length===1?'':'s'}`}</span></div>{loading?<div className="exp-doc-empty"><FileText size={18}/>Consultando documentación autorizada…</div>:status!==200?<div className="exp-doc-empty"><FileText size={18}/>No se pudo cargar la documentación vinculada.</div>:visible.length===0?<div className="exp-doc-empty"><FileText size={18}/>Este expediente no tiene documentación vinculada visible.</div>:<div className="exp-docs-grid">{visible.map(row=>{const id=idOf(row);return <button type="button" className="exp-doc-card" key={id} onClick={()=>navigate(`/documentos/${encodeURIComponent(id)}?returnTo=${encodeURIComponent(returnTo)}`)}><small>{typeOf(row)}</small><strong>{nameOf(row)}</strong><span>{stateOf(row)} · Abrir solo este documento →</span></button>})}</div>}</article></>,host);
}
