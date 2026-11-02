#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runFactoryRequest} from '../runtime/fact001-request-runner.mjs';
import {runAutoHostIteration} from '../runtime/rsi-learning-auto-host.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../..');
const CEREBRO=path.join(ROOT,'cerebro');
const LRN_STATE_BRANCH='cerebro-rsi-learning-state-v0';
const LRN_STATE_ROOT='cerebro/runtime/rsi-learning-state';

function assert(condition,message){if(!condition)throw new Error(message);}
function sha256(value){return crypto.createHash('sha256').update(value).digest('hex');}
function listFiles(root){
  const out=[];
  const walk=(dir)=>{
    if(!fs.existsSync(dir))return;
    for(const name of fs.readdirSync(dir).sort()){
      const full=path.join(dir,name);
      const st=fs.statSync(full);
      if(st.isDirectory())walk(full);
      else if(st.isFile())out.push(path.relative(root,full).split(path.sep).join('/'));
    }
  };
  walk(root);
  return out;
}
function treeDigest(root){
  const h=crypto.createHash('sha256');
  for(const rel of listFiles(root)){
    h.update(rel,'utf8');h.update('\0');h.update(fs.readFileSync(path.join(root,rel)));h.update('\0');
  }
  return h.digest('hex');
}
function copyDir(src,dst){
  fs.rmSync(dst,{recursive:true,force:true});
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  fs.cpSync(src,dst,{recursive:true,force:false});
}
function restoreProbe({source,backup,work,label}){
  copyDir(source,backup);
  const sourceDigest=treeDigest(source),backupDigest=treeDigest(backup);
  assert(sourceDigest===backupDigest,`${label}: backup digest mismatch`);
  copyDir(backup,work);
  const files=listFiles(work);
  assert(files.length>0,`${label}: empty recovery set`);
  const target=path.join(work,files[0]);
  fs.appendFileSync(target,'\nSTRICT179_ROLLBACK_PROBE\n','utf8');
  assert(treeDigest(work)!==sourceDigest,`${label}: rollback mutation probe did not change digest`);
  copyDir(backup,work);
  const restoredDigest=treeDigest(work);
  assert(restoredDigest===sourceDigest,`${label}: rollback restore digest mismatch`);
  return {source_digest:sourceDigest,backup_digest:backupDigest,restored_digest:restoredDigest,file_count:files.length};
}
function parseArgs(argv){
  const i=argv.indexOf('--out');
  if(i<0||!argv[i+1])throw new Error('usage: strict179-batch01-recovery-gates-v1.mjs --out <dir>');
  return {out:path.resolve(argv[i+1])};
}
function lrnStatus(result){
  return {
    status:result.status,
    remote_outbox:result.remote_outbox?.status??null,
    learning:result.learning?.status??null,
    candidates:result.candidates?.status??null,
    orchestration:result.orchestration?.status??null,
    horizons:result.horizons?.status??null,
    meta_observability:result.meta_observability?.status??null,
    additional_cost_eur:result.additional_cost_eur,
    prod_authorized:result.prod_authorized,
    prod_write_authorized:result.prod_write_authorized,
    trading_access:result.trading_access
  };
}

