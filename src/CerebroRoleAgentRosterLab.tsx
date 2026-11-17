import {useCallback,useEffect,useMemo,useState} from 'react';
import {readRoleAgentRosterLab,type RoleAgentRecord,type RoleAgentResult} from './cerebroRoleAgentRosterLabApi';
import CerebroAgentJobLivePanel from './CerebroAgentJobLivePanel';

const EMPTY:RoleAgentResult={kind:'unavailable',data:null,reason:'NOT_READ_YET'};
const NAME:Record<RoleAgentRecord['class'],string>={
 SPECIALIST_ROLE:'Especialista registrado',
 AGENT_PROFILE_IMPLEMENTED_PLAN_ONLY:'Perfil de agente · solo plan'
};
export default function CerebroRoleAgentRosterLab(){
 const [read,setRead]=useState<RoleAgentResult>(EMPTY);
 const [busy,setBusy]=useState(false);
 const [query,setQuery]=useState('');
 const [department,setDepartment]=useState('ALL');
 const reload=useCallback(async(signal?:AbortSignal)=>{
  setBusy(true);
  const result=await readRoleAgentRosterLab(signal);
  if(!signal?.aborted){setRead(result);setBusy(false)}
 },[]);
 useEffect(()=>{const c=new AbortController();void reload(c.signal);return()=>c.abort()},[reload]);
 const records=read.kind==='ready'?read.data?.roles||[]:[];
 const departments=useMemo(()=>Array.from(new Set(records.map(r=>r.department))).sort(),[records]);
 const filtered=records.filter(r=>(department==='ALL'||r.department===department)&&
  (!query.trim()||[r.name,r.role_id,r.department,...r.engines].join(' ').toLowerCase().includes(query.trim().toLowerCase())));
 const specialists=records.filter(r=>r.class==='SPECIALIST_ROLE').length;
 const plans=records.filter(r=>r.class==='AGENT_PROFILE_IMPLEMENTED_PLAN_ONLY').length;
 return <section className="op3-universe" aria-label="Agentes y subagentes · fuente canónica de roles">
  <div className="op3-source-identity"><span>REGISTRO CANÓNICO · FACT-001</span>
   <strong className={read.kind==='ready'?'is-ok':'is-amber'}>{read.kind==='ready'?'Inventario leído · PREPROD':read.kind==='denied'?'Acceso denegado':'Fuente no verificable'}</strong>
  </div>
  <p className="op3-source-note">Se muestran perfiles existentes del repositorio, no agentes conectados ni ejecutores activos.
   Las relaciones de subordinación y la ejecución actual siguen sin acreditar. Ningún perfil recibe nuevos permisos.</p>
  <div className="op3-universe-list" aria-label="Estado y origen de agentes">
   <article className="op3-universe-line"><div><strong>Especialistas registrados</strong>
    <small>{read.kind==='ready'?specialists:'—'} perfiles con fuente canónica · ejecución en producción NO VERIFICADA</small></div></article>
   <article className="op3-universe-line"><div><strong>Perfiles de agente en planificación</strong>
    <small>{read.kind==='ready'?plans:'—'} · no implica agentes autónomos activos</small></div></article>
   <article className="op3-universe-line"><div><strong>Subagentes y jerarquías</strong>
    <small>SIN VERIFICAR: el registro no acredita relaciones «reports_to» ni subagentes ejecutándose</small></div></article>
  </div>
  <div className="op3-universe-list">
   <button type="button" disabled={busy} onClick={()=>{void reload()}} aria-label="Actualizar fuente de roles">
    {busy?'Leyendo…':'Actualizar registro'}
   </button>
   {read.kind!=='ready'?<p role="status" className="op3-source-empty">
    No se puede mostrar el inventario: {read.reason}. Acceso solo con sesión de propietario y ámbito Fénix LAB.
   </p>:<>
    <p className="op3-source-note">Origen: <strong>{read.data?.source}</strong> · revisión {read.data?.snapshot_date} · lectura protegida.
     Perfiles definidos: {records.length}. Estado de ejecución real: NO VERIFICADO.</p>
    <label>Buscar agente o motor <input type="search" value={query} onChange={e=>setQuery(e.target.value)}
      placeholder="Nombre, ID, motor…" aria-label="Buscar agentes y especialistas"/></label>
    <label>Departamento <select aria-label="Filtrar departamento" value={department} onChange={e=>setDepartment(e.target.value)}>
     <option value="ALL">Todos</option>{departments.map(d=><option key={d} value={d}>{d}</option>)}
    </select></label>
    <div aria-live="polite">{filtered.length} perfiles visibles de {records.length} registrados</div>
    {filtered.map(r=><article className="op3-universe-line" key={r.role_id}>
     <div><strong>{r.name} · {r.role_id}</strong>
      <small>{NAME[r.class]} · {r.department} · {r.company_scope==='GLOBAL'?'Transversal':'Fénix'}</small>
      <small>Estado registrado: {r.state} · Superior: {r.reports_to_state==='UNRESOLVED'?'sin relación acreditada':r.reports_to||'sin verificar'}</small>
      <details><summary>Ver motores y conocimiento</summary>
       <small>Motores vinculados en configuración: {r.engines.join(', ')}</small>
       <small>Paquete de conocimiento: {r.knowledge_pack_id} · uso y ejecución no verificados</small>
      </details>
     </div>
     <span className="is-amber">{r.class==='SPECIALIST_ROLE'?'PREPROD':'PLANIFICADO'}</span>
    </article>)}
   </>}
  </div>
  <CerebroAgentJobLivePanel/>
 </section>;
}
