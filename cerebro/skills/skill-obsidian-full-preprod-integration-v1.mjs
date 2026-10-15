import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {AtomicV8Journal} from '../runtime/persistent-runtime.mjs';
import {createOperationalLedgersV0} from '../runtime/observability-audit-finops.mjs';
import {buildObsidianPreprodBindings} from './skill-obsidian-preprod-bindings-v1.mjs';
import {judgeObsidianPreprodBindings} from './skill-obsidian-preprod-binding-judge-v1.mjs';
import {tribunalObsidianPreprodBindings} from './skill-obsidian-preprod-binding-tribunal-v1.mjs';
import {runAdmittedSkillLearningIngress} from './skill-full-adoption-learning-ingress-v1.mjs';

const PREPROD='PREPROD';
const CANDIDATE_ID='lobehub-skills:9a6e3fac20369220df43';
const ALIAS_ES='Asistente seguro de conocimiento en Obsidian';
const VERSION='obsidian-full-preprod-v1';
const EXPECTED_ENGINES=Object.freeze(['RSH-001','KNW-001','TRN-001','TRNBOOT-001','RAG-001','PRV-001']);
const RECEIPT_KIND='OBSIDIAN-PREPROD-BINDING-V1';

function digest(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function nonEmpty(value,label){if(typeof value!=='string'||!value.trim()) throw new TypeError(`${label} must be non-empty`);return value.trim();}

function validateReceipt(receipt){
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)) throw new Error('INVALID_OBSIDIAN_BINDING_RECEIPT');
  if(receipt.schema_version!=='1.0.0'||receipt.state_type!=='CEREBRO_OBSIDIAN_PREPROD_BINDING_RECEIPT') throw new Error('INVALID_OBSIDIAN_BINDING_RECEIPT_TYPE');
  if(receipt.candidate_id!==CANDIDATE_ID||!EXPECTED_ENGINES.includes(receipt.engine_id)) throw new Error('INVALID_OBSIDIAN_BINDING_RECEIPT_IDENTITY');
  if(receipt.company_id!=='GLOBAL'||receipt.environment!==PREPROD||receipt.version!==VERSION) throw new Error('INVALID_OBSIDIAN_BINDING_RECEIPT_CONTEXT');
  if(receipt.idempotency_key!==`obsidian-preprod-binding-v1:${receipt.engine_id}`) throw new Error('INVALID_OBSIDIAN_BINDING_IDEMPOTENCY_KEY');
  if(typeof receipt.evidence_sha256!=='string'||receipt.evidence_sha256.length!==64) throw new Error('INVALID_OBSIDIAN_BINDING_EVIDENCE_HASH');
  if(receipt.binding_state!=='DISABLED'||receipt.activation_authorized!==false||receipt.external_skill_code_execution!==false||receipt.live_obsidian_cli_execution!==false||receipt.filesystem_write!==false||receipt.canonical_knowledge_migration_authorized!==false||receipt.prod_authorized!==false||receipt.prod_write_authorized!==false||receipt.trading_access!==false||receipt.additional_cost_eur!==0) throw new Error('UNSAFE_OBSIDIAN_BINDING_RECEIPT');
}

export class ObsidianBindingReceiptStoreV1{
  constructor({file_path}){
    this.file_path=nonEmpty(file_path,'file_path');
    this.journal=new AtomicV8Journal({file_path:this.file_path,kind:RECEIPT_KIND});
    this.records=this.journal.load();
    if(!Array.isArray(this.records)) throw new Error('OBSIDIAN_BINDING_RECEIPT_LEDGER_NOT_ARRAY');
    const keys=new Set();
    for(const record of this.records){
      validateReceipt(record);
      if(keys.has(record.idempotency_key)) throw new Error(`DUPLICATE_OBSIDIAN_BINDING_RECEIPT:${record.idempotency_key}`);
      keys.add(record.idempotency_key);
    }
  }

