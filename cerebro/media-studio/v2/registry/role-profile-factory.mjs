import { loadSourceRegistry } from './role-registry.mjs';

const KNOWLEDGE_REQUIREMENTS=['professional_standards','canonical_workflows','tools_and_models','research_and_papers','case_studies','benchmarks','rights_and_licenses','failure_modes','quality_metrics','cost_latency_compute','interoperability','future_watch'];
const AUTONOMY={HEAD:'ORCHESTRATE_WITH_GATES',SPECIALIST:'EXECUTE_WITHIN_CONTRACT',SUPERVISOR:'INDEPENDENT_REVIEW',JUDGE:'INDEPENDENT_JUDGMENT',GUARDIAN:'FAIL_CLOSED_POLICY',BRAIN:'ORCHESTRATE_WITH_GATES'};

function baseProfile({id,name,role_class,department_id=null,domain=null,parent_id=null}){
  return {
    id,name,role_class,department_id,domain,parent_id,
    company_scope:'MULTI_COMPANY',environment_scope:['LAB','PREPROD','PROD'],
    mission: role_class==='SPECIALIST'?`Perform ${name} work at professional studio quality within ${domain}.`:`Act as ${name} with independent, auditable responsibility.`,
    autonomy:AUTONOMY[role_class],
    knowledge_requirements:[...KNOWLEDGE_REQUIREMENTS],
    learning:{daily_inbox:true,horizons:['NOW','EMERGING','COMING','FRONTIER'],requires_old_vs_new:true,requires_benchmark_before_promotion:true},
    evidence:{sources_required:true,versioned:true,provenance_required:true},
    quality:{self_check:true,supervisor_required:role_class!=='GUARDIAN'&&role_class!=='JUDGE',tribunal_when_routed:true},
    safety:{rights_gate:true,license_gate:true,security_gate:true,cost_gate:true,no_cross_company:true},
    status:'REGISTERED_KNOWLEDGE_BOOTSTRAP_REQUIRED'
  };
}

export function materializeRoleProfiles(){
  const r=loadSourceRegistry(); const out=[];
  out.push(baseProfile({id:r.studio_brain.id,name:r.studio_brain.name,role_class:'BRAIN',domain:'UNIVERSAL_MEDIA_STUDIO'}));
  for(const d of r.departments){
    out.push(baseProfile({id:d.id,name:d.name,role_class:'HEAD',domain:d.name,parent_id:r.studio_brain.id}));
    for(const s of d.specialists||[]) out.push(baseProfile({id:s.id,name:s.name,role_class:'SPECIALIST',department_id:d.id,domain:d.name,parent_id:d.id}));
  }
  for(const s of r.supervisors||[]) out.push(baseProfile({id:s.id,name:s.name,role_class:'SUPERVISOR',domain:'INDEPENDENT_SUPERVISION'}));
  for(const t of r.tribunals||[]) for(const j of t.judges||[]) out.push(baseProfile({id:j.id,name:j.name,role_class:'JUDGE',domain:t.name,parent_id:t.id}));
  for(const g of r.guardians||[]) out.push(baseProfile({id:g.id,name:g.name,role_class:'GUARDIAN',domain:'GOVERNANCE_GUARD'}));
  return out;
}

export function roleProfileSummary(){
  const p=materializeRoleProfiles(); const by_class={};
  for(const x of p) by_class[x.role_class]=(by_class[x.role_class]||0)+1;
  return {total:p.length,by_class,knowledge_bootstrap_required:p.filter(x=>x.status==='REGISTERED_KNOWLEDGE_BOOTSTRAP_REQUIRED').length};
}

export function getRoleProfile(id){return materializeRoleProfiles().find(x=>x.id===id)||null;}
