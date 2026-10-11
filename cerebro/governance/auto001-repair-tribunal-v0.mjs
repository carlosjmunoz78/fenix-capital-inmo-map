#!/usr/bin/env node
import fs from 'node:fs';

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()}

export function judgeAuto001Repair({validation,build_green=false,targeted_tests_green=false,diff_files=0,diff_line_delta=0}={}){
  if(!validation||validation.state_type!=='CEREBRO_AUTO001_REPAIR_VALIDATION_V0')throw new Error('repair validation required');
  const reasons=[];
  if(validation.status!=='VALIDATION_GREEN')reasons.push('SOURCE_VALIDATION_RED');
  if(validation.old_vs_new?.improved!==true)reasons.push('NO_MEASURED_IMPROVEMENT');
  if(validation.regression?.passed!==true)reasons.push('REGRESSION_GATE_RED');
  if(validation.rebuild?.passed!==true)reasons.push('REBUILD_GATE_RED');
  if(validation.rollback?.passed!==true)reasons.push('ROLLBACK_GATE_RED');
  if(build_green!==true)reasons.push('BUILD_RED');
  if(targeted_tests_green!==true)reasons.push('TARGETED_TESTS_RED');
  if(diff_files!==1)reasons.push('DIFF_FILE_LIMIT');
  if(!Number.isFinite(diff_line_delta)||diff_line_delta<1||diff_line_delta>4)reasons.push('DIFF_LINE_LIMIT');
  if(validation.safety?.prod_write!==false||validation.safety?.customer_data!==false||validation.safety?.trading!==false||Number(validation.safety?.additional_subscription_eur??NaN)!==0)reasons.push('SAFETY_DRIFT');
  const approved=reasons.length===0;
  return {
    schema_version:'0.1.0',state_type:'CEREBRO_AUTO001_REPAIR_TRIBUNAL_V0',company_id:'fenix',engine_id:'JDG-001',environment:'PREPROD_CONTROL_PLANE',version:'0.1.0',
    status:approved?'APPROVE_PREPROD_PATCH':'REJECT_PREPROD_PATCH',approved,reasons,
    evidence:{validation_status:validation.status,old_vs_new:validation.old_vs_new,build_green,targeted_tests_green,diff_files,diff_line_delta,rebuild:validation.rebuild?.passed===true,rollback:validation.rollback?.passed===true},
    authority:{merge_authorized:false,promotion_authorized:false,prod_authorized:false,prod_write_authorized:false},
    next_gate:approved?'GOVERNED_LOW_RISK_PROMOTION_POLICY':'RETURN_TO_OWNER_REPAIR',
    safety:{prod_write:false,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0}
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const input=req(arg('--validation'),'--validation');const out=req(arg('--out'),'--out');
  const state=judgeAuto001Repair({validation:JSON.parse(fs.readFileSync(input,'utf8')),build_green:arg('--build-green')==='true',targeted_tests_green:arg('--tests-green')==='true',diff_files:Number(arg('--diff-files')),diff_line_delta:Number(arg('--diff-line-delta'))});
  fs.writeFileSync(out,JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify({status:state.status,approved:state.approved,reasons:state.reasons,next_gate:state.next_gate,cost_eur:0}));
  if(!state.approved)process.exitCode=3;
}
