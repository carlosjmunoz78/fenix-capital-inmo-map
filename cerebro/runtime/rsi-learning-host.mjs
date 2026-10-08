import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runLearningWorkerOnce} from './rsi-learning-worker.mjs';

const PREPROD='PREPROD';
const ENGINE_ID='LRN-001';

function reqString(value,label){
  if(typeof value!=='string'||!value.trim()) throw new Error(`${label} required`);
  return value.trim();
}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});return dir;}
function sha256Bytes(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function sha256Text(text){return sha256Bytes(Buffer.from(text,'utf8'));}
function atomicJson(file,value){
  ensureDir(path.dirname(file));
  const temp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  fs.writeFileSync(temp,`${JSON.stringify(value,null,2)}\n`,{encoding:'utf8',mode:0o600});
  fs.renameSync(temp,file);
}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function canonicalNow(now){
  const value=typeof now==='function'?now():new Date().toISOString();
  if(typeof value!=='string'||Number.isNaN(Date.parse(value))) throw new Error('now() must return ISO time');
  return new Date(value).toISOString();
}
function sortedJsonFiles(dir){
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir,{withFileTypes:true})
    .filter(entry=>entry.isFile()&&entry.name.toLowerCase().endsWith('.json'))
    .map(entry=>path.join(dir,entry.name))
    .sort((a,b)=>a.localeCompare(b));
}
function pidAlive(pid){
  if(!Number.isInteger(pid)||pid<=0) return false;
  try{process.kill(pid,0);return true;}
  catch(error){return error?.code==='EPERM';}
}
function writeLockOwner(lockDir,kind){
  atomicJson(path.join(lockDir,'owner.json'),{schema_version:'1.0.0',kind,pid:process.pid,started_at:new Date().toISOString()});
}
function inspectExistingLock(lockDir,label,{reclaimStale=false}={}){
  if(!fs.existsSync(lockDir)) return Object.freeze({exists:false,active:false,reclaimed:false});
  const ownerFile=path.join(lockDir,'owner.json');
  if(!fs.existsSync(ownerFile)) throw new Error(`${label} lock owner metadata missing`);
  let owner;
  try{owner=readJson(ownerFile);}catch{throw new Error(`${label} lock owner metadata invalid`);}
  if(!Number.isInteger(owner?.pid)||owner.pid<=0) throw new Error(`${label} lock owner pid invalid`);
  if(pidAlive(owner.pid)) return Object.freeze({exists:true,active:true,reclaimed:false,owner});
  if(!reclaimStale) return Object.freeze({exists:true,active:false,reclaimed:false,owner});
  fs.rmSync(lockDir,{recursive:true,force:true});
  return Object.freeze({exists:true,active:false,reclaimed:true,owner});
}
function acquireManagedLock(lockDir,label,kind){
  ensureDir(path.dirname(lockDir));
  try{fs.mkdirSync(lockDir,{recursive:false,mode:0o700});}
  catch(error){
    if(error?.code!=='EEXIST') throw error;
    const state=inspectExistingLock(lockDir,label,{reclaimStale:true});
    if(state.active) throw new Error(`${label} lock already held`);
    try{fs.mkdirSync(lockDir,{recursive:false,mode:0o700});}
    catch(retryError){if(retryError?.code==='EEXIST') throw new Error(`${label} lock acquisition raced with another owner`);throw retryError;}
  }
  writeLockOwner(lockDir,kind);
  return ()=>{try{fs.rmSync(lockDir,{recursive:true,force:true});}catch{}};
}

export function normalizeHostConfig(input,configDir=process.cwd()){
  if(!input||typeof input!=='object'||Array.isArray(input)) throw new Error('host config object required');
  const company_id=reqString(input.company_id,'company_id');
  const engine_id=reqString(input.engine_id??ENGINE_ID,'engine_id');
  if(engine_id!==ENGINE_ID) throw new Error('host engine_id must be LRN-001');
  const environment=reqString(input.environment??PREPROD,'environment');
  if(environment!==PREPROD) throw new Error('LRN host accepts exact PREPROD only');
  const version=reqString(input.version,'version');
  const preprod_version=reqString(input.preprod_version??version,'preprod_version');
  const resolveFromConfig=value=>path.resolve(configDir,reqString(value,'path'));
  const data_dir=resolveFromConfig(input.data_dir);
  const inbox_dir=resolveFromConfig(input.inbox_dir);
  const backup_dir=resolveFromConfig(input.backup_dir??path.join(data_dir,'backups'));
  const poll_interval_ms=Number(input.poll_interval_ms??60000);
  if(!Number.isInteger(poll_interval_ms)||poll_interval_ms<5000||poll_interval_ms>3600000) throw new Error('poll_interval_ms must be integer 5000..3600000');
  return Object.freeze({
    company_id,engine_id,environment,version,preprod_version,data_dir,inbox_dir,backup_dir,poll_interval_ms,
    policy_pass:input.policy_pass===true,
    security_pass:input.security_pass===true,
    local_persistence_enabled:input.local_persistence_enabled===true,
    additional_cost_eur:0,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false
  });
}

