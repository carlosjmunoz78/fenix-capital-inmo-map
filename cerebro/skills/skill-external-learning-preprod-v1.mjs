import {createHash} from 'node:crypto';
import {prepareExternalSkillProposal} from './skill-chatgpt-evolution-bridge-v1.mjs';
import {buildRsiShadowBridge} from './skill-rsi-shadow-bridge.mjs';
import {analyzeSkillImpact,buildOldVsNewPlans} from '../runtime/skill-capability-evolution.mjs';
import {runLearningWorkerOnce} from '../runtime/rsi-learning-worker.mjs';

const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const noAuthority=()=>({prod_authorized:false,prod_write_authorized:false,publish_authorized:false,trading_access:false,additional_cost_eur:0});
const hold=reason=>({status:'HOLD',reason,...noAuthority()});

// Internal PREPROD adapter. Context, catalog, subscriber policy, engine descriptors,
// review and ledger path MUST be resolved by an authenticated trusted host.
// Never map these parameters from an untrusted proposal request.
export function runExternalSkillLearningPreprod({proposal,baseline,candidate,evidence,catalog,context,subscribers,engines,known_engine_ids,review,ledger_file,preprod_version,local_persistence_enabled=false,kill_switch=false,observed_at}={}){
  if(kill_switch) return {status:'KILLED',...noAuthority()};
  const receipt=prepareExternalSkillProposal({proposal,baseline,candidate,catalog,context});
  if(typeof evidence!=='string'||!evidence.length||Buffer.byteLength(evidence)>1048576||sha(evidence)!==proposal.evidence_sha256) return hold('EVIDENCE_HASH_MISMATCH');
  const allowed=(subscribers?.subscribers??[]).filter(x=>x.company_id===context.company_id&&x.enabled===true&&x.environment==='PREPROD'&&x.local_validation_required===true&&x.local_persistence_scope==='LOCAL_PREPROD_LRN_LEDGER_ONLY'&&x.prod_authorized===false&&x.prod_write_authorized===false&&x.trading_access===false);
  if(allowed.length!==1||!subscribers?.accepted_signal_families?.includes('SKILL_SUPPLY_CHAIN')) return hold('SUBSCRIPTION_NOT_AUTHORIZED');
  if(review?.proposal_id!==receipt.proposal_id||review?.candidate_sha256!==proposal.candidate_sha256||review?.evidence_sha256!==proposal.evidence_sha256||review?.policy_pass!==true||review?.security_pass!==true||review?.private_artifact_verified!==true||local_persistence_enabled!==true) return hold('TRUSTED_REVIEW_OR_PERSISTENCE_MISSING');
  const entry=catalog.find(x=>x.company_id===context.company_id&&x.skill_id===proposal.skill_id);
  if(!Array.isArray(entry.capabilities)||!entry.capabilities.length||!Array.isArray(engines)||!Array.isArray(known_engine_ids)||!known_engine_ids.length) return hold('FACT_BINDING_MISSING');
  if(engines.some(x=>x.company_id!==context.company_id||!known_engine_ids.includes(x.engine_id))) return hold('INVALID_ENGINE_SCOPE');
  const skill={company_id:context.company_id,environment:'PREPROD',skill_id:proposal.skill_id,skill_version:proposal.candidate_sha256,capabilities:entry.capabilities,tags:entry.tags??[],inputs:[],outputs:[],permissions:[],risk_class:'MEDIUM',source:'EXTERNAL_SKILL_REVISION_CANDIDATE',...noAuthority()};
  const impact=analyzeSkillImpact({skill,engines});
  if(impact.gap_detected) return {...hold('FACT_CAPABILITY_GAP_REVIEW'),proposal_id:receipt.proposal_id,impact};
  const plans=buildOldVsNewPlans({skill,impact_analysis:impact});
  const event_report={events:receipt.events.map(event=>({...event,target_engine_bindings:impact.impacts.map(x=>x.engine_id)}))};
  const shadow=buildRsiShadowBridge(event_report,observed_at?{observedAt:observed_at}:{});
  if(shadow.bridge_status!=='SHADOW_BRIDGE_GREEN'||shadow.learning_candidates_valid!==1) return hold('LRN_SHADOW_NOT_GREEN');
  const worker=runLearningWorkerOnce({event_report,ledger_file,preprod_version,environment:'PREPROD',policy_pass:true,security_pass:true,local_persistence_enabled:true,observed_at});
  const accepted=worker.status==='GREEN'&&worker.learning_candidates_valid===1&&worker.persisted_total+worker.duplicates_total===1;
  return {status:accepted?'LRN_CANDIDATE_RECORDED':'HOLD',proposal_id:receipt.proposal_id,impact,plans,learning:{persisted_total:worker.persisted_total,duplicates_total:worker.duplicates_total,held_total:worker.held_total,bridge_status:worker.bridge_status},next_gate:accepted?'CONTROLLED_OLD_VS_NEW_AND_TRIBUNAL':'REVIEW_LRN_INGRESS',...noAuthority()};
}
