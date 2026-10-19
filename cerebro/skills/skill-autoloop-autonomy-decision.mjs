import fs from 'node:fs';
import path from 'node:path';
import {decideSkillCapabilityAutonomy} from '../runtime/skill-capability-autonomy-closure-v1.mjs';

function first(report,key){return report?.[key]?.[0]??null;}
function text(value){return typeof value==='string'&&value.trim()?value.trim():null;}
function uniq(values){return [...new Set((Array.isArray(values)?values:[]).filter((v)=>text(v)).map((v)=>v.trim()))].sort();}

function safeDisabledWrapper(wrapper){
  if(!wrapper) return false;
  const p=wrapper.permissions??{};
  const explicitFalse=['network','filesystem_read','filesystem_write','credentials','external_actions','prod_write','trading_access']
    .every((key)=>p[key]===false||p[key]===undefined);
  return wrapper.enabled===false&&wrapper.execution_authorized===false&&wrapper.install_authorized===false&&wrapper.prod_authorized===false&&
    explicitFalse&&Number(wrapper.economics?.additional_cost_target_eur??0)===0;
}

export function buildAutoloopAutonomyDecision({selection,wrappers,manifests,staticLab,licenses,behavioral,tribunal,rollback,readiness,runId=null}={}){
  const selected=selection?.selected??selection??null;
  if(!text(selected?.candidate_id)) throw new Error('selected candidate required');
  const candidateId=selected.candidate_id.trim();
  const wrapper=first(wrappers,'plans');
  const manifest=first(manifests,'results');
  const lab=first(staticLab,'results');
  const license=first(licenses,'results');
  const tribunalCandidate=(tribunal?.candidates??[]).find((x)=>x?.candidate_id===candidateId)??first(tribunal,'candidates');

  const sameCandidate=[wrapper,manifest,lab,license,tribunalCandidate]
    .filter(Boolean)
    .every((item)=>!item.candidate_id||item.candidate_id===candidateId);
  if(!sameCandidate) throw new Error('candidate evidence mismatch');

  const version=text(wrapper?.provenance?.upstream_head_commit)??text(manifest?.upstream_head_commit)??text(wrapper?.provenance?.manifest_sha256)??`candidate-${candidateId}`;
  const bindings=uniq(selected.engine_bindings?.length?selected.engine_bindings:wrapper?.engine_bindings);
  const readinessGreen=readiness?.ready===true&&readiness?.status==='READY_FOR_PREPROD_PROMOTION_REVIEW'&&readiness?.autonomous_preprod_decision_authorized===true;
  const tribunalGreen=tribunal?.decision==='GREEN'&&tribunal?.green===true&&tribunalCandidate?.decision==='GREEN';
  const rollbackGreen=rollback?.ready===true&&rollback?.status==='GREEN_ROLLBACK_REBUILD_PROOF';
  const staticGreen=lab?.status==='STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL'&&!(lab?.hard_blocks??[]).length&&Number(lab?.policy_alignment_score??0)===100;
  const behavioralGreen=behavioral?.status==='PROXY_COMPLETE';
  const wrapperSafe=safeDisabledWrapper(wrapper);
  const technicalLicenseGreen=license?.status==='EXACT_LICENSE_FILE_EVIDENCE'&&license?.metadata_matches_detected===true&&tribunalCandidate?.decision==='GREEN';
  const evidenceComplete=readinessGreen&&tribunalGreen&&rollbackGreen&&staticGreen&&behavioralGreen&&wrapperSafe&&technicalLicenseGreen;

  return decideSkillCapabilityAutonomy({
    company_id:text(selected.company_id)??'GLOBAL',environment:'PREPROD',version:'1.0.0',skill_id:candidateId,skill_version:version,risk_class:'LOW',
    source_ref:`skill-autoloop:${runId??'unknown'}:${candidateId}`,
    security:{provenance_ok:Boolean(text(manifest?.upstream_head_commit)??text(wrapper?.provenance?.upstream_head_commit)),supply_chain_ok:staticGreen,license_ok:technicalLicenseGreen,incident:false,legal_required:false},
    evidence:{complete:evidenceComplete,confidence:1},policy_locked:staticGreen&&wrapperSafe,permissions_locked:wrapperSafe,rollback_ready:rollbackGreen,rebuild_ready:rollbackGreen,
    duplicate:{exact:false},demand:{needed_now:true},impact:{existing_engine_bindings:bindings},old_vs_new:{decision:behavioralGreen&&readinessGreen?'PASS':'MORE_EVIDENCE',reasons:readiness?.blockers??[]},tribunal:{decision:tribunalGreen?'PASS':'MORE_EVIDENCE'},
    cost:{additional_cost_eur:0,zero_cost_alternative:false,roi_positive:false,money_limit_exceeded:false},internal_wrapper_ready:false,external_code_execution_required:false
  });
}

export function buildSafeHandlerReconciliation(decision){
  if(!decision?.decision_id||!decision?.decision) throw new Error('canonical autonomy decision required');
  if(decision.human_required){
    return {outcome:'HUMAN_REQUIRED',reason:decision.reasons?.join('|')||decision.human_required,decision_id:decision.decision_id,human_required:decision.human_required,decision:decision.decision};
  }
  return {outcome:'AUTONOMOUS_PREPROD_DECISION',reason:decision.reasons?.join('|')||decision.decision,decision_id:decision.decision_id,human_required:null,decision:decision.decision};
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function load(file){if(!file||!fs.existsSync(file)) throw new Error(`missing evidence file:${file}`);return JSON.parse(fs.readFileSync(file,'utf8'));}

if(import.meta.url===`file://${process.argv[1]}`){
  const output=argValue('--output')??'artifacts/handler/autonomy-decision.json';
  const decision=buildAutoloopAutonomyDecision({selection:load(argValue('--selection')??'artifacts/autoloop/selection.json'),wrappers:load(argValue('--wrappers')??'artifacts/handler/wrappers.json'),manifests:load(argValue('--manifests')??'artifacts/handler/manifests.json'),staticLab:load(argValue('--static-lab')??'artifacts/handler/static-lab.json'),licenses:load(argValue('--licenses')??'artifacts/handler/licenses.json'),behavioral:load(argValue('--behavioral')??'artifacts/handler/behavioral.json'),tribunal:load(argValue('--tribunal')??'artifacts/handler/tribunal.json'),rollback:load(argValue('--rollback')??'artifacts/handler/rollback.json'),readiness:load(argValue('--readiness')??'artifacts/handler/promotion-readiness.json'),runId:argValue('--run-id')});
  const reconciliation=buildSafeHandlerReconciliation(decision);
  const persisted={...decision,reconciliation};
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(persisted,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,decision:decision.decision,reconciliation_outcome:reconciliation.outcome,human_required:decision.human_required,next_gate:decision.next_gate,prod_authorized:false,prod_write_authorized:false,trading_access:false}));
}
