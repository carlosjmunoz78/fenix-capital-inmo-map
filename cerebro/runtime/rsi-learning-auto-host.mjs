import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {normalizeHostConfig,hostPaths,runHostCycle} from './rsi-learning-host.mjs';
import {syncRemoteOutboxOnce} from './rsi-outbox-client.mjs';
import {persistDueLearningPlans} from './learning-orchestrator.mjs';

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});return dir;}
function atomicJson(file,value){ensureDir(path.dirname(file));const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{encoding:'utf8',mode:0o600});fs.renameSync(tmp,file);}
function pidAlive(pid){if(!Number.isInteger(pid)||pid<=0)return false;try{process.kill(pid,0);return true;}catch(error){return error?.code==='EPERM';}}
function acquireLoopLock(lockDir){
  ensureDir(path.dirname(lockDir));
  if(fs.existsSync(lockDir)){
    const ownerFile=path.join(lockDir,'owner.json');
    if(!fs.existsSync(ownerFile)) throw new Error('AUTO_HOST_LOCK_METADATA_MISSING');
    let owner;try{owner=readJson(ownerFile);}catch{throw new Error('AUTO_HOST_LOCK_METADATA_INVALID');}
    if(pidAlive(owner?.pid)) throw new Error('AUTO_HOST_LOCK_ALREADY_HELD');
    fs.rmSync(lockDir,{recursive:true,force:true});
  }
  fs.mkdirSync(lockDir,{mode:0o700});
  atomicJson(path.join(lockDir,'owner.json'),{schema_version:'1.0.0',pid:process.pid,started_at:new Date().toISOString(),kind:'LRN_AUTO_HOST'});
  return ()=>{try{fs.rmSync(lockDir,{recursive:true,force:true});}catch{}};
}
function fingerprint(error){return crypto.createHash('sha256').update(`${error?.name??'Error'}:${error?.message??error}`).digest('hex').slice(0,24);}
function noteRemoteFailure(file,error){
  const fp=fingerprint(error);let count=1;
  if(fs.existsSync(file)){try{const prior=readJson(file);if(prior.fingerprint===fp)count=(prior.count??0)+1;}catch{}}
  atomicJson(file,{fingerprint:fp,count,last_error_at:new Date().toISOString(),message:String(error?.message??error).slice(0,500)});
  return count;
}
function clearRemoteFailure(file){if(fs.existsSync(file))fs.rmSync(file,{force:true});}

export async function runAutoHostIteration({raw_config,fetch_impl=globalThis.fetch,now=()=>new Date().toISOString()}){
  const cfg=normalizeHostConfig(raw_config);
  const paths=hostPaths(cfg);
  const remoteFailure=path.join(paths.companyRoot,'remote-sync-failure.json');
  let remote={status:'REMOTE_OUTBOX_DISABLED',downloaded_total:0,skipped_total:0,prod_authorized:false};
  if(!fs.existsSync(paths.killSwitch)&&raw_config.remote_outbox?.enabled===true){
    try{
      remote=await syncRemoteOutboxOnce({remote_outbox:raw_config.remote_outbox,company_id:cfg.company_id,inbox_dir:cfg.inbox_dir,fetch_impl});
      clearRemoteFailure(remoteFailure);
    }catch(error){
      const count=noteRemoteFailure(remoteFailure,error);
      if(count>=3){const wrapped=new Error(`HOLD_REMOTE_OUTBOX_SAME_ERROR_FAMILY: ${error?.message??error}`);wrapped.cause=error;wrapped.remote_hold=true;throw wrapped;}
      remote={status:'REMOTE_OUTBOX_ERROR',error:String(error?.message??error).slice(0,500),consecutive_same_error:count,downloaded_total:0,skipped_total:0,prod_authorized:false};
    }
  }
  const learning=runHostCycle({config:cfg,now});
  let orchestration={status:'ORCHESTRATOR_KILLED',planned_total:0,created_total:0,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  if(learning.status!=='KILLED'){
    orchestration=persistDueLearningPlans({
      state_file:path.join(paths.companyRoot,'orchestration-state.json'),
      plans_dir:path.join(paths.companyRoot,'orchestration-plans'),
      company_id:cfg.company_id,
      version:cfg.version,
      now:typeof now==='function'?now():now
    });
  }
  return Object.freeze({status:learning.status,remote_outbox:remote,learning,orchestration,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});
}

export async function runAutoHostLoop({raw_config,signal,fetch_impl=globalThis.fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=()=>new Date().toISOString()}){
  const cfg=normalizeHostConfig(raw_config);const paths=hostPaths(cfg);ensureDir(paths.companyRoot);
  const release=acquireLoopLock(path.join(paths.companyRoot,'auto-host.lock'));
  try{
    while(!signal?.aborted){
      await runAutoHostIteration({raw_config,fetch_impl,now});
      if(signal?.aborted)break;
      await sleep(cfg.poll_interval_ms);
    }
  }finally{release();}
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){
  const command=process.argv[2];const configPath=arg('--config');
  if(command!=='daemon'||!configPath){console.error('usage: node rsi-learning-auto-host.mjs daemon --config <host.json>');process.exitCode=2;}
  else{
    try{
      const raw=readJson(path.resolve(configPath));const controller=new AbortController();
      process.on('SIGINT',()=>controller.abort());process.on('SIGTERM',()=>controller.abort());
      await runAutoHostLoop({raw_config:raw,signal:controller.signal});
    }catch(error){console.error(error?.stack??String(error));process.exitCode=4;}
  }
}
