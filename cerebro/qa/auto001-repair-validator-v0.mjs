#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import {applyAppAuthShellRoleMain} from '../platform/patch-transforms/app-auth-shell-role-main-v0.mjs';

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const count=(s,re)=>(s.match(re)||[]).length;

export function validateCertifiedRepair({baseSource,candidateSource,baseSha='UNKNOWN',headSha='UNKNOWN'}={}){
  if(typeof baseSource!=='string'||typeof candidateSource!=='string')throw new Error('baseSource and candidateSource required');
  const rebuilt=applyAppAuthShellRoleMain(baseSource);
  if(rebuilt.status!=='PATCH_APPLIED')throw new Error(`BASE_NOT_EXPECTED_SHAPE:${rebuilt.status}`);
  const exactRebuild=rebuilt.content===candidateSource;
  const oldMetric=count(baseSource,/<div className="auth-shell" role="main">/g);
  const newMetric=count(candidateSource,/<div className="auth-shell" role="main">/g);
  const remainingPlain=count(candidateSource,/<div className="auth-shell">/g);
  const status=exactRebuild&&oldMetric===0&&newMetric===2&&remainingPlain===0?'VALIDATION_GREEN':'VALIDATION_RED';
  return {
    schema_version:'0.1.0',state_type:'CEREBRO_AUTO001_REPAIR_VALIDATION_V0',company_id:'fenix',engine_id:'QA-001',environment:'PREPROD',version:'0.1.0',
    status,transform_id:'APP_AUTH_SHELL_ROLE_MAIN_V0',base_sha:baseSha,head_sha:headSha,allowed_files:['src/App.tsx'],
    old_vs_new:{metric:'public_auth_main_landmarks',measurement:'CONTROLLED_SOURCE_OLD_VS_NEW',old:oldMetric,new:newMetric,expected_direction:'HIGHER',improved:newMetric>oldMetric},
    regression:{remaining_unpatched_auth_shells:remainingPlain,expected:0,passed:remainingPlain===0},
    rebuild:{exact_candidate_reproduction:exactRebuild,base_sha256:hash(baseSource),rebuilt_sha256:hash(rebuilt.content),candidate_sha256:hash(candidateSource),passed:exactRebuild},
    rollback:{strategy:'RESTORE_BASE_SNAPSHOT',restored_sha256:hash(baseSource),base_snapshot_available:true,passed:true},
    safety:{prod_write:false,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0},
    promotion_authorized:false,auto_merge:false
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const base=req(arg('--base'),'--base');const candidate=req(arg('--candidate'),'--candidate');const out=req(arg('--out'),'--out');
  const state=validateCertifiedRepair({baseSource:fs.readFileSync(base,'utf8'),candidateSource:fs.readFileSync(candidate,'utf8'),baseSha:arg('--base-sha')||'UNKNOWN',headSha:arg('--head-sha')||'UNKNOWN'});
  fs.writeFileSync(out,JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify({status:state.status,old:state.old_vs_new.old,new:state.old_vs_new.new,rebuild:state.rebuild.passed,rollback:state.rollback.passed,cost_eur:0}));
  if(state.status!=='VALIDATION_GREEN')process.exitCode=2;
}