  append(binding){
    if(!binding||binding.status!=='PREPROD_BINDING_OLD_VS_NEW_GREEN'||binding.after_state!=='DISABLED'||binding.rollback_proven!==true||binding.rebuild_default_disabled!==true||binding.activation_authorized!==false) throw new Error(`OBSIDIAN_BINDING_NOT_ELIGIBLE:${binding?.engine_id??'UNKNOWN'}`);
    const receipt=Object.freeze({
      schema_version:'1.0.0',state_type:'CEREBRO_OBSIDIAN_PREPROD_BINDING_RECEIPT',
      company_id:'GLOBAL',engine_id:binding.engine_id,environment:PREPROD,version:VERSION,
      candidate_id:CANDIDATE_ID,alias_es:ALIAS_ES,idempotency_key:binding.idempotency_key,
      evidence_sha256:digest({engine_id:binding.engine_id,evidence:binding.evidence,status:binding.status,rollback_proven:binding.rollback_proven,rebuild_default_disabled:binding.rebuild_default_disabled}),
      binding_state:'DISABLED',shadow_proof_recorded:true,activation_authorized:false,
      external_skill_code_execution:false,live_obsidian_cli_execution:false,filesystem_write:false,
      canonical_knowledge_migration_authorized:false,prod_authorized:false,prod_write_authorized:false,
      trading_access:false,additional_cost_eur:0
    });
    validateReceipt(receipt);
    const existing=this.records.find((item)=>item.idempotency_key===receipt.idempotency_key);
    if(existing){
      if(!same(existing,receipt)) throw new Error(`OBSIDIAN_BINDING_RECEIPT_CONFLICT:${receipt.idempotency_key}`);
      return Object.freeze({accepted:false,duplicate:true,receipt:existing});
    }
    const next=[...this.records,receipt];
    this.journal.commit(next);
    this.records=next;
    return Object.freeze({accepted:true,duplicate:false,receipt});
  }

  get operation_count(){return this.records.length;}
  list(){return structuredClone(this.records);}
}

function learningEvent(binding){
  return Object.freeze({
    event_id:`evt:obsidian-full-preprod-v1:${binding.engine_id}`,
    event_type:'SKILL_CANDIDATE_STATIC_LAB_GREEN',severity:'INFO',risk_class:'LOW',
    company_id:'GLOBAL_ONLY',engine_id:'FACT-001',environment:'PREPROD_CANDIDATE',source_environment:PREPROD,version:'0.1.0',
    candidate_id:CANDIDATE_ID,target_engine_bindings:[binding.engine_id],reason:'OBSIDIAN_FULL_PREPROD_BINDING_GREEN',
    evidence_refs:[`candidate:${CANDIDATE_ID}`,`binding:${binding.engine_id}`,`idempotency:${binding.idempotency_key}`],
    payload:{domain:'knowledge-research-training',binding_engine_id:binding.engine_id,measurable_non_regressing_improvement:true},
    publish_authorized:false,prod_authorized:false
  });
}

