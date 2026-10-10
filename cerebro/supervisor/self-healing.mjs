import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const req=(v,l)=>{if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()};
const LEGACY_SAFE=new Set(['RETRY','RESTART_WORKER','REQUEUE_JOB','REBUILD_CACHE','REOPEN_LOCAL_STORE']);
const PLAN_ONLY_SAFE=new Set(['PREPARE_OWNER_PATCH','REPRODUCE_AND_PREPARE_OWNER_PATCH','BIND_REGRESSION_TEST','RUN_OLD_VS_NEW','REQUEST_TRIBUNAL','PREPARE_ROLLBACK']);
const CANONICAL_HUMAN=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);

function stable(parts){return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0,24)}
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}

export function planHealing(i={}){
  const c=i.context;
  if(!c||typeof c!=='object'||Array.isArray(c))throw new Error('context required');
  for(const k of ['company_id','engine_id','environment','version'])req(c[k],`context.${k}`);
  if(c.environment!=='PREPROD')return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',execute:false});
  const action=req(i.action,'action');
  if(i.trading===true)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',execute:false});
  if(i.prod_write===true)return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',execute:false});
  if(i.additional_cost_eur!=null&&Number(i.additional_cost_eur)>0)return Object.freeze({status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT',execute:false});
  if(!LEGACY_SAFE.has(action)&&!PLAN_ONLY_SAFE.has(action))return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',execute:false});
  return Object.freeze({
    status:'PLAN_READY',action,execute:false,preprod_only:true,rollback_required:true,verification_required:true,audit_required:true,
    code_mutation_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

function caseAction(item){
  return item.source==='BUG'?'REPRODUCE_AND_PREPARE_OWNER_PATCH':'PREPARE_OWNER_PATCH';
}

function normalizeHuman(reason){
  if(reason==null)return null;
  return CANONICAL_HUMAN.has(reason)?reason:'POLICY_CONFLICT';
}

export function buildQaHealingPlans(remediation,{now=new Date().toISOString()}={}){
  if(!remediation||remediation.state_type!=='CEREBRO_QA_AUTONOMOUS_REMEDIATION_STATE_V0')throw new Error('verified QA remediation state required');
  if(remediation.company_id!=='fenix'||remediation.engine_id!=='SELF-001')throw new Error('SELF-001 remediation scope mismatch');
  if(remediation.safety?.prod_write!==false||remediation.safety?.customer_data!==false||remediation.safety?.trading!==false||Number(remediation.safety?.additional_subscription_eur??NaN)!==0)throw new Error('SELF-001 safety boundary drift');
  if(remediation.authority?.prod_write_authorized!==false||remediation.authority?.promotion_authorized!==false)throw new Error('SELF-001 authority boundary drift');

  const plans=[];
  const human=[];
  for(const item of remediation.cases??[]){
    const owner=req(item.owner_engine,'owner_engine');
    const humanReason=normalizeHuman(item.human_required);
    if(humanReason){
      const hold={repair_id:`self:${stable([item.case_id,humanReason])}`,case_id:item.case_id,owner_engine:owner,status:'HUMAN_REQUIRED',reason:humanReason,execute:false};
      plans.push(hold);human.push(hold);continue;
    }
    if(item.environment!=='PREPROD'||item.prod_write_authorized!==false||item.additional_cost_eur!==0){
      const hold={repair_id:`self:${stable([item.case_id,'HIGH_RISK'])}`,case_id:item.case_id,owner_engine:owner,status:'HUMAN_REQUIRED',reason:'HIGH_RISK',execute:false};
      plans.push(hold);human.push(hold);continue;
    }
    const action=caseAction(item);
    const gate=planHealing({
      context:{company_id:item.company_id,engine_id:'SELF-001',environment:'PREPROD',version:remediation.version},
      action,prod_write:false,trading:false,additional_cost_eur:0
    });
    if(gate.status!=='PLAN_READY'){
      const hold={repair_id:`self:${stable([item.case_id,gate.reason])}`,case_id:item.case_id,owner_engine:owner,status:'HUMAN_REQUIRED',reason:normalizeHuman(gate.reason),execute:false};
      plans.push(hold);human.push(hold);continue;
    }
    plans.push({
      repair_id:`self:${stable([item.case_id,action])}`,
      company_id:item.company_id,
      engine_id:'SELF-001',
      owner_engine:owner,
      environment:'PREPROD',
      version:remediation.version,
      case_id:item.case_id,
      source:item.source,
      action,
      status:'PLAN_READY',
      execute:false,
      execution_mode:'OWNER_ENGINE_OR_CODE_AGENT_REQUIRED',
      code_mutation_authorized:false,
      branch_required:true,
      snapshot_required:true,
      smallest_patch_required:true,
      regression_test_required:item.gates?.regression_test_required===true,
      old_vs_new_required:item.gates?.old_vs_new_required!==false,
      preprod_required:true,
      independent_judge_required:true,
      rollback_required:true,
      rebuild_required:true,
      promotion_authorized:false,
      prod_authorized:false,
      prod_write_authorized:false,
      customer_data:false,
      trading_access:false,
      additional_cost_eur:0
    });
  }

  return Object.freeze({
    schema_version:'0.1.0',state_type:'CEREBRO_SELF_HEALING_PLAN_BATCH_V0',company_id:remediation.company_id,engine_id:'SELF-001',environment:'PREPROD_CONTROL_PLANE',version:'0.1.0',updated_at:now,
    source_remediation_updated_at:remediation.updated_at,plans_total:plans.length,plan_ready:plans.filter(x=>x.status==='PLAN_READY').length,human_required_total:human.length,
    status:human.length?'PLANNED_WITH_HUMAN_HOLDS':plans.length?'PLANS_READY':'GREEN_NO_WORK',plans,human_required:human,
    execution_authority:{plan_only:true,code_mutation_authorized:false,promotion_authorized:false,prod_authorized:false,prod_write_authorized:false},
    next_gate:plans.some(x=>x.status==='PLAN_READY')?'OWNER_EXECUTOR_CAPABILITY_AUDIT':'WAIT_FOR_QA_EVIDENCE',
    safety:{prod_write:false,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0}
  });
}

if(import.meta.url===`file://${process.argv[1]}`){
  const input=req(arg('--input'),'--input');const output=req(arg('--output'),'--output');
  const batch=buildQaHealingPlans(JSON.parse(fs.readFileSync(input,'utf8')));
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(batch,null,2)+'\n');
  console.log(JSON.stringify({status:batch.status,plans_total:batch.plans_total,plan_ready:batch.plan_ready,human_required:batch.human_required_total,next_gate:batch.next_gate,cost_eur:0}));
}
