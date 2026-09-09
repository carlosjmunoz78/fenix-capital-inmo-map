import {useEffect,useMemo,useState} from 'react';
import {ChevronDown,FileText} from 'lucide-react';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchNotionRuntime} from './notionRuntime';
import './expediente-documents.css';

type Row=Record<string,any>;
type Response={items?:Row[]};

function belongsToExpediente(row:Row,code:string){
 const scope=String(row.scope_code||row.expediente_code||'');
 if(scope===code)return true;
 const rel=row.expediente_id;
 if(typeof rel==='string')return rel===code;
 if(Array.isArray(rel))return rel.some(x=>String(x?.id??x)===code);
 return false;
}
function docId(row:Row){return String(row.document_code||row.document_id||row.id||'')}
function show(v:any){return v===null||v===undefined||v===''?'—':String(v)}

export default function ExpedienteDocumentsPanel({expedienteId}:{expedienteId:string}){
 const navigate=useNavigate();
 const {pathname}=useLocation();
 const[loading,setLoading]=useState(true),[status,setStatus]=useState<number|null>(null),[rows,setRows]=useState<Row[]>([]),[open,setOpen]=useState(false);
 useEffect(()=>{
  let alive=true;
  setLoading(true);
  void fetchNotionRuntime<Response>('/documentos').then(r=>{
   if(!alive)return;
   setStatus(r.status);
   setRows(r.status===200?(r.data?.items??[]):[]);
   setLoading(false);
  }).catch(()=>{if(alive){setStatus(500);setRows([]);setLoading(false)}});
  return()=>{alive=false};
 },[expedienteId]);
 const docs=useMemo(()=>rows.filter(row=>belongsToExpediente(row,expedienteId)),[rows,expedienteId]);
 return <section className="exp-documents-panel" aria-label="Documentación del expediente" data-testid="expediente-documents-panel">
  <button type="button" className="exp-documents-head exp-documents-toggle" onClick={()=>setOpen(v=>!v)} aria-expanded={open} data-testid="expediente-documents-toggle"><div><span>DOCUMENTOS</span><h2>Documentación de este expediente</h2><p>{open?'Ocultar documentos':'Pulsa para ver todos los documentos vinculados.'}</p></div><strong data-testid="expediente-document-count">{loading?'Cargando…':`${docs.length} documento${docs.length===1?'':'s'}`} <ChevronDown size={17} className={open?'is-open':''}/></strong></button>
  {open&&<div data-testid="expediente-documents-content">
   {status===403&&<div className="ops-message">Tu perfil no puede consultar la documentación de este expediente.</div>}
   {!loading&&status!==403&&status!==200&&<div className="ops-message">No se pudo cargar la documentación vinculada.</div>}
   {!loading&&status===200&&docs.length===0&&<div className="exp-documents-empty">Este expediente no tiene documentación vinculada visible.</div>}
   {docs.length>0&&<div className="exp-documents-grid">{docs.map(row=>{const id=docId(row);const analysis=String(row.analysis_state||'').trim();return <button type="button" className="exp-document-card" key={id} onClick={()=>navigate(`/documentos/${encodeURIComponent(id)}?returnTo=${encodeURIComponent(pathname)}`)}><FileText size={18}/><small>{show(row.tipo)}</small><strong>{show(row.title||row.documento)}</strong><span>{show(row.estado)}{analysis?` · ${analysis}`:''} · Abrir documento →</span></button>})}</div>}
  </div>}
 </section>;
}
