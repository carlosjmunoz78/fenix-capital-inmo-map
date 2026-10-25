import crypto from 'node:crypto';
import {materializeProdSpecialistEnrichment} from '../knowledge/prod-specialist-enrichment-v1.mjs';
import {materializeProdSpecialistDepthMatrix} from '../knowledge/prod-specialist-depth-matrix-v1.mjs';

const freeze=(v)=>Object.freeze(v);
function dayIndex(date){const t=Date.parse(`${date}T00:00:00Z`);if(!Number.isFinite(t))throw new Error('VALID_DATE_REQUIRED');return Math.floor(t/86400000);}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');}

export function buildDailySpecialistLearningPlan({date=new Date().toISOString().slice(0,10)}={}){
  const roles=materializeProdSpecialistEnrichment();const matrix=materializeProdSpecialistDepthMatrix();
  if(roles.length!==192||matrix.total_cells!==2304)throw new Error('PROD_SPECIALIST_KNOWLEDGE_BASELINE_REQUIRED');
  const idx=dayIndex(date);const byRole=new Map();for(const cell of matrix.cells){const list=byRole.get(cell.role_id)??[];list.push(cell);byRole.set(cell.role_id,list);}
  const role_requests=roles.map((role,roleIndex)=>{
    const cells=(byRole.get(role.role_id)??[]).sort((a,b)=>a.section.localeCompare(b.section));
    if(cells.length!==12)throw new Error(`EXPECTED_12_DEPTH_CELLS:${role.role_id}`);
    const primary=cells[(idx+roleIndex)%cells.length];
    const secondary=cells[(idx+roleIndex+6)%cells.length];
    const frontier=role.frontier_watch??[];
    return freeze({
      request_id:`UMS-DAILY-${date}-${role.role_id}`,
      date,role_id:role.role_id,role_name:role.role_name,department_id:role.department_id,
      primary_section:primary.section,secondary_section:secondary.section,
      questions:freeze([...new Set([...(primary.queries??[]),...(secondary.queries??[]),...(role.daily_learning_questions??[]).slice(0,2)])]),
      source_revalidation_ids:role.verified_sources,
      frontier_watch_ids:freeze(frontier.map(x=>x.id)),
      known_gap_ids:freeze((role.known_capability_gaps??[]).map(x=>x.gap_id)),
      expected_outcome:'NEW_EVIDENCE_OR_EXPLICIT_NO_CHANGE',
      auto_promote:false,prod_write_authorized:false,tool_execution_authorized:false,spend_authorized:false,additional_cost_eur:0
    });
  });

  // The central scout deduplicates by the shared deep-knowledge section, not by role or
  // department. The 12-section curriculum is intentionally common across all enriched
  // specialists, so one governed research job can fan evidence back out to every
  // interested department/role while retaining exact consumer routing below.
  const groups=new Map();
  for(const request of role_requests){
    const key=request.primary_section;
    const group=groups.get(key)??{section:request.primary_section,department_ids:new Set(),role_ids:[],questions:new Set(),source_ids:new Set(),frontier_ids:new Set(),gap_ids:new Set()};
    group.department_ids.add(request.department_id);
    group.role_ids.push(request.role_id);
    request.questions.forEach(q=>group.questions.add(q));
    request.source_revalidation_ids.forEach(x=>group.source_ids.add(x));
    request.frontier_watch_ids.forEach(x=>group.frontier_ids.add(x));
    request.known_gap_ids.forEach(x=>group.gap_ids.add(x));
    groups.set(key,group);
  }
  const research_jobs=[...groups.values()].map((g)=>{
    const department_ids=[...g.department_ids].sort();
    return freeze({
      job_id:`UMS-DAILY-RESEARCH-${date}-${g.section}`,
      date,
      department_id:department_ids.length===1?department_ids[0]:'MULTI',
      department_ids:freeze(department_ids),
      section:g.section,
      consumer_role_ids:freeze(g.role_ids.sort()),
      questions:freeze([...g.questions].sort()),
      source_revalidation_ids:freeze([...g.source_ids].sort()),
      frontier_watch_ids:freeze([...g.frontier_ids].sort()),
      known_gap_ids:freeze([...g.gap_ids].sort()),
      status:'RESEARCH_REQUESTED',
      required_pipeline:freeze(['deduplicate','research','source_verify','rights_license_security','role_fit','benchmark_if_operational','OLD_vs_NEW','tribunal','knowledge_store']),
      auto_promote:false,prod_write_authorized:false,spend_authorized:false,additional_cost_eur:0
    });
  }).sort((a,b)=>a.job_id.localeCompare(b.job_id));
  const report={schema_version:'1.0.0',state_type:'CEREBRO_UMS_DAILY_SPECIALIST_LEARNING_PLAN_V1',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PROD_KNOWLEDGE_REQUESTS',version:'1.0.0',date,specialists:roles.length,role_requests:freeze(role_requests),deduplicated_research_jobs:freeze(research_jobs),role_request_count:role_requests.length,deduplicated_job_count:research_jobs.length,all_roles_request_learning_daily:true,knowledge_auto_promotion:false,prod_write_authorized:false,spend_authorized:false,additional_cost_eur:0};
  return freeze({...report,plan_hash:hash(report)});
}

if(process.argv[1]&&process.argv[1].endsWith('daily-specialist-learning-plan-v1.mjs')){
  const dateArg=process.argv.indexOf('--date');const date=dateArg>=0?process.argv[dateArg+1]:new Date().toISOString().slice(0,10);process.stdout.write(`${JSON.stringify(buildDailySpecialistLearningPlan({date}),null,2)}\n`);
}
