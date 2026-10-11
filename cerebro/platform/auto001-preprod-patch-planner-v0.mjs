#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
function stable(parts){return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0,16)}

export function planAuto001Patch(sourceMap,{baseSha='UNKNOWN'}={}){
  if(!sourceMap||sourceMap.state_type!=='CEREBRO_QA_SOURCE_MAPPING_STATE_V0')throw new Error('verified QA source mapping required');
  if(sourceMap.safety?.prod_write!==false||sourceMap.safety?.customer_data!==false||sourceMap.safety?.trading!==false||Number(sourceMap.safety?.additional_subscription_eur??NaN)!==0)throw new Error('source map safety drift');
  const eligible=(sourceMap.mappings??[]).find(m=>
    m?.resolution?.status==='SOURCE_HINT_VERIFIED' &&
    m.resolution.repository==='carlosjmunoz78/fenix-capital-inmo-map' &&
    m.owner_engine==='HCI-001' &&
    m.dimension==='accessibility_semantics' &&
    String(m.target??'').startsWith('APP:') &&
    (m.resolution.file_hints??[]).includes('src/App.tsx') &&
    m.execution_authority?.prod_write_authorized===false
  );
  if(!eligible)return {status:'NO_ELIGIBLE_PATCH',engine_id:'AUTO-001',environment:'PREPROD',execute:false,reason:'NO_CERTIFIED_TRANSFORM_MATCH',prod_write_authorized:false,auto_merge:false,additional_cost_eur:0};
  const planId=`auto001:${stable([eligible.repair_id,eligible.case_id,eligible.dimension,'APP_AUTH_SHELL_ROLE_MAIN_V0',baseSha])}`;
  return {
    status:'PATCH_PLAN_READY',plan_id:planId,company_id:sourceMap.company_id??'fenix',engine_id:'AUTO-001',environment:'PREPROD',version:'0.1.0',
    source_repair_id:eligible.repair_id,source_case_id:eligible.case_id,owner_engine:eligible.owner_engine,target:eligible.target,dimension:eligible.dimension,
    repository:'carlosjmunoz78/fenix-capital-inmo-map',base_ref:'main',base_sha:baseSha,
    transform_id:'APP_AUTH_SHELL_ROLE_MAIN_V0',allowed_files:['src/App.tsx'],max_files_changed:1,max_line_delta:4,
    branch_name:`cerebro/auto001-${stable([planId])}`,
    required_gates:['SNAPSHOT','APPLY_CERTIFIED_TRANSFORM','BUILD','TARGETED_TESTS','DIFF_LIMIT','OLD_VS_NEW_PENDING','TRIBUNAL_PENDING'],
    create_pull_request:true,auto_merge:false,promotion_authorized:false,prod_authorized:false,prod_write_authorized:false,customer_data:false,trading_access:false,additional_cost_eur:0,
    rollback:{strategy:'DELETE_PATCH_BRANCH_OR_REVERT_PR',base_sha:baseSha}
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const input=req(arg('--input'),'--input');const out=req(arg('--out'),'--out');const baseSha=req(arg('--base-sha')??'UNKNOWN','--base-sha');
  const plan=planAuto001Patch(read(input),{baseSha});fs.writeFileSync(out,JSON.stringify(plan,null,2)+'\n');
  console.log(JSON.stringify({status:plan.status,plan_id:plan.plan_id??null,transform_id:plan.transform_id??null,branch_name:plan.branch_name??null,cost_eur:0}));
}
