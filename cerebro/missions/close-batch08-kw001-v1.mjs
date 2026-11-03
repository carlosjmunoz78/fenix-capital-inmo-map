#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {auditKeywords,persistenceEnvelope} from '../multicompany/post-scan-parallel-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch08-kw001-autonomy-closure/2026-11-03');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:json(v))).digest('hex');
const A=(v,m)=>{if(!v)throw new Error(m)};
const W=(r,v)=>{const p=path.join(OUT,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,json(v))};
fs.rmSync(OUT,{recursive:true,force:true});

const runtime=path.join(ROOT,'cerebro/multicompany/post-scan-parallel-v1.mjs');
A(fs.existsSync(runtime),`missing ${runtime}`);
const runtimeSha=sha(fs.readFileSync(runtime));
const scan=company_id=>({company_id,engine_id:'SCAN-001',environment:'PREPROD',version:'1.0.0',evidence_at:'2026-11-03T04:00:00Z',evidence_sha256:sha(`${company_id}:scan`),social_profiles:{},read_only:true,prod_authorized:false,prod_write_authorized:false,trading_access:false});
const build=company_id=>auditKeywords({company_id,evidence_at:'2026-11-03T04:05:00Z',scan_result:scan(company_id),declared_seed_terms:['hipotecas','financiacion'],locations:['cordoba'],public_terms:['broker hipotecario']});
const first=build('fenix'),second=build('fenix'),other=build('acme');
A(first.engine_id==='KW-001'&&first.version==='1.0.0','engine/version drift');
A(first.company_id==='fenix'&&first.environment==='PREPROD','company/environment drift');
A(first.read_only===true&&first.remote_write===false&&first.prod_authorized===false&&first.prod_write_authorized===false&&first.trading_access===false&&first.additional_cost_eur===0,'authority/cost drift');
A(first.payload.opportunity_count>0&&first.payload.external_metrics_fabricated===false,'keyword output drift');
A(first.payload.opportunities.every(x=>x.external_metrics==='unknown_without_authorized_source'),'external metric fabrication drift');
A(first.payload.opportunities.some(x=>x.source_refs.includes('declared_seed')),'declared seed provenance missing');
A(first.payload.opportunities.some(x=>x.source_refs.includes('public_signal')),'public signal provenance missing');
A(first.payload.opportunities.some(x=>x.keyword==='hipotecas cordoba'&&x.source_refs.includes('derived_location')),'location derivation missing');
A(first.result_sha256===second.result_sha256,'rebuild nondeterministic');
A(other.result_sha256!==first.result_sha256&&other.company_id==='acme','company isolation drift');
const low=auditKeywords({company_id:'fenix',evidence_at:'2026-11-03T04:06:00Z',scan_result:scan('fenix')});
A(low.human_required_code==='LOW_CONFIDENCE'&&low.payload.opportunity_count===0,'LOW_CONFIDENCE semantics drift');
let policyDenied=false,secretDenied=false;
try{auditKeywords({company_id:'fenix',evidence_at:'x',scan_result:scan('other'),declared_seed_terms:['hipotecas']})}catch(e){policyDenied=/POLICY_CONFLICT:SCAN/.test(String(e.message))}
try{auditKeywords({company_id:'fenix',evidence_at:'x',scan_result:scan('fenix'),declared_seed_terms:[{password:'x'}]})}catch(e){secretDenied=/SECURITY_INCIDENT/.test(String(e.message))}
A(policyDenied&&secretDenied,'fail-closed drift');
const env=persistenceEnvelope(first,{idempotency_key:'kw001:fenix:v1',recorded_by:'ci'});
A(env.engine_id==='KW-001'&&env.company_id==='fenix'&&env.item_count===first.payload.opportunity_count&&env.prod_authorized===false&&env.prod_write_authorized===false&&env.trading_access===false&&env.additional_cost_eur===0,'persistence envelope drift');

