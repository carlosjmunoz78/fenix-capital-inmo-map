import fs from 'node:fs';
import path from 'node:path';
import {runLearningWorkerOnce} from '../runtime/rsi-learning-worker.mjs';
import {validateSkillFullAdoptionQueue} from './skill-full-adoption-selector-v1.mjs';

const PREPROD='PREPROD';

function text(value){return typeof value==='string'&&value.trim()?value.trim():null;}

export function runAdmittedSkillLearningIngress({
  registry,event_report,ledger_file,preprod_version,environment=PREPROD,
  policy_pass=false,security_pass=false,local_persistence_enabled=false,kill_switch=false,observed_at
}){
  validateSkillFullAdoptionQueue(registry);
  if(environment!==PREPROD) throw new Error('admitted skill learning ingress accepts exact PREPROD only');
  if(!event_report||!Array.isArray(event_report.events)) throw new Error('event_report.events required');
  if(!text(ledger_file)) throw new Error('ledger_file required');
  if(!text(preprod_version)) throw new Error('preprod_version required');

  const admittedById=new Map((registry.queue??[]).map((item)=>[item.candidate_id,item]));
  const admitted=[];
  const ignored=[];
  for(const event of event_report.events){
    const item=admittedById.get(event?.candidate_id);
    if(!item){
      ignored.push({event_id:event?.event_id??null,candidate_id:event?.candidate_id??null,reason:'CANDIDATE_NOT_IN_ADMITTED_FULL_QUEUE'});
      continue;
    }
    admitted.push({...event,admission_alias_es:item.alias_es,admission_priority:item.priority});
  }

  if(kill_switch){
    return Object.freeze({
      schema_version:'1.0.0',state_type:'CEREBRO_ADMITTED_SKILL_LEARNING_INGRESS',environment:PREPROD,status:'KILLED',reason:'KILL_SWITCH',
      source_events_total:event_report.events.length,admitted_events_total:admitted.length,ignored_not_admitted_total:ignored.length,ignored,
      persisted_total:0,duplicates_total:0,held_total:0,human_required:[],prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
    });
  }

  if(admitted.length===0){
    return Object.freeze({
      schema_version:'1.0.0',state_type:'CEREBRO_ADMITTED_SKILL_LEARNING_INGRESS',environment:PREPROD,status:'NO_ADMITTED_EVENTS',
      source_events_total:event_report.events.length,admitted_events_total:0,ignored_not_admitted_total:ignored.length,ignored,
      persisted_total:0,duplicates_total:0,held_total:0,human_required:[],next_gate:'WAIT_FOR_ADMITTED_SKILL_EVIDENCE',
      prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
    });
  }

  const worker=runLearningWorkerOnce({
    event_report:{...event_report,events:admitted},ledger_file,preprod_version,environment:PREPROD,
    policy_pass,security_pass,local_persistence_enabled,kill_switch:false,observed_at
  });

  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_ADMITTED_SKILL_LEARNING_INGRESS',environment:PREPROD,
    status:worker.status==='GREEN'?'GREEN_PERSISTENT_PREPROD_LEARNING':worker.status,
    source_events_total:event_report.events.length,admitted_events_total:admitted.length,ignored_not_admitted_total:ignored.length,ignored,
    bridge_status:worker.bridge_status,learning_candidates_valid:worker.learning_candidates_valid,
    persisted_total:worker.persisted_total,duplicates_total:worker.duplicates_total,held_total:worker.held_total,human_required:worker.human_required,
    ledger_operation_count:worker.ledger_operation_count,ledger_file:worker.ledger_file,next_gate:worker.next_gate,
    persistence_scope:'LOCAL_PREPROD_LRN_LEDGER_ONLY',supabase_required:false,
    rsi_publish_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

function arg(name){const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:null;}
function flag(name){return process.argv.includes(name);}
if(import.meta.url===`file://${process.argv[1]}`){
  const registryPath=arg('--registry')??'cerebro/registry/skill-full-adoption-v1.json';
  const eventsPath=arg('--events');
  const ledgerFile=arg('--ledger');
  const version=arg('--version');
  const output=arg('--output')??'artifacts/skills-full/learning-ingress.json';
  if(!eventsPath||!ledgerFile||!version){
    console.error('usage: node cerebro/skills/skill-full-adoption-learning-ingress-v1.mjs --events <json> --ledger <file> --version <version> --policy-pass --security-pass --enable-local-persistence');
    process.exitCode=2;
  }else{
    const report=runAdmittedSkillLearningIngress({
      registry:JSON.parse(fs.readFileSync(registryPath,'utf8')),
      event_report:JSON.parse(fs.readFileSync(eventsPath,'utf8')),
      ledger_file:ledgerFile,preprod_version:version,
      policy_pass:flag('--policy-pass'),security_pass:flag('--security-pass'),local_persistence_enabled:flag('--enable-local-persistence'),kill_switch:flag('--kill-switch')
    });
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
    console.log(JSON.stringify({status:report.status,admitted_events:report.admitted_events_total,persisted:report.persisted_total,duplicates:report.duplicates_total,held:report.held_total,human_required:report.human_required,prod_write:false,trading:false,cost_eur:0}));
    if(report.status==='PARTIAL_HELD') process.exitCode=3;
  }
}
