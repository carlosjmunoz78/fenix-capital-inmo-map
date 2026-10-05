import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

function byCandidate(report){
  const map=new Map();
  for(const item of report?.results??[]) if(item?.candidate_id) map.set(item.candidate_id,item);
  return map;
}

function wrapperId(candidateId,commit,manifestSha){
  return `skillwrap:${createHash('sha256').update(`${candidateId}|${commit??''}|${manifestSha??''}`).digest('hex').slice(0,20)}`;
}

function classifySkillClass(domain){
  const shared=new Set(['agent-ai-orchestration','software-engineering-devops','browser-automation-scraping','data-database-supabase','security-identity-privacy','observability-quality-resilience']);
  return shared.has(domain)?'SHARED':'CEREBRO_RUNTIME';
}

export function buildWrapperPlans(prelab,shortlist,manifests,licenses){
  const shortlistMap=byCandidate(shortlist);
  const manifestMap=byCandidate(manifests);
  const licenseMap=byCandidate(licenses);
  const plans=[];
  for(const admission of prelab?.results??[]){
    if(!String(admission.prelab_state??'').startsWith('STATIC_PRELAB_READY')) continue;
    const candidate=shortlistMap.get(admission.candidate_id);
    const manifest=manifestMap.get(admission.candidate_id);
    const license=licenseMap.get(admission.candidate_id);
    if(!candidate||!manifest) continue;
    plans.push({
      wrapper_id:wrapperId(admission.candidate_id,admission.upstream_head_commit??manifest.upstream_head_commit,manifest.sha256),
      status:'WRAPPER_PLAN_ONLY',
      enabled:false,
      execution_authorized:false,
      install_authorized:false,
      prod_authorized:false,
      sandbox_authorized:false,
      new_engine_id:false,
      owner_engine_id:'FACT-001',
      candidate_id:admission.candidate_id,
      skill_class:classifySkillClass(candidate.top_domain),
      domain:candidate.top_domain,
      engine_bindings:[...(candidate.suggested_engine_bindings??[])],
      provenance:{
        source_ref:candidate.source_ref,
        upstream_full_name:candidate.upstream_full_name,
        upstream_head_commit:candidate.upstream_head_commit,
        manifest_path:candidate.manifest_path,
        manifest_sha256:candidate.manifest_sha256,
        declared_name:manifest.declared_name??null,
        declared_description:manifest.declared_description??null,
        repo_license_spdx:candidate.repo_license_spdx??null,
        license_evidence_status:license?.status??null,
        license_evidence_hashes:(license?.exact_evidence??[]).filter((x)=>x.fetched).map((x)=>({path:x.path,sha256:x.sha256,detected_family:x.detected_family})),
        legal_compatibility:'UNASSESSED'
      },
      contract:{
        inputs:'UNRESOLVED_LAB_CONTRACT',
        outputs:'UNRESOLVED_LAB_CONTRACT',
        side_effects:'DENY_BY_DEFAULT',
        deterministic_path:'PREFERRED_WHERE_APPLICABLE'
      },
      permissions:{
        network:false,
        filesystem_read:false,
        filesystem_write:false,
        credentials:false,
        external_actions:false,
        prod_write:false,
        trading_access:false
      },
      economics:{additional_cost_target_eur:0,paid_service_required:false},
      quality:{
        static_prelab_state:admission.prelab_state,
        bundle_static_flags:[...(admission.bundle_static_flags??[])],
        tests_required:true,
        eval_required:true,
        tribunal_required:true,
        old_vs_new_required:true,
        rollback_required:true
      },
      next_gate:admission.prelab_state==='STATIC_PRELAB_READY_INSTRUCTION_ONLY'
        ?'BUILD_NORMALIZED_INSTRUCTION_WRAPPER_IN_LAB_WITHOUT_EXTERNAL_EXECUTION'
        :'DESIGN_ISOLATED_SANDBOX_BEFORE_ANY_CODE_EXECUTION'
    });
  }
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'WRAPPER_PLAN_ONLY',
    wrapper_plans:plans.length,
    enabled_wrappers:0,
    execution_authorized:false,
    install_authorized:false,
    prod_authorized:false,
    plans
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const prelab=JSON.parse(fs.readFileSync(argValue('--prelab')??'artifacts/cerebro-skill-prelab-p0.json','utf8'));
  const shortlist=JSON.parse(fs.readFileSync(argValue('--shortlist')??'artifacts/cerebro-skill-shortlist.json','utf8'));
  const manifests=JSON.parse(fs.readFileSync(argValue('--manifests')??'artifacts/cerebro-skill-manifests.json','utf8'));
  const licenses=JSON.parse(fs.readFileSync(argValue('--licenses')??'artifacts/cerebro-skill-license-evidence.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-wrapper-plans-p0.json';
  const report=buildWrapperPlans(prelab,shortlist,manifests,licenses);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,wrapper_plans:report.wrapper_plans,enabled_wrappers:0,execution_authorized:false,install_authorized:false,prod_authorized:false}));
}