const implemented_scope=['declared_seed_terms','declared_locations','public_terms','derived_location_opportunities','source_refs','deterministic_priority','LOW_CONFIDENCE_without_signals'];
const not_claimed=['GSC_integration','SERP_live_acquisition','intent_classification','keyword_clusters','target_page_mapping','competitor_metrics'];
const cases={runtime_physical:true,deterministic_keyword_opportunities:first.result_sha256===second.result_sha256,declared_seed_provenance:true,localization_derivation:true,public_signal_provenance:true,external_metrics_not_fabricated:true,company_isolation:true,low_confidence_semantics:low.human_required_code==='LOW_CONFIDENCE',policy_conflict_fail_closed:policyDenied,secret_rejected:secretDenied,safe_envelope:true,zero_cost:first.additional_cost_eur===0};
const evaluation={engine_id:'KW-001',approved:Object.values(cases).every(Boolean),score:Object.values(cases).every(Boolean)?1:0,cases,runtime_sha256:runtimeSha,implemented_scope,not_claimed,full_canonical_feature_completeness_claimed:false};
const tribunal={engine_id:'KW-001',approved:evaluation.approved,pass:evaluation.approved,decision:evaluation.approved?'PASS':'DENY',basis:'physical PREPROD runtime + deterministic declared/public fixtures + provenance + fail-closed checks',prod_authorized:false,full_canonical_feature_completeness_claimed:false};
A(tribunal.approved,'KW-001 tribunal denied');

const b=fs.mkdtempSync(path.join(os.tmpdir(),'kw001-bkp-'));
const runtimeBackup=path.join(b,path.basename(runtime));fs.copyFileSync(runtime,runtimeBackup);A(sha(fs.readFileSync(runtimeBackup))===runtimeSha,'runtime backup hash mismatch');
const state=path.join(b,'kw001-state.json'),stateBackup=path.join(b,'kw001-state.backup.json');fs.writeFileSync(state,json({result:first,envelope:env}));fs.copyFileSync(state,stateBackup);const originalStateSha=sha(fs.readFileSync(state));fs.writeFileSync(state,'{}\n');fs.copyFileSync(stateBackup,state);A(sha(fs.readFileSync(state))===originalStateSha,'local rollback restore failed');
const rebuilt=build('fenix');A(rebuilt.result_sha256===first.result_sha256,'rebuild failed');

W('evaluation/kw-001-evaluation-evidence.json',{engine_id:'KW-001',gate:'evaluation',status:'PASS',environment:'LAB_PREPROD',...evaluation,additional_cost_eur:0});
W('tribunal/kw-001-tribunal-evidence.json',{engine_id:'KW-001',gate:'tribunal',status:'GREEN',environment:'LAB_PREPROD',...tribunal,additional_cost_eur:0});
W('observability/kw-001-observability-evidence.json',{engine_id:'KW-001',gate:'observability',status:'PASS',environment:'LAB_PREPROD',telemetry_scope:'LOCAL_DETERMINISTIC_FIXTURE_ONLY',live_external_metrics_claimed:false,metrics:{companies_tested:2,opportunities:first.payload.opportunity_count,low_confidence_cases:1,policy_denials:policyDenied?1:0,secret_denials:secretDenied?1:0,prod_writes:0,trading_touched:0},trace_sha256:sha({first,env}),implemented_scope,not_claimed,additional_cost_eur:0});
W('backup/kw-001-backup-evidence.json',{engine_id:'KW-001',gate:'backup',status:'PASS',environment:'LAB_PREPROD',tested:true,scope:'runtime local copy',source_runtime_sha256:runtimeSha,backup_runtime_sha256:sha(fs.readFileSync(runtimeBackup)),restore:'PASS',additional_cost_eur:0});
W('rollback/kw-001-rollback-evidence.json',{engine_id:'KW-001',gate:'rollback',status:'PASS',environment:'LAB_PREPROD',tested:true,scope:'isolated local state only',prod_rollback_claimed:false,local_state_restore:'PASS',original_state_sha256:originalStateSha,restored_state_sha256:sha(fs.readFileSync(state)),additional_cost_eur:0});
W('rebuild/kw-001-rebuild-evidence.json',{engine_id:'KW-001',gate:'rebuild',status:'PASS',environment:'LAB_PREPROD',tested:true,deterministic:true,first_result_sha256:first.result_sha256,rebuilt_result_sha256:rebuilt.result_sha256,additional_cost_eur:0});
W('SUMMARY.json',{mission:'CLOSE_BATCH08_KW001_V1',status:'GREEN',engine_id:'KW-001',company_id:'fenix',environment:'LAB_PREPROD',version:'1.0.0',evaluation:'PASS',tribunal:'PASS',observability:'PASS',backup:'PASS',rollback:'PASS',rebuild:'PASS',implemented_scope,not_claimed,full_canonical_feature_completeness_claimed:false,prod_execution_authorized:false,prod_writes:false,trading_touched:false,factory_mutated:false,registry_mutated:false,additional_cost_eur:0});
fs.rmSync(b,{recursive:true,force:true});
console.log('CLOSE_BATCH08_KW001_V1=GREEN');
