/** SEO-001: additive LAB worker binding. No WordPress/CRM writes or paid AI. */
import {createHash} from 'node:crypto';
import {tribunalDecision,evaluateOldNew,defineBenchmark} from '../../../runtime/evaluation-tribunal.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const safeId=(v,k)=>{if(typeof v!=='string'||!/^[A-Za-z0-9_-]{2,72}$/.test(v))throw Error(k+'_INVALID');return v};
const typos=[['FUTURE_TYPO',/\bfurura\b/ig,'futura'],['CONSTRUCTION_TYPO',/\bconstucci[oó]n\b/ig,'construcción'],['PUNCTUATION',/\.No\b/g,'. No']];
const risky=[['MORTGAGE_GUARANTEE',/\b(hipoteca|financiaci[oó]n)\s+(100%\s+)?garantizad[ao]s?\b/ig,'LEGAL_REQUIRED'],['ZERO_REQUIREMENTS',/\bsin (requisitos|ning[uú]n requisito)\b/ig,'HIGH_RISK']];
const scan=(text,patterns,field)=>patterns.flatMap(([code,re,suggestion])=>[...text.matchAll(re)].map(m=>({code,offset:m.index,observed:m[0],[field]:suggestion})));
export function runSeoEditorialMission(m){
 for(const field of ['mission_id','company_id','environment','version','author_actor_id','reviewer_actor_id','judge_actor_id'])safeId(m?.[field],field);
 if(!['LAB','PREPROD'].includes(m.environment))throw Error('ENVIRONMENT_DENIED');
 if(new Set([m.author_actor_id,m.reviewer_actor_id,m.judge_actor_id]).size!==3)throw Error('SELF_REVIEW_DENIED');
 if(m.budget_eur!==0||m.allow_writes!==false||m.allow_paid_ai!==false)throw Error('ZERO_COST_READONLY_POLICY_DENIED');
 if(typeof m.text!=='string'||m.text.length<8||m.text.length>150000)throw Error('TEXT_INVALID');
 if(!Array.isArray(m.sources)||!m.sources.length||m.sources.some(s=>typeof s!=='string'||!/^https?:\/\//i.test(s)))throw Error('PROVENANCE_REQUIRED');
 const observations=scan(m.text,typos,'suggestion');
 const risk_flags=scan(m.text,risky,'human_exception');
 const evidence={mission_id:m.mission_id,company_id:m.company_id,engine_id:'SEO-001',environment:m.environment,version:m.version,source_refs:[...m.sources],source_sha256:sha(m.text),source_freshness_verified:false,observations,risk_flags};
 const worker={actor_id:m.author_actor_id,role:'SEO-D15-COPY-INSPECTOR',task:'COPY_QA_READONLY',input_sha256:evidence.source_sha256,output_sha256:sha(JSON.stringify(observations)),output:observations};
 const reviewer={actor_id:m.reviewer_actor_id,role:'SEO-D31-INDEPENDENT-QA',task:'VERIFY_FINDINGS',passed:observations.every(x=>m.text.slice(x.offset,x.offset+x.observed.length)===x.observed),risk_review_required:risk_flags.length>0};
 const verdict={actor_id:m.judge_actor_id,role:'SEO-INDEPENDENT-JUDGE',decision:reviewer.passed&&!risk_flags.length?'LAB_FINDINGS_VERIFIED':'HUMAN_REVIEW_REQUIRED',prod_authorized:false,staging_write_authorized:false};
 return {schema_version:'0.1.0',status:'LAB_EXECUTED_NOT_DEPARTMENT_READY',evidence,worker,reviewer,verdict,merit:{eligible_for_verified_task_badge:reviewer.passed&&!risk_flags.length,awarded:false,actor_scored_by:m.reviewer_actor_id,permissions_added:[],budget_added_eur:0},promotion:{allowed:false,reason:'STAGING_E2E_BACKUP_ROLLBACK_OLD_NEW_NOT_PROVEN'},cost:{additional_eur:0,paid_ai_calls:0}};
}
export function compareSeoCandidate({company_id,experiment_id,old_quality,new_quality,candidate_actor_id,judge_actor_id}){
 for(const [k,v] of Object.entries({company_id,experiment_id,candidate_actor_id,judge_actor_id}))safeId(v,k);
 const ctx={company_id,engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0'};
 const benchmark=defineBenchmark({...ctx,benchmark_id:'SEO-LAB-QUALITY',benchmark_version:'1',metric:'quality',holdout_ref:'SEO-LAB-PRIVATE-HOLDOUT'});
 const evaluation=evaluateOldNew({benchmark,old_result:{...ctx,experiment_id,arm:'OLD',metrics:{quality:old_quality}},new_result:{...ctx,experiment_id,arm:'NEW',metrics:{quality:new_quality}}});
 const tribunal=tribunalDecision({evaluation,judge_id:judge_actor_id,candidate_actor_id});
 return {evaluation,tribunal,shadow_required:true,rollback_required:true,permissions_increased:false,prod_authorized:false};
}
export function recordMerit({subject_actor_id,evaluator_actor_id,evaluator_class,mission_evidence,independent_second_actor_id}){
 for(const [k,v] of Object.entries({subject_actor_id,evaluator_actor_id,independent_second_actor_id}))safeId(v,k);
 if(new Set([subject_actor_id,evaluator_actor_id,independent_second_actor_id]).size!==3)throw Error('INDEPENDENCE_DENIED');
 if(!['AGENT','SUBAGENT','DIRECTOR','DEPARTMENT_HEAD','SUPERVISOR','JUDGE','TRIBUNAL','GUARDIAN','META_SUPERVISOR','QA_AGENT'].includes(evaluator_class))throw Error('EVALUATOR_CLASS_INVALID');
 if(mission_evidence?.verdict?.decision!=='LAB_FINDINGS_VERIFIED'||mission_evidence?.verdict?.prod_authorized!==false)throw Error('EVIDENCE_NOT_ELIGIBLE');
 return {subject_actor_id,evaluator_actor_id,independent_second_actor_id,mission_id:mission_evidence.evidence.mission_id,award:'VERIFIED_LAB_MISSION_BADGE_CANDIDATE',requires_independent_approval:true,awarded:false,autonomy_increased:false,budget_eur:0,permissions_added:[]};
}
export function assessReplacement({old_actor_id,new_actor_id,independent_judge_id,old_new,shadow_passed=false,rollback_tested=false,identical_permissions=false}){
 if(new Set([old_actor_id,new_actor_id,independent_judge_id].map(x=>safeId(x,'ACTOR'))).size!==3)throw Error('REPLACEMENT_SELF_DECISION_DENIED');
 const eligible=old_new?.tribunal?.decision==='PASS'&&old_new?.evaluation?.delta>0&&shadow_passed&&rollback_tested&&identical_permissions;
 return {state:eligible?'LAB_CANDIDATE_ELIGIBLE_FOR_CANARY':'BLOCKED',reason:eligible?'CANARY_STILL_GATED':'MISSING_EVIDENCE_OR_POLICY',prod_authorized:false,automatically_replaced:false,knowledge_preserved:true};
}
