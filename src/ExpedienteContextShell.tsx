import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {Brain,CheckSquare,FileText,Landmark,MessageCircle,ShieldCheck} from 'lucide-react';
import ExpedienteDetailAuthorizedNav from './ExpedienteDetailAuthorizedNav';
import ExpedienteDocumentsPanel from './ExpedienteDocumentsPanel';
import {fetchAppApi,fetchEnvironmentApi} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import {anaAvatar} from './assets/visualAssets';
import './operational.css';
import './detail-expediente.css';
import './expediente-context-shell.css';

type Tab='documentacion'|'analisis'|'banco'|'tareas';
type AnyRow=Record<string,any>;
type Workspace={ok?:boolean;status?:number;expediente?:AnyRow;personas?:AnyRow[];counts?:Record<string,number>;qa?:{blockers?:unknown[];warnings?:unknown[]};lifecycle?:{effective_stage?:string;recorded_stage?:string}};
type Advice={ok?:boolean;action?:string|null;why?:string;blocking_reason?:string;people?:{count?:number;missing_docs?:number;missing_data?:number};ana?:{can_execute?:boolean;would_do?:string;blocked_by?:string}};
type Rank={bank_id:string;bank:string;score:number;reasons?:string[];risks?:string[];requires_belen?:boolean};
type Ranking={ok?:boolean;ranking?:Rank[];strategy_status?:string;requires_belen_gate?:boolean};

type TaskRow=Record<string,unknown>;
function rowsFrom(data:unknown):TaskRow[]{if(!data||typeof data!=='object')return[];const x=data as Record<string,unknown>;return Array.isArray(x.items)?x.items as TaskRow[]:[];}
function sval(v:unknown){return v===null||v===undefined||v===''?'—':String(v)}
function nameOf(row:AnyRow|undefined){return String(row?.cliente_alias||row?.cliente||row?.nombre_cliente||row?.nombre||row?.expediente||'Expediente')}
function taskId(r:TaskRow){return String(r.id||r.tarea_id||r.tarea_code||r.code||'')}
function taskTitle(r:TaskRow){return String(r.tarea||r.titulo||r['título']||r.nombre||r.title||'Tarea sin título visible')}
function taskState(r:TaskRow){return String(r.estado||r.status||'Sin estado')}
function taskDue(r:TaskRow){return String(r.fecha_limite||r['fecha_límite']||r.vencimiento||r.fecha||r.due_date||'Sin fecha')}
function sameCode(v:unknown,code:string){
 if(typeof v==='string')return v===code||decodeURIComponent(v)===code;
 if(Array.isArray(v))return v.some(x=>sameCode((x as any)?.id??x,code));
 if(v&&typeof v==='object'){const x=v as Record<string,unknown>;return sameCode(x.id,code)||sameCode(x.code,code)||sameCode(x.expediente_code,code);}
 return false;
}
function belongsTask(r:TaskRow,code:string){
 const keys=['expediente_code','expediente_id','expediente','scope_code','origin_code','related_expediente'];
 return keys.some(k=>sameCode(r[k],code));
}
function issue(v:unknown){if(typeof v==='string')return v;if(v&&typeof v==='object'){const x=v as Record<string,unknown>;return String(x.message||x.detail||x.error||x.code||'');}return'';}