export function hostPaths(config){
  const companyRoot=path.join(config.data_dir,config.company_id,config.engine_id);
  return Object.freeze({
    companyRoot,
    ledger:path.join(companyRoot,'learning.v8'),
    heartbeat:path.join(companyRoot,'heartbeat.json'),
    receipts:path.join(companyRoot,'receipts'),
    killSwitch:path.join(companyRoot,'KILL_SWITCH'),
    hostLock:path.join(companyRoot,'host.lock'),
    failureGuard:path.join(companyRoot,'failure-guard.json')
  });
}

export function readHeartbeat(config){
  const {heartbeat}=hostPaths(config);
  return fs.existsSync(heartbeat)?readJson(heartbeat):null;
}

function heartbeatBody(config,{status,cycle_started_at,cycle_finished_at,last_batch_ref=null,last_result=null,error=null,consecutive_same_error=0}){
  return {
    schema_version:'1.0.0',
    company_id:config.company_id,
    engine_id:config.engine_id,
    environment:config.environment,
    version:config.version,
    status,
    cycle_started_at,
    cycle_finished_at,
    last_success_at:status==='GREEN'||status==='PARTIAL_HELD'?cycle_finished_at:null,
    last_batch_ref,
    last_result,
    error:error?{name:error.name??'Error',message:String(error.message??error).slice(0,500),fingerprint:sha256Text(String(error.message??error)).slice(0,24)}:null,
    consecutive_same_error,
    kill_switch_enabled:fs.existsSync(hostPaths(config).killSwitch),
    data_root_fingerprint:sha256Text(path.resolve(config.data_dir)).slice(0,24),
    additional_cost_eur:0,
    persistent_scope:'LOCAL_PREPROD_LRN_LEDGER_ONLY',
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false
  };
}

function writeHeartbeat(config,body){
  const heartbeat=hostPaths(config).heartbeat;
  if(body.last_success_at===null&&fs.existsSync(heartbeat)){
    try{body={...body,last_success_at:readJson(heartbeat).last_success_at??null};}catch{}
  }
  atomicJson(heartbeat,body);return body;
}
function receiptFile(config,digest){return path.join(hostPaths(config).receipts,`${digest}.json`);}

