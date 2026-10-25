import fs from 'node:fs';
import {materializeSpecialtyKnowledgePacks} from './specialty-knowledge-pack.mjs';

const SNAPSHOT_URL=new URL('./verified-source-snapshot-2026-10-25.json',import.meta.url);
const EXPANSION_URL=new URL('./verified-source-expansion-prod-2026-10-25.json',import.meta.url);
function loadJson(url){return JSON.parse(fs.readFileSync(url,'utf8'));}
function loadSnapshot(){
  const base=loadJson(SNAPSHOT_URL);const expansion=loadJson(EXPANSION_URL);
  const byId=new Map();
  for(const source of [...(base.sources??[]),...(expansion.sources??[])])byId.set(source.source_id,source);
  return {
    snapshot_date:[base.snapshot_date,expansion.snapshot_date].filter(Boolean).sort().at(-1),
    sources:[...byId.values()],
    source_sets:[
      {id:'BASE',environment:'PROD_FOUNDATION',count:(base.sources??[]).length},
      {id:'PROD_EXPANSION_2026_10_25',environment:expansion.environment??'PROD',count:(expansion.sources??[]).length}
    ]
  };
}
const freeze=(value)=>Object.freeze(value);
function verified(source){return String(source?.status??'').startsWith('VERIFIED_');}
function statusFor(count){return count===0?'NO_VERIFIED_DEPARTMENT_SOURCE':count===1?'SEED_SINGLE_SOURCE':'SEED_MULTI_SOURCE';}
function priorityFor(count){return count===0?'CRITICAL':count===1?'HIGH':'MEDIUM';}
function sourceIndex(snapshot){const map=new Map();for(const source of snapshot.sources??[]){if(!verified(source))continue;for(const department of source.departments??[]){const list=map.get(department)??[];list.push(source);map.set(department,list);}}return map;}

export function buildSpecialtyKnowledgeCoverage({snapshot=loadSnapshot(),packs=materializeSpecialtyKnowledgePacks()}={}){
  if(!snapshot?.snapshot_date||!Array.isArray(snapshot?.sources))throw new Error('VERIFIED_SOURCE_SNAPSHOT_REQUIRED');
  if(!Array.isArray(packs)||packs.length!==384)throw new Error('EXACT_384_SPECIALIST_PACKS_REQUIRED');
  const byDepartment=sourceIndex(snapshot);
  const roles=packs.map((pack)=>{
    const sources=byDepartment.get(pack.department_id)??[];
    const verified_source_count=sources.length;
    const knowledgePoints=[...new Set(sources.flatMap((source)=>source.knowledge_points??[]))];
    return freeze({
      role_id:pack.role_id,role_name:pack.role_name,department_id:pack.department_id,domain:pack.domain,
      verified_source_count,verified_source_ids:freeze(sources.map((s)=>s.source_id).sort()),
      source_status:statusFor(verified_source_count),
      verified_seed_density:Number(Math.min(1,verified_source_count/3).toFixed(3)),
      inherited_verified_knowledge_points:freeze(knowledgePoints),
      required_sections:pack.required_sections,
      section_level_verification:'PARTIAL_DEPARTMENT_SOURCE_MAPPING',
      deep_verified_operational_knowledge:false,
      research_required:true
    });
  });
  const departments=[...new Set(packs.map((p)=>p.department_id))].sort().map((department_id)=>{
    const departmentRoles=roles.filter((r)=>r.department_id===department_id);
    const sources=byDepartment.get(department_id)??[];
    return freeze({department_id,specialist_count:departmentRoles.length,verified_source_count:sources.length,verified_source_ids:freeze(sources.map((s)=>s.source_id).sort()),source_status:statusFor(sources.length),priority:priorityFor(sources.length),knowledge_point_count:[...new Set(sources.flatMap((s)=>s.knowledge_points??[]))].length});
  });
  const research_jobs=departments.map((department)=>{
    const rolePacks=packs.filter((p)=>p.department_id===department.department_id);
    const queries=[...new Set(rolePacks.flatMap((p)=>p.research_queries??[]))].slice(0,32);
    return freeze({
      job_id:`UMS-KNOWLEDGE-GAP-${department.department_id}`,company_id:'GLOBAL',engine_id:'UMS-001',environment:'PREPROD',version:'2.0.1',
      department_id:department.department_id,priority:department.priority,status:'RESEARCH_REQUIRED',
      reason:department.verified_source_count===0?'NO_VERIFIED_OFFICIAL_SOURCE_MAPPED_TO_DEPARTMENT':'DEEP_ROLE_AND_SECTION_COVERAGE_NOT_YET_PROVEN',
      specialist_role_ids:freeze(rolePacks.map((p)=>p.role_id)),research_queries:freeze(queries),
      required_pipeline:freeze(['existing_cerebro_learning_intake','source_verification','license_rights_security','role_section_mapping','benchmark_if_operational','OLD_vs_NEW','tribunal','knowledge_store_review']),
      auto_promote:false,prod_write_authorized:false,spend_authorized:false,additional_cost_eur:0
    });
  });
  const zeroSourceRoles=roles.filter((r)=>r.verified_source_count===0).length;
  const zeroSourceDepartments=departments.filter((d)=>d.verified_source_count===0).length;
  return freeze({
    schema_version:'2.0.1',state_type:'CEREBRO_UMS_SPECIALIST_KNOWLEDGE_COVERAGE_V1',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PROD_KNOWLEDGE_WITH_GOVERNED_RESEARCH',version:'2.0.1',
    snapshot_date:snapshot.snapshot_date,source_sets:freeze(snapshot.source_sets??[]),specialist_roles:roles.length,departments:departments.length,verified_sources:snapshot.sources.filter(verified).length,
    roles_with_zero_verified_department_sources:zeroSourceRoles,roles_with_one_or_more_verified_department_sources:roles.length-zeroSourceRoles,
    departments_with_zero_verified_sources:zeroSourceDepartments,departments_with_one_or_more_verified_sources:departments.length-zeroSourceDepartments,
    roles:freeze(roles),department_coverage:freeze(departments),research_jobs:freeze(research_jobs),
    interpretation:'ALL DEPARTMENTS NOW HAVE VERIFIED SEED SOURCES, BUT DEPARTMENT-LEVEL SOURCE MAPPING IS NOT A CLAIM OF DEEP ROLE MASTERY. ROLE/SECTION RESEARCH AND BENCHMARKING CONTINUE.',
    prod_knowledge_loaded:true,
    deep_verified_operational_claims:0,knowledge_auto_promotion:false,prod_authorized:false,prod_write_authorized:false,prod_tool_execution_authorized:false,spend_authorized:false,additional_cost_eur:0
  });
}

if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href){
  const report=buildSpecialtyKnowledgeCoverage();
  const outIndex=process.argv.indexOf('--out');const out=outIndex>=0?process.argv[outIndex+1]:null;
  const body=`${JSON.stringify(report,null,2)}\n`;if(out)fs.writeFileSync(out,body);else process.stdout.write(body);
}
