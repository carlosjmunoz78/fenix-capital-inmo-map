import {useMemo,useState,type FormEvent,type KeyboardEvent,type ReactNode,type Ref} from 'react';
import {
 Activity,AudioLines,BarChart3,Building2,CheckCircle2,ChevronLeft,ChevronRight,
 CircleAlert,Clock3,Cpu,Database,ExternalLink,FileCheck2,Layers3,Mic,Play,
 Search,Send,ShieldCheck,Square,Workflow,Volume2
} from 'lucide-react';
import type {CerebroActivityRun} from './cerebroActivityApi';
import type {OwnerUniverseResult} from './cerebroOperativaLabUniverseApi';
import CerebroOperativaUniverseViews from './CerebroOperativaUniverseViews';
import CerebroAudioDiagnostics from './CerebroAudioDiagnostics';
import './cerebro-operative-cockpit-v3.css';

type VoiceSnapshot={ready:boolean;sending:boolean;voiceActive:boolean;voiceListening:boolean;voiceSpeaking:boolean};
type Company='all'|'fenix'|'aion'|'captacasa';
type View='resumen'|'entidades'|'proyectos'|'motores'|'trabajos'|'evidencias'|'decisiones';
type FeedStatus='LIVE'|'CACHED'|'UNAVAILABLE';
type Props={
 snapshot:VoiceSnapshot;composer:string;onComposerChange:(value:string)=>void;
 onSubmit:()=>void;onToggleVoice:()=>void;onToggleDictation:()=>void;
 dictating:boolean;dictationSupported:boolean;dictationError:string;
 voiceFeedback:string;onReadLastReply:()=>void;ttsActive:boolean;onStopVoice:()=>void;
 composerRef:Ref<HTMLTextAreaElement>;source:FeedStatus;observedAt:string;
 company:Company;onCompanyChange:(value:Company)=>void;
 runs:CerebroActivityRun[];onOpenRun:(run:CerebroActivityRun)=>void;
 ownerUniverse:OwnerUniverseResult;
 scopeCanExecute:boolean;
 chatLines:{role:'user'|'cerebro';text:string}[];
 children:ReactNode;
};
const NAV:readonly [View,string,typeof Building2][]=[
 ['entidades','Entidades',Building2],['proyectos','Proyectos',Layers3],
 ['motores','Motores',Cpu],['trabajos','Trabajos',Workflow],
 ['evidencias','Evidencias',FileCheck2]
];
const NAMES:Record<Company,string>={
 all:'Empresas vinculadas',fenix:'Fénix',aion:'AION',captacasa:'CAPTACASA'
};
const CURRENT=new Set(['in_progress']);
const PENDING=new Set(['queued','waiting','requested','pending']);
const FAILURES=new Set(['failure','timed_out','action_required']);
function realRunning(run:CerebroActivityRun){
 if(run.jobs_provenance==='REAL_GITHUB_JOBS'&&run.running_jobs!=null)
  return Math.max(0,Number(run.running_jobs)||0);
 return CURRENT.has(run.status)?1:0;
}
function realPending(run:CerebroActivityRun){
 if(run.jobs_provenance==='REAL_GITHUB_JOBS'&&run.queued_jobs!=null)
  return Math.max(0,Number(run.queued_jobs)||0);
 return PENDING.has(run.status)?1:0;
}
function isFailed(run:CerebroActivityRun){
 return run.status==='completed'&&FAILURES.has(String(run.conclusion||''));
}
function runLabel(run:CerebroActivityRun){
 return String(run.workflow_alias||run.workflow_name||'Trabajo sin nombre').slice(0,110);
}
function runTime(value:string){
 const d=new Date(value);return Number.isFinite(d.getTime())?
  d.toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Sin fecha';
}
function validLink(run:CerebroActivityRun){
 try{const url=new URL(run.html_url);return url.protocol==='https:'&&url.hostname==='github.com'&&
  url.pathname.startsWith('/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/')?url.href:null}
 catch{return null}
}
function spanCount(n:number,one:string,many:string){return n===1?one:many}
function initialOperativaPreviewPanel():View{
 if(typeof window==='undefined')return 'resumen';
 const query=new URLSearchParams(window.location.search);
 if(!/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/.test(window.location.hostname))return 'resumen';
 if(query.get('section')!=='operativa'||query.get('visual_lab')!=='cockpit-v3')return 'resumen';
 // Preview-only deep link; user/role checks remain in the existing ConsoleHost.
 return query.get('op3_panel')==='motores'?'motores':'resumen';
}

