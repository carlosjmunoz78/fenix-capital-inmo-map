import {useEffect,useState,type FormEvent} from 'react';
import {readAgentDirectoryLab,type AgentDirectoryRecord,type AgentDirectoryFilters,type AgentDirectoryResult} from './cerebroAgentDirectoryApi';
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
 useEffect(()=>{const timer=window.setInterval(()=>{if(document.visibilityState==='visible')setRefresh(v=>v+1)},30_000);return()=>window.clearInterval(timer)},[]);
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
  <p className="op3-source-note" role="status">Estado de ejecutores: {data?.runtime_source?.status==='DEGRADADO'?
    'DEGRADADO · '+(data.runtime_source.error_code||'fuente no disponible'):
    data?.runtime_source?.status==='ACTIVO'?
    'Fuente '+data.runtime_source.provider+' · observada '+data.runtime_source.observed_at+' · perfiles con identidad exacta '+data.runtime_source.verified_profiles:
    'POR VERIFICAR · fuente de ejecución pendiente'}. Un motor observado no implica que todos sus perfiles estén ejecutándose.</p>
  <p className="op3-source-note">Los ingenieros aparecen primero por organización, <b>pero no son todo CEREBRO</b>. Este directorio reúne fuentes reales de Productora, SEO, Facebook, Instagram y LinkedIn, además de ingeniería y comercial.
   Cada ficha puede mostrar los motores documentados asociados y cada subagente conserva el responsable documentado. Los perfiles definidos no equivalen a procesos activos; el censo completo de toda la plataforma sigue pendiente de verificar.
   Pulsa sobre un registro para ver la ficha técnica o sitúa el cursor sobre su nombre para comprender claramente para qué sirve.</p>
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
   <div><strong>—</strong><small>Agentes y subagentes ejecutándose: NO VERIFICADO</small></div>
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
       <p><b>Estado declarado:</b> {item.state}. <b>Estado de este perfil:</b> {item.shared_state?.status??(item.runtime_verified?'ACTIVO':'POR_VERIFICAR')}.</p>
       <p><b>Motivo de evaluación:</b> {item.shared_state?.reason??'NO_EXACT_PROFILE_RUNTIME_EVIDENCE'}.</p>
       {item.shared_state?.evidence?<a href={item.shared_state.evidence} target="_blank" rel="noreferrer">Ver ejecución acreditada</a>:null}
       {item.runtime_observation?<p><b>Motor relacionado observado:</b> {item.runtime_observation.engine_id} · {item.runtime_observation.status}
        · {item.runtime_observation.provider} · {item.runtime_observation.observed_at}
        · <a href={item.runtime_observation.evidence} target="_blank" rel="noreferrer">Evidencia GitHub</a>.
        La actividad del motor NO acredita la ejecución de este rol salvo identidad exacta.</p>:null}
       <p><b>Jerarquía:</b> {item.hierarchy_verified?'Verificada':'SIN VERIFICAR'}. <b>Empresa:</b> {item.company_scope}.</p>
       <a href={item.source_url} target="_blank" rel="noreferrer">Abrir fuente original</a>
      </details>
     </div>
     <div className="op3-agent-controls">
      <span className={item.shared_state?.status==='ACTIVO'?'is-ok':'is-amber'} title={item.shared_state?.reason??'Sin prueba individual'}>{item.shared_state?.status??(item.kind==='SUBAGENT_TEMPLATE'?'DEFINIDO':item.runtime_verified?'ACTIVO':'POR_VERIFICAR')}</span>
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
  <p className="op3-source-note">Estados sincronizados automáticamente cada 30 segundos desde CEREBRO compartido. SIN VERIFICAR: no se ha localizado todavía un directorio completo de miles de instancias
   con <code>agent_id</code>, <code>subagent_id</code>, vínculos y latidos actuales. Las plantillas no se cuentan como agentes instalados.</p>
 </section>;
}
