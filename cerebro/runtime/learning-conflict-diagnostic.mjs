import fs from 'node:fs';
import path from 'node:path';
import {LearningLedgerV0} from './learning-ledger.mjs';
import {stableIdempotencyKey} from './continuous-improvement-contract.mjs';
import {buildRsiShadowBridge} from '../skills/skill-rsi-shadow-bridge.mjs';
import {preparePreprodLearningCandidate} from './learning-preprod-pipeline.mjs';

function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function arg(name){const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:null;}
function digest(value){return value===undefined?'UNDEFINED':stableIdempotencyKey({value});}
function differingFields(prior,incoming){
  const keys=[...new Set([...Object.keys(prior??{}),...Object.keys(incoming??{})])].sort();
  return keys.filter((key)=>digest(prior?.[key])!==digest(incoming?.[key]));
}
function safeConflict(prior,incoming){
  const fields=differingFields(prior,incoming);
  return {
    learning_id:incoming.learning_id,
    source_learning_id:incoming.source_learning_id??null,
    source_type:incoming.source_type??null,
    source_event_ids:[...(incoming.source_event_ids??[])],
    different_fields:fields,
    observed_at_only:fields.length===1&&fields[0]==='observed_at',
    prior_record_hash:stableIdempotencyKey(prior),
    incoming_record_hash:stableIdempotencyKey(incoming),
    field_hashes:Object.fromEntries(fields.map((key)=>[key,{prior:digest(prior?.[key]),incoming:digest(incoming?.[key])}]))
  };
}

export function diagnoseLearningConflicts({ledger_file,batch_file,preprod_version,company_id,observed_at='2099-01-01T00:00:00.000Z'}){
  const company=req(company_id,'company_id');
  const ledger=new LearningLedgerV0({file_path:req(ledger_file,'ledger_file')});
  const batch=JSON.parse(fs.readFileSync(req(batch_file,'batch_file'),'utf8'));
  if(batch.company_id!==company) throw new Error(`batch company mismatch:${batch.company_id}`);
  const bridge=buildRsiShadowBridge(batch,{observedAt:observed_at});
  const priorById=new Map(ledger.list().map((record)=>[record.learning_id,record]));
  const conflicts=[];const exact=[];const observedOnly=[];const newRecords=[];const held=[];
  for(const shadow of bridge.learning_candidates){
    const prepared=preparePreprodLearningCandidate({shadow_record:shadow,preprod_version:req(preprod_version,'preprod_version'),bridge_status:bridge.bridge_status,policy_pass:true,security_pass:true,local_persistence_enabled:true});
    if(!prepared.ok){held.push({source_learning_id:shadow.learning_id,reasons:prepared.reasons,human_required:prepared.human_required});continue;}
    const incoming=prepared.candidate;
    const prior=priorById.get(incoming.learning_id);
    if(!prior){newRecords.push({learning_id:incoming.learning_id,source_learning_id:incoming.source_learning_id??null,source_event_ids:[...(incoming.source_event_ids??[])]});continue;}
    const priorHash=stableIdempotencyKey(prior);const incomingHash=stableIdempotencyKey(incoming);
    if(priorHash===incomingHash){exact.push({learning_id:incoming.learning_id});continue;}
    const diff=safeConflict(prior,incoming);
    if(diff.observed_at_only) observedOnly.push(diff); else conflicts.push(diff);
  }
  return {
    schema_version:'1.0.0',state_type:'CEREBRO_LRN_CONFLICT_DIAGNOSTIC',company_id:company,environment:'PREPROD',
    source_batch_id:batch.batch_id??null,source_events_total:batch.events?.length??0,bridge_status:bridge.bridge_status,
    durable_learning_total:ledger.operation_count,exact_duplicates:exact.length,observed_at_only_duplicates:observedOnly.length,
    semantic_conflicts:conflicts.length,new_records:newRecords.length,held_total:held.length,
    conflicts,observed_at_only:observedOnly,new_record_ids:newRecords,held,
    writes_performed:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const output=arg('--output');
  const result=diagnoseLearningConflicts({ledger_file:path.resolve(req(arg('--ledger'),'--ledger')),batch_file:path.resolve(req(arg('--batch'),'--batch')),preprod_version:req(arg('--preprod-version'),'--preprod-version'),company_id:req(arg('--company-id'),'--company-id')});
  const text=`${JSON.stringify(result,null,2)}\n`;
  if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(path.resolve(output),text,'utf8');}
  process.stdout.write(text);
}
