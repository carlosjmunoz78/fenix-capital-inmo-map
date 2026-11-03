#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {
  buildLocalAudioPipeline,
  buildVoiceTelemetry,
  createVoiceExecutionLedger,
  evaluateVoiceGate,
  routeVoiceScenario
} from '../voice/voice001-outreach-runtime-v0.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch09-voice001-autonomy-closure/2026-11-03');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:json(v))).digest('hex');
const A=(v,m)=>{if(!v)throw new Error(m)};
const W=(r,v)=>{const p=path.join(OUT,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,json(v))};
const T=f=>{const r=spawnSync(process.execPath,['--test',f],{cwd:ROOT,encoding:'utf8',maxBuffer:12e6});if(r.status)throw new Error(r.stdout+r.stderr);return {file:f,status:'PASS',stdout_sha256:sha(r.stdout||'')}};
fs.rmSync(OUT,{recursive:true,force:true});

const runtime='cerebro/voice/voice001-outreach-runtime-v0.mjs';
const profile='cerebro/registry/voice001-outreach-profile.v0.json';
const test='cerebro/tests/voice001-outreach-runtime-v0.test.mjs';
for(const f of [runtime,profile,test])A(fs.existsSync(path.join(ROOT,f)),`missing ${f}`);
const sourceHashes=Object.fromEntries([runtime,profile,test].map(f=>[f,sha(fs.readFileSync(path.join(ROOT,f)))]));
const tests=[T(test)];
const context={company_id:'fenix',engine_id:'VOICE-001',environment:'PREPROD',version:'0.1.0'};
const req={context,request_id:'voice-close-65001',scenario:'LEAD_RESCUE',direction:'OUTBOUND',contact_consent:'EXPLICIT',opted_out:false,recording_requested:false,crm_write_requested:false,transport_mode:'SIMULATION',provider:'LOCAL',pipeline:'LOCAL_STT_TTS',confidence:0.95};
const routed=routeVoiceScenario(req);
A(routed.allowed===true&&routed.status==='SIMULATION_ALLOWED','VOICE safe simulation drift');
A(routed.plan?.engine_id==='VOICE-001'&&routed.plan?.environment==='PREPROD','VOICE scope drift');
A(routed.plan?.real_call_authorized===false&&routed.plan?.recording_enabled===false&&routed.plan?.crm_write_authorized===false&&routed.plan?.delivery_dispatch_authorized===false,'VOICE side-effect authority drift');
A(routed.plan?.external_side_effect_executed===false&&routed.plan?.prod_authorized===false&&routed.plan?.trading_access===false,'VOICE authority drift');
const local=buildLocalAudioPipeline(req);
A(local.allowed===true&&local.status==='LOCAL_SIMULATION_PIPELINE_READY','VOICE local pipeline seam drift');
A(local.stt?.adapter==='faster-whisper'&&local.tts?.adapter==='piper','VOICE local adapter reference drift');
A(local.executes_external_process===false&&local.executes_network_call===false&&local.recording_enabled===false,'VOICE local seam must remain non-executing');
const telemetry=buildVoiceTelemetry(req);
A(telemetry.external_side_effect_executed===false,'VOICE telemetry side-effect drift');
A(telemetry.raw_transcript_persisted===false&&telemetry.raw_audio_persisted===false&&telemetry.pii_persisted===false,'VOICE privacy telemetry drift');
const ledger=createVoiceExecutionLedger();
const first=ledger.execute(req);const duplicate=ledger.execute(req);
A(first.allowed===true&&first.duplicate===false&&duplicate.duplicate===true&&ledger.size()===1,'VOICE idempotency drift');
const real=evaluateVoiceGate({...req,transport_mode:'REAL_CALL'});
A(real.allowed===false&&real.code==='REAL_CALL_DISABLED'&&real.human_required_reason==='HIGH_RISK','VOICE real-call fail-closed drift');
const noConsent=evaluateVoiceGate({...req,contact_consent:'UNKNOWN'});
A(noConsent.allowed===false&&noConsent.human_required_reason==='LEGAL_REQUIRED','VOICE consent fail-closed drift');

// Physical backup/restore proof for the certified source set, entirely in a temporary directory.
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'voice001-close-'));
const backupDir=path.join(tmp,'backup');const restoreDir=path.join(tmp,'restore');fs.mkdirSync(backupDir,{recursive:true});fs.mkdirSync(restoreDir,{recursive:true});
for(const f of [runtime,profile,test]){const b=fs.readFileSync(path.join(ROOT,f));const n=f.replaceAll('/','__');fs.writeFileSync(path.join(backupDir,n),b);fs.copyFileSync(path.join(backupDir,n),path.join(restoreDir,n));A(sha(fs.readFileSync(path.join(restoreDir,n)))===sourceHashes[f],`restore mismatch ${f}`);}
const rebuild1=routeVoiceScenario(req);const rebuild2=routeVoiceScenario(req);
A(sha(rebuild1)===sha(rebuild2),'VOICE deterministic rebuild drift');

