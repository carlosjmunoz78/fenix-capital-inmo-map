/** Owner fleet observability: a declared role is not a process, workflow or live agent. */
const GH_RUN=/^https:\/\/github\.com\/carlosjmunoz78\/(?:fenix-capital-inmo-map|capital-mapa-pro)\/actions\/runs\/\d+$/;
const STATUS=new Set(['queued','in_progress','completed','waiting','pending','requested']);
export function normalizeFleetRun(row,repo){
 if(!row||!Number.isSafeInteger(row.id)||row.id<1||!STATUS.has(row.status)||
  typeof row.html_url!=='string'||!GH_RUN.test(row.html_url)||
  row.repository?.full_name!==repo)return null;
 return {run_id:row.id,name:String(row.name||'Trabajo sin título').slice(0,115),
  status:row.status,conclusion:typeof row.conclusion==='string'?row.conclusion.slice(0,35):null,
  updated_at:typeof row.updated_at==='string'&&Number.isFinite(Date.parse(row.updated_at))?row.updated_at:null,
  url:row.html_url,engine_id:null,agent_id:null,subagent_id:null};
}
export function summarizeFleetRuns(raw,repo){
 if(!raw||!Array.isArray(raw.workflow_runs)||raw.workflow_runs.length>60)return null;
 const runs=raw.workflow_runs.slice(0,35).map(x=>normalizeFleetRun(x,repo)).filter(Boolean);
 return {observed_sample:runs.length,
  active_in_sample:runs.filter(x=>x.status==='in_progress').length,
  queued_in_sample:runs.filter(x=>x.status==='queued'||x.status==='waiting'||x.status==='pending').length,
  recent:runs.slice(0,8),
  total_repo_run_count:Number.isSafeInteger(raw.total_count)&&raw.total_count>=0?raw.total_count:null};
}
export function summarizeFleetRoles(registry){
 const roles=Array.isArray(registry?.roles)?registry.roles:[];
 if(roles.length>200)return null;
 const entries=roles.flatMap(r=>r&&typeof r.role_id==='string'&&/^[A-Z][A-Z0-9-]{2,70}$/.test(r.role_id)&&
  typeof r.department==='string'&&/^[A-Z_]{3,50}$/.test(r.department)?
  [{id:r.role_id,name:String(r.name||r.role_id).slice(0,70),department:r.department,
    company_id:String(r.company_scope||'GLOBAL').slice(0,30),
    environment:String(r.environment||'UNKNOWN').slice(0,30),
    state:String(r.state||'DEFINED').slice(0,55),
    reports_to:typeof r.reports_to==='string'?r.reports_to:null,
    runtime_verified:false}]:[]);
 if(entries.length!==roles.length||new Set(entries.map(x=>x.id)).size!==entries.length)return null;
 const by_department={};
 for(const r of entries)by_department[r.department]=(by_department[r.department]||0)+1;
 return {declared_role_profiles:entries.length,active_agent_count:null,
  verified_subagent_count:null,unknown_agent_count:true,unknown_subagent_count:true,
  hierarchy_complete:entries.every(x=>x.reports_to!==null),by_department,entries};
}
const CONTROL=/\b(pausar|pausa|detener|reanudar|reactivar|reactiva|acelerar|acelera|priorizar|prioriza|activar|arrancar)\b/i;
const QUERY=/\b(agentes?|subagentes?|motores?|trabajos?|workflow|ejecuciones?|departamentos?|plataformas?|situaci[oó]n|estado|actividad|cu[aá]ntos?|inventario|qu[eé] (?:se est[aá] haciendo|est[aá] haciendo))\b/i;
export function classifyFleetMessage(text){
 if(typeof text!=='string'||text.length>4000)return null;
 const value=text.trim();
 if(!value)return null;
 if(CONTROL.test(value)){
  const verb=value.match(CONTROL)?.[1]?.toLowerCase()||'';
  const action=/pausar|pausa|detener/.test(verb)?'PAUSE':/reanudar|reactivar|reactiva|activar|arrancar/.test(verb)?'RESUME':'PRIORITIZE';
  const engine=value.match(/\b[A-Z]{2,12}-\d{3}\b/)?.[0]||null;
  return {kind:'CONTROL_PRECHECK',action,engine_id:engine};
 }
 if(QUERY.test(value))return {kind:'FLEET_QUERY'};
 return null;
}
export function planFleetControl({action,engine_id,environment='LAB'}={}){
 if(!['PAUSE','RESUME','PRIORITIZE'].includes(action))return{status:'DENIED',reason:'ACTION_NOT_ALLOWLISTED'};
 if(environment==='PROD'||environment==='STAGING')return{status:'BLOCKED',reason:'PROTECTED_ENVIRONMENT'};
 if(environment!=='LAB')return{status:'BLOCKED',reason:'ENVIRONMENT_UNVERIFIED'};
 if(!engine_id||!/^[A-Z]{2,12}-\d{3}$/.test(engine_id))
  return{status:'BLOCKED',reason:'EXACT_TARGET_REQUIRED'};
 return {status:'BLOCKED',reason:'NO_VERIFIED_CONTROL_EXECUTOR',
  action,engine_id,company_id:'fenix',environment:'LAB',
  executed:false,requires_executor_binding:true,observed_state_changed:false};
}
