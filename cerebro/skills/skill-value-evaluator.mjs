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

const DOMAIN_OPERATIONAL_TERMS = Object.freeze({
  'agent-ai-orchestration': ['route','routing','orchestrat','agent','capabilit','tool','workflow','context','memory','rag','eval'],
  'software-engineering-devops': ['github','pull request','issue','ci','check','release','repo','repository','test','deploy','code'],
  'browser-automation-scraping': ['browser','navigate','form','click','screenshot','extract','scrap','crawl','test web','automation'],
  'data-database-supabase': ['postgres','database','schema','migration','rls','index','query','sql','trigger','function','pgvector'],
  'seo-search-content': ['seo','keyword','schema','serp','crawl','index','canonical','sitemap','local seo','search console'],
  'security-identity-privacy': ['security','iam','oauth','secret','vulnerab','privacy','gdpr','credential','policy'],
  'web-wordpress-frontend': ['wordpress','gutenberg','frontend','html','css','ui','ux','responsive','web app'],
  'integration-mcp-connectors': ['mcp','connector','integration','webhook','api','oauth','stdio'],
  'documents-office-pdf': ['pdf','docx','word','excel','xlsx','ocr','document','slides','presentation'],
  'marketing-growth-social': ['marketing','copy','campaign','social','linkedin','newsletter','conversion','brand'],
  'knowledge-research-training': ['research','knowledge','training','learning','documentation','source-grounded'],
  'observability-quality-resilience': ['observability','monitor','logs','metrics','incident','regression','backup','rollback','recovery']
});

const LOW_UTILITY_PATTERNS = Object.freeze([
  /\bquick[- ]reference\b/i,
  /\breference card\b/i,
  /\bhelp(?:er)?\b/i,
  /\bpersona\b/i,
  /\bvoice mode\b/i,
  /\bstyle mode\b/i,
  /\bcaveman\b/i,
  /\bwenyan\b/i,
  /\bcommit messages?\b/i,
  /\bcompress\b.{0,30}\b(?:prose|memory|markdown|todo)\b/i
]);

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

export function operationalFitScore(manifest,domain){
  if(!manifest) return 50;
  const text=`${manifest.declared_name??''} ${manifest.declared_description??''}`.toLowerCase();
  if(!text.trim()) return 35;
  if(LOW_UTILITY_PATTERNS.some((pattern)=>pattern.test(text))) return 15;
  const terms=DOMAIN_OPERATIONAL_TERMS[domain]??[];
  const hits=terms.filter((term)=>text.includes(term)).length;
  const actionBonus=/\b(?:create|review|diagnos|automate|extract|test|deploy|migrat|optim|route|manage|monitor|analy|build|write|change|fill|click|navigate)\w*\b/i.test(text)?10:0;
  const specificityBonus=(manifest.declared_description?.length??0)>=120?10:0;
  return clamp(45+Math.min(35,hits*7)+actionBonus+specificityBonus);
}

function instructionIntegrityPenalty(manifest){
  const flags=new Set(manifest?.static_flags??[]);
  let penalty=0;
  if(flags.has('ROUTER_PRECEDENCE_CLAIM')) penalty+=12;
  if(flags.has('SHELL_PIPE_EXEC')) penalty+=35;
  if(flags.has('SECRET_ACCESS_MENTION')) penalty+=20;
  if(flags.has('NETWORK_DOWNLOAD_COMMAND')) penalty+=15;
  return clamp(penalty,0,100);
}

