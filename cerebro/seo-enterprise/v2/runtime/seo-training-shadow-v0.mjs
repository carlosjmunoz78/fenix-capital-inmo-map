/** Bounded OLD vs NEW/SHADOW and executable rollback on public synthetic fixtures. */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {tribunalDecision} from '../../../runtime/evaluation-tribunal.mjs';
const armModule=fileURLToPath(new URL('./seo-shadow-arm-v0.mjs',import.meta.url));
const CASES=[
 {case_id:'T01',text:'Mi furura cuota hipotecaria',expected_codes:['FUTURE_TYPO']},
 {case_id:'T02',text:'La constucción de la vivienda',expected_codes:['CONSTRUCTION_TYPO']},
 {case_id:'T03',text:'Mi futura hipoteca',expected_codes:[]},
 {case_id:'T04',text:'Una construcción correcta',expected_codes:[]}
];
function arm(name,cases){
 const x=spawnSync(process.execPath,[armModule,name],{input:JSON.stringify(cases),
  encoding:'utf8',timeout:6000,maxBuffer:100000});
 if(x.status!==0)throw Error('SHADOW_ARM_PROCESS_FAILED_'+name);
 const d=JSON.parse(x.stdout);
 if(d.arm!==name||d.external_writes!==0||d.prod_authorized!==false||d.public_fixture_not_secret_holdout!==true)
  throw Error('SHADOW_ARM_UNSAFE');
 return d;
}
export function runSeoShadowTraining({company_id='fenix',candidate_actor_id='SEO_D15_NEW',judge_actor_id='SEO_JUDGE_A',cases=CASES}={}){
 if(!/^[a-z0-9_-]{2,70}$/i.test(company_id))throw Error('COMPANY_ID_INVALID');
 if(candidate_actor_id===judge_actor_id||!candidate_actor_id||!judge_actor_id)throw Error('SELF_EVALUATION_DENIED');
 const old=arm('OLD',cases),challenger=arm('NEW',cases),rollback=arm('OLD',cases);
 if(new Set([old.process_pid,challenger.process_pid,rollback.process_pid]).size!==3)throw Error('ARM_OS_ISOLATION_FAILED');
 if(old.input_sha256!==challenger.input_sha256||old.input_sha256!==rollback.input_sha256)throw Error('OLD_NEW_INPUT_MISMATCH');
 if(old.results_sha256!==rollback.results_sha256||old.f1!==rollback.f1)throw Error('OLD_VERSION_RESTORE_REGRESSION');
 const evaluation={delta:Math.round((challenger.f1-old.f1)*10000)/100,experiment_id:'SEO_LAB_TRAINING_FIXTURE_V0',metric:'f1_percent',old:old.f1*100,new:challenger.f1*100,benchmark_ref:'PUBLIC_SYNTHETIC_FIXTURE_NOT_BLINDED'};
 const tribunal=tribunalDecision({evaluation,judge_id:judge_actor_id,candidate_actor_id,
  real_outcome_delta:null,metric_direction:'higher'});
 const better=tribunal.decision==='PASS'&&challenger.f1>old.f1;
 return {schema_version:'0.1.0',company_id,engine_id:'SEO-001',environment:'LAB',version:'0.1.0',
  status:better?'LAB_CORRECTION_SHADOW_AND_ROLLBACK_PASS':'LAB_CANDIDATE_REJECTED',
  source_type:'PUBLIC_SYNTHETIC_FIXTURE',benchmark_blinded:false,
  training_type:'DETERMINISTIC_RULE_CORRECTION_NOT_MODEL_FINETUNING',
  old:{f1:old.f1,counts:old.counts,process_pid:old.process_pid},
  new:{f1:challenger.f1,counts:challenger.counts,process_pid:challenger.process_pid},
  rollback:{f1:rollback.f1,process_pid:rollback.process_pid,replay_verified:true},
  separate_os_processes_verified:true,experimental_delta_percentage_points:evaluation.delta,
  tribunal_decision:tribunal.decision,judge_independent_logically:candidate_actor_id!==judge_actor_id,
  candidate_real_customer_outcomes_verified:false,iam_roles_authenticated:false,
  shadow_staging_true:false,physical_site_rollback_verified:false,
  candidate_auto_replaced:false,prod_authorized:false,
  additional_cost_eur:0,external_writes:0,ready:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 try{process.stdout.write(JSON.stringify(runSeoShadowTraining(),null,2)+'\n');}
 catch(e){process.stderr.write(JSON.stringify({status:'BLOCKED',reason:String(e.message).slice(0,100),external_writes:0})+'\n');process.exitCode=2;}