export function runHostCycle({config,now=()=>new Date().toISOString()}){
  const cfg=normalizeHostConfig(config);
  const paths=hostPaths(cfg);
  ensureDir(paths.companyRoot);ensureDir(paths.receipts);ensureDir(cfg.inbox_dir);ensureDir(cfg.backup_dir);
  const started=canonicalNow(now);
  if(fs.existsSync(paths.killSwitch)){
    return writeHeartbeat(cfg,heartbeatBody(cfg,{status:'KILLED',cycle_started_at:started,cycle_finished_at:canonicalNow(now),last_result:{persisted_total:0,held_total:0,reason:'KILL_SWITCH'}}));
  }
  const reports=sortedJsonFiles(cfg.inbox_dir);
  let persisted_total=0,duplicates_total=0,held_total=0,processed_batches=0,skipped_receipts=0,lastBatch=null;
  const human_required=new Set();
  try{
    for(const file of reports){
      const bytes=fs.readFileSync(file);
      const digest=sha256Bytes(bytes);
      const receipt=receiptFile(cfg,digest);
      if(fs.existsSync(receipt)){skipped_receipts+=1;continue;}
      const report=JSON.parse(bytes.toString('utf8'));
      if(!Array.isArray(report.events)) throw new Error(`event report missing events array: ${path.basename(file)}`);
      for(const event of report.events){
        if(!event||event.company_id!==cfg.company_id) throw new Error(`CROSS_COMPANY_EVENT: ${event?.company_id??'MISSING'} != ${cfg.company_id}`);
      }
      const result=runLearningWorkerOnce({
        event_report:report,
        ledger_file:paths.ledger,
        preprod_version:cfg.preprod_version,
        environment:cfg.environment,
        policy_pass:cfg.policy_pass,
        security_pass:cfg.security_pass,
        local_persistence_enabled:cfg.local_persistence_enabled
      });
      persisted_total+=result.persisted_total??0;
      duplicates_total+=result.duplicates_total??0;
      held_total+=result.held_total??0;
      for(const reason of result.human_required??[]) human_required.add(reason);
      processed_batches+=1;
      lastBatch=`sha256:${digest}`;
      atomicJson(receipt,{
        schema_version:'1.0.0',company_id:cfg.company_id,engine_id:cfg.engine_id,environment:cfg.environment,version:cfg.version,
        batch_ref:lastBatch,source_file:path.basename(file),processed_at:canonicalNow(now),result:{status:result.status,persisted_total:result.persisted_total??0,duplicates_total:result.duplicates_total??0,held_total:result.held_total??0,human_required:result.human_required??[]},
        source_preserved:true,prod_authorized:false
      });
    }
    if(fs.existsSync(paths.failureGuard)) fs.rmSync(paths.failureGuard,{force:true});
    const status=held_total>0?'PARTIAL_HELD':'GREEN';
    return writeHeartbeat(cfg,heartbeatBody(cfg,{
      status,cycle_started_at:started,cycle_finished_at:canonicalNow(now),last_batch_ref:lastBatch,
      last_result:{processed_batches,skipped_receipts,persisted_total,duplicates_total,held_total,human_required:[...human_required],ledger_exists:fs.existsSync(paths.ledger)}
    }));
  }catch(error){
    const fingerprint=sha256Text(`${error?.name??'Error'}:${error?.message??error}`).slice(0,24);
    let count=1;
    if(fs.existsSync(paths.failureGuard)){
      try{const prior=readJson(paths.failureGuard);if(prior.fingerprint===fingerprint) count=(prior.count??0)+1;}catch{}
    }
    atomicJson(paths.failureGuard,{fingerprint,count,last_error_at:canonicalNow(now)});
    const status=count>=3?'HOLD_SAME_ERROR_FAMILY':'ERROR';
    writeHeartbeat(cfg,heartbeatBody(cfg,{status,cycle_started_at:started,cycle_finished_at:canonicalNow(now),last_batch_ref:lastBatch,error,consecutive_same_error:count}));
    const wrapped=new Error(`${status}: ${error?.message??error}`);wrapped.cause=error;wrapped.host_status=status;throw wrapped;
  }
}

function assertNoActiveLock(config){
  const paths=hostPaths(config);
  for(const [lockDir,label] of [[paths.hostLock,'LRN-001 host'],[`${paths.ledger}.lock`,'LRN-001 worker']]){
    const state=inspectExistingLock(lockDir,label,{reclaimStale:true});
    if(state.active) throw new Error(`${label} lock is active`);
  }
}

export function createLedgerBackup({config,now=()=>new Date().toISOString()}){
  const cfg=normalizeHostConfig(config);const paths=hostPaths(cfg);assertNoActiveLock(cfg);
  if(!fs.existsSync(paths.ledger)) return Object.freeze({status:'NO_LEDGER',backup_created:false});
  ensureDir(cfg.backup_dir);
  const bytes=fs.readFileSync(paths.ledger);const digest=sha256Bytes(bytes);const stamp=canonicalNow(now).replace(/[:.]/g,'-');
  const backupFile=path.join(cfg.backup_dir,`${cfg.company_id}-${cfg.engine_id}-${stamp}-${digest.slice(0,12)}.v8`);
  fs.writeFileSync(backupFile,bytes,{mode:0o600,flag:'wx'});
  const manifest={schema_version:'1.0.0',company_id:cfg.company_id,engine_id:cfg.engine_id,environment:cfg.environment,version:cfg.version,created_at:canonicalNow(now),sha256:digest,bytes:bytes.length,backup_file:path.basename(backupFile),source:'learning.v8',additional_cost_eur:0,prod_authorized:false};
  const manifestFile=`${backupFile}.manifest.json`;atomicJson(manifestFile,manifest);
  return Object.freeze({status:'BACKUP_GREEN',backup_created:true,backup_file:backupFile,manifest_file:manifestFile,sha256:digest,bytes:bytes.length});
}