export function evaluateStaticSkillValue(wrapperPlans,prelab,upstreams,overlapReport,licenses,{now=new Date(),manifests=null}={}){
  const prelabMap=byCandidate(prelab);
  const manifestMap=byCandidate(manifests);
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
    const manifest=manifestMap.get(id)??null;
    const domain=plan.domain??overlap?.binding_domain_id??overlap?.top_domains?.[0]?.domain_id??null;
    const strategic=DOMAIN_STRATEGIC_FIT[domain]??75;
    const evidence=evidenceScore(plan,repo,license);
    const maintenance=maintenanceScore(repo,now);
    const portability=portabilityScore(plan,p);
    const permission=permissionBurdenScore(plan);
    const zeroCost=plan?.economics?.additional_cost_target_eur===0?100:0;
    const reusePotential=overlap?.overlap_state==='EXISTING_DOMAIN_OVERLAP'?88:70;
    const operationalFit=operationalFitScore(manifest,domain);
    const duplicatePenalty=duplicationPenalty(overlap);
    const permissionPenalty=permissionRiskPenalty(p);
    const maintPenalty=maintenanceRiskPenalty(repo);
    const instructionPenalty=instructionIntegrityPenalty(manifest);
    const weighted=(strategic*0.2)+(reusePotential*0.15)+(evidence*0.1)+(maintenance*0.1)+(portability*0.1)+(permission*0.05)+(zeroCost*0.1)+(operationalFit*0.2);
    const riskPenalty=(duplicatePenalty*0.18)+(permissionPenalty*0.22)+(maintPenalty*0.1)+(instructionPenalty*0.15);
    const valueScore=clamp(weighted-riskPenalty);
    const recommendation=operationalFit<60?'HOLD_LOW_OPERATIONAL_FIT':valueScore>=80?'HIGH_VALUE_LAB_BENCHMARK':valueScore>=65?'LAB_BENCHMARK':'HOLD_REVIEW';
    results.push({
      candidate_id:id,
      wrapper_id:plan.wrapper_id,
      domain,
      engine_bindings:[...(plan.engine_bindings??[])],
      skill_class:plan.skill_class,
      declared_name:manifest?.declared_name??null,
      declared_description:manifest?.declared_description??null,
      value_score:Number(valueScore.toFixed(2)),
      recommendation,
      components:{strategic_fit:strategic,reuse_potential:reusePotential,evidence,maintenance,portability,permission_simplicity:permission,zero_cost:zeroCost,operational_fit:operationalFit},
      penalties:{duplication:Number(duplicatePenalty.toFixed(2)),permission_risk:permissionPenalty,maintenance_risk:maintPenalty,instruction_integrity:instructionPenalty},
      evidence_refs:{upstream_full_name:repo?.full_name??plan.provenance?.upstream_full_name??null,upstream_head_commit:repo?.head_commit??plan.provenance?.upstream_head_commit??null,manifest_sha256:plan.provenance?.manifest_sha256??null,license_status:license?.status??null},
      popularity_used_in_score:false,
      external_code_executed:false,
      adoption_authorized:false,
      prod_authorized:false
    });
  }
  results.sort((a,b)=>b.value_score-a.value_score||a.candidate_id.localeCompare(b.candidate_id));
  return Object.freeze({
    schema_version:'0.2.0',
    execution_mode:'STATIC_VALUE_EVALUATION_ONLY',
    candidates_evaluated:results.length,
    high_value_candidates:results.filter((x)=>x.recommendation==='HIGH_VALUE_LAB_BENCHMARK').length,
    low_operational_fit_candidates:results.filter((x)=>x.recommendation==='HOLD_LOW_OPERATIONAL_FIT').length,
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
  const manifestPath=argValue('--manifests')??'artifacts/cerebro-skill-manifests.json';
  const manifests=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):null;
  const output=argValue('--output')??'artifacts/cerebro-skill-value-p0.json';
  const report=evaluateStaticSkillValue(wrappers,prelab,upstreams,overlap,licenses,{manifests});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,candidates_evaluated:report.candidates_evaluated,high_value_candidates:report.high_value_candidates,low_operational_fit_candidates:report.low_operational_fit_candidates,top:report.results.slice(0,5).map((x)=>({candidate_id:x.candidate_id,name:x.declared_name,score:x.value_score,recommendation:x.recommendation,operational_fit:x.components.operational_fit})),popularity_used_in_score:false,adoption_authorized:false}));
}
