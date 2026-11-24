import {createHash} from 'node:crypto';

const SOURCES=new Set(['CHATGPT','CODEX','JARVIS','CEREBRO']);
const ID=/^[a-z][a-z0-9-]{1,63}$/;
const SHA=/^[a-f0-9]{64}$/;
const RELEASE=/^[A-Za-z0-9_.:-]{1,128}$/;
const hash=(value)=>createHash('sha256').update(value,'utf8').digest('hex');
const fields=['company_id','skill_id','base_release','base_sha256','candidate_sha256','evidence_sha256','source'];
const fail=(reason)=>{throw new Error(reason);};
const isObject=(x)=>x!==null&&typeof x==='object'&&!Array.isArray(x);

// Only private, authenticated caller supplies context and current release catalog.
// Receipt is a candidate for existing FACT/LRN pipeline, not an authorization.
export function prepareExternalSkillProposal({proposal,baseline,candidate,catalog,context,kill_switch=false}={}){
  if(kill_switch) return {status:'KILLED',events:[],prod_authorized:false};
  if(!isObject(context)||context.environment!=='PREPROD'||!ID.test(context.company_id)||!SOURCES.has(context.source)) fail('INVALID_TRUSTED_CONTEXT');
  if(!isObject(proposal)||Object.keys(proposal).sort().join('|')!==[...fields].sort().join('|')) fail('INVALID_PROPOSAL_FIELDS');
  if(proposal.company_id!==context.company_id||proposal.source!==context.source) fail('SCOPE_MISMATCH');
  if(!ID.test(proposal.skill_id)||!RELEASE.test(proposal.base_release)||![proposal.base_sha256,proposal.candidate_sha256,proposal.evidence_sha256].every(x=>typeof x==='string'&&SHA.test(x))) fail('INVALID_PROPOSAL_IDENTITY');
  if(!Array.isArray(catalog)) fail('TRUSTED_CATALOG_REQUIRED');
  const matches=catalog.filter(x=>x.company_id===context.company_id&&x.skill_id===proposal.skill_id);
  if(matches.length!==1||matches[0].release!==proposal.base_release||matches[0].sha256!==proposal.base_sha256) fail('STALE_OR_UNKNOWN_BASELINE');
  if(typeof baseline!=='string'||typeof candidate!=='string'||!baseline.length||!candidate.length||Buffer.byteLength(baseline)>1048576||Buffer.byteLength(candidate)>1048576) fail('INVALID_SKILL_CONTENT');
  if(hash(baseline)!==proposal.base_sha256||hash(candidate)!==proposal.candidate_sha256) fail('HASH_MISMATCH');
  if(proposal.base_sha256===proposal.candidate_sha256) fail('NO_CHANGE');
  // Restrict this V1 adapter to matching SKILL.md identities; no script or tool execution.
  const header=candidate.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if(!header||!header.split(/\r?\n/).includes('name: '+proposal.skill_id)||!/^description:\s+\S/m.test(header)) fail('SKILL_IDENTITY_MISMATCH');
  const id=hash(JSON.stringify([proposal.company_id,proposal.skill_id,proposal.base_release,proposal.base_sha256,proposal.candidate_sha256]));
  const event={event_id:'evt:skill-external:'+id,event_type:'SKILL_EXTERNAL_REVISION_PROPOSED',company_id:context.company_id,engine_id:'FACT-001',environment:'PREPROD_CANDIDATE',source_environment:'LAB',version:'1.0.0',source_type:'SKILL_SUPPLY_CHAIN',candidate_id:'external-skill:'+id,reason:'UNVERIFIED_EXTERNAL_PROPOSAL',risk_class:'MEDIUM',confidence:0.5,evidence_refs:['sha256:'+proposal.evidence_sha256,'sha256:'+proposal.candidate_sha256],learning_hypothesis:'An externally proposed skill revision may improve a capability; controlled evaluation is required.',expected_metric_delta:{name:'capability_quality',direction:'HIGHER',measurement:'CONTROLLED_OLD_VS_NEW'},payload:{skill_id:proposal.skill_id,source:proposal.source,base_release:proposal.base_release,base_sha256:proposal.base_sha256,candidate_sha256:proposal.candidate_sha256},prod_authorized:false,publish_authorized:false};
  return {schema_version:'1.0.0',status:'CANDIDATE_ONLY',proposal_id:id,events:[event],next_gate:'FACT_INGEST_PRIVATE_ARTIFACT_AND_OLD_VS_NEW',prod_authorized:false,prod_write_authorized:false,publish_authorized:false,trading_access:false,additional_cost_eur:0};
}

// The caller must obtain these receipts from canonical evaluators, not proposal text.
// This function only plans a release; it never calls a publisher or grants permission.
export function planExternalSkillDistribution({receipt,gates,current_release}={}){
  if(receipt?.status!=='CANDIDATE_ONLY'||!SHA.test(receipt.proposal_id??'')) fail('CANDIDATE_RECEIPT_REQUIRED');
  const p=receipt.events?.[0]?.payload;
  if(!p||current_release!==p.base_release) fail('STALE_RELEASE');
  const required=['same_dataset','measured_improvement','no_policy_regression','no_cost_regression','tribunal_pass','supervisor_pass','backup_verified','rollback_tested','private_artifact_verified'];
  if(!isObject(gates)||gates.proposal_id!==receipt.proposal_id||gates.candidate_sha256!==p.candidate_sha256||required.some(k=>gates[k]!==true)) return {status:'HOLD',prod_authorized:false,publish_authorized:false};
  return {status:'DISTRIBUTION_PLAN_ONLY',proposal_id:receipt.proposal_id,base_release:p.base_release,candidate_sha256:p.candidate_sha256,targets:['CHATGPT','CODEX','JARVIS'],next_gate:'AUTHORIZED_HOST_RELEASE_UPDATE_AND_E2E',prod_authorized:false,publish_authorized:false,additional_cost_eur:0};
}