export function verifyLedgerBackup({config,manifest_file}){
  const cfg=normalizeHostConfig(config);const manifest=readJson(path.resolve(manifest_file));
  if(manifest.company_id!==cfg.company_id||manifest.engine_id!==cfg.engine_id||manifest.environment!==PREPROD) throw new Error('backup context mismatch');
  const backupFile=path.join(path.dirname(path.resolve(manifest_file)),reqString(manifest.backup_file,'backup_file'));
  const bytes=fs.readFileSync(backupFile);const digest=sha256Bytes(bytes);
  if(digest!==manifest.sha256||bytes.length!==manifest.bytes) throw new Error('backup checksum mismatch');
  return Object.freeze({status:'BACKUP_VERIFIED',sha256:digest,bytes:bytes.length,backup_file:backupFile});
}

export function restoreLedgerBackup({config,manifest_file,confirm_restore=false,now=()=>new Date().toISOString()}){
  const cfg=normalizeHostConfig(config);const paths=hostPaths(cfg);assertNoActiveLock(cfg);
  if(confirm_restore!==true) throw new Error('confirm_restore=true required');
  if(!fs.existsSync(paths.killSwitch)) throw new Error('kill switch file required before restore');
  const verified=verifyLedgerBackup({config:cfg,manifest_file});
  let preservation=null;
  if(fs.existsSync(paths.ledger)) preservation=createLedgerBackup({config:cfg,now});
  ensureDir(path.dirname(paths.ledger));
  const bytes=fs.readFileSync(verified.backup_file);const temp=`${paths.ledger}.restore-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  fs.writeFileSync(temp,bytes,{mode:0o600});fs.renameSync(temp,paths.ledger);
  return Object.freeze({status:'RESTORE_GREEN',restored_sha256:sha256Bytes(bytes),preservation_backup:preservation?.manifest_file??null,kill_switch_still_enabled:true,prod_authorized:false});
}

function acquireHostLock(config){
  return acquireManagedLock(hostPaths(config).hostLock,'LRN-001 host','LRN_HOST');
}

export async function runHostLoop({config,signal,now=()=>new Date().toISOString(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
  const cfg=normalizeHostConfig(config);const paths=hostPaths(cfg);
  if(fs.existsSync(paths.failureGuard)){
    try{const guard=readJson(paths.failureGuard);if((guard.count??0)>=3) throw new Error('HOLD_SAME_ERROR_FAMILY: failure guard must be cleared by a changed/fixed condition');}catch(error){if(String(error.message).includes('HOLD_SAME_ERROR_FAMILY')) throw error;}
  }
  const release=acquireHostLock(cfg);
  try{
    while(!signal?.aborted){
      try{runHostCycle({config:cfg,now});}
      catch(error){if(error.host_status==='HOLD_SAME_ERROR_FAMILY') throw error;}
      if(signal?.aborted) break;
      await sleep(cfg.poll_interval_ms);
    }
  }finally{release();}
}

function cliArg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function cliFlag(name){return process.argv.includes(name);}
function loadConfig(file){const resolved=path.resolve(reqString(file,'--config'));return normalizeHostConfig(readJson(resolved),path.dirname(resolved));}

const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){
  const command=process.argv[2];const configPath=cliArg('--config');
  if(!command||!configPath){console.error('usage: node rsi-learning-host.mjs <once|daemon|health|backup|verify-backup|restore> --config <host.json> [--manifest <file>] [--confirm-restore]');process.exitCode=2;}
  else{
    try{
      const config=loadConfig(configPath);
      if(command==='once') console.log(JSON.stringify(runHostCycle({config})));
      else if(command==='health') console.log(JSON.stringify(readHeartbeat(config)??{status:'NO_HEARTBEAT'}));
      else if(command==='backup') console.log(JSON.stringify(createLedgerBackup({config})));
      else if(command==='verify-backup') console.log(JSON.stringify(verifyLedgerBackup({config,manifest_file:cliArg('--manifest')})));
      else if(command==='restore') console.log(JSON.stringify(restoreLedgerBackup({config,manifest_file:cliArg('--manifest'),confirm_restore:cliFlag('--confirm-restore')})));
      else if(command==='daemon'){
        const controller=new AbortController();
        process.on('SIGINT',()=>controller.abort());process.on('SIGTERM',()=>controller.abort());
        await runHostLoop({config,signal:controller.signal});
      }else throw new Error(`unknown command: ${command}`);
    }catch(error){console.error(error?.stack??String(error));process.exitCode=4;}
  }
}
