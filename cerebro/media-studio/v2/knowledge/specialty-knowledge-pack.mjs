import {materializeRoleProfiles} from '../registry/role-profile-factory.mjs';
import {departmentKnowledgeBaseline} from './department-knowledge-baseline.mjs';

const SOURCE_CLASSES=['SRC-STANDARDS','SRC-INTEROP','SRC-PROFESSIONAL-BODIES','SRC-VENDOR-OFFICIAL','SRC-RESEARCH','SRC-PRODUCTION','SRC-INTERNAL'];
const REQUIRED_SECTIONS=['professional_standards','canonical_workflows','tools_and_models','research_and_papers','case_studies','benchmarks','rights_and_licenses','failure_modes','quality_metrics','cost_latency_compute','interoperability','future_watch'];
const STOP=new Set(['and','or','the','of','for','to','in','with','a','an','senior','junior','specialist','artist','engineer','producer','supervisor','coordinator','lead','head']);

function terms(value=''){
  return [...new Set(String(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9+.# -]/g,' ').split(/\s+/).filter((x)=>x.length>1&&!STOP.has(x)))];
}
function specializationTerms(profile){
  return [...new Set([...terms(profile.name),...terms(profile.domain)])].slice(0,24);
}
function rubricFor(profile){
  const words=specializationTerms(profile);
  return Object.freeze({
    dimensions:Object.freeze(['technical_correctness','professional_workflow_fidelity','output_quality','continuity_consistency','rights_and_provenance','interoperability','latency_and_compute','cost_efficiency','failure_recovery','reproducibility']),
    pass_rule:'No critical dimension may fail; measurable candidate must beat or equal baseline on quality while respecting rights, cost and reliability gates.',
    specialty_signals:Object.freeze(words),
    evidence_required:true,
    old_vs_new_required:true,
    independent_review_required:true
  });
}

export function buildSpecialtyKnowledgePack(profile){
  if(!profile||profile.role_class!=='SPECIALIST')throw new Error('SPECIALIST_PROFILE_REQUIRED');
  const baseline=departmentKnowledgeBaseline(profile.department_id);
  const specialty=specializationTerms(profile);
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_UMS_SPECIALTY_KNOWLEDGE_PACK_V1',
    company_id:'GLOBAL',engine_id:'UMS-001',environment:'PREPROD',version:'1.0.0',
    role_id:profile.id,role_name:profile.name,department_id:profile.department_id,domain:profile.domain,
    inheritance:Object.freeze({common_professional_profile:true,department_baseline:baseline.department_id,department_quality_level:baseline.quality_level}),
    specialty_terms:Object.freeze(specialty),
    topics:Object.freeze([...new Set([...baseline.topics,...specialty.map((x)=>`${x} professional practice`),...specialty.map((x)=>`${x} failure modes`),...specialty.map((x)=>`${x} quality metrics`)])]),
    source_classes:Object.freeze([...SOURCE_CLASSES]),
    source_families:Object.freeze([...baseline.source_families]),
    required_sections:Object.freeze([...REQUIRED_SECTIONS]),
    research_queries:Object.freeze([
      `${profile.name} professional standards current`,
      `${profile.name} production workflow best practices`,
      `${profile.name} failure modes quality control`,
      `${profile.name} benchmark tools interoperability`,
      `${profile.name} emerging research production readiness`
    ]),
    evaluation:rubricFor(profile),
    promotion_policy:Object.freeze({verified_sources_required:true,license_rights_security_check:true,benchmark_before_operational_promotion:true,old_vs_new:true,tribunal:true,unknown_source_auto_promote:false}),
    learning:Object.freeze({daily_inbox:true,horizons:['NOW','EMERGING','COMING','FRONTIER'],supersession_supported:true}),
    deep_knowledge_status:'STRUCTURED_RESEARCH_REQUIRED',
    operational_claim:false,
    additional_cost_eur:0
  });
}

export function materializeSpecialtyKnowledgePacks(){
  return materializeRoleProfiles().filter((p)=>p.role_class==='SPECIALIST').map(buildSpecialtyKnowledgePack);
}

export function specialtyKnowledgePackSummary(){
  const packs=materializeSpecialtyKnowledgePacks();
  const departments=new Set(packs.map((p)=>p.department_id));
  return Object.freeze({specialists:packs.length,departments:departments.size,structured:packs.filter((p)=>p.deep_knowledge_status==='STRUCTURED_RESEARCH_REQUIRED').length,operational_claims:packs.filter((p)=>p.operational_claim).length,additional_cost_eur:0});
}
