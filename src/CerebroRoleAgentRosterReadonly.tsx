import {useEffect,useState,type FormEvent} from 'react';
import {readAgentDirectoryLab,type AgentDirectoryRecord,type AgentDirectoryFilters,type AgentDirectoryResult} from './cerebroAgentDirectoryApi';
import {readExecutorCoverage,type ExecutorCoverageResult} from './cerebroExecutorCoverageApi';
import './cerebro-role-agent-roster-readonly.css';
const initial:AgentDirectoryResult={kind:'unavailable',data:null,reason:'NOT_READ_YET'};
const PAGE_SIZE=25;
const stateText=(r:AgentDirectoryRecord)=>r.kind==='SUBAGENT_TEMPLATE'?'PLANTILLA · no instalada':
 r.state==='FULL_SAFE_PREPROD'?'ROL LAB · actividad no verificada':
 r.state==='PLAN_ONLY'?'PERFIL PLANIFICADO':'ROL LÓGICO · solo definido';
export default function CerebroRoleAgentRosterReadonly(){
 const [result,setResult]=useState<AgentDirectoryResult>(initial);
 const [kind,setKind]=useState<AgentDirectoryFilters['kind']>('ALL');
 const [family,setFamily]=useState<AgentDirectoryFilters['family']>('ALL');
 const [draft,setDraft]=useState('');
 const [q,setQ]=useState('');
 const [offset,setOffset]=useState(0);
 const [loading,setLoading]=useState(true);
 const [refresh,setRefresh]=useState(0);
 const [coverage,setCoverage]=useState<ExecutorCoverageResult>({kind:'unavailable',data:null});
 // Source coverage uses one bounded read every 30 seconds; provider inventories
 // never establish that any logical agent or subagent is actually running.
 useEffect(()=>{
  if(!/^fenix-capital-preprod-[a-z0-9]+\.vercel\.app$/.test(window.location.hostname))return;
  let mounted=true;
  const controller=new AbortController();
  const load=()=>{void readExecutorCoverage(controller.signal).then(x=>{if(mounted)setCoverage(x)})};
  load();
  const timer=window.setInterval(load,30000);
  return()=>{mounted=false;controller.abort();window.clearInterval(timer)};
 },[]);
 useEffect(()=>{
  let open=true;const controller=new AbortController();
  setLoading(true);
  void readAgentDirectoryLab({kind,family,q,offset,limit:PAGE_SIZE},controller.signal).then(r=>{
   if(open){setResult(r);setLoading(false)}
  });
  return()=>{open=false;controller.abort()};
 },[kind,family,q,offset,refresh]);
 const data=result.kind==='ready'?result.data:null;
 const rows=data?.records||[];
 const count=data?.counts;
 const page=data?.page;
 function submitSearch(e:FormEvent){e.preventDefault();setOffset(0);setQ(draft.trim())}
 return <section className="op3-universe op3-agent-directory" aria-label="Agentes y subagentes · catálogo federado por fuentes">
  <div className="op3-source-identity">
   <span>DIRECTORIO FEDERADO · REGISTROS + DISEÑOS · SOLO LECTURA</span>
   <strong className={data?'is-ok':'is-amber'}>{data?'Fuentes consultadas · inventario parcial':result.kind==='denied'?'Acceso denegado':'Sin lectura verificable'}</strong>
  </div>
  <p className="op3-source-note">Los ingenieros aparecen primero por organización, <b>pero no son todo CEREBRO</b>. Este directorio reúne fuentes reales de Productora, SEO, Facebook, Instagram y LinkedIn, además de ingeniería y comercial.
   Cada ficha puede mostrar los motores documentados asociados y cada subagente conserva el responsable documentado. Los perfiles definidos no equivalen a procesos activos; el censo completo de toda la plataforma sigue pendiente de verificar.
   Pulsa sobre un registro para ver la ficha técnica o sitúa el cursor sobre su nombre para comprender claramente para qué sirve.</p>
  {coverage.kind==='ready'&&coverage.data?
   <p className="op3-source-note" role="status">Ejecutores consultados en directo · {coverage.data.inventory_sources.map(s=>
    s.source+': '+(s.status==='LIVE'?s.visible_count+(s.metric_label==='WORKERS_IN_ACCOUNT'?' Workers inventariados':' registros históricos LAB'):s.status)
   ).join(' · ')}. <b>Esto acredita infraestructura, NO ejecución de perfiles.</b> {coverage.data.receipt_source_status==='SUPABASE_SIGNED_SQL_QA'?'QA-001 dispone de recibos reales firmados; los demás roles no quedan acreditados por esta comprobación.':'Los recibos de los demás perfiles siguen pendientes de conexión.'}</p>:
   <p className="op3-source-note">Cobertura de ejecutores Cloudflare/Supabase: no acreditada desde este entorno. El catálogo permanece disponible sin inventar estados.</p>}
  {coverage.kind==='ready'&&coverage.data?
   <p className="op3-source-note" role="status">
    Supervisor de fuentes: <b>{coverage.data.supervisor.provider_health==='LIVE'?'lecturas disponibles':'cobertura parcial'}</b>.
    Motor de pruebas QA-001 en Supabase LAB: <b>{coverage.data.lab_qa.status==='LIVE'?
       (coverage.data.lab_qa.execution_status==='SUCCEEDED'?'EJECUCIÓN REAL VERIFICADA':'FALLO DE PRUEBA VERIFICADO'):'SIN LECTURA ACTUAL'}</b>.
    {coverage.data.lab_qa.status==='LIVE'?
      <span> Firma comprobada: <b>{coverage.data.lab_qa.signature_verified?'SÍ':'NO'}</b>;
       verificaciones: <b>{coverage.data.lab_qa.tests_passed}/{coverage.data.lab_qa.tests_total}</b>;
       recibos persistidos: <b>{coverage.data.lab_qa.runs_count}</b>.
       Ejecutor periódico compartido (cada 15 minutos), sin GitHub Actions.
      </span>:null}
    {coverage.data.verified_profiles.length>0?
     <span> Identidad atribuida: <b>ENG-QA</b> · QA-001 ·
      {coverage.data.verified_profiles[0].proof_source==='SUPABASE_PGCRON'?
       <span> recibo de Supabase <code>{coverage.data.verified_profiles[0].proof_id}</code>.</span>:
       <span> trabajo histórico de GitHub.
        {coverage.data.verified_profiles[0].proof_url?
         <a href={coverage.data.verified_profiles[0].proof_url} target="_blank" rel="noopener noreferrer">Ver prueba del ejecutor</a>:null}
       </span>}
      Esta evidencia NO acredita autonomía ni excelencia de los otros perfiles.
     </span>:<span> Sin identidades de ejecución acreditadas.</span>}
    Tribunal y excelencia global: <b>PENDIENTES</b>.
   </p>:null}
  {coverage.kind==='ready'&&coverage.data?.engine_truth.status==='LIVE'?
   <section className="op3-source-note" aria-label="Auditoría de motores existentes y evidencias">
    <strong>Estado REAL de los motores existentes (solo lectura LAB)</strong>.
    <p>El historial no demuestra que los motores estén ejecutándose. Revisados {coverage.data.engine_truth.historical_job_rows} trabajos
     en JARVIS, navegador y productora. No se atribuyen automáticamente a agentes.</p>
    <ul>{coverage.data.engine_truth.sources.map(e=>
     <li key={e.source+'-'+e.engine_id+'-'+e.environment}>
      <b>{e.engine_id}</b> · {e.source} · {e.historical_jobs} trabajos históricos;
      <b> {e.recent_metadata_rows===0?'SIN ACTIVIDAD RECIENTE ACREDITADA':'CON METADATOS RECIENTES SIN CERTIFICACIÓN'}</b>;
      identificadores de rol explícitos: {e.explicit_role_rows};
      certificación autónoma: <b>NO</b>.
     </li>
    )}</ul>
   </section>:
   <p className="op3-source-note">Auditoría de actividad real por motor: lectura no disponible ahora; no equivale a motores operativos.</p>}
  {coverage.kind==='ready'&&coverage.data?.console_job.status==='LIVE'?
   <section className="op3-source-note" aria-label="Trabajo real de lectura pública de CONSOLE-001">
    <strong>CONSOLE-001 · CAPACIDAD DE REPOSITORIO EJECUTADA EN LAB</strong>
    <p><b>repo.sandbox.public.readonly.v0</b> · Supabase SQL/pg_net, sin GitHub Actions ·
      recibo firmado: <b>{coverage.data.console_job.signature_verified?'VERIFICADO':'NO'}</b> ·
      trabajo: <code>{coverage.data.console_job.job_id}</code> ·
      resultado: <b>{coverage.data.console_job.execution_state}</b> ·
      commit leído: <code>{coverage.data.console_job.observed_commit_sha?.slice(0,12)}</code> ·
      trabajos comprobados: {coverage.data.console_job.completed_job_count}.
      <b> No se ejecutó el antiguo worker OIDC ni se modificó el repositorio.</b>
      Certificación completa y agente personal identificado: <b>PENDIENTES</b>.
    </p>
   </section>:
   <p className="op3-source-note">CONSOLE-001 · lectura real del repositorio: pendiente de prueba firmada o de acceso a la fuente.</p>}
  {coverage.kind==='ready'&&coverage.data?.dispatch_health.status==='LIVE'?
   <section className="op3-source-note" aria-label="Comprobación de salud de cuatro despachadores PREPROD">
    <strong>Salud real de API · cuatro ejecutores existentes · sin GitHub Actions</strong>
    <p>Responden sus rutas de salud, verificadas por `pg_net` y recibos HMAC:
     <b> {coverage.data.dispatch_health.healthy_endpoints}/{coverage.data.dispatch_health.signed_samples}</b>.
     Son pruebas de disponibilidad, <b>NO de ejecución, agentes activos ni certificación autónoma</b>.
     Los ejecutores originales siguen exigiendo su identidad OIDC para ejecutar trabajos.</p>
    <ul>{coverage.data.dispatch_health.sources.map(p=>
     <li key={p.service}>
      <b>{p.engine_id}</b> · {p.service} ·
      <b> {p.health_state==='HEALTH_ENDPOINT_OK'&&p.recent?'API ACCESIBLE':'SALUD NO ACREDITADA'}</b> ·
      firma {p.signature_verified?'válida':'inválida'} ·
      comprobación {new Date(p.last_checked_at).toLocaleString('es-ES')}.
      Ejecución: <b>POR ACREDITAR</b>.
     </li>
    )}</ul>
   </section>:
   <p className="op3-source-note">Comprobación firmada de disponibilidad de ejecutores: sin lectura verificable. No implica caída ni actividad de sus motores.</p>}
  {coverage.kind==='ready'&&coverage.data?.durable_supervisor.status==='LIVE'?
   <p className="op3-source-note" role="status">
    <b>SUPERVISOR AUTÓNOMO LAB</b> · revisión programada cada 15 minutos ·
    historial firmado: <b>{coverage.data.durable_supervisor.history_count} informe(s)</b> ·
    integridad: <b>{coverage.data.durable_supervisor.signed?'VERIFICADA':'BLOQUEADA'}</b> ·
    último informe: <b>{coverage.data.durable_supervisor.observed_at?
     new Date(coverage.data.durable_supervisor.observed_at).toLocaleString('es-ES'):'—'}</b> ·
    {coverage.data.durable_supervisor.recent?' seguimiento reciente':' sin informe reciente'} ·
    {coverage.data.durable_supervisor.health==='GATE_HOLD'?'GATE EN HOLD':'evidencias observadas; ningún motor promovido'}.
   </p>:
   <p className="op3-source-note">Historial firmado del supervisor automático: SIN LECTURA VERIFICABLE.</p>}
  {coverage.kind==='ready'&&coverage.data?.certification_gates.status==='LIVE'?
   <section className="op3-source-note" aria-label="Matriz de preparación para certificación por motor">
    <strong>Preparación para certificación · 5 fuentes examinadas · LAB</strong>
    <p>Las pruebas individuales no certifican automáticamente el motor completo. Cada motor debe superar permisos,
     contratos, pruebas funcionales, tribunal, coste, rollback y evidencias de actividad.</p>
    <ul>{coverage.data.certification_gates.evidence_categories.map(e=>
     <li key={e.id}>
      <b>{e.id}</b> · {e.id==='QA-001'?
       <span>ejecución firmada de QA, {e.tests_passed}/{e.tests_total} pruebas, {e.signed_runs} recibos.</span>:
       e.id==='FACT-001'?
       <span>{e.specific_capability_evidenced?'registro de la fábrica comprobado en LAB (histórico)':'atestación del registro sin verificar'}; no demuestra producción autónoma.</span>:
       e.id==='CONSOLE-001'?
       <span>{e.historical_rows??0} trabajos antiguos; sin identidad de agente verificable ni ejecución reciente acreditada.</span>:
       e.id==='UMS-001'?
       <span>{e.historical_rows??0} trabajo histórico en HOLD; no reactivado.</span>:
       <span>{e.active_schedules??0} programaciones sociales activas de {e.scheduled_jobs_total??0};
        {e.active_schedules_succeeded_within_48h??0} con última ejecución correcta observada en una muestra limitada
        de registros, sin certificar resultados comerciales.</span>}
      <b> · Certificación autónoma: NO</b>
     </li>
    )}</ul>
    <p>Excelencia global: <b>NO CERTIFICADA</b>. Coste marginal: <b>PENDIENTE DE MEDIR</b>.</p>
   </section>:
   <p className="op3-source-note">Matriz de certificación por motor: no disponible. No se mostrarán estados aprobados sin pruebas.</p>}
  <div className="op3-agent-counts" aria-label="Cobertura de fuentes">
   <div><strong>{count?.known_agent_roles??'—'}</strong><small>Roles/perfiles documentados en fuentes indexadas</small></div>
   <div><strong>{count?.registered_logical_subagent_roles??'—'}</strong><small>Especialistas/subagentes lógicos · ejecución no verificada</small></div>
   <div><strong>{count?.media_studio_source_roles??'—'}</strong><small>Roles registrados en Productora UMS-001</small></div>
   <div><strong>{count?.facebook_source_components??'—'}</strong><small>Componentes Facebook · 42 agentes y 527 subagentes</small></div>
   <div><strong>{count?.seo_source_profiles??'—'}</strong><small>SEO-001 · 32 departamentos, 191 perfiles definidos, ninguno autónomo acreditado</small></div>
   <div><strong>{count?.instagram_source_components??'—'}</strong><small>Instagram · agentes y subagentes lógicos</small></div>
   <div><strong>{count?.linkedin_source_components??'—'}</strong><small>LinkedIn · definidos, no certificados</small></div>
   <div><strong>{count?.instagram_department_roles??'—'}</strong><small>Instagram · dirección, agentes y tribunal aislados</small></div>
   <div><strong>{count?.subagent_templates_not_instances??'—'}</strong><small>Plantillas de especialidades no instanciadas</small></div>
   <div><strong>{coverage.kind==='ready'&&coverage.data?coverage.data.runtime_verified_profiles:'—'}</strong><small>Perfiles con ejecución histórica acreditada por este puente (NO implica autonomía ni actividad actual)</small></div>
   <div><strong>{coverage.kind==='ready'&&coverage.data?coverage.data.active_recent_profiles:'—'}</strong><small>Perfiles con ejecución activa y heartbeat validado por este puente</small></div>
   <div><strong>PARCIAL</strong><small>Quedan fuentes de CEREBRO por incorporar · sin falso total global</small></div>
  </div>
  <div className="op3-engine-tools">
   <label>Mostrar
    <select aria-label="Tipo de agentes" value={kind} onChange={e=>{setKind(e.target.value as AgentDirectoryFilters['kind']);setOffset(0)}}>
     <option value="AGENT_ROLE">Agentes principales</option>
     <option value="SUBAGENT_ROLE">Especialistas y subagentes registrados</option>
     <option value="SUBAGENT_TEMPLATE">Plantillas · no instaladas</option>
     <option value="ALL">Todos los registros</option>
    </select>
   </label>
   <label>Área
    <select aria-label="Filtrar por familia" value={family} onChange={e=>{setFamily(e.target.value as AgentDirectoryFilters['family']);setOffset(0)}}>
     <option value="ALL">Todas las áreas</option><option value="MEDIA_STUDIO">Productora UMS-001 · 529 roles</option>
     <option value="SEO_ENTERPRISE">SEO-001 · 191 perfiles</option>
     <option value="SOCIAL_INSTAGRAM">Instagram · familia 569</option>
     <option value="SOCIAL_LINKEDIN">LinkedIn · familia 569</option>
     <option value="INSTAGRAM_DEPARTMENTS">Instagram · departamento 39</option>
     <option value="ENGINEERING">Ingeniería</option>
     <option value="REVENUE_SALES">Comercial</option><option value="SOCIAL_FACEBOOK">Facebook · Social Family</option>
    </select>
   </label>
   <form onSubmit={submitSearch} className="op3-agent-search">
    <input type="search" value={draft} maxLength={100} onChange={e=>setDraft(e.target.value)}
     aria-label="Buscar en todos los agentes indexados" placeholder="Nombre, ID, función o motor…"/>
    <button type="submit">Buscar</button>
   </form>
   <button type="button" onClick={()=>setRefresh(v=>v+1)} disabled={loading}>Actualizar</button>
  </div>
  {loading?<p role="status">Consultando registros autorizados…</p>:result.kind!=='ready'?
   <p className="op3-source-empty" role="alert">No se puede verificar el catálogo ahora: {result.reason}. No se mostrarán cifras inventadas.</p>:<>
   <p className="op3-source-note" role="status">Mostrando {rows.length?(page!.offset+1)+'–'+(page!.offset+rows.length):'0'} de {page!.total} coincidencias
    · Fuentes: GitHub Registry + Productora UMS-001 + SEO-001 + Facebook + Instagram + LinkedIn (SHA fijados)
    · Estado: <b>cobertura parcial, no inventario global completo</b>.</p>
   <div className="op3-universe-list op3-agent-list" aria-label="Listado paginado de agentes y subagentes">
    {rows.map(item=><article className="op3-universe-line op3-agent-entry" key={item.kind+item.id}>
     <div className="op3-agent-content">
      <strong title={item.purpose_plain}>{item.name} <code>{item.id}</code></strong>
      <small>{item.family} · {stateText(item)} · {item.source}</small>
      <p className="op3-agent-human" title={item.purpose_plain}>¿Para qué sirve? <span>{item.purpose_plain}</span></p>
      <details><summary>Ficha técnica y procedencia</summary>
       <p><b>Función técnica:</b> {item.purpose_technical}</p>
       <p><b>Tipo:</b> {item.kind==='AGENT_ROLE'?'Agente lógico / rol':item.kind==='SUBAGENT_ROLE'?'Especialista/subagente lógico':'Plantilla conceptual de subagente'}</p>
       <p><b>Estado declarado:</b> {item.state}. <b>Runtime:</b> NO VERIFICADO.</p>
       <p><b>Jerarquía:</b> {item.hierarchy_verified?'Verificada':'SIN VERIFICAR'}. <b>Empresa:</b> {item.company_scope}.</p>
       <a href={item.source_url} target="_blank" rel="noreferrer">Abrir fuente original</a>
      </details>
     </div>
     <div className="op3-agent-controls">
      <span className="is-amber">{item.kind==='SUBAGENT_TEMPLATE'?'NO INSTANCIADO':'NO ACTIVO VERIFICADO'}</span>
      {item.engine_ids.length?<details><summary>Motores documentados ({item.engine_ids.length})</summary>
        {item.engine_ids.map(id=><code key={id} style={{display:'inline-block',margin:'4px'}}>{id}</code>)}
       </details>:
       <small title="No hay asociación a motores acreditada en la fuente original">Motores asociados: SIN VERIFICAR</small>}
     </div>
    </article>)}
    {!rows.length?<p className="op3-source-empty">Esta fuente no devuelve coincidencias con el filtro. No significa que no existan otros agentes.</p>:null}
   </div>
   <div className="op3-agent-pages">
    <button type="button" disabled={loading||offset===0} onClick={()=>setOffset(v=>Math.max(0,v-PAGE_SIZE))}>← Anterior</button>
    <span>Página {Math.floor(offset/PAGE_SIZE)+1} · {page!.total} coincidencias</span>
    <button type="button" disabled={loading||page?.next_offset==null} onClick={()=>setOffset(page!.next_offset!)}>Siguiente →</button>
   </div>
  </>}
  <p className="op3-source-note">SIN VERIFICAR: no se ha localizado todavía un directorio completo de miles de instancias
   con <code>agent_id</code>, <code>subagent_id</code>, vínculos y latidos actuales. Las plantillas no se cuentan como agentes instalados.</p>
 </section>;
}
