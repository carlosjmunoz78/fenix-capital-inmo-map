import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

function stableEventId(type,candidateId,versionRef=''){
  return `evt:skill:${createHash('sha256').update(`${type}|${candidateId}|${versionRef}`).digest('hex').slice(0,24)}`;
}

function makeEvent(type,item,{severity='INFO',reason=null,payload={}}={}){
  const versionRef=item.upstream_head_commit??item.provenance?.upstream_head_commit??'';
  return {
    event_id:stableEventId(type,item.candidate_id,versionRef),
    event_type:type,
    severity,
    company_id:'GLOBAL_ONLY',
    engine_id:'FACT-001',
    environment:'PREPROD_CANDIDATE',
    version:'0.1.0',
    candidate_id:item.candidate_id,
    target_engine_bindings:[...(item.suggested_engine_bindings??item.engine_bindings??[])],
    reason,
    evidence_ref:{
      source_ref:item.source_ref??item.provenance?.source_ref??null,
      upstream_full_name:item.upstream_full_name??item.provenance?.upstream_full_name??null,
      upstream_head_commit:versionRef||null,
      manifest_path:item.manifest_path??item.provenance?.manifest_path??null,
      manifest_sha256:item.manifest_sha256??item.provenance?.manifest_sha256??null
    },
    payload,
    publish_authorized:false,
    prod_authorized:false
  };
}

export function buildSkillImprovementEventProposals(shortlist,prelab,wrapperPlans){
  const events=[];
  for(const item of shortlist?.results??[]){
    if(item.disposition==='GAP_REVIEW_REQUIRED'){
      events.push(makeEvent('CAPABILITY_GAP_DETECTED',item,{severity:'MEDIUM',reason:'NO_EXISTING_DOMAIN_MATCH_CONFIRMED',payload:{top_domain:item.top_domain??null,overlap_state:item.overlap_state??null}}));
    }
    if(['QUARANTINE_SECURITY_REVIEW','REJECTED_SECURITY_POLICY'].includes(item.disposition)){
      events.push(makeEvent('SECURITY_ADVISORY',item,{severity:item.disposition==='REJECTED_SECURITY_POLICY'?'HIGH':'MEDIUM',reason:item.disposition,payload:{static_flags:item.static_flags??[]}}));
    }
    if(item.disposition==='LICENSE_REVIEW_REQUIRED'){
      events.push(makeEvent('SKILL_LICENSE_REVIEW_REQUIRED',item,{severity:'MEDIUM',reason:'LICENSE_GATE_NOT_CLEARED',payload:{repo_license_spdx:item.repo_license_spdx??null}}));
    }
    if(item.disposition==='PERMISSION_REVIEW_REQUIRED'){
      events.push(makeEvent('SKILL_PERMISSION_REVIEW_REQUIRED',item,{severity:'MEDIUM',reason:'PERMISSION_GATE_NOT_CLEARED',payload:{static_flags:item.static_flags??[]}}));
    }
  }
  for(const item of prelab?.results??[]){
    if(['SECURITY_REVIEW_REQUIRED','TEST_CODE_REVIEW_REQUIRED'].includes(item.prelab_state)){
      events.push(makeEvent('SECURITY_ADVISORY',item,{severity:item.prelab_state==='SECURITY_REVIEW_REQUIRED'?'HIGH':'LOW',reason:item.prelab_state,payload:{bundle_static_flags:item.bundle_static_flags??[]}}));
    }
  }
  for(const plan of wrapperPlans?.plans??[]){
    events.push(makeEvent('SKILL_CANDIDATE_STATIC_READY',{
      candidate_id:plan.candidate_id,
      source_ref:plan.provenance?.source_ref,
      upstream_full_name:plan.provenance?.upstream_full_name,
      upstream_head_commit:plan.provenance?.upstream_head_commit,
      manifest_path:plan.provenance?.manifest_path,
      manifest_sha256:plan.provenance?.manifest_sha256,
      engine_bindings:plan.engine_bindings
    },{severity:'INFO',reason:'STATIC_PRELAB_GATE_CLEAR',payload:{wrapper_id:plan.wrapper_id,domain:plan.domain,skill_class:plan.skill_class,next_gate:plan.next_gate}}));
  }
  const dedup=[];
  const seen=new Set();
  for(const event of events){
    if(seen.has(event.event_id)) continue;
    seen.add(event.event_id);
    dedup.push(event);
  }
  const counts={};
  for(const event of dedup) counts[event.event_type]=(counts[event.event_type]??0)+1;
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'EVENT_PROPOSALS_ONLY',
    events_total:dedup.length,
    event_counts:counts,
    publish_authorized:false,
    prod_authorized:false,
    rsi_hook_status:'DEFINED_NOT_CONNECTED',
    events:dedup
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const shortlist=JSON.parse(fs.readFileSync(argValue('--shortlist')??'artifacts/cerebro-skill-shortlist.json','utf8'));
  const prelab=JSON.parse(fs.readFileSync(argValue('--prelab')??'artifacts/cerebro-skill-prelab-p0.json','utf8'));
  const wrappers=JSON.parse(fs.readFileSync(argValue('--wrappers')??'artifacts/cerebro-skill-wrapper-plans-p0.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-improvement-events.json';
  const report=buildSkillImprovementEventProposals(shortlist,prelab,wrappers);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,events_total:report.events_total,event_counts:report.event_counts,publish_authorized:false,rsi_hook_status:report.rsi_hook_status}));
}
