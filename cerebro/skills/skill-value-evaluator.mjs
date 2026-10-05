import fs from 'node:fs';
import path from 'node:path';

const DOMAIN_STRATEGIC_FIT = Object.freeze({
  'agent-ai-orchestration': 92,
  'integration-mcp-connectors': 94,
  'software-engineering-devops': 98,
  'web-wordpress-frontend': 94,
  'seo-search-content': 98,
  'marketing-growth-social': 90,
  'browser-automation-scraping': 98,
  'external-information-retrieval': 90,
  'data-database-supabase': 98,
  'documents-office-pdf': 96,
  'knowledge-research-training': 94,
  'security-identity-privacy': 98,
  'observability-quality-resilience': 98,
  'sales-crm-customer': 94,
  'finance-accounting-payments': 92,
  'legal-compliance-contracts': 88,
  'hr-people-operations': 82,
  'multimedia-voice-video-design': 88,
  'productivity-office-workspace': 90,
  'multi-company-business-bootstrap': 98
});

function byCandidate(report){
  const map=new Map();
  for(const item of report?.results??[]) if(item?.candidate_id) map.set(item.candidate_id,item);
  return map;
}

function clamp(n,min=0,max=100){return Math.max(min,Math.min(max,n));}

function maintenanceScore(repo, now=new Date()){
  if(!repo||repo.archived||repo.disabled) return 0;
  const pushed=new Date(repo.pushed_at??repo.updated_at??0);
  if(Number.isNaN(pushed.getTime())||pushed.getTime()===0) return 50;
  const ageDays=Math.max(0,(now.getTime()-pushed.getTime())/86400000);
  if(ageDays<=30) return 100;
  if(ageDays<=90) return 90;
  if(ageDays<=180) return 80;
  if(ageDays<=365) return 65;
  if(ageDays<=730) return 45;
  return 25;
}

function portabilityScore(plan,prelab){
  if(!plan||!prelab) return 0;
  if(prelab.prelab_state==='STATIC_PRELAB_READY_INSTRUCTION_ONLY') return 100;
  if(prelab.prelab_state==='STATIC_PRELAB_READY_CODE_BUNDLE') return 65;
  return 20;
}

function permissionBurdenScore(plan){
  if(!plan?.permissions) return 40;
  const p=plan.permissions;
  const burden=[p.network,p.filesystem_read,p.filesystem_write,p.credentials,p.external_actions,p.prod_write,p.trading_access].filter(Boolean).length;
  return clamp(100-burden*15);
}

function evidenceScore(plan,repo,license){
  let score=0;
  if(plan?.provenance?.manifest_sha256) score+=25;
  if(plan?.provenance?.upstream_head_commit) score+=20;
  if(repo?.head_tree_sha) score+=15;
  if(license?.status==='EXACT_LICENSE_FILE_EVIDENCE') score+=25;
  if((license?.exact_evidence??[]).some((x)=>x.fetched&&x.sha256)) score+=15;
  return clamp(score);
}

function duplicationPenalty(overlap){
  if(!overlap) return 35;
  if(overlap.overlap_state==='EXACT_KNOWN_UPSTREAM') return 80;
  if(overlap.overlap_state==='EXISTING_DOMAIN_OVERLAP') {
    const confidence=clamp(overlap.overlap_confidence_score??0);
    return clamp(20+confidence*0.25,20,55);
  }
  return 5;
}

function permissionRiskPenalty(prelab){
  const state=prelab?.prelab_state;
  if(state==='STATIC_PRELAB_READY_INSTRUCTION_ONLY') return 0;
  if(state==='STATIC_PRELAB_READY_CODE_BUNDLE') return 15;
  if(state==='TEST_CODE_REVIEW_REQUIRED') return 30;
  if(state==='PERMISSION_REVIEW_REQUIRED') return 45;
  if(state==='SECURITY_REVIEW_REQUIRED') return 70;
  return 35;
}

function maintenanceRiskPenalty(repo){
  if(!repo) return 35;
  if(repo.disabled) return 100;
  if(repo.archived) return 80;
  return 0;
}

