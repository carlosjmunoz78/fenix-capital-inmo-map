import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = '1.1';
const ENGINE_ID = 'ORCH-001';
const VERSION = 'mission-recursive-decomposer-v1';
const DEFAULT_COMPANY = process.env.CEREBRO_COMPANY_ID || 'fenix';
const DEFAULT_ENV = process.env.CEREBRO_ENVIRONMENT || 'PREPROD';
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCOPE_FILE = path.resolve(MODULE_DIR, '../../28_MACROFRENTES.md');

const PHASES = [
  ['scope','Resolve canonical scope and acceptance'],
  ['inventory','Inventory current assets and live state'],
  ['dependencies','Map dependencies and reverse dependencies'],
  ['contracts','Freeze current contracts and invariants'],
  ['capabilities','Audit and ensure required capabilities'],
  ['design','Design parallel PREPROD change without replacing legacy'],
  ['implement','Implement bounded PREPROD delta'],
  ['test','Run deterministic tests and regression checks'],
  ['evaluate','Run evaluation and tribunal gate'],
  ['observe','Attach observability, cost and audit evidence'],
  ['resilience','Verify backup, rollback and rebuild'],
  ['accept','Collect acceptance evidence and compare OLD vs NEW'],
  ['document','Update registry, contracts, dependencies, runbook and changelog'],
  ['promote_gate','Prepare gradual promotion gate without PROD authority'],
];

const ATOMIC = {
  scope:['resolve_source','extract_objective','extract_constraints','define_done','risk_classify','scope_fingerprint'],
  inventory:['repo_inventory','runtime_inventory','integration_inventory','data_inventory','environment_inventory','gap_inventory'],
  dependencies:['direct_dependencies','reverse_dependencies','shared_runtime','credential_boundaries','data_boundaries','dependency_fingerprint'],
  contracts:['inputs','outputs','permissions','events_jobs_api','invariants','compatibility'],
  capabilities:['capability_audit','capability_ensure','capability_test','capability_evaluate','capability_register','capability_unblock'],
  design:['preservation_plan','parallel_path','data_contract_delta','policy_delta','cost_zero_path','rollback_plan'],
  implement:['scaffold','config','logic','integration','guards','evidence_hooks'],
  test:['unit','contract','integration','regression','security','idempotency'],
  evaluate:['quality_eval','safety_eval','cost_eval','autonomy_eval','tribunal','gate_result'],
  observe:['metrics','structured_logs','cost_meter','audit_trail','alerts','health_probe'],
  resilience:['backup','restore_test','rollback','rollback_test','rebuild','rebuild_test'],
  accept:['old_snapshot','new_snapshot','old_vs_new','acceptance_checks','physical_evidence','decision'],
  document:['engine_registry','contracts_map','dependency_map','runbook','changelog','autonomy_state'],
  promote_gate:['preprod_green','permissions_green','policy_green','cost_green','human_exception_check','promotion_packet'],
};

const ROUTE = {
  scope:'deterministic', inventory:'repo_read', dependencies:'repo_read', contracts:'repo_read', capabilities:'capability_factory',
  design:'reasoning', implement:'repo_write_preprod', test:'test', evaluate:'evaluation', observe:'deterministic', resilience:'test',
  accept:'evidence', document:'docs', promote_gate:'governance',
};

const digest = v => crypto.createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
const key = parts => digest(parts.join('|'));
const unitId = (m,p,a=null) => a ? `${m}.${p}.${a}` : `${m}.${p}`;

function canonicalFallbackRoots(error='CANONICAL_SCOPE_FILE_UNAVAILABLE') {
  return Array.from({length:28},(_,i)=>{
    const id=`M${String(i+1).padStart(2,'0')}`;
    return {
      mission_id:id,
      title:`Canonical macrofront ${id}`,
      scope_text:null,
      canonical_scope_ref:`28_MACROFRENTES.md#${id}`,
      canonical_source_sha256:null,
      scope_fingerprint:null,
      source_status:'CANONICAL_REF_BOUND_SCOPE_TEXT_NOT_EMBEDDED',
      scope_hydration_error:error,
      company_id:DEFAULT_COMPANY,
      engine_id:ENGINE_ID,
      environment:DEFAULT_ENV,
      version:'2026-10-28',
      priority:1000-i
    };
  });
}

