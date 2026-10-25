import fs from 'node:fs';
import {materializeSpecialtyKnowledgePacks} from './specialty-knowledge-pack.mjs';

const EXPANSION_URL=new URL('./verified-source-expansion-prod-2026-10-25.json',import.meta.url);
const SKILLS_URL=new URL('./existing-skill-reuse-map-prod-2026-10-25.json',import.meta.url);
const TARGET_DEPARTMENTS=Object.freeze(['D03','D05','D06','D07','D08','D09','D10','D11','D12','D14','D15','D16','D18','D19','D21','D23','D24','D25','D30','D32','D34','D35','D36','D44']);
const freeze=(v)=>Object.freeze(v);
const load=(url)=>JSON.parse(fs.readFileSync(url,'utf8'));

function indexSources(expansion){
  const byDepartment=new Map();
  for(const source of expansion.sources??[]){
    for(const department of source.departments??[]){
      const list=byDepartment.get(department)??[];list.push(source);byDepartment.set(department,list);
    }
  }
  return byDepartment;
}
function indexSkills(skillMap){
  const byDepartment=new Map();
  for(const skill of skillMap.skills??[]){
    for(const department of skill.departments??[]){const list=byDepartment.get(department)??[];list.push(skill);byDepartment.set(department,list);}
  }
  return byDepartment;
}
function gapsFor(skillMap,department){return (skillMap.known_missing_or_unbound??[]).filter((gap)=>(gap.departments??[]).includes(department));}

export function materializeProdSpecialistEnrichment(){
  const expansion=load(EXPANSION_URL);const skillMap=load(SKILLS_URL);
  const bySource=indexSources(expansion);const bySkill=indexSkills(skillMap);
  const packs=materializeSpecialtyKnowledgePacks().filter((pack)=>TARGET_DEPARTMENTS.includes(pack.department_id));
  if(packs.length!==192)throw new Error(`EXPECTED_192_TARGET_SPECIALISTS_GOT_${packs.length}`);
  return packs.map((pack)=>{
    const sources=(bySource.get(pack.department_id)??[]).sort((a,b)=>a.source_id.localeCompare(b.source_id));
    const skills=(bySkill.get(pack.department_id)??[]).sort((a,b)=>a.skill_id.localeCompare(b.skill_id));
    const knowledge=[...new Set(sources.flatMap((source)=>source.knowledge_points??[]))];
    const sourceIds=sources.map((source)=>source.source_id);
    const sourceUris=sources.map((source)=>source.uri);
    const sourceTopics=[...new Set(sources.map((source)=>source.topic))];
    const reusableSkills=skills.filter((skill)=>['REUSE_EXISTING_PROD_CORE','REUSE_IF_PRESENT','P1_ADAPTER_SEAM_ONLY','P1_AVAILABLE_CAPABILITY_REFERENCE','P1_OPEN_SOURCE_CANDIDATE'].includes(skill.status));
    const benchmarkSkills=skills.filter((skill)=>['LAB_CANDIDATE','BENCHMARK_REQUIRED'].includes(skill.status));
    const heldSkills=skills.filter((skill)=>String(skill.status).startsWith('HOLD_')||skill.status==='CATALOG_ONLY');
    const gaps=gapsFor(skillMap,pack.department_id);
    return freeze({
      schema_version:'1.0.0',state_type:'CEREBRO_UMS_PROD_SPECIALIST_ENRICHMENT_V1',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PROD',version:'1.0.0',
      role_id:pack.role_id,role_name:pack.role_name,department_id:pack.department_id,domain:pack.domain,
      specialty_terms:pack.specialty_terms,
      verified_sources:freeze(sourceIds),verified_source_uris:freeze(sourceUris),source_topics:freeze(sourceTopics),
      verified_knowledge_points:freeze(knowledge),
      reusable_cerebro_skills:freeze(reusableSkills.map((skill)=>freeze({skill_id:skill.skill_id,status:skill.status,capabilities:skill.capabilities,notes:skill.notes}))),
      benchmark_candidate_skills:freeze(benchmarkSkills.map((skill)=>freeze({skill_id:skill.skill_id,status:skill.status,capabilities:skill.capabilities,notes:skill.notes}))),
      held_or_reference_skills:freeze(heldSkills.map((skill)=>freeze({skill_id:skill.skill_id,status:skill.status,capabilities:skill.capabilities,notes:skill.notes}))),
      known_capability_gaps:freeze(gaps),
      professional_sections:pack.required_sections,
      daily_learning_questions:freeze([
        `What changed today in ${pack.role_name} standards, workflows, tools or research?`,
        `Which current ${pack.role_name} workflow gives better quality, reliability or cost than our baseline?`,
        `What failure modes or production incidents are newly documented for ${pack.role_name}?`,
        `Which open-source or already-owned capability can improve ${pack.role_name} without adding recurring cost?`,
        `Which announced or frontier capability could materially change ${pack.role_name} in the next 3-12 months?`,
        `What evidence would be required to replace an existing ${pack.role_name} method under OLD vs NEW?`
      ]),
      research_queries:pack.research_queries,
      learning_horizons:pack.learning.horizons,
      status:sources.length>=2&&knowledge.length>=6?'PROD_VERIFIED_SEED_ACTIVE':'PROD_SEED_NEEDS_MORE_DEPTH',
      deep_mastery_claim:false,
      source_revalidation_required:true,
      operational_tool_promotion_requires_benchmark:true,
      rights_license_security_review_required:true,
      additional_cost_eur:0
    });
  });
}

export function prodSpecialistEnrichmentSummary(){
  const roles=materializeProdSpecialistEnrichment();
  return freeze({
    target_specialists:roles.length,
    target_departments:new Set(roles.map((r)=>r.department_id)).size,
    roles_with_two_or_more_verified_sources:roles.filter((r)=>r.verified_sources.length>=2).length,
    roles_with_six_or_more_verified_knowledge_points:roles.filter((r)=>r.verified_knowledge_points.length>=6).length,
    roles_active:roles.filter((r)=>r.status==='PROD_VERIFIED_SEED_ACTIVE').length,
    deep_mastery_claims:roles.filter((r)=>r.deep_mastery_claim).length,
    additional_cost_eur:0
  });
}

if(process.argv[1]&&process.argv[1].endsWith('prod-specialist-enrichment-v1.mjs')){
  const output=process.argv.includes('--summary')?prodSpecialistEnrichmentSummary():materializeProdSpecialistEnrichment();
  process.stdout.write(`${JSON.stringify(output,null,2)}\n`);
}
