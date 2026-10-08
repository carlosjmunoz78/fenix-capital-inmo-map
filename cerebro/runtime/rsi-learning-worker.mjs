import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildRsiShadowBridge} from '../skills/skill-rsi-shadow-bridge.mjs';
import {LearningLedgerV0} from './learning-ledger.mjs';
import {persistBridgeReportToPreprod} from './learning-preprod-pipeline.mjs';

const PREPROD='PREPROD';

function acquireLock(lockDir){
  try{fs.mkdirSync(lockDir,{recursive:false,mode:0o700});}
  catch(error){
    if(error?.code==='EEXIST') throw new Error('LRN-001 single-writer lock already held');
    throw error;
  }
  return ()=>{try{fs.rmdirSync(lockDir);}catch{}};
}

export function runLearningWorkerOnce({
  event_report,ledger_file,preprod_version,environment=PREPROD,policy_pass=false,security_pass=false,
  local_persistence_enabled=false,kill_switch=false,observed_at
}){
  if(environment!==PREPROD) throw new Error('RSI learning worker accepts exact PREPROD only');
  if(kill_switch) return Object.freeze({status:'KILLED',reason:'KILL_SWITCH',persisted_total:0,held_total:0,human_required:[],prod_authorized:false,prod_write_authorized:false});
  if(!event_report||!Array.isArray(event_report.events)) throw new Error('event_report.events required');
  if(typeof ledger_file!=='string'||!ledger_file.trim()) throw new Error('ledger_file required');
  if(typeof preprod_version!=='string'||!preprod_version.trim()) throw new Error('preprod_version required');
  const ledgerPath=path.resolve(ledger_file);
  fs.mkdirSync(path.dirname(ledgerPath),{recursive:true});
  const release=acquireLock(`${ledgerPath}.lock`);
  try{
    const bridge=buildRsiShadowBridge(event_report,observed_at?{observedAt:observed_at}:{});
    const ledger=new LearningLedgerV0({file_path:ledgerPath,environment:PREPROD});
    const persistence=persistBridgeReportToPreprod({
      bridge_report:bridge,
      ledger,
      preprod_version,
      policy_pass,
      security_pass,
      local_persistence_enabled
    });
    return Object.freeze({
      status:persistence.held_total?'PARTIAL_HELD':'GREEN',
      bridge_status:bridge.bridge_status,
      source_events_total:bridge.source_events_total,
      learning_candidates_valid:bridge.learning_candidates_valid,
      persisted_total:persistence.persisted_total,
      duplicates_total:persistence.duplicates_total,
      held_total:persistence.held_total,
      human_required:persistence.human_required,
      ledger_operation_count:ledger.operation_count,
      ledger_file:ledger.journal_path,
      next_gate:persistence.next_gate,
      additional_cost_eur:0,
      rsi_publish_authorized:false,
      prod_authorized:false,
      prod_write_authorized:false,
      trading_access:false
    });
  }finally{release();}
}

function arg(name){const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:null;}
function flag(name){return process.argv.includes(name);}

const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){
  const eventsPath=arg('--events');
  const ledgerFile=arg('--ledger');
  const preprodVersion=arg('--version');
  if(!eventsPath||!ledgerFile||!preprodVersion){
    console.error('usage: node cerebro/runtime/rsi-learning-worker.mjs --events <json> --ledger <file> --version <version> --policy-pass --security-pass --enable-local-persistence');
    process.exitCode=2;
  }else{
    const eventReport=JSON.parse(fs.readFileSync(eventsPath,'utf8'));
    const result=runLearningWorkerOnce({
      event_report:eventReport,
      ledger_file:ledgerFile,
      preprod_version:preprodVersion,
      policy_pass:flag('--policy-pass'),
      security_pass:flag('--security-pass'),
      local_persistence_enabled:flag('--enable-local-persistence'),
      kill_switch:flag('--kill-switch')
    });
    console.log(JSON.stringify(result));
    if(result.status==='PARTIAL_HELD') process.exitCode=3;
  }
}