export default function CerebroOperativeCockpitV3({
 snapshot,composer,onComposerChange,onSubmit,onToggleVoice,onToggleDictation,
 dictating,dictationSupported,dictationError,voiceFeedback,onReadLastReply,ttsActive,onStopVoice,composerRef,source,observedAt,
 company,onCompanyChange,runs,onOpenRun,ownerUniverse,scopeCanExecute,chatLines,children
}:Props){
 const[view,setView]=useState<View>(initialOperativaPreviewPanel);
 const running=useMemo(()=>runs.reduce((n,r)=>n+realRunning(r),0),[runs]);
 const queued=useMemo(()=>runs.reduce((n,r)=>n+realPending(r),0),[runs]);
 const failed=useMemo(()=>runs.filter(isFailed),[runs]);
 const recent=useMemo(()=>runs.filter(r=>r.status==='completed'&&r.conclusion==='success'),[runs]);
 const status= snapshot.voiceSpeaking?'speaking':
  snapshot.voiceListening?'listening':
  (snapshot.sending?'responding':
  composer.trim()?'typing':
  running>0?'working':'idle');
 const statusText={
  speaking:'Hablando contigo',listening:'Escuchando',
  responding:'Procesando tu petición',typing:'Preparado para recibir tu instrucción',
  working:'Hay trabajos en ejecución',idle:'En espera de instrucciones'
 }[status];
 const provenance=source==='LIVE'?'Datos observados':source==='CACHED'?'Última captura disponible':'Sin conexión verificable';
 const showLive=source!=='UNAVAILABLE';
 function handleSubmit(event:FormEvent){event.preventDefault();if(scopeCanExecute)onSubmit()}
 function keydown(event:KeyboardEvent<HTMLTextAreaElement>){
  if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();if(scopeCanExecute)onSubmit()}
 }
 const recentRuns=runs.slice(0,14);
 const selectPanel=(next:View)=>setView(next);
 const modules=useMemo(()=>{
  const engines=new Map<string,{count:number;running:number}>();
  for(const run of runs){
   const name=run.engine_id?.trim();
   if(!name)continue;
   const item=engines.get(name)||{count:0,running:0};
   item.count++;item.running+=realRunning(run);engines.set(name,item);
  }
  return [...engines.entries()].sort((a,b)=>b[1].count-a[1].count);
 },[runs]);
 const canSend=scopeCanExecute&&snapshot.ready&&!snapshot.sending;
 return <main className={`op3-root op3-${status}`} aria-label={typeof window!=='undefined'&&window.location.hostname==='app.fenixcapital.es'?'Centro de mando operativo (acceso privado)':'Centro de mando operativo (ensayo)'}>
  <div className="op3-backplate" aria-hidden="true"/>
  <div className="op3-wrapper">
   <div className="op3-toolbar">
    <div className="op3-selectors">
     <label><span>EMPRESA</span><select aria-label="Empresa" value={company}
      onChange={event=>onCompanyChange(event.target.value as Company)}>
       {Object.entries(NAMES).map(([key,name])=><option key={key} value={key}>{name}</option>)}
      </select></label>
     <span className="op3-separator" aria-hidden="true"/>
     <div className="op3-scope"><span>ALCANCE</span><strong>{company==='all'?'Alcance verificado: Fénix':company==='fenix'?'Fénix · acceso del propietario':NAMES[company]+' · acceso sin verificar'}</strong></div>
    </div>
    <div className="op3-observation"><span className={`op3-dot is-${source.toLowerCase()}`}/>
     <span>{provenance}</span>{observedAt?<time dateTime={observedAt}>{runTime(observedAt)}</time>:null}
    </div>
   </div>

   {view==='resumen'?<section className="op3-main" aria-label="Visión general y conversación">
    <div className="op3-glance">
     <button className="op3-status-tile" type="button" onClick={()=>selectPanel('decisiones')} aria-label="Consultar estado y revisiones">
      <span className="op3-overline"><ShieldCheck size={15}/> ESTADO OBSERVADO</span>
      <span className={`op3-primary-state ${source==='UNAVAILABLE'?'is-unavailable':''}`}>
       {showLive?<CheckCircle2 size={23}/>:<CircleAlert size={23}/>}
       {showLive?source==='LIVE'?'Actividad GitHub disponible':'Actividad GitHub en caché':'Actividad sin verificar'}
      </span>
      <span className="op3-indicators">
       <span><b className="is-blue">{showLive?running:'—'}</b> En ejecución</span>
       <span><b className="is-amber">{showLive?queued:'—'}</b> En cola</span>
       <span><b className={failed.length?'is-red':'is-muted'}>{showLive?failed.length:'—'}</b> Revisiones</span>
      </span>
      <span className="op3-link-label">Ver estado <ChevronRight size={14}/></span>
     </button>
     <button className="op3-decisions" type="button" onClick={()=>selectPanel('decisiones')}>
      <span className="op3-overline"><Clock3 size={15}/> ATENCIÓN</span>
      <strong>{source==='UNAVAILABLE'?'Estado no comprobable':failed.length?
       `${failed.length} ${spanCount(failed.length,'resultado requiere','resultados requieren')} revisión`:
       'Sin fallos visibles'}</strong>
      <small>{source==='UNAVAILABLE'?'La última lectura no se ha podido verificar':
        failed[0]?runLabel(failed[0]):'Esta fuente no acredita decisiones humanas'}</small>
      <span className="op3-link-label">Ver detalle <ChevronRight size={14}/></span>
     </button>
    </div>

    <div className={`op3-command ${chatLines.length?'has-chat':''}`}>
     <div className={`op3-pulse is-${status}`} aria-label={statusText} role="img">
      <i className="op3-ring op3-ring-a"/><i className="op3-ring op3-ring-b"/>
      <i className="op3-ring op3-ring-c"/><i className="op3-core"/>
      <span className="op3-wave" aria-hidden="true"><i/><i/><i/><i/><i/></span>
     </div>
     {chatLines.length?<div className="op3-chat-history" role="log" aria-label="Historial de conversación" aria-live="polite">
      {chatLines.map((line,index)=><div key={index} className={`op3-chat-entry is-${line.role}`}>
       <strong>{line.role==='user'?'Tú':'Respuesta'}</strong>
       <p>{line.text}</p>
      </div>)}
     </div>:null}
     <div className="op3-command-copy"><h1>{chatLines.length?'Continuar conversación':'¿Qué necesitas hacer?'}</h1>
      <p>Pregunta, investiga, ejecuta o supervisa. Un punto de entrada para todo.</p>
      <span role="status" aria-live="polite" className="op3-voice-status">{scopeCanExecute?statusText:'Consulta sin permisos operativos en esta empresa'}</span>
     </div>
     <form className="op3-input-frame" onSubmit={handleSubmit}>
      <textarea ref={composerRef} aria-label="Pregunta u orden" placeholder={scopeCanExecute?'Escribe o habla aquí…':'Empresa sin acceso verificado · selecciona Fénix'}
       value={composer} onChange={e=>onComposerChange(e.target.value)}
       onKeyDown={keydown} rows={1} disabled={!scopeCanExecute||!snapshot.ready||snapshot.sending}/>
      <button type="button" className={`op3-icon-button ${dictating?'is-active':''}`}
       title={dictating?'Detener dictado':dictationSupported?'Dictar':'Dictado con Windows + H'} aria-label={dictating?'Detener dictado':'Dictar'}
       disabled={!scopeCanExecute||!snapshot.ready||snapshot.sending||snapshot.voiceActive}
       onClick={onToggleDictation}>{dictating?<Square size={17}/>:<Mic size={19}/>}</button>
      <button type="button" className={`op3-icon-button ${snapshot.voiceActive?'is-active':''}`}
       title="Conversación por voz" aria-label={snapshot.voiceActive?'Finalizar conversación por voz':'Conversación por voz'}
       aria-pressed={snapshot.voiceActive} disabled={!scopeCanExecute||!snapshot.ready||snapshot.sending||dictating}
       onClick={onToggleVoice}><AudioLines size={19}/></button>
      {(snapshot.voiceActive||snapshot.voiceSpeaking||ttsActive)?<button type="button"
       className="op3-icon-button op3-stop-voice"
       aria-label="Parar voz ahora" title="Parar voz inmediatamente (o pulsa Escape)"
       onClick={onStopVoice}><Square size={19}/></button>:null}
      {chatLines.some(line=>line.role==='cerebro')?<button type="button"
       className={`op3-icon-button ${ttsActive?'is-active':''}`}
       aria-label="Escuchar última respuesta" title="Escuchar última respuesta"
       disabled={!scopeCanExecute||snapshot.sending||snapshot.voiceActive||dictating}
       onClick={onReadLastReply}><Volume2 size={19}/></button>:null}
      <button className="op3-submit" aria-label="Enviar instrucción" type="submit"
       disabled={!canSend||!composer.trim()}><Send size={18}/></button>
     </form>
     {voiceFeedback&&!dictationError?<small role="status" className="op3-input-help">{voiceFeedback}</small>:null}
      {dictationError?<small role="alert" className="op3-input-error">{dictationError}</small>:null}
     <CerebroAudioDiagnostics/>
    </div>

    <div className="op3-live-track" aria-label="Actividad por fases">
     <div className="op3-live-caption"><Activity size={16}/><strong>Actividad verificable</strong>
      <span>{source==='LIVE'?'Captura reciente':source==='CACHED'?'Captura en caché':'Sin lectura disponible'}</span></div>
     <div className="op3-steps">
      {([['Investigar',Search],['Analizar',BarChart3],['Ejecutar',Play],['Verificar',ShieldCheck],['Aprender',Database]] as const)
       .map(([name,Icon])=>{
        const current=running>0&&name==='Ejecutar'&&showLive;
        return <span key={name} className={current?'is-current':''}><Icon size={18}/><small>{name}</small></span>
       })}
     </div>
     <span className="op3-live-note">{running>0&&showLive?
      `${running} ${spanCount(running,'ejecución observada','ejecuciones observadas')}; fases internas no verificadas`:
      'Sin fases internas verificadas'}</span>
    </div>
   </section>:<section className="op3-detail" aria-live="polite">
    <div className="op3-detail-header">
     <button type="button" className="op3-back" onClick={()=>selectPanel('resumen')}><ChevronLeft size={18}/> Volver al centro</button>
     <span className="op3-overline">DATOS DE FUENTES EXISTENTES · SOLO LECTURA</span>
    </div>
    <h2>{({
     entidades:'Entidades y conexiones',proyectos:'Proyectos y dependencias',
     motores:'Motores observados',trabajos:'Trabajos y ejecuciones',
     evidencias:'Evidencias de ejecución',decisiones:'Estado y revisiones',
     resumen:'Resumen'
    } as Record<View,string>)[view]}</h2>
    <p className="op3-detail-lede">{({
     entidades:'Empresas realmente devueltas por el Gateway de laboratorio; selector sin concesión de permisos.',
     proyectos:'Proyectos registrados y comprobados en el Gateway de laboratorio; fuente parcial, no inventario global.',
     motores:'Registros, catálogo de diseño FACT-001 y ejecuciones observadas, sin equipararlos.',
     trabajos:'Actividad publicada por la fuente autenticada, con acceso a su evidencia.',
     evidencias:'Referencias originales de ejecución; no se generan informes ficticios.',
     decisiones:'Fallos observados; las aprobaciones humanas requieren su propia fuente.',
     resumen:''
    } as Record<View,string>)[view]}</p>
    {(view==='entidades'||view==='proyectos'||view==='motores')?
      <CerebroOperativaUniverseViews section={view} scope={company} result={ownerUniverse}
       onCompanyChange={onCompanyChange} onNavigate={selectPanel}
       observedEngines={modules.map(([id,metric])=>({id,count:metric.count,running:metric.running}))}
      />:null}
    {(view==='trabajos'||view==='evidencias'||view==='decisiones')?
     <div className="op3-data-lines">
      {((view==='decisiones'?failed:view==='evidencias'?runs.filter(x=>validLink(x)):recentRuns)
       .slice(0,20)).map(run=><div key={run.run_id} className="op3-data-row">
       {isFailed(run)?<CircleAlert className="is-warning" size={18}/>:
        run.status==='completed'?<CheckCircle2 className="is-ok" size={18}/>:<Activity size={18}/>}
       <div><strong>{runLabel(run)}</strong><small>{runTime(run.updated_at)} · {run.status}
         {run.engine_id?' · '+run.engine_id:''}</small></div>
       {view==='evidencias'&&validLink(run)?<a href={validLink(run)!} target="_blank" rel="noreferrer">
        GitHub <ExternalLink size={14}/></a>:
        <button type="button" onClick={()=>onOpenRun(run)}>Inspeccionar <ChevronRight size={15}/></button>}
      </div>)}
      {!showLive?<div className="op3-empty-proof">La fuente no está disponible. No se puede certificar el estado actual.</div>:
       !(view==='decisiones'?failed:view==='evidencias'?runs.filter(x=>validLink(x)):recentRuns).length?
        <div className="op3-empty-proof">No hay registros de esta categoría en la última lectura. No es una certificación de ausencia global.</div>:null}
     </div>:null}
   </section>}

   <nav className="op3-navigation" aria-label="Áreas de Operativa">
    <button className={view==='resumen'?'is-active':''} type="button" onClick={()=>selectPanel('resumen')}><Activity size={20}/><span>Resumen</span></button>
    {NAV.map(([key,label,Icon])=><button type="button" key={key} className={view===key?'is-active':''}
      onClick={()=>selectPanel(key)} aria-current={view===key?'page':undefined}>
      <Icon size={20}/><span>{label}</span></button>)}
   </nav>
   <footer className="op3-footer">
    <span>FUENTE: {source==='UNAVAILABLE'?'NO VERIFICADA':'GITHUB ACTIONS · '+source}</span>
    <span>{typeof window!=='undefined'&&window.location.hostname==='app.fenixcapital.es'?'V3 EN PRODUCCIÓN · VISTA PRIVADA DEL PROPIETARIO':'ENSAYO VISUAL · SIN PROMOCIÓN A PRODUCCIÓN'}</span>
    {typeof window!=='undefined'&&window.location.hostname==='app.fenixcapital.es'?<a href="/cerebro?section=operativa&operativa_legacy=1" style={{color:'#83d5f2',textDecoration:'underline'}}>Operativa anterior</a>:null}
   </footer>
  </div>
  {children}
 </main>;
}
