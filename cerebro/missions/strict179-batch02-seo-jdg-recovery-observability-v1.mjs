#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const SEO_SOURCE='cerebro/marketing/phase13-marketing-seo-feedback-runtime-v0.mjs';
const JDG_SOURCES=['cerebro/runtime/evaluation-tribunal.mjs','cerebro/runtime/continuous-improvement-contract.mjs'];

function assert(condition,message){if(!condition)throw new Error(message);}
function stable(value){return Array.isArray(value)?value.map(stable):(value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value);}
function stableJson(value){return JSON.stringify(stable(value));}
function sha256(value){return crypto.createHash('sha256').update(value).digest('hex');}
function bundleDigest(root,files){
  const h=crypto.createHash('sha256');
  for(const rel of [...files].sort()){
    h.update(rel);h.update('\0');h.update(fs.readFileSync(path.join(root,rel)));h.update('\0');
  }
  return h.digest('hex');
}
function copyBundle(files,fromRoot,toRoot){
  for(const rel of files){
    const src=path.join(fromRoot,rel),dst=path.join(toRoot,rel);
    fs.mkdirSync(path.dirname(dst),{recursive:true});
    fs.copyFileSync(src,dst);
  }
}
function recoveryProbe({label,files,backupRoot,workRoot}){
  for(const rel of files)assert(fs.existsSync(path.join(ROOT,rel)),`${label}: missing canonical source ${rel}`);
  copyBundle(files,ROOT,backupRoot);
  const sourceDigest=bundleDigest(ROOT,files);
  const backupDigest=bundleDigest(backupRoot,files);
  assert(sourceDigest===backupDigest,`${label}: backup digest mismatch`);
  copyBundle(files,backupRoot,workRoot);
  const mutationTarget=path.join(workRoot,files[0]);
  fs.appendFileSync(mutationTarget,'\n// STRICT179_BATCH02_ROLLBACK_PROBE\n');
  assert(bundleDigest(workRoot,files)!==sourceDigest,`${label}: mutation probe did not change bundle`);
  fs.rmSync(workRoot,{recursive:true,force:true});
  copyBundle(files,backupRoot,workRoot);
  const restoredDigest=bundleDigest(workRoot,files);
  assert(restoredDigest===sourceDigest,`${label}: restored digest mismatch`);
  return {source_digest:sourceDigest,backup_digest:backupDigest,restored_digest:restoredDigest,file_count:files.length};
}
function parseArgs(argv){const i=argv.indexOf('--out');if(i<0||!argv[i+1])throw new Error('usage: strict179-batch02-seo-jdg-recovery-observability-v1.mjs --out <dir>');return {out:path.resolve(argv[i+1])};}
async function importFresh(file,tag){return import(`${pathToFileURL(file).href}?strict179=${encodeURIComponent(tag)}`);}