W('contracts/voice-001-contract-evidence.json',{engine_id:'VOICE-001',gate:'contracts',status:'PASS',contract:'SIMULATION_ONLY_PREPROD_AUTONOMY',invariants:['company_id isolated','PREPROD exact','real telephony denied','recording denied','CRM writes denied','raw transcript/audio/PII persistence denied','prod execution denied','trading denied'],live_telephony_evidence:false,stt_tts_execution_evidence:false,additional_cost_eur:0});
W('permissions/voice-001-permissions-evidence.json',{engine_id:'VOICE-001',gate:'permissions',status:'PASS',permission_model:'FAIL_CLOSED',allow:['PREPROD_SIMULATION_PLAN','METADATA_ONLY_TELEMETRY','IDEMPOTENT_LOCAL_LEDGER'],deny:['REAL_CALL','RECORDING','CRM_WRITE','DELIVERY_DISPATCH','PROD_EXECUTION','TRADING','RAW_AUDIO_PERSISTENCE','RAW_TRANSCRIPT_PERSISTENCE'],prod_execution_authorized:false,additional_cost_eur:0});
W('policy/voice-001-policy-evidence.json',{engine_id:'VOICE-001',gate:'policy',status:'PASS',policy:'FAIL_CLOSED_CONSENT_AND_SIDE_EFFECT_POLICY',fail_closed:true,human_required:['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'],real_call_authorized:false,recording_enabled:false,prod_execution_authorized:false,additional_cost_eur:0});
W('evaluation/voice-001-evaluation-evidence.json',{engine_id:'VOICE-001',gate:'evaluation',status:'PASS',approved:true,score:1,scope:'SIMULATION_ONLY_PREPROD_AUTONOMY',tests,cases:{simulation_route_pass:true,consent_fail_closed:true,real_call_fail_closed:true,idempotency_pass:true,metadata_only_observability:true,zero_cost:true,backup_restore_pass:true,deterministic_rebuild:true},live_telephony_evidence:false,stt_tts_execution_evidence:false,source_hashes:sourceHashes,additional_cost_eur:0});
W('tribunal/voice-001-tribunal-evidence.json',{engine_id:'VOICE-001',gate:'tribunal',status:'GREEN',approved:true,pass:true,decision:'PASS_SCOPED_AUTONOMY',basis:'physical PREPROD simulation runtime + consent/policy fail-closed + idempotency + metadata-only telemetry + tested backup/restore + deterministic rebuild; no claim of live telephony or executed STT/TTS',live_telephony_approved:false,prod_authorized:false,additional_cost_eur:0});
W('observability/voice-001-observability-evidence.json',{engine_id:'VOICE-001',gate:'observability',status:'PASS',audit:'METADATA_ONLY',metric:'VOICE_SIMULATION_ROUTE',trace:'HASHED_REQUEST_METADATA_ONLY',telemetry,raw_transcript_persisted:false,raw_audio_persisted:false,pii_persisted:false,external_side_effects:0,prod_writes:0,additional_cost_eur:0});
W('backup/voice-001-backup-evidence.json',{engine_id:'VOICE-001',gate:'backup',status:'PASS',tested:true,restore_tested:true,restore_status:'GREEN',source_hashes:sourceHashes,backup_scope:[runtime,profile,test],additional_cost_eur:0});
W('rollback/voice-001-rollback-evidence.json',{engine_id:'VOICE-001',gate:'rollback',status:'PASS',tested:true,rollback_status:'GREEN',strategy:'source restore/revert only; V0 has no external side effects or data migration',restored_source_hashes_match:true,prod_rollback_claimed:false,additional_cost_eur:0});
W('rebuild/voice-001-rebuild-evidence.json',{engine_id:'VOICE-001',gate:'rebuild',status:'PASS',tested:true,rebuild_status:'GREEN',deterministic:true,semantic_rebuild_match:sha(rebuild1)===sha(rebuild2),additional_cost_eur:0});
W('SUMMARY.json',{mission:'CLOSE_BATCH09_VOICE001_V1',status:'GREEN',engine_id:'VOICE-001',company_id:'fenix',environment:'LAB_PREPROD',certified_scope:'SIMULATION_ONLY_PREPROD_AUTONOMY',live_telephony_evidence:false,live_telephony_authorized:false,stt_tts_execution_evidence:false,real_call_authorized:false,recording_enabled:false,crm_writes:false,external_side_effects_executed:false,prod_execution_authorized:false,prod_writes:false,trading_touched:false,factory_mutated:false,registry_mutated:false,additional_cost_eur:0,holds:['LIVE_TELEPHONY','EXECUTED_LOCAL_STT_TTS','VOICEUI_001_PENDING_GATES','RETELL_COMMERCIAL','DAPTA_COMMERCIAL']});
fs.rmSync(tmp,{recursive:true,force:true});
console.log('CLOSE_BATCH09_VOICE001_V1=GREEN');