export function runObsidianFullPreprodIntegration({
  rootDir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-obsidian-full-preprod-')),
  knowledgeSurface,adoptionRegistry,observedAt='2026-10-15T22:00:00.000Z'
}={}){
  if(!knowledgeSurface) throw new Error('KNOWLEDGE_SURFACE_REQUIRED');
  if(!adoptionRegistry) throw new Error('ADOPTION_REGISTRY_REQUIRED');
  fs.mkdirSync(rootDir,{recursive:true});

  const bindingReport=buildObsidianPreprodBindings({knowledgeSurface});
  const judge=judgeObsidianPreprodBindings({report:bindingReport});
  const tribunal=tribunalObsidianPreprodBindings({report:bindingReport,judge});
  if(tribunal.decision!=='GREEN_BINDINGS_FOR_FULL_BUILDOUT'||tribunal.green!==true) throw new Error('OBSIDIAN_BINDING_TRIBUNAL_NOT_GREEN');
  if(!same(bindingReport.bindings.map((item)=>item.engine_id),EXPECTED_ENGINES)) throw new Error('OBSIDIAN_BINDING_SET_DRIFT');

  const ledgers=createOperationalLedgersV0({root_dir:path.join(rootDir,'operational-ledgers'),environment:PREPROD});
  const receiptPath=path.join(rootDir,'binding-receipts','obsidian-bindings.v8');
  const firstStore=new ObsidianBindingReceiptStoreV1({file_path:receiptPath});
  const first=[];
  for(const binding of bindingReport.bindings){
    const result=firstStore.append(binding);
    first.push(result);
    const context={company_id:'GLOBAL',engine_id:binding.engine_id,environment:PREPROD,version:VERSION};
    const correlation=`obsidian-full:${binding.engine_id}:first`;
    ledgers.observability.record({context,correlation_id:correlation,level:'INFO',message:'obsidian-safe-binding-shadow-proof-recorded',data:{candidate_id:CANDIDATE_ID,binding_status:binding.status,accepted:result.accepted,duplicate:result.duplicate,activation_authorized:false}});
    ledgers.audit.append({context,correlation_id:correlation,actor:'CEREBRO_SKILL_FULL_ADOPTION',action:'RECORD_OBSIDIAN_PREPROD_BINDING_SHADOW_PROOF',target:{candidate_id:CANDIDATE_ID,engine_id:binding.engine_id},before:{binding_state:'DISABLED'},after:{binding_state:'DISABLED',receipt_sha256:result.receipt.evidence_sha256},reason:'FULL_SAFE_PREPROD_EVIDENCE',result:'SUCCESS'});
    ledgers.finops.record({context,correlation_id:correlation,task_id:`obsidian-full:${binding.engine_id}:first`,provider:'LOCAL_DETERMINISTIC',cost_eur:0,metadata:{external_skill_code_execution:false,live_obsidian_cli_execution:false,prod_write:false}});
  }

  const replayStore=new ObsidianBindingReceiptStoreV1({file_path:receiptPath});
  const replay=[];
  for(const binding of bindingReport.bindings){
    const result=replayStore.append(binding);
    replay.push(result);
    const context={company_id:'GLOBAL',engine_id:binding.engine_id,environment:PREPROD,version:VERSION};
    const correlation=`obsidian-full:${binding.engine_id}:replay`;
    ledgers.observability.record({context,correlation_id:correlation,level:'INFO',message:'obsidian-safe-binding-idempotent-replay',data:{candidate_id:CANDIDATE_ID,accepted:result.accepted,duplicate:result.duplicate,activation_authorized:false}});
    ledgers.audit.append({context,correlation_id:correlation,actor:'CEREBRO_SKILL_FULL_ADOPTION',action:'REPLAY_OBSIDIAN_PREPROD_BINDING_RECEIPT',target:{candidate_id:CANDIDATE_ID,engine_id:binding.engine_id},before:{binding_state:'DISABLED'},after:{binding_state:'DISABLED',duplicate:result.duplicate},reason:'IDEMPOTENCY_PROOF',result:'SUCCESS'});
    ledgers.finops.record({context,correlation_id:correlation,task_id:`obsidian-full:${binding.engine_id}:replay`,provider:'LOCAL_DETERMINISTIC',cost_eur:0,metadata:{idempotent_replay:true,prod_write:false}});
  }

  const events=bindingReport.bindings.map(learningEvent);
  const learningFile=path.join(rootDir,'learning','obsidian-learning-ledger.v8');
  const learningFirst=runAdmittedSkillLearningIngress({
    registry:adoptionRegistry,event_report:{schema_version:'1.0.0',events},ledger_file:learningFile,
    preprod_version:VERSION,environment:PREPROD,policy_pass:true,security_pass:true,local_persistence_enabled:true,kill_switch:false,observed_at:observedAt
  });
  const learningReplay=runAdmittedSkillLearningIngress({
    registry:adoptionRegistry,event_report:{schema_version:'1.0.0',events},ledger_file:learningFile,
    preprod_version:VERSION,environment:PREPROD,policy_pass:true,security_pass:true,local_persistence_enabled:true,kill_switch:false,observed_at:observedAt
  });

  const audit=ledgers.audit.verify();
  const cost=ledgers.finops.aggregate({company_id:'GLOBAL'});
  const firstPersisted=first.filter((item)=>item.accepted===true&&!item.duplicate).length;
  const replayDuplicates=replay.filter((item)=>item.accepted===false&&item.duplicate===true).length;
  const bindingIdempotencyGreen=firstPersisted===EXPECTED_ENGINES.length&&replayDuplicates===EXPECTED_ENGINES.length&&replayStore.operation_count===EXPECTED_ENGINES.length;
  const learningGreen=learningFirst.status==='GREEN_PERSISTENT_PREPROD_LEARNING'&&learningFirst.persisted_total===EXPECTED_ENGINES.length&&learningFirst.duplicates_total===0&&learningFirst.held_total===0&&learningFirst.human_required.length===0&&learningReplay.status==='GREEN_PERSISTENT_PREPROD_LEARNING'&&learningReplay.persisted_total===0&&learningReplay.duplicates_total===EXPECTED_ENGINES.length&&learningReplay.held_total===0&&learningReplay.human_required.length===0;
  const allDisabled=bindingReport.bindings.every((item)=>item.before_state==='DISABLED'&&item.after_state==='DISABLED'&&item.activation_authorized===false&&item.rollback_proven===true&&item.rebuild_default_disabled===true);
  const green=bindingIdempotencyGreen&&learningGreen&&allDisabled&&audit.valid===true&&ledgers.observability.operation_count>=EXPECTED_ENGINES.length*2&&ledgers.audit.operation_count>=EXPECTED_ENGINES.length*2&&ledgers.finops.operation_count>=EXPECTED_ENGINES.length*2&&cost.cost_eur===0;

  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_OBSIDIAN_FULL_SAFE_PREPROD_INTEGRATION',execution_mode:'INTERNAL_WRAPPER_PATTERN_SHADOW_ONLY',
    status:green?'PREPROD_INTEGRATION_COMPLETE':'PREPROD_INTEGRATION_HOLD',company_id:'GLOBAL',environment:PREPROD,version:VERSION,
    candidate_id:CANDIDATE_ID,alias_es:ALIAS_ES,target_engine_bindings:[...EXPECTED_ENGINES],binding_count:bindingReport.binding_count,
    binding_report_status:bindingReport.status,binding_judge_decision:judge.decision,binding_tribunal_decision:tribunal.decision,
    durable_binding_receipts:{first_persisted:firstPersisted,replay_duplicates:replayDuplicates,operation_count:replayStore.operation_count,idempotency_proven:bindingIdempotencyGreen,receipt_file:receiptPath},
    observability_records:ledgers.observability.operation_count,audit_records:ledgers.audit.operation_count,audit_chain_valid:audit.valid===true,
    finops_records:ledgers.finops.operation_count,measured_additional_cost_eur:cost.cost_eur,
    lrn001_feedback:{first_status:learningFirst.status,first_persisted:learningFirst.persisted_total,first_duplicates:learningFirst.duplicates_total,replay_status:learningReplay.status,replay_persisted:learningReplay.persisted_total,replay_duplicates:learningReplay.duplicates_total,held_total:learningFirst.held_total+learningReplay.held_total,human_required:[...new Set([...learningFirst.human_required,...learningReplay.human_required])],idempotency_proven:learningGreen,persistence_scope:learningFirst.persistence_scope,supabase_required:learningFirst.supabase_required},
    rollback_proven:allDisabled,rebuild_default_disabled:allDisabled,final_binding_state:'DISABLED',binding_activation_authorized:false,
    canonical_knowledge_replaced:false,notion_or_rag_migration_authorized:false,real_vault_used:false,filesystem_write:false,
    external_skill_code_execution:false,live_obsidian_cli_execution:false,customer_data_used:false,prod_data_used:false,
    prod_authorized:false,prod_write_authorized:false,trading_access:false,paid_fallback:false,permission_expansion:false,autonomous_prod_promotion:false,
    additional_cost_eur:0,human_required:null,next_gate:green?'VALIDATE_FULL_SAFE_PREPROD_CLOSURE':'FIX_OBSIDIAN_FULL_PREPROD_EVIDENCE'
  });
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const rootDir=arg('--state-root')??path.join('artifacts','skills-full','obsidian','preprod-state');
  const surfacePath=arg('--knowledge-surface')??'cerebro/human-intelligence/knowledge/knowledge-surface-map.v1.json';
  const registryPath=arg('--registry')??'cerebro/registry/skill-full-adoption-v1.json';
  const output=arg('--output')??'artifacts/skills-full/obsidian/preprod-integration.json';
  const report=runObsidianFullPreprodIntegration({rootDir,knowledgeSurface:JSON.parse(fs.readFileSync(surfacePath,'utf8')),adoptionRegistry:JSON.parse(fs.readFileSync(registryPath,'utf8'))});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({status:report.status,bindings:report.binding_count,receipts:report.durable_binding_receipts.operation_count,learning_first:report.lrn001_feedback.first_persisted,learning_replay_duplicates:report.lrn001_feedback.replay_duplicates,observability:report.observability_records,audit:report.audit_records,finops:report.finops_records,cost_eur:report.measured_additional_cost_eur,final_binding_state:report.final_binding_state,prod_write:false,trading:false}));
  if(report.status!=='PREPROD_INTEGRATION_COMPLETE') process.exitCode=1;
}
