#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
function stable(parts){return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0,16)}
function mappingOrderKey(mapping){
  return [mapping?.repair_id,mapping?.case_id,mapping?.target,...(mapping?.resolution?.file_hints??[])].map(v=>String(v??'')).join('|');
}
function compareMappingOrder(left,right){const a=mappingOrderKey(left);const b=mappingOrderKey(right);return a<b?-1:a>b?1:0}

function certifiedTransformSourceState(sourceText){
  if(typeof sourceText!=='string')return null;
  const pending=(sourceText.match(/<div className="auth-shell">/g)??[]).length;
  const applied=(sourceText.match(/<div className="auth-shell" role="main">/g)??[]).length;
  if(pending===0&&applied===2)return {status:'ALREADY_SATISFIED',pending,applied};
  if(pending===2&&applied===0)return {status:'READY',pending,applied};
  return {status:'UNSAFE_SOURCE_SHAPE',pending,applied};
}

export function planAuto001Patch(sourceMap,{baseSha='UNKNOWN',sourceText=null}={}){
  if(!sourceMap||sourceMap.state_type!=='CEREBRO_QA_SOURCE_MAPPING_STATE_V0')throw new Error('verified QA source mapping required');
  if(sourceMap.safety?.prod_write!==false||sourceMap.safety?.customer_data!==false||sourceMap.safety?.trading!==false||Number(sourceMap.safety?.additional_subscription_eur??NaN)!==0)throw new Error('source map safety drift');
  const eligible=(sourceMap.mappings??[]).filter(m=>
    m?.resolution?.status==='SOURCE_HINT_VERIFIED' &&
    m.resolution.repository==='carlosjmunoz78/fenix-capital-inmo-map' &&
    m.owner_engine==='HCI-001' &&
    m.dimension==='accessibility_semantics' &&
    String(m.target??'').startsWith('APP:') &&
    (m.resolution.file_hints??[]).includes('src/App.tsx') &&
    m.execution_authority?.prod_write_authorized===false
  ).sort(compareMappingOrder)[0];
  if(!eligible)return {status:'NO_ELIGIBLE_PATCH',engine_id:'AUTO-001',environment:'PREPROD',execute:false,reason:'NO_CERTIFIED_TRANSFORM_MATCH',prod_write_authorized:false,auto_merge:false,additional_cost_eur:0};
  const sourceState=certifiedTransformSourceState(sourceText);
  if(sourceState?.status==='ALREADY_SATISFIED')return {status:'NO_ELIGIBLE_PATCH',engine_id:'AUTO-001',environment:'PREPROD',execute:false,reason:'CERTIFIED_TRANSFORM_ALREADY_SATISFIED',source_state:sourceState,prod_write_authorized:false,auto_merge:false,additional_cost_eur:0};
  if(sourceState?.status==='UNSAFE_SOURCE_SHAPE')return {status:'NO_ELIGIBLE_PATCH',engine_id:'AUTO-001',environment:'PREPROD',execute:false,reason:'CERTIFIED_TRANSFORM_SOURCE_SHAPE_NOT_PROVEN',source_state:sourceState,prod_write_authorized:false,auto_merge:false,additional_cost_eur:0};
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
  const sourceText=fs.existsSync('src/App.tsx')?fs.readFileSync('src/App.tsx','utf8'):null;
  const plan=planAuto001Patch(read(input),{baseSha,sourceText});fs.writeFileSync(out,JSON.stringify(plan,null,2)+'\n');
  console.log(JSON.stringify({status:plan.status,reason:plan.reason??null,plan_id:plan.plan_id??null,transform_id:plan.transform_id??null,branch_name:plan.branch_name??null,cost_eur:0}));
}