export function evaluateStaticSkillValue(wrapperPlans,prelab,upstreams,overlapReport,licenses,{now=new Date()}={}){
  const prelabMap=byCandidate(prelab);
  const repoMap=new Map();
  for(const repo of upstreams?.results??[]) for(const id of repo.discovery_candidate_ids??[]) repoMap.set(id,repo);
  const overlapMap=new Map((overlapReport?.candidates??[]).map((x)=>[x.candidate_id,x]));
  const licenseMap=byCandidate(licenses);
  const results=[];
  for(const plan of wrapperPlans?.plans??[]){
    const id=plan.candidate_id;
    const p=prelabMap.get(id)??null;
    const repo=repoMap.get(id)??null;
    const overlap=overlapMap.get(id)??null;
    const license=licenseMap.get(id)??null;
    const domain=plan.domain??overlap?.binding_domain_id??overlap?.top_domains?.[0]?.domain_id??null;
    const strategic=DOMAIN_STRATEGIC_FIT[domain]??75;
    const evidence=evidenceScore(plan,repo,license);
    const maintenance=maintenanceScore(repo,now);
    const portability=portabilityScore(plan,p);
    const permission=permissionBurdenScore(plan);
    const zeroCost=plan?.economics?.additional_cost_target_eur===0?100:0;
    const reusePotential=overlap?.overlap_state==='EXISTING_DOMAIN_OVERLAP'?88:70;
    const duplicatePenalty=duplicationPenalty(overlap);
    const permissionPenalty=permissionRiskPenalty(p);
    const maintPenalty=maintenanceRiskPenalty(repo);
    const weighted=(strategic*0.25)+(reusePotential*0.2)+(evidence*0.15)+(maintenance*0.1)+(portability*0.1)+(permission*0.1)+(zeroCost*0.1);
    const riskPenalty=(duplicatePenalty*0.18)+(permissionPenalty*0.22)+(maintPenalty*0.1);
    const valueScore=clamp(weighted-riskPenalty);
    const recommendation=valueScore>=80?'HIGH_VALUE_LAB_BENCHMARK':valueScore>=65?'LAB_BENCHMARK':'HOLD_REVIEW';
    results.push({
      candidate_id:id,
      wrapper_id:plan.wrapper_id,
      domain,
      engine_bindings:[...(plan.engine_bindings??[])],
      skill_class:plan.skill_class,
      value_score:Number(valueScore.toFixed(2)),
      recommendation,
      components:{strategic_fit:strategic,reuse_potential:reusePotential,evidence,maintenance,portability,permission_simplicity:permission,zero_cost:zeroCost},
      penalties:{duplication:Number(duplicatePenalty.toFixed(2)),permission_risk:permissionPenalty,maintenance_risk:maintPenalty},
      evidence_refs:{upstream_full_name:repo?.full_name??plan.provenance?.upstream_full_name??null,upstream_head_commit:repo?.head_commit??plan.provenance?.upstream_head_commit??null,manifest_sha256:plan.provenance?.manifest_sha256??null,license_status:license?.status??null},
      popularity_used_in_score:false,
      external_code_executed:false,
      adoption_authorized:false,
      prod_authorized:false
    });
  }
  results.sort((a,b)=>b.value_score-a.value_score||a.candidate_id.localeCompare(b.candidate_id));
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'STATIC_VALUE_EVALUATION_ONLY',
    candidates_evaluated:results.length,
    high_value_candidates:results.filter((x)=>x.recommendation==='HIGH_VALUE_LAB_BENCHMARK').length,
    popularity_used_in_score:false,
    external_code_executed:false,
    adoption_authorized:false,
    prod_authorized:false,
    results
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const wrappers=JSON.parse(fs.readFileSync(argValue('--wrappers')??'artifacts/cerebro-skill-wrapper-plans-p0.json','utf8'));
  const prelab=JSON.parse(fs.readFileSync(argValue('--prelab')??'artifacts/cerebro-skill-prelab-p0.json','utf8'));
  const upstreams=JSON.parse(fs.readFileSync(argValue('--upstreams')??'artifacts/cerebro-skill-upstreams.json','utf8'));
  const overlap=JSON.parse(fs.readFileSync(argValue('--overlap')??'artifacts/cerebro-skill-overlap.json','utf8'));
  const licenses=JSON.parse(fs.readFileSync(argValue('--licenses')??'artifacts/cerebro-skill-license-evidence.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-value-p0.json';
  const report=evaluateStaticSkillValue(wrappers,prelab,upstreams,overlap,licenses);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,candidates_evaluated:report.candidates_evaluated,high_value_candidates:report.high_value_candidates,top:report.results.slice(0,5).map((x)=>({candidate_id:x.candidate_id,score:x.value_score,recommendation:x.recommendation})),popularity_used_in_score:false,adoption_authorized:false}));
}