async function main(){
  const {out}=parseArgs(process.argv);
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-strict179-batch01-'));
  const stateCheckout=path.join(scratch,'lrn-state-source');
  let worktreeAdded=false;
  try{
    const factA=path.join(scratch,'fact-a'),factB=path.join(scratch,'fact-b');
    const factRequest=path.join(CEREBRO,'factory/requests/fact001-selfcheck.v0.json');
    const fact1=runFactoryRequest({requestFile:factRequest,outDir:factA});
    const fact2=runFactoryRequest({requestFile:factRequest,outDir:factB});
    assert(fact1.status==='FACTORY_SCAFFOLD_GREEN'&&fact2.status==='FACTORY_SCAFFOLD_GREEN','FACT-001 rebuild did not return GREEN');
    assert(fact1.generated_file_count===18&&fact2.generated_file_count===18,'FACT-001 rebuild file count mismatch');
    assert(fact1.bundle_sha256===fact2.bundle_sha256,'FACT-001 rebuild bundle not deterministic');
    assert(fact1.idempotency_key===fact2.idempotency_key,'FACT-001 rebuild idempotency key mismatch');
    const factRecovery=restoreProbe({
      source:factA,
      backup:path.join(scratch,'fact-backup'),
      work:path.join(scratch,'fact-rollback-work'),
      label:'FACT-001'
    });

    execFileSync('git',['worktree','add','--detach',stateCheckout,`refs/remotes/origin/${LRN_STATE_BRANCH}`],{cwd:ROOT,stdio:'pipe'});
    worktreeAdded=true;
    const liveState=path.join(stateCheckout,LRN_STATE_ROOT);
    assert(fs.existsSync(liveState),'LRN-001 durable PREPROD state root missing');
    const lrnBackup=path.join(scratch,'lrn-backup');
    const lrnRollback=path.join(scratch,'lrn-rollback-work');
    const lrnRecovery=restoreProbe({source:liveState,backup:lrnBackup,work:lrnRollback,label:'LRN-001'});

    const subscribers=JSON.parse(fs.readFileSync(path.join(CEREBRO,'registry/rsi-learning-subscribers.v0.json'),'utf8'));
    const sub=(subscribers.subscribers||[]).find(x=>x.enabled===true&&x.environment==='PREPROD'&&x.prod_authorized===false&&x.trading_access===false);
    assert(sub,'LRN-001 enabled PREPROD subscriber not found');

    async function runRestoredLrn(dir){
      copyDir(lrnBackup,dir);
      const cfg={
        company_id:sub.company_id,
        engine_id:'LRN-001',
        environment:'PREPROD',
        version:sub.version,
        preprod_version:sub.version,
        data_dir:path.join(dir,'data'),
        inbox_dir:path.join(dir,'inbox'),
        backup_dir:path.join(dir,'backups'),
        poll_interval_ms:900000,
        policy_pass:true,
        security_pass:true,
        local_persistence_enabled:true,
        remote_outbox:{enabled:false}
      };
      const result=await runAutoHostIteration({
        raw_config:cfg,
        fetch_impl:async()=>{throw new Error('NETWORK_FORBIDDEN_IN_RECOVERY_GATE');},
        now:()=> '2026-11-02T15:00:00.000Z'
      });
      assert(result.status!=='ERROR'&&result.status!=='PARTIAL_REMOTE_ERROR','LRN-001 restored iteration failed');
      assert(result.additional_cost_eur===0,'LRN-001 recovery introduced cost');
      assert(result.prod_authorized===false&&result.prod_write_authorized===false&&result.trading_access===false,'LRN-001 recovery authority boundary violated');
      return lrnStatus(result);
    }

    const lrnRun1=await runRestoredLrn(path.join(scratch,'lrn-rebuild-a'));
    const lrnRun2=await runRestoredLrn(path.join(scratch,'lrn-rebuild-b'));
    assert(JSON.stringify(lrnRun1)===JSON.stringify(lrnRun2),'LRN-001 restored execution status is not deterministic');

    const summary={
      schema_version:'1.0.0',
      state_type:'STRICT_179_BATCH01_RECOVERY_GATE_RESULT',
      status:'GREEN',
      environment:'PREPROD',
      scope:['FACT-001','LRN-001'],
      gates:['backup','rollback','rebuild'],
      engines:{
        'FACT-001':{
          backup:{tested:true,status:'GREEN',restore_verified:true,digest:factRecovery.backup_digest,file_count:factRecovery.file_count},
          rollback:{tested:true,status:'GREEN',revert_verified:true,restored_digest:factRecovery.restored_digest},
          rebuild:{tested:true,status:'GREEN',deterministic:true,bundle_sha256:fact1.bundle_sha256,idempotency_key:fact1.idempotency_key,generated_file_count:18}
        },
        'LRN-001':{
          backup:{tested:true,status:'GREEN',restore_verified:true,digest:lrnRecovery.backup_digest,file_count:lrnRecovery.file_count,state_branch:LRN_STATE_BRANCH},
          rollback:{tested:true,status:'GREEN',revert_verified:true,restored_digest:lrnRecovery.restored_digest},
          rebuild:{tested:true,status:'GREEN',deterministic:true,restored_preprod_iteration:lrnRun1}
        }
      },
      safety:{
        additional_cost_eur:0,
        prod_authorized:false,
        prod_write_authorized:false,
        trading_access:false,
        secrets_read:false,
        external_writes:false
      },
      evidence_hash:sha256(JSON.stringify({fact:factRecovery,lrn:lrnRecovery,fact_bundle:fact1.bundle_sha256,lrn_run:lrnRun1}))
    };
    fs.rmSync(out,{recursive:true,force:true});
    fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'SUMMARY.json'),`${JSON.stringify(summary,null,2)}\n`,'utf8');
    process.stdout.write(`STRICT179_BATCH01_RECOVERY=${JSON.stringify(summary)}\n`);
  }finally{
    if(worktreeAdded){
      try{execFileSync('git',['worktree','remove','--force',stateCheckout],{cwd:ROOT,stdio:'pipe'});}catch{}
    }
    fs.rmSync(scratch,{recursive:true,force:true});
  }
}
await main();
