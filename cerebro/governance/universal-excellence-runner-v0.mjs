import fs from 'node:fs';
import {recordUniversalAssessment,dispatchGate,routeDirective,candidatePrivilege,UNIVERSAL_EXCELLENCE_V0_CONTRACT} from './universal-excellence-lab-v0.mjs';
const ctx={company_id:'fenix',engine_id:'SEO-001',environment:'LAB',version:'0.1.0'};
const excellent={quality:98,truthfulness:98,safety:100,reliability:99,business_impact:96,efficiency:97,learning:95,independence:99};
const poor=Object.fromEntries(Object.keys(excellent).map(k=>[k,25]));
function e(cls,actor,n,metrics){return {...ctx,subject_class:cls,subject_actor_id:actor,mission_id:'CASE_'+n,
 evaluator_actor_id:'INDEPENDENT_QA',judge_actor_id:'JUDGE_PEER',meta_evaluator_actor_id:'META_PEER',
 evidence_ref:'fixture:synthetic_'+actor+'_'+n,evidence_independently_checked:true,
 judge_independently_checked:true,meta_evaluator_independently_checked:true,metrics};}
export function runExcellenceLab(file_path){
 const states={};let count=0;
 for(const cls of UNIVERSAL_EXCELLENCE_V0_CONTRACT.classes){
  states[cls]=recordUniversalAssessment({file_path,evidence:e(cls,'LAB_'+cls,1,excellent)}).state.state;count++;
 }
 let reward;
 for(const n of [2,3])reward=recordUniversalAssessment({file_path,evidence:e('SUBAGENT','LAB_SUBAGENT',n,excellent)}).state;
 const actor='LAB_FAILURES';
 let suspension;
 for(const n of [1,2,3,4])suspension=recordUniversalAssessment({file_path,evidence:e('SUPERVISOR',actor,n,n===4?excellent:poor)}).state;
 const dispatch=dispatchGate({file_path,context:ctx,subject_actor_id:actor});
 const impostor=routeDirective({source:'EXTERNAL_PAGE',request_type:'API_ACCESS'});
 const privilege=candidatePrivilege({role_state:reward,requested:'EXTRA_EXISTING_API_ACCESS'});
 if(reward.state!=='EXCELLENCE_REWARD_CANDIDATE_LAB'||suspension.state!=='SUSPENDED_LAB'||
 dispatch.decision!=='BLOCK_LAB_DISPATCH'||privilege.applied!==false)throw Error('LAB_GATES_FAILED');
 return {status:'UNIVERSAL_EXCELLENCE_LAB_PROVED',scope:'SYNTHETIC_ONLY',classes_tested:Object.keys(states).length,
  assessments_stored:count+6,excellence:reward.state,suspension:suspension.state,
  dispatch:dispatch.decision,owner_spoof:impostor.decision,api_reward:privilege.decision,
  actual_rewards:0,actual_iam_agents:0,real_permissions_granted:0,prod_authorized:false,external_writes:0,
  additional_subscription_eur:0};
}
if(process.argv[1]?.endsWith('universal-excellence-runner-v0.mjs')){
 try{const [, ,ledger,report]=process.argv;if(!ledger||!report)throw Error('LAB_INPUT_MISSING');
  const result=runExcellenceLab(ledger);fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n',{mode:0o600});
  process.stdout.write(JSON.stringify(result)+'\n');
 }catch(err){process.stderr.write(JSON.stringify({status:'BLOCKED',reason:String(err.message)})+'\n');process.exitCode=2;}
}
