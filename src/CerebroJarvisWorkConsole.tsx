import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {Activity,ChevronDown,ChevronRight,Code2,Columns3,ExternalLink,FileText,FlaskConical,Folder,FolderOpen,Globe2,GripVertical,Maximize2,Minus,Paperclip,Radio,Search,Sparkles,Terminal} from 'lucide-react';
import CerebroConsoleShell from './CerebroConsoleShell';
import {fetchCerebroActivity,type CerebroActivityRun} from './cerebroActivityApi';
import projectRegistryJson from '../cerebro/registry/jarvis-project-registry.v1.json';
import auditIndexJson from '../cerebro/audit/jarvis-audit-index.v1.json';
import './cerebro-jarvis-work.css';

type SurfaceName='JARVIS'|'OPERATIVA';
type Props={surface?:SurfaceName};
type ProjectStatus='HECHO'|'EXISTENTE'|'PARCIAL'|'DEFINIDO'|'PLANIFICADO'|'POR_AUDITAR'|string;
type ProjectRecord={project_id:string;order:number;title:string;status:ProjectStatus;owner:string;editors:string[];autonomy_state:string;objective:string;subprojects:string[];dependencies:string[];audit_refs:string[];last_reconciled_at:string|null;source:string};
type ProjectRegistry={schema_version:string;company_id:string;engine_id:string;environment:string;version:string;editors:string[];projects:ProjectRecord[]};
type AuditCategory={audit_id:string;title:string;current_state:string;evidence_refs:string[]};
type AuditEvidence={evidence_id:string;recorded_at:string;source:string;summary:string};
type AuditIndex={audit_project_id:string;current_summary:{revision:number;updated_at:string;updated_by:string;text:string};categories:AuditCategory[];immutable_evidence:AuditEvidence[]};
type RightTab='activity'|'evidence'|'tools';
type LayoutState={left:number;right:number;leftOpen:boolean;rightOpen:boolean;maxCenter:boolean};

const registry=projectRegistryJson as unknown as ProjectRegistry;
const auditIndex=auditIndexJson as unknown as AuditIndex;
const ACTIVE_STATUSES=new Set(['in_progress','queued','waiting','requested','pending']);
const LAYOUT_KEY='cerebro_jarvis_workspace_layout_v1';
const DEFAULT_LAYOUT:LayoutState={left:286,right:330,leftOpen:true,rightOpen:true,maxCenter:false};