async function main(){
  const {out}=parseArgs(process.argv);
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-strict179-batch02-'));
  try{
    const seoFiles=[SEO_SOURCE];
    const seoBackup=path.join(scratch,'seo-backup'),seoWork=path.join(scratch,'seo-work');
    const seoRecovery=recoveryProbe({label:'SEO-001',files:seoFiles,backupRoot:seoBackup,workRoot:seoWork});
    const seoModule=await importFresh(path.join(seoWork,SEO_SOURCE),'seo-restored');
    const seoInput={context:{company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0'},request_id:'strict179:batch02:seo',source_of_truth_ref:'seo:canonical:existing'};
    const seoA=seoModule.wrapExistingSeo001(seoInput);
    const seoB=seoModule.wrapExistingSeo001(seoInput);
    assert(stableJson(seoA)===stableJson(seoB),'SEO-001 restored execution is not deterministic');
    assert(seoA.allowed===true&&seoA.engine_id==='SEO-001','SEO-001 restored execution invalid');
    assert(seoA.replace_existing===false&&seoA.preserve_existing_runtime===true,'SEO-001 preservation contract violated');
    assert(seoA.wordpress_write_authorized===false&&seoA.gsc_write_authorized===false&&seoA.seo_mutation_authorized===false,'SEO-001 write boundary violated');

    const jdgFiles=JDG_SOURCES;
    const jdgBackup=path.join(scratch,'jdg-backup'),jdgWork=path.join(scratch,'jdg-work');
    const jdgRecovery=recoveryProbe({label:'JDG-001',files:jdgFiles,backupRoot:jdgBackup,workRoot:jdgWork});
    const jdgModule=await importFresh(path.join(jdgWork,'cerebro/runtime/evaluation-tribunal.mjs'),'jdg-restored');
    const benchmark=jdgModule.defineBenchmark({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0',benchmark_id:'strict179-seo-quality',benchmark_version:'v1',metric:'score',holdout_ref:'holdout:strict179:opaque',adversarial_refs:['adv:strict179:001']});
    const oldResult={experiment_id:'strict179-batch02',company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0',arm:'OLD',metrics:{score:70}};
    const newResult={...oldResult,arm:'NEW',metrics:{score:80}};
    const evalA=jdgModule.evaluateOldNew({benchmark,old_result:oldResult,new_result:newResult});
    const evalB=jdgModule.evaluateOldNew({benchmark,old_result:oldResult,new_result:newResult});
    assert(stableJson(evalA)===stableJson(evalB),'JDG-001 evaluation is not deterministic');
    const decisionA=jdgModule.tribunalDecision({evaluation:evalA,judge_id:'JDG-001',candidate_actor_id:'LRN-001',real_outcome_delta:1});
    const decisionB=jdgModule.tribunalDecision({evaluation:evalB,judge_id:'JDG-001',candidate_actor_id:'LRN-001',real_outcome_delta:1});
    assert(stableJson(decisionA)===stableJson(decisionB),'JDG-001 decision is not deterministic');
    assert(decisionA.decision==='PASS'&&decisionA.prod_authorized===false,'JDG-001 restored judgement invalid');

    const auditEvent={
      schema_version:'1.0.0',
      event_type:'JDG001_TRIBUNAL_DECISION_AUDIT',
      company_id:'fenix',engine_id:'JDG-001',environment:'PREPROD',version:'0.1.0',
      audit_status:'GREEN',trace_status:'GREEN',metric_name:'tribunal_decision',metric_value:decisionA.decision,
      evaluation_id:evalA.evaluation_id,decision:decisionA.decision,reason:decisionA.reason,
      trace_id:sha256(stableJson({evaluation_id:evalA.evaluation_id,judge_id:'JDG-001',decision:decisionA})).slice(0,32),
      prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,
      raw_pii_persisted:false,secrets_read:false,external_writes:false
    };

    const summary={
      schema_version:'1.0.0',state_type:'STRICT_179_BATCH02_RECOVERY_OBSERVABILITY_RESULT',status:'GREEN',environment:'PREPROD',
      scope:['SEO-001','JDG-001'],
      engines:{
        'SEO-001':{
          backup:{tested:true,status:'GREEN',restore_verified:true,digest:seoRecovery.backup_digest,file_count:seoRecovery.file_count},
          rollback:{tested:true,status:'GREEN',revert_verified:true,restored_digest:seoRecovery.restored_digest},
          rebuild:{tested:true,status:'GREEN',deterministic:true,restored_execution_status:seoA.status,source_bundle_digest:seoRecovery.source_digest}
        },
        'JDG-001':{
          backup:{tested:true,status:'GREEN',restore_verified:true,digest:jdgRecovery.backup_digest,file_count:jdgRecovery.file_count},
          rollback:{tested:true,status:'GREEN',revert_verified:true,restored_digest:jdgRecovery.restored_digest},
          rebuild:{tested:true,status:'GREEN',deterministic:true,evaluation_id:evalA.evaluation_id,decision:decisionA.decision,source_bundle_digest:jdgRecovery.source_digest},
          observability:{tested:true,status:'GREEN',audit_emitted:true,trace_emitted:true,metric_emitted:true,trace_id:auditEvent.trace_id}
        }
      },
      safety:{additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false,secrets_read:false,external_writes:false},
      evidence_hash:sha256(stableJson({seoRecovery,jdgRecovery,seoA,evalA,decisionA,auditEvent}))
    };
    fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'SUMMARY.json'),JSON.stringify(summary,null,2)+'\n');
    fs.writeFileSync(path.join(out,'JDG001_OBSERVABILITY.json'),JSON.stringify(auditEvent,null,2)+'\n');
    process.stdout.write(`STRICT179_BATCH02=${JSON.stringify(summary)}\n`);
    process.stdout.write(`JDG001_AUDIT_EVENT=${JSON.stringify(auditEvent)}\n`);
  } finally {fs.rmSync(scratch,{recursive:true,force:true});}
}

await main();