export function loadCanonicalMissionRoots(options={}) {
  const scopeFile=path.resolve(options.scope_file || process.env.CEREBRO_MISSION_SCOPE_FILE || DEFAULT_SCOPE_FILE);
  let text;
  try {
    text=fs.readFileSync(scopeFile,'utf8');
  } catch (error) {
    return {hydrated:false,scope_file:scopeFile,error:`READ_FAILED:${error?.code||'UNKNOWN'}`,sha256:null,roots:canonicalFallbackRoots(`READ_FAILED:${error?.code||'UNKNOWN'}`)};
  }

  const lines=text.replace(/\r\n/g,'\n').split('\n');
  const sections=[];
  for(let i=0;i<lines.length;i++){
    const match=lines[i].match(/^##\s+(M\d{2})\s+·\s+(.+?)\s*$/);
    if(!match) continue;
    const [,mission_id,title]=match;
    const body=[];
    for(let j=i+1;j<lines.length&&!/^##\s+M\d{2}\s+·\s+/.test(lines[j]);j++){
      if(lines[j].trim()) body.push(lines[j].trim());
    }
    sections.push({mission_id,title:title.trim(),scope_text:body.join(' ').trim()});
  }

  const expected=Array.from({length:28},(_,i)=>`M${String(i+1).padStart(2,'0')}`);
  const ids=sections.map(s=>s.mission_id);
  const validCount=sections.length===28;
  const validOrder=validCount&&expected.every((id,i)=>ids[i]===id);
  const unique=new Set(ids).size===ids.length;
  const nonEmpty=sections.every(s=>s.title&&s.scope_text);
  if(!validCount||!validOrder||!unique||!nonEmpty){
    const reason=`PARSE_FAILED:count=${sections.length};order=${validOrder};unique=${unique};non_empty=${nonEmpty}`;
    return {hydrated:false,scope_file:scopeFile,error:reason,sha256:digest(text),roots:canonicalFallbackRoots(reason)};
  }

  const sourceSha=digest(text);
  const roots=sections.map((section,i)=>({
    mission_id:section.mission_id,
    title:section.title,
    scope_text:section.scope_text,
    canonical_scope_ref:`28_MACROFRENTES.md#${section.mission_id}`,
    canonical_source_sha256:sourceSha,
    scope_fingerprint:digest(`${section.mission_id}|${section.title}|${section.scope_text}`),
    source_status:'CANONICAL_SCOPE_HYDRATED',
    scope_hydration_error:null,
    company_id:DEFAULT_COMPANY,
    engine_id:ENGINE_ID,
    environment:DEFAULT_ENV,
    version:'2026-10-28',
    priority:1000-i
  }));
  return {hydrated:true,scope_file:scopeFile,error:null,sha256:sourceSha,roots};
}

export function defaultMissionRoots(options={}) {
  return loadCanonicalMissionRoots(options).roots;
}

function common(root, environment, now) {
  return {
    company_id:root.company_id||DEFAULT_COMPANY,
    engine_id:root.engine_id||ENGINE_ID,
    environment,
    version:VERSION,
    estimated_cost_eur:0,
    paid_ai_allowed:false,
    prod_write_allowed:false,
    trading_access:false,
    canonical_scope_ref:root.canonical_scope_ref,
    canonical_source_sha256:root.canonical_source_sha256||null,
    scope_fingerprint:root.scope_fingerprint||null,
    source_status:root.source_status||'UNKNOWN',
    scope_hydration_error:root.scope_hydration_error||null,
    mission_title:root.title||null,
    mission_scope:root.scope_text||null,
    generated_at:now
  };
}

export function buildMissionDag(roots=defaultMissionRoots(),options={}) {
  const environment=options.environment||DEFAULT_ENV;
  if(environment==='PROD') throw new Error('MISSION_DAG_V1 refuses PROD generation');
  if(!Array.isArray(roots)||roots.length!==28) throw new Error(`Expected exactly 28 canonical roots, received ${roots?.length}`);
  if(new Set(roots.map(r=>r.mission_id)).size!==28) throw new Error('Duplicate mission_id in canonical roots');
  const now=options.generated_at||new Date(0).toISOString();
  const units=[];

  for(const root of roots){
    units.push({work_unit_id:root.mission_id,mission_id:root.mission_id,parent_id:null,depth:0,title:root.title,kind:'mission_root',priority:root.priority??500,route_class:'orchestrator',risk:'bounded_preprod',status:'READY',dependencies:[],capability_required:['mission_planning','dag_orchestration'],acceptance_criteria:['all child packets resolved or governed exception recorded'],evidence_required:['dag_summary','work_unit_evidence'],idempotency_key:key([VERSION,root.mission_id,'root',root.canonical_scope_ref||'',root.scope_fingerprint||'']),source_fingerprint:key([root.mission_id,root.title||'',root.canonical_scope_ref||'',root.scope_fingerprint||'']),...common(root,environment,now)});

    let previousTail=root.mission_id;
    for(let pIndex=0;pIndex<PHASES.length;pIndex++){
      const [phase,phaseTitle]=PHASES[pIndex];
      const phaseId=unitId(root.mission_id,phase);
      units.push({work_unit_id:phaseId,mission_id:root.mission_id,parent_id:root.mission_id,depth:1,title:phaseTitle,kind:'phase_packet',priority:(root.priority??500)-pIndex,route_class:ROUTE[phase],risk:phase==='implement'?'medium_preprod':'low_preprod',status:'BLOCKED',dependencies:[previousTail],capability_required:phase==='capabilities'?['capability_registry','skill_factory','tech_scout']:[],acceptance_criteria:[`phase ${phase} atomic units complete`],evidence_required:[`${phase}_evidence`],idempotency_key:key([VERSION,root.mission_id,phase,root.scope_fingerprint||'']),source_fingerprint:key([root.mission_id,root.canonical_scope_ref||'',root.scope_fingerprint||'',phase]),...common(root,environment,now)});

      let prior=phaseId;
      for(const atom of ATOMIC[phase]){
        const id=unitId(root.mission_id,phase,atom);
        const isCapability=phase==='capabilities';
        units.push({work_unit_id:id,mission_id:root.mission_id,parent_id:phaseId,depth:2,title:`${phase}.${atom}`,kind:isCapability?'capability_work_unit':'atomic_work_unit',priority:(root.priority??500)-20,route_class:isCapability?'capability_factory':ROUTE[phase],risk:phase==='implement'?'medium_preprod':'low_preprod',status:'BLOCKED',dependencies:[prior],capability_required:isCapability?[atom.replace(/^capability_/,'')]:[],capability_state:isCapability?'ENSURE_IF_MISSING':null,acceptance_criteria:[`${atom} produces deterministic evidence`,'no existing capability is reacquired if already GREEN'],evidence_required:[`${id}.json`],idempotency_key:key([VERSION,root.mission_id,phase,atom,root.scope_fingerprint||'']),source_fingerprint:key([root.mission_id,root.canonical_scope_ref||'',root.scope_fingerprint||'',phase,atom]),...common(root,environment,now)});
        prior=id;
      }
      previousTail=prior;
    }
  }

  const ids=new Set(), keys=new Set();
  for(const u of units){
    if(ids.has(u.work_unit_id)) throw new Error(`Duplicate work_unit_id ${u.work_unit_id}`);
    if(keys.has(u.idempotency_key)) throw new Error(`Duplicate idempotency_key ${u.work_unit_id}`);
    ids.add(u.work_unit_id); keys.add(u.idempotency_key);
  }
  for(const u of units) for(const dep of u.dependencies) if(!ids.has(dep)) throw new Error(`Missing dependency ${dep}`);
  const byId=new Map(units.map(u=>[u.work_unit_id,u]));
  const visiting=new Set(), visited=new Set();
  const dfs=id=>{if(visiting.has(id)) throw new Error(`Cycle detected at ${id}`); if(visited.has(id)) return; visiting.add(id); for(const dep of byId.get(id).dependencies) dfs(dep); visiting.delete(id); visited.add(id);};
  for(const id of byId.keys()) dfs(id);

  const hydratedRoots=roots.filter(r=>r.source_status==='CANONICAL_SCOPE_HYDRATED'&&r.scope_text&&r.scope_fingerprint);
  const graph_fingerprint=digest(units.map(u=>({id:u.work_unit_id,deps:u.dependencies,key:u.idempotency_key,source_status:u.source_status,scope_fingerprint:u.scope_fingerprint})));
  return {
    schema_version:SCHEMA_VERSION,
    engine:VERSION,
    company_id:DEFAULT_COMPANY,
    environment,
    mission_count:roots.length,
    hydrated_mission_count:hydratedRoots.length,
    scope_hydrated:hydratedRoots.length===roots.length,
    canonical_source_sha256:hydratedRoots.length===roots.length?roots[0]?.canonical_source_sha256||null:null,
    work_unit_count:units.length,
    atomic_count:units.filter(u=>u.kind==='atomic_work_unit'||u.kind==='capability_work_unit').length,
    capability_work_unit_count:units.filter(u=>u.kind==='capability_work_unit').length,
    graph_fingerprint,
    safeguards:{paid_ai:false,prod_write:false,trading:false,max_depth:2,dedup:true,cycle_check:true,idempotent:true,scope_hydration_fail_closed:true},
    roots:roots.map(r=>r.mission_id),
    units
  };
}

export const readyQueue=graph=>graph.units.filter(u=>u.status==='READY').sort((a,b)=>b.priority-a.priority||a.work_unit_id.localeCompare(b.work_unit_id));

function main(){
  const outDir=process.env.CEREBRO_MISSION_OUT_DIR||'artifacts/cerebro-mission-dag-v1';
  const graph=buildMissionDag();
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(path.join(outDir,'mission-dag.json'),JSON.stringify(graph,null,2));
  fs.writeFileSync(path.join(outDir,'work-units.jsonl'),graph.units.map(u=>JSON.stringify(u)).join('\n')+'\n');
  fs.writeFileSync(path.join(outDir,'ready-queue.jsonl'),readyQueue(graph).map(u=>JSON.stringify(u)).join('\n')+'\n');
  fs.writeFileSync(path.join(outDir,'summary.json'),JSON.stringify({mission_count:graph.mission_count,hydrated_mission_count:graph.hydrated_mission_count,scope_hydrated:graph.scope_hydrated,canonical_source_sha256:graph.canonical_source_sha256,work_unit_count:graph.work_unit_count,atomic_count:graph.atomic_count,capability_work_unit_count:graph.capability_work_unit_count,graph_fingerprint:graph.graph_fingerprint,safeguards:graph.safeguards},null,2));
  console.log(JSON.stringify({ok:true,mission_count:graph.mission_count,hydrated_mission_count:graph.hydrated_mission_count,scope_hydrated:graph.scope_hydrated,canonical_source_sha256:graph.canonical_source_sha256,work_unit_count:graph.work_unit_count,atomic_count:graph.atomic_count,capability_work_unit_count:graph.capability_work_unit_count,graph_fingerprint:graph.graph_fingerprint}));
}

if(import.meta.url===`file://${process.argv[1]}`) main();