function clamp(value:number,min:number,max:number){return Math.min(max,Math.max(min,value))}
function displayProjectTitle(project:ProjectRecord){return project.project_id===auditIndex.audit_project_id?'Auditoría Total':project.title}
function activityLabel(run:CerebroActivityRun){return run.workflow_alias||run.engine_id||run.workflow_name.replace(/\bCEREBRO\b|\bPREPROD\b|\bPROD\b|\bLIVE\b/gi,'').replace(/[^A-Za-z0-9áéíóúüñÁÉÍÓÚÜÑ]+/g,' ').trim().slice(0,44)||'Actividad CEREBRO'}
function activityState(run:CerebroActivityRun){if(run.jobs_provenance==='REAL_GITHUB_JOBS'&&Number(run.running_jobs||0)>0)return'EN CURSO';if(run.jobs_provenance==='REAL_GITHUB_JOBS'&&Number(run.queued_jobs||0)>0)return'EN COLA';if(run.status==='completed')return run.conclusion==='success'?'COMPLETADO':'INCIDENCIA';if(run.status==='in_progress')return'EN CURSO';if(ACTIVE_STATUSES.has(run.status))return'EN COLA';return run.status.toUpperCase()}
function loadLayout(){if(typeof window==='undefined')return DEFAULT_LAYOUT;try{const parsed=JSON.parse(window.localStorage.getItem(LAYOUT_KEY)||'') as Partial<LayoutState>;return{left:clamp(Number(parsed.left)||DEFAULT_LAYOUT.left,228,430),right:clamp(Number(parsed.right)||DEFAULT_LAYOUT.right,270,460),leftOpen:parsed.leftOpen!==false,rightOpen:parsed.rightOpen!==false,maxCenter:parsed.maxCenter===true}}catch{return DEFAULT_LAYOUT}}
function setReactTextareaValue(textarea:HTMLTextAreaElement,value:string){const descriptor=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');descriptor?.set?.call(textarea,value);textarea.dispatchEvent(new Event('input',{bubbles:true}));textarea.dispatchEvent(new Event('change',{bubbles:true}))}

export default function CerebroJarvisWorkConsole({surface='JARVIS'}:Props){
 const[runs,setRuns]=useState<CerebroActivityRun[]>([]);
 const[source,setSource]=useState<'LIVE'|'CACHED'|'UNAVAILABLE'>('UNAVAILABLE');
 const[observedAt,setObservedAt]=useState('');
 const[query,setQuery]=useState('');
 const[selectedProjectId,setSelectedProjectId]=useState(auditIndex.audit_project_id);
 const[selectedSubproject,setSelectedSubproject]=useState<string|null>(auditIndex.categories[0]?.audit_id||null);
 const[expanded,setExpanded]=useState<Set<string>>(()=>new Set([auditIndex.audit_project_id]));
 const[rightTab,setRightTab]=useState<RightTab>('activity');
 const[layout,setLayout]=useState<LayoutState>(loadLayout);
 const dragRef=useRef<{side:'left'|'right';startX:number;startWidth:number}|null>(null);

 useEffect(()=>{try{window.localStorage.setItem(LAYOUT_KEY,JSON.stringify(layout))}catch{/* layout persistence is optional */}},[layout]);
 useEffect(()=>{let cancelled=false;const refresh=async()=>{const{status,data}=await fetchCerebroActivity();if(cancelled)return;if(status===200&&data?.status==='OK'){setRuns(data.runs||[]);setSource(data.source_status);setObservedAt(data.observed_at)}else setSource('UNAVAILABLE')};void refresh();const timer=window.setInterval(()=>{void refresh()},30_000);return()=>{cancelled=true;window.clearInterval(timer)}},[]);
 useEffect(()=>{const move=(event:PointerEvent)=>{const drag=dragRef.current;if(!drag)return;if(drag.side==='left')setLayout(current=>({...current,left:clamp(drag.startWidth+(event.clientX-drag.startX),228,430)}));else setLayout(current=>({...current,right:clamp(drag.startWidth-(event.clientX-drag.startX),270,460)}))};const stop=()=>{dragRef.current=null;document.body.classList.remove('jarvis-resizing')};window.addEventListener('pointermove',move);window.addEventListener('pointerup',stop);return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop)}},[]);

 const projects=useMemo(()=>[...registry.projects].sort((a,b)=>a.order-b.order),[]);
 const filteredProjects=useMemo(()=>{const term=query.trim().toLocaleLowerCase('es');if(!term)return projects;return projects.filter(project=>`${displayProjectTitle(project)} ${project.title} ${project.objective} ${project.subprojects.join(' ')}`.toLocaleLowerCase('es').includes(term))},[projects,query]);
 const selectedProject=projects.find(project=>project.project_id===selectedProjectId)||projects[0];
 const auditCategory=selectedProject.project_id===auditIndex.audit_project_id?auditIndex.categories.find(item=>item.audit_id===selectedSubproject)||null:null;
 const selectedSubTitle=auditCategory?.title||selectedSubproject;
 const activeCount=useMemo(()=>runs.filter(run=>ACTIVE_STATUSES.has(run.status)||Number(run.running_jobs||0)>0||Number(run.queued_jobs||0)>0).length,[runs]);
 const recentRuns=useMemo(()=>runs.slice(0,8),[runs]);
 const sourceLabel=source==='LIVE'?'Actividad conectada':source==='CACHED'?'Última actividad disponible':'Actividad no disponible';
 const selectedEvidenceRefs=useMemo(()=>auditCategory?.evidence_refs||selectedProject.audit_refs||[],[auditCategory,selectedProject]);
 const matchedEvidence=useMemo(()=>auditIndex.immutable_evidence.filter(item=>selectedEvidenceRefs.includes(item.evidence_id)),[selectedEvidenceRefs]);
 const workspaceStyle={'--jarvis-left-width':`${layout.left}px`,'--jarvis-right-width':`${layout.right}px`} as CSSProperties;
 const subprojects=selectedProject.project_id===auditIndex.audit_project_id?auditIndex.categories.map(item=>({id:item.audit_id,title:item.title,state:item.current_state})):selectedProject.subprojects.map(item=>({id:item,title:item,state:null}));

 function toggleProject(projectId:string){setExpanded(current=>{const next=new Set(current);if(next.has(projectId))next.delete(projectId);else next.add(projectId);return next})}
 function chooseProject(project:ProjectRecord){setSelectedProjectId(project.project_id);setExpanded(current=>new Set(current).add(project.project_id));if(project.project_id===auditIndex.audit_project_id)setSelectedSubproject(auditIndex.categories[0]?.audit_id||null);else setSelectedSubproject(project.subprojects[0]||null)}
 function beginResize(side:'left'|'right',event:React.PointerEvent){dragRef.current={side,startX:event.clientX,startWidth:side==='left'?layout.left:layout.right};document.body.classList.add('jarvis-resizing');event.currentTarget.setPointerCapture?.(event.pointerId)}
 function primeJarvisCommand(text:string,submit=false){const textarea=document.querySelector<HTMLTextAreaElement>('.jarvis-conversation .cerebro-chat-form textarea');if(!textarea)return;setReactTextareaValue(textarea,text);textarea.focus();if(submit){const form=textarea.closest('form');window.setTimeout(()=>form?.requestSubmit(),0)}}
 function editCurrentProject(){const scope=selectedSubTitle?` / ${selectedSubTitle}`:'';primeJarvisCommand(`Quiero actualizar el proyecto ${displayProjectTitle(selectedProject)}${scope}. Usa el Project Hub canónico, conserva evidencia e historial y limita el cambio a metadatos gobernados. Propón el cambio y ejecútalo solo si la política vigente lo permite.`)}
 function reconcileCurrentProject(){const scope=selectedSubTitle?` / ${selectedSubTitle}`:'';primeJarvisCommand(`Reconciliación de ${displayProjectTitle(selectedProject)}${scope}: compara el estado canónico con la evidencia viva disponible, actualiza únicamente metadatos permitidos en Project Hub, conserva historial append-only y devuelve HECHO / EXISTENTE / PARCIAL / DEFINIDO / PLANIFICADO / POR AUDITAR con evidencias.`,true)}
 function triggerVoice(){document.querySelector<HTMLButtonElement>('.jarvis-conversation .cerebro-voice-main')?.click()}
 function openBrowser(){window.location.assign('/cerebro?section=browser')}

 return <main className={`jarvis-work is-${surface.toLowerCase()}${layout.maxCenter?' is-max-center':''}`} aria-label={`CEREBRO ${surface}`}>
  <header className="jarvis-workspace-header">
   <div className="jarvis-workspace-brand"><span className="jarvis-energy-core" aria-hidden="true"><Sparkles size={17}/></span><div><small>CEREBRO OS</small><strong>JARVIS</strong></div></div>
   <div className="jarvis-workspace-context"><span>{registry.company_id.toUpperCase()}</span><i>/</i><b>{displayProjectTitle(selectedProject)}</b>{selectedSubTitle?<><i>/</i><em>{selectedSubTitle}</em></>:null}</div>
   <div className={`jarvis-evidence-state is-${source.toLowerCase()}`} title={observedAt?`Observado ${new Date(observedAt).toLocaleString('es-ES')}`:sourceLabel}><Radio size={12}/><span>{sourceLabel}</span>{activeCount>0?<b>{activeCount}</b>:null}</div>
  </header>

  <section className="jarvis-workspace" style={workspaceStyle}>
   {layout.leftOpen&&!layout.maxCenter?<aside className="jarvis-projects-pane" aria-label="Proyectos y subproyectos">
    <div className="jarvis-pane-heading"><div><small>PROYECTOS</small><strong>{projects.length} canónicos</strong></div><button type="button" onClick={()=>setLayout(current=>({...current,leftOpen:false}))} aria-label="Ocultar proyectos"><Minus size={15}/></button></div>
    <label className="jarvis-project-search"><Search size={14}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar proyecto…" aria-label="Buscar proyectos"/></label>
    <nav className="jarvis-project-tree" aria-label="Árbol de proyectos">
     {filteredProjects.map((project,index)=>{const open=expanded.has(project.project_id);const active=project.project_id===selectedProject.project_id;const children=project.project_id===auditIndex.audit_project_id?auditIndex.categories.map(item=>({id:item.audit_id,title:item.title,state:item.current_state})):project.subprojects.map(item=>({id:item,title:item,state:null}));return <div className={`jarvis-project-node${active?' is-active':''}`} key={project.project_id}>
      <div className="jarvis-project-row">
       <button type="button" className="jarvis-tree-toggle" onClick={()=>toggleProject(project.project_id)} aria-label={open?'Contraer subproyectos':'Expandir subproyectos'}>{open?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</button>
       <button type="button" className="jarvis-project-select" onClick={()=>chooseProject(project)} title={project.objective}>{open?<FolderOpen size={15}/>:<Folder size={15}/>}<span><strong>{index===0?'01 · ':''}{displayProjectTitle(project)}</strong><small>{project.status.replaceAll('_',' ')}</small></span></button>
      </div>
      {open?<div className="jarvis-subproject-list">{children.map(child=><button key={child.id} type="button" className={active&&selectedSubproject===child.id?'is-selected':''} onClick={()=>{chooseProject(project);setSelectedSubproject(child.id)}}><span>{child.title}</span>{child.state?<small>{child.state.replaceAll('_',' ')}</small>:null}</button>)}</div>:null}
     </div>})}
    </nav>
   </aside>:null}

   {layout.leftOpen&&!layout.maxCenter?<button type="button" className="jarvis-resize-handle is-left" onPointerDown={event=>beginResize('left',event)} aria-label="Redimensionar panel de proyectos"><GripVertical size={14}/></button>:null}

   <section className="jarvis-center-pane">
    <div className="jarvis-center-topbar">
     <div className="jarvis-center-project"><small>{selectedProject.project_id===auditIndex.audit_project_id?'PROYECTO 1':'PROYECTO'}</small><strong>{displayProjectTitle(selectedProject)}</strong>{selectedSubTitle?<span>› {selectedSubTitle}</span>:null}</div>
     <div className="jarvis-center-actions">
      {!layout.leftOpen&&!layout.maxCenter?<button type="button" onClick={()=>setLayout(current=>({...current,leftOpen:true}))}>Proyectos</button>:null}
      {!layout.rightOpen&&!layout.maxCenter?<button type="button" onClick={()=>setLayout(current=>({...current,rightOpen:true}))}>Ejecución</button>:null}
      <button type="button" onClick={()=>setLayout(current=>({...current,maxCenter:!current.maxCenter}))} title={layout.maxCenter?'Restaurar paneles':'Maximizar conversación'} aria-label={layout.maxCenter?'Restaurar paneles':'Maximizar conversación'}>{layout.maxCenter?<Columns3 size={15}/>:<Maximize2 size={15}/>}</button>
     </div>
    </div>
    <div className="jarvis-project-brief">
     <div><span className={`jarvis-status-pill is-${selectedProject.status.toLowerCase().replaceAll('_','-')}`}>{selectedProject.status.replaceAll('_',' ')}</span><p>{selectedProject.objective}</p></div>
     <div className="jarvis-project-brief-actions"><button type="button" onClick={editCurrentProject}>Editar con Jarvis</button><button type="button" onClick={reconcileCurrentProject}>Reconciliar</button></div>
    </div>
    {selectedProject.project_id===auditIndex.audit_project_id?<details className="jarvis-audit-summary"><summary>Resumen vivo de Auditoría Total · revisión {auditIndex.current_summary.revision}</summary><p>{auditIndex.current_summary.text}</p><small>Actualizado por {auditIndex.current_summary.updated_by} · {new Date(auditIndex.current_summary.updated_at).toLocaleString('es-ES')}</small></details>:null}
    <section className="jarvis-conversation" aria-label="Conversación con JARVIS"><CerebroConsoleShell/></section>
    <div className="jarvis-input-tools operativa-jarvis-composer" aria-label="Herramientas de entrada">
     <button type="button" aria-label="Añadir archivo"><Paperclip size={15}/> Adjuntar</button>
     <button type="button" onClick={triggerVoice} aria-label="Activar voz"><Radio size={14}/> Voz / dictado</button>
     <span>Archivos locales y privados · voz del navegador · envío por Gateway gobernado</span>
    </div>
   </section>

   {layout.rightOpen&&!layout.maxCenter?<button type="button" className="jarvis-resize-handle is-right" onPointerDown={event=>beginResize('right',event)} aria-label="Redimensionar panel de ejecución"><GripVertical size={14}/></button>:null}

   {layout.rightOpen&&!layout.maxCenter?<aside className="jarvis-execution-pane" aria-label="Ejecución y evidencias">
    <div className="jarvis-pane-heading"><div><small>EJECUCIÓN</small><strong>Evidencia y herramientas</strong></div><button type="button" onClick={()=>setLayout(current=>({...current,rightOpen:false}))} aria-label="Ocultar ejecución"><Minus size={15}/></button></div>
    <div className="jarvis-right-tabs" role="tablist">
     <button type="button" className={rightTab==='activity'?'is-active':''} onClick={()=>setRightTab('activity')}><Activity size={13}/> Actividad</button>
     <button type="button" className={rightTab==='evidence'?'is-active':''} onClick={()=>setRightTab('evidence')}><FileText size={13}/> Evidencia</button>
     <button type="button" className={rightTab==='tools'?'is-active':''} onClick={()=>setRightTab('tools')}><Code2 size={13}/> Herramientas</button>
    </div>

    {rightTab==='activity'?<div className="jarvis-right-scroll"><div className="jarvis-right-meta"><span>{sourceLabel}</span>{observedAt?<small>{new Date(observedAt).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</small>:null}</div>{recentRuns.length?recentRuns.map(run=><article key={run.run_id} className="jarvis-run-card"><div><strong>{activityLabel(run)}</strong><span>{run.engine_id||'Capacidad no publicada'} · {run.environment}</span></div><b>{activityState(run)}</b><a href={run.html_url} target="_blank" rel="noreferrer"><ExternalLink size={12}/> Evidencia</a></article>):<div className="jarvis-empty-state">No hay actividad publicable en este momento. No se inventan ejecuciones.</div>}</div>:null}

    {rightTab==='evidence'?<div className="jarvis-right-scroll"><div className="jarvis-evidence-project"><small>FUENTE CANÓNICA</small><strong>{displayProjectTitle(selectedProject)}</strong><span>{selectedSubTitle||selectedProject.project_id}</span></div>{selectedEvidenceRefs.length?<div className="jarvis-evidence-ref-list">{selectedEvidenceRefs.map(ref=><span key={ref}>{ref}</span>)}</div>:<div className="jarvis-empty-state">Sin referencias de evidencia publicadas para esta selección.</div>}{matchedEvidence.map(item=><article className="jarvis-evidence-card" key={item.evidence_id}><strong>{item.evidence_id}</strong><p>{item.summary}</p><small>{item.source} · {new Date(item.recorded_at).toLocaleString('es-ES')}</small></article>)}</div>:null}

    {rightTab==='tools'?<div className="jarvis-right-scroll jarvis-tool-grid">
     <button type="button" onClick={()=>document.querySelector<HTMLButtonElement>('.jarvis-input-tools button[aria-label="Añadir archivo"]')?.click()}><Paperclip size={16}/><span><strong>Archivos</strong><small>CONECTADO · extracción local</small></span></button>
     <button type="button" onClick={()=>primeJarvisCommand(`Trabaja con código para ${displayProjectTitle(selectedProject)}. Usa el runtime/repo disponible, muestra OLD vs NEW, tests y evidencia antes de cualquier promoción.`)}><Code2 size={16}/><span><strong>Código</strong><small>VÍA JARVIS · gobernado</small></span></button>
     <button type="button" onClick={()=>primeJarvisCommand(`Necesito una operación de terminal para ${displayProjectTitle(selectedProject)}. Usa únicamente un runtime permitido, registra comando, salida, tests y rollback; no inventes ejecución si no existe terminal conectada.`)}><Terminal size={16}/><span><strong>Terminal</strong><small>VÍA RUNTIME · evidencia obligatoria</small></span></button>
     <button type="button" onClick={openBrowser}><Globe2 size={16}/><span><strong>Navegador</strong><small>CONECTADO · superficie propia</small></span></button>
     <button type="button" onClick={()=>setRightTab('activity')}><FlaskConical size={16}/><span><strong>Tests</strong><small>CONECTADO · actividad real</small></span></button>
     <button type="button" onClick={()=>setRightTab('evidence')}><FileText size={16}/><span><strong>Evidencias</strong><small>CONECTADO · fuentes canónicas</small></span></button>
    </div>:null}
   </aside>:null}
  </section>
 </main>;
}