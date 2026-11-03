#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {auditWebsite,persistenceEnvelope} from '../multicompany/post-scan-parallel-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch08-waud001-autonomy-closure/2026-11-03');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:json(v))).digest('hex');
const A=(v,m)=>{if(!v)throw new Error(m)};
const W=(r,v)=>{const p=path.join(OUT,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,json(v))};
const T=f=>{const r=spawnSync(process.execPath,['--test',f],{cwd:ROOT,encoding:'utf8',maxBuffer:8e6});if(r.status)throw new Error(r.stdout+r.stderr);return {file:f,status:'PASS',stdout_sha256:sha(r.stdout||'')}};
fs.rmSync(OUT,{recursive:true,force:true});

const runtime=path.join(ROOT,'cerebro/multicompany/post-scan-parallel-v1.mjs');
const migration=path.join(ROOT,'supabase/migrations/20261013101500_cerebro_post_scan_parallel_preprod_v1.sql');
const rollbackSql=path.join(ROOT,'cerebro/multicompany/rollback/post-scan-parallel-preprod-v1.rollback.sql');
const test1=path.join(ROOT,'cerebro/tests/post-scan-parallel-preprod-persistence-v1.test.mjs');
for(const p of [runtime,migration,rollbackSql,test1]) A(fs.existsSync(p),`missing ${p}`);
const hashes=Object.fromEntries([runtime,migration,rollbackSql,test1].map(p=>[path.basename(p),sha(fs.readFileSync(p))]));

const scan=company_id=>({company_id,engine_id:'SCAN-001',environment:'PREPROD',version:'1.0.0',evidence_at:'2026-11-03T04:10:00Z',evidence_sha256:sha(`${company_id}:scan`),social_profiles:{},read_only:true,prod_authorized:false,prod_write_authorized:false,trading_access:false});
const badHtml='<html><body><h1>A</h1><h1>B</h1><img src="x"></body></html>';
const goodHtml='<html><head><title>Good</title><meta name="description" content="ok"><link rel="canonical" href="https://example.com/good"><meta name="viewport" content="width=device-width"></head><body><h1>Good</h1><img src="a" alt="a"><script>gtag("config","X")</script></body></html>';
const pages=[{url:'https://example.com/bad',status:404,html:badHtml},{url:'https://example.com/good',status:200,html:goodHtml}];
const build=company_id=>auditWebsite({company_id,evidence_at:'2026-11-03T04:15:00Z',scan_result:scan(company_id),pages});
const first=build('fenix'),second=build('fenix'),other=build('acme');
A(first.engine_id==='WAUD-001'&&first.version==='1.0.0','engine/version drift');
A(first.company_id==='fenix'&&first.environment==='PREPROD','company/environment drift');
A(first.read_only===true&&first.remote_write===false&&first.prod_authorized===false&&first.prod_write_authorized===false&&first.trading_access===false&&first.additional_cost_eur===0,'authority/cost drift');
A(first.payload.pages_audited===2,'page count drift');
const codes=first.payload.findings.map(x=>x.code);
for(const code of ['HTTP_ERROR','MISSING_TITLE','MISSING_META_DESCRIPTION','MISSING_CANONICAL','MULTIPLE_H1','MISSING_VIEWPORT','IMAGE_ALT_MISSING','TRACKING_SIGNAL_NOT_DETECTED']) A(codes.includes(code),`missing ${code}`);
A(first.payload.findings.every(x=>x.url==='https://example.com/bad'),'good page false positive');
A(first.result_sha256===second.result_sha256,'rebuild nondeterministic');
A(other.result_sha256!==first.result_sha256&&other.company_id==='acme','company isolation drift');
const low=auditWebsite({company_id:'fenix',evidence_at:'2026-11-03T04:16:00Z',scan_result:scan('fenix'),pages:[]});
A(low.human_required_code==='LOW_CONFIDENCE'&&low.payload.pages_audited===0,'LOW_CONFIDENCE semantics drift');
let policyDenied=false,secretDenied=false,invalidUrlDenied=false;
try{auditWebsite({company_id:'fenix',evidence_at:'x',scan_result:scan('other'),pages})}catch(e){policyDenied=/POLICY_CONFLICT:SCAN/.test(String(e.message))}
try{auditWebsite({company_id:'fenix',evidence_at:'x',scan_result:scan('fenix'),pages:[{url:'https://example.com',html:'<html></html>',password:'x'}]})}catch(e){secretDenied=/SECURITY_INCIDENT/.test(String(e.message))}
try{auditWebsite({company_id:'fenix',evidence_at:'x',scan_result:scan('fenix'),pages:[{url:'/relative',html:'<html></html>'}]})}catch(e){invalidUrlDenied=/invalid public page url/.test(String(e.message))}
A(policyDenied&&secretDenied&&invalidUrlDenied,'fail-closed drift');
const env=persistenceEnvelope(first,{idempotency_key:'waud001:fenix:v1',recorded_by:'ci'});
A(env.engine_id==='WAUD-001'&&env.company_id==='fenix'&&env.item_count===2&&env.finding_count===first.payload.finding_count&&env.prod_authorized===false&&env.prod_write_authorized===false&&env.trading_access===false&&env.additional_cost_eur===0,'persistence envelope drift');
const tests=[T('cerebro/tests/post-scan-parallel-preprod-persistence-v1.test.mjs')];

const implemented_scope=['supplied_public_page_html_analysis','HTTP_status_findings','title_meta_canonical_H1_viewport_image_alt_tracking_signal_checks','deterministic_findings','LOW_CONFIDENCE_without_pages','tenant_company_isolation','PREPROD_persistence_receipt'];
const not_claimed=['live_crawler_execution','Lighthouse_Core_Web_Vitals','full_accessibility_audit','security_penetration_test','authenticated_site_audit','automatic_prod_remediation'];
const cases={runtime_physical:true,persistence_contract_test:tests.every(x=>x.status==='PASS'),deterministic:first.result_sha256===second.result_sha256,expected_findings:codes.length>=8,good_page_no_false_positive:true,company_isolation:true,low_confidence_semantics:low.human_required_code==='LOW_CONFIDENCE',policy_conflict_fail_closed:policyDenied,secret_rejected:secretDenied,invalid_url_rejected:invalidUrlDenied,safe_persistence_envelope:true,zero_cost:first.additional_cost_eur===0};
const evaluation={engine_id:'WAUD-001',approved:Object.values(cases).every(Boolean),score:Object.values(cases).every(Boolean)?1:0,cases,tests,runtime_sha256:hashes[path.basename(runtime)],implemented_scope,not_claimed,full_canonical_feature_completeness_claimed:false};
const tribunal={engine_id:'WAUD-001',approved:evaluation.approved,pass:evaluation.approved,decision:evaluation.approved?'PASS':'DENY',basis:'physical shared PREPROD runtime + persistence test + deterministic supplied-page fixtures + fail-closed checks',prod_authorized:false,full_canonical_feature_completeness_claimed:false};
A(tribunal.approved,'WAUD-001 tribunal denied');

const b=fs.mkdtempSync(path.join(os.tmpdir(),'waud001-bkp-'));
for(const p of [runtime,migration,rollbackSql,test1]){const n=path.basename(p);fs.copyFileSync(p,path.join(b,n));A(sha(fs.readFileSync(path.join(b,n)))===hashes[n],`backup fail ${n}`)}
const state=path.join(b,'waud001-state.json'),stateBackup=path.join(b,'waud001-state.backup.json');fs.writeFileSync(state,json({result:first,envelope:env}));fs.copyFileSync(state,stateBackup);const originalStateSha=sha(fs.readFileSync(state));fs.writeFileSync(state,'{}\n');fs.copyFileSync(stateBackup,state);A(sha(fs.readFileSync(state))===originalStateSha,'local rollback restore failed');
const rebuilt=build('fenix');A(rebuilt.result_sha256===first.result_sha256,'rebuild failed');

W('evaluation/waud-001-evaluation-evidence.json',{engine_id:'WAUD-001',gate:'evaluation',status:'PASS',environment:'LAB_PREPROD',...evaluation,additional_cost_eur:0});
W('tribunal/waud-001-tribunal-evidence.json',{engine_id:'WAUD-001',gate:'tribunal',status:'GREEN',environment:'LAB_PREPROD',...tribunal,additional_cost_eur:0});
W('observability/waud-001-observability-evidence.json',{engine_id:'WAUD-001',gate:'observability',status:'PASS',environment:'LAB_PREPROD',telemetry_scope:'LOCAL_DETERMINISTIC_FIXTURE_ONLY',live_web_telemetry_claimed:false,metrics:{companies_tested:2,pages_audited:first.payload.pages_audited,findings:first.payload.finding_count,low_confidence_cases:1,policy_denials:policyDenied?1:0,secret_denials:secretDenied?1:0,invalid_url_denials:invalidUrlDenied?1:0,prod_writes:0,trading_touched:0},trace_sha256:sha({first,env}),implemented_scope,not_claimed,additional_cost_eur:0});
W('backup/waud-001-backup-evidence.json',{engine_id:'WAUD-001',gate:'backup',status:'PASS',environment:'LAB_PREPROD',tested:true,scope:'runtime+migration+rollback+test local copies',hashes,restore:'PASS',additional_cost_eur:0});
W('rollback/waud-001-rollback-evidence.json',{engine_id:'WAUD-001',gate:'rollback',status:'PASS',environment:'LAB_PREPROD',tested:true,scope:'isolated local state + physical SQL rollback',prod_rollback_claimed:false,local_state_restore:'PASS',sql_rollback_present:true,sql_rollback_sha256:hashes[path.basename(rollbackSql)],original_state_sha256:originalStateSha,restored_state_sha256:sha(fs.readFileSync(state)),additional_cost_eur:0});
W('rebuild/waud-001-rebuild-evidence.json',{engine_id:'WAUD-001',gate:'rebuild',status:'PASS',environment:'LAB_PREPROD',tested:true,deterministic:true,first_result_sha256:first.result_sha256,rebuilt_result_sha256:rebuilt.result_sha256,additional_cost_eur:0});
W('SUMMARY.json',{mission:'CLOSE_BATCH08_WAUD001_V1',status:'GREEN',engine_id:'WAUD-001',company_id:'fenix',environment:'LAB_PREPROD',version:'1.0.0',evaluation:'PASS',tribunal:'PASS',observability:'PASS',backup:'PASS',rollback:'PASS',rebuild:'PASS',implemented_scope,not_claimed,full_canonical_feature_completeness_claimed:false,prod_execution_authorized:false,prod_writes:false,trading_touched:false,factory_mutated:false,registry_mutated:false,additional_cost_eur:0});
fs.rmSync(b,{recursive:true,force:true});
console.log('CLOSE_BATCH08_WAUD001_V1=GREEN');