export default function ExpedienteContextShell(){
 const location=useLocation(),navigate=useNavigate();
 const match=location.pathname.match(/^\/expedientes\/([^/]+)\/(documentacion|analisis|banco|tareas)\/?$/);
 const code=match?.[1]?decodeURIComponent(match[1]):'';
 const tab=(match?.[2]||'documentacion') as Tab;
 const[workspace,setWorkspace]=useState<Workspace|null>(null),[detail,setDetail]=useState<AnyRow|null>(null),[advice,setAdvice]=useState<Advice|null>(null),[ranking,setRanking]=useState<Ranking|null>(null),[tasks,setTasks]=useState<TaskRow[]>([]),[status,setStatus]=useState('Cargando contexto del expediente…');
 useEffect(()=>{
  if(!code)return;let alive=true;setStatus('Cargando contexto del expediente…');
  void Promise.all([
   fetchAppApi<Workspace>(`/expedientes/${encodeURIComponent(code)}/workspace`),
   fetchNotionRuntime<any>(`/expedientes/${encodeURIComponent(code)}`),
   fetchEnvironmentApi<Advice>('fenix-expediente-assistant',`/expedientes/${encodeURIComponent(code)}/advice`),
   fetchEnvironmentApi<Ranking>('fenix-bank-ranking',`/expedientes/${encodeURIComponent(code)}/ranking`),
   fetchNotionRuntime<unknown>('/tareas')
  ]).then(([w,d,a,b,t])=>{
   if(!alive)return;
   setWorkspace(w.status===200?w.data:null);
   const body=d.data as any;setDetail(d.status===200?(body?.item||body?.expediente||null):null);
   setAdvice(a.status===200?a.data:null);setRanking(b.status===200?b.data:null);
   setTasks(t.status===200?rowsFrom(t.data).filter(r=>belongsTask(r,code)):[]);
   setStatus(w.status===200||d.status===200?'':'No se pudo cargar el expediente autorizado.');
  }).catch(()=>{if(alive)setStatus('No se pudo cargar el expediente autorizado.')});
  return()=>{alive=false};
 },[code]);
 const exp=workspace?.expediente||detail||{};
 const displayName=nameOf(exp);
 const stage=String(workspace?.lifecycle?.effective_stage||exp.stage||exp.fase||'Sin fase');
 const blockers=useMemo(()=>(workspace?.qa?.blockers||[]).map(issue).filter(Boolean),[workspace]);
 const warnings=useMemo(()=>(workspace?.qa?.warnings||[]).map(issue).filter(Boolean),[workspace]);
 const banks=(ranking?.ranking||[]).slice(0,3);
 const tabs:Array<[Tab,string]>=[['documentacion','Documentación'],['analisis','Análisis'],['banco','Banco'],['tareas','Tareas']];
 if(!match)return null;
 function go(t:Tab|'resumen'){navigate(t==='resumen'?`/expedientes/${encodeURIComponent(code)}`:`/expedientes/${encodeURIComponent(code)}/${t}`)}
 function openAna(mode='help'){navigate(`/ana?mode=${mode}&scope_type=expediente&scope_code=${encodeURIComponent(code)}&stage=${encodeURIComponent(stage)}`)}
 return <div className="ops-root detail-exp-root exp-context-root" style={{zIndex:5200}} data-theme={(sessionStorage.getItem('fenix-theme')||'light')}>
  <ExpedienteDetailAuthorizedNav/>
  <main className="ops-main detail-exp-main"><section className="ops-content detail-exp-content">
   <article className="detail-ana-hero exp-context-ana"><img src={anaAvatar} alt="Ana"/><div className="detail-ana-copy"><span>ANA · {displayName.toUpperCase()} · {tab.toUpperCase()}</span><h2>{advice?.action||`Trabajando en ${stage}`}</h2><p>{advice?.why||advice?.blocking_reason||'Estoy usando únicamente el contexto vivo de este expediente.'}</p><div className="exp-context-ana-actions"><button className="primary" onClick={()=>openAna('do')}>Que lo haga Ana</button><button onClick={()=>openAna('help')}>Ayúdame</button></div></div></article>
   <button className="detail-back" onClick={()=>navigate('/expedientes')}>← Volver a expedientes</button>
   <div className="detail-master-title"><span>FICHA MAESTRA · {stage}</span><h1>{displayName}</h1><p>Todo lo que ves en esta barra pertenece exclusivamente a este expediente.</p></div>
   {status&&<div className="ops-message">{status}</div>}
   <nav className="detail-tabs exp-context-tabs" aria-label="Secciones del expediente"><button onClick={()=>go('resumen')}>Resumen</button>{tabs.map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>go(key)}>{label}</button>)}</nav>

   {tab==='documentacion'&&<section className="exp-context-view" data-testid="expediente-context-documentacion"><div className="exp-context-heading"><FileText size={20}/><div><small>DOCUMENTACIÓN CONTEXTUAL</small><h2>Documentos de {displayName}</h2><p>No se mezclan archivos de otros expedientes.</p></div></div><ExpedienteDocumentsPanel expedienteId={code}/></section>}

   {tab==='analisis'&&<section className="exp-context-view" data-testid="expediente-context-analisis"><div className="exp-context-heading"><Brain size={20}/><div><small>ANÁLISIS VIVO</small><h2>Ana analiza el expediente con los datos disponibles</h2><p>Si falta un dato crítico, se mantiene como bloqueo real en vez de inventarlo.</p></div></div><div className="exp-context-grid"><article><small>FASE</small><strong>{stage}</strong><span>{workspace?.counts?.documentos??0} documentos · {workspace?.personas?.length??workspace?.counts?.personas??0} intervinientes</span></article><article><small>CONTROL DOCUMENTAL</small><strong>{blockers.length?`${blockers.length} bloqueo${blockers.length===1?'':'s'}`:'Sin bloqueos registrados'}</strong><span>{blockers[0]||warnings[0]||'La fuente canónica no registra avisos críticos.'}</span></article><article><small>SIGUIENTE ACCIÓN DE ANA</small><strong>{advice?.action||'Pendiente de respuesta del motor de Ana'}</strong><span>{advice?.why||advice?.blocking_reason||'Sin justificación disponible todavía.'}</span></article></div><section className="exp-context-banks"><h3>Bancos con mejor encaje</h3>{banks.length?banks.map((b,i)=><article key={b.bank_id}><small>OPCIÓN {i+1} · ENCAJE {b.score}/100</small><strong>{b.bank}</strong><p>{(b.reasons||[]).join(' ')||'Sin motivo detallado disponible.'}</p>{b.risks?.length?<em>Revisar: {b.risks.join(' ')}</em>:null}</article>):<div className="ops-message">El ranking bancario todavía no devuelve alternativas válidas para este expediente.</div>}</section></section>}

   {tab==='banco'&&<section className="exp-context-view" data-testid="expediente-context-banco"><div className="exp-context-heading"><Landmark size={20}/><div><small>BANCO · EXPEDIENTE ACTUAL</small><h2>Estrategia y preparación bancaria</h2><p>La selección y preparación se hacen aquí; el análisis permanece separado.</p></div></div><div className="exp-context-grid"><article><small>ENVÍOS REGISTRADOS</small><strong>{workspace?.counts?.envios_banco??0}</strong><span>Trazabilidad canónica de este expediente</span></article><article><small>CONTROL</small><strong>{ranking?.requires_belen_gate?'Revisión de Belén requerida':'Sin gate adicional informado'}</strong><span>{ranking?.strategy_status||'Estado de estrategia no informado'}</span></article></div><section className="exp-context-banks"><h3>Alternativas preparadas</h3>{banks.length?banks.map((b,i)=><article key={b.bank_id}><small>OPCIÓN {i+1} · ENCAJE {b.score}/100</small><strong>{b.bank}</strong><p>{(b.reasons||[]).join(' ')||'Sin motivo detallado disponible.'}</p><button onClick={()=>navigate(`/bancos/${encodeURIComponent(b.bank_id)}`)}>Revisar banco</button></article>):<div className="ops-message">No hay una alternativa bancaria calculada todavía.</div>}</section><div className="exp-context-bank-actions"><button className="primary" onClick={()=>openAna('do')}><ShieldCheck size={16}/> Preparar con Ana</button><span>La preparación no se confunde con un envío real ni se marca como enviado sin evidencia.</span></div></section>}

   {tab==='tareas'&&<section className="exp-context-view" data-testid="expediente-context-tareas"><div className="exp-context-heading"><CheckSquare size={20}/><div><small>TAREAS · EXPEDIENTE ACTUAL</small><h2>Trabajo y seguimiento de {displayName}</h2><p>Solo tareas relacionadas con este expediente.</p></div></div><div className="exp-context-task-actions"><button onClick={()=>navigate(`/tareas/nueva?expediente=${encodeURIComponent(code)}`)}>+ Nueva tarea</button><button onClick={()=>navigate(`/comunicaciones/nueva?scope_type=expediente&scope_code=${encodeURIComponent(code)}`)}><MessageCircle size={16}/> Nueva comunicación</button></div>{tasks.length?<div className="exp-context-task-list">{tasks.map((r,i)=>{const id=taskId(r);return <button key={id||i} onClick={()=>id&&navigate(`/tareas/${encodeURIComponent(id)}`)}><span><strong>{taskTitle(r)}</strong><small>{taskState(r)} · {taskDue(r)}</small></span><b>→</b></button>})}</div>:<div className="exp-documents-empty">No hay tareas vinculadas visibles para este expediente.</div>}</section>}
  </section></main>
 </div>;
}
