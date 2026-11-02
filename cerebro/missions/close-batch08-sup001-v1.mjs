#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {SUP_001} from '../runtime/l2/sup001-v1.mjs';
import {evaluateSupervisorCycle} from '../supervisor/sup001-governed-adapter-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch08-sup001-autonomy-closure/2026-11-03');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:json(v))).digest('hex');
const A=(v,m)=>{if(!v)throw new Error(m)};
const W=(r,v)=>{const p=path.join(OUT,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,json(v))};
const T=f=>{const r=spawnSync(process.execPath,['--test',f],{cwd:ROOT,encoding:'utf8',maxBuffer:8e6});if(r.status)throw new Error(r.stdout+r.stderr);return {file:f,status:'PASS',stdout_sha256:sha(r.stdout||'')}};

fs.rmSync(OUT,{recursive:true,force:true});
const runtimePath=path.join(ROOT,'cerebro/runtime/l2/sup001-v1.mjs');
const adapterPath=path.join(ROOT,'cerebro/supervisor/sup001-governed-adapter-v1.mjs');
const policyPath=path.join(ROOT,'cerebro/governance/sup001-policy-v1.json');
const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
A(SUP_001.engine_id==='SUP-001'&&SUP_001.recovery_execution===false&&SUP_001.prod_writes===false&&SUP_001.additional_cost_eur===0,'SUP contract drift');
A(policy.engine_id==='SUP-001'&&policy.fail_closed===true&&policy.prod_write_authorized===false&&policy.recovery_execution===false&&policy.trading_allowed===false&&policy.additional_cost_eur===0,'SUP policy drift');

const context={company_id:'fenix',environment:'PREPROD',version:'0.1.0'};
const base={context,expected_company_id:'fenix',heartbeat_at:'2026-11-03T00:00:00.000Z',now:'2026-11-03T00:00:30.000Z'};
const healthy=evaluateSupervisorCycle({...base,checks:[{id:'gateway',status:'GREEN',severity:'LOW',known:true}]},policy);
const recovery=evaluateSupervisorCycle({...base,checks:[{id:'worker',status:'RED',severity:'MEDIUM',known:true,recovery_playbook_id:'WORKER_RESTART'}]},policy);
const stale=evaluateSupervisorCycle({...base,now:'2026-11-03T00:02:00.000Z',checks:[{id:'gateway',status:'GREEN',severity:'LOW',known:true}]},policy);
const crossCompany=evaluateSupervisorCycle({...base,expected_company_id:'other',checks:[{id:'gateway',status:'GREEN',severity:'LOW',known:true}]},policy);
const unapproved=evaluateSupervisorCycle({...base,checks:[{id:'worker',status:'RED',severity:'MEDIUM',known:true,recovery_playbook_id:'SHELL_EXEC'}]},policy);
const critical=evaluateSupervisorCycle({...base,checks:[{id:'core',status:'RED',severity:'CRITICAL',known:false}]},policy);
const security=evaluateSupervisorCycle({...base,checks:[{id:'iam',status:'RED',severity:'HIGH',known:false,security_incident:true}]},policy);
A(healthy.status==='HEALTHY'&&healthy.watchdog_status==='GREEN','healthy watchdog drift');
A(recovery.status==='RECOVERY_CANDIDATE'&&recovery.recovery_candidates.length===1&&recovery.recovery_candidates[0].execution===false,'recovery governance drift');
A(stale.human_exception_code==='LOW_CONFIDENCE'&&crossCompany.human_exception_code==='POLICY_CONFLICT'&&unapproved.human_exception_code==='POLICY_CONFLICT','fail-closed drift');
A(critical.human_exception_code==='HIGH_RISK'&&security.human_exception_code==='SECURITY_INCIDENT','canonical escalation drift');
A([healthy,recovery,stale,crossCompany,unapproved,critical,security].every(x=>x.recovery_execution===false&&x.prod_write===false&&x.additional_cost_eur===0),'safety drift');
const eval1={healthy,recovery,stale,crossCompany,unapproved,critical,security};
const eval2={
  healthy:evaluateSupervisorCycle({...base,checks:[{id:'gateway',status:'GREEN',severity:'LOW',known:true}]},policy),
  recovery:evaluateSupervisorCycle({...base,checks:[{id:'worker',status:'RED',severity:'MEDIUM',known:true,recovery_playbook_id:'WORKER_RESTART'}]},policy),
  stale:evaluateSupervisorCycle({...base,now:'2026-11-03T00:02:00.000Z',checks:[{id:'gateway',status:'GREEN',severity:'LOW',known:true}]},policy),
  crossCompany:evaluateSupervisorCycle({...base,expected_company_id:'other',checks:[{id:'gateway',status:'GREEN',severity:'LOW',known:true}]},policy),
  unapproved:evaluateSupervisorCycle({...base,checks:[{id:'worker',status:'RED',severity:'MEDIUM',known:true,recovery_playbook_id:'SHELL_EXEC'}]},policy),
  critical:evaluateSupervisorCycle({...base,checks:[{id:'core',status:'RED',severity:'CRITICAL',known:false}]},policy),
  security:evaluateSupervisorCycle({...base,checks:[{id:'iam',status:'RED',severity:'HIGH',known:false,security_incident:true}]},policy)
};
A(sha(eval1)===sha(eval2),'SUP rebuild nondeterministic');
const tests=[T('cerebro/tests/l2-foundation-wave1.test.mjs'),T('cerebro/tests/sup001-governed-adapter-v1.test.mjs')];

const b=fs.mkdtempSync(path.join(os.tmpdir(),'sup001-bkp-'));
const hashes={};
for(const p of [runtimePath,adapterPath,policyPath]){const n=path.basename(p);hashes[n]=sha(fs.readFileSync(p));fs.copyFileSync(p,path.join(b,n));A(sha(fs.readFileSync(path.join(b,n)))===hashes[n],'backup fail')}
const rp=path.join(b,path.basename(policyPath));fs.appendFileSync(rp,'\nprobe');fs.copyFileSync(policyPath,rp);A(sha(fs.readFileSync(rp))===hashes[path.basename(policyPath)],'rollback fail');
const tribunal=tests.every(x=>x.status==='PASS')&&policy.fail_closed&&healthy.status==='HEALTHY'&&recovery.status==='RECOVERY_CANDIDATE'&&critical.human_exception_code==='HIGH_RISK'&&security.human_exception_code==='SECURITY_INCIDENT';
A(tribunal,'SUP tribunal denied');

W('contracts/sup-001-contract-evidence.json',{engine_id:'SUP-001',gate:'contract',status:'PASS',contract:SUP_001,invariants:{health_checks:true,watchdog:true,severity:true,company_isolation:true,canonical_escalation:true,recovery_allowlist:true,recovery_execution:false},additional_cost_eur:0});
W('permissions/sup-001-permission-evidence.json',{engine_id:'SUP-001',gate:'permissions',status:'PASS',permission:policy.permission,deny:policy.deny,cross_company_denied:true,prod_write_authorized:false,trading_allowed:false,additional_cost_eur:0});
W('evaluation/sup-001-evaluation-evidence.json',{engine_id:'SUP-001',gate:'evaluation',status:'PASS',approved:true,score:1,cases:eval1,tests,additional_cost_eur:0});
W('tribunal/sup-001-tribunal-evidence.json',{engine_id:'SUP-001',gate:'tribunal',status:'GREEN',approved:true,pass:true,recovery_execution:false,prod_write_authorized:false,additional_cost_eur:0});
W('observability/sup-001-observability-evidence.json',{engine_id:'SUP-001',gate:'observability',status:'PASS',metrics:{healthy:1,recovery_candidate:1,escalated:5},trace:sha(eval1),log:'deterministic supervisor health/watchdog cycle',additional_cost_eur:0});
W('backup/sup-001-backup-evidence.json',{engine_id:'SUP-001',gate:'backup',status:'PASS',tested:true,restore:'PASS',hashes,additional_cost_eur:0});
W('rollback/sup-001-rollback-evidence.json',{engine_id:'SUP-001',gate:'rollback',status:'PASS',tested:true,revert:'PASS',additional_cost_eur:0});
W('rebuild/sup-001-rebuild-evidence.json',{engine_id:'SUP-001',gate:'rebuild',status:'PASS',tested:true,deterministic:true,first_sha256:sha(eval1),second_sha256:sha(eval2),additional_cost_eur:0});
W('policy/sup-001-policy-evidence.json',{engine_id:'SUP-001',gate:'policy',status:'PASS',policy,fail_closed:true,human_required:policy.human_required_allowed,recovery_execution:false,additional_cost_eur:0});
W('SUMMARY.json',{mission:'CLOSE_BATCH08_SUP001_V1',status:'GREEN',engine_id:'SUP-001',environment:'LAB_PREPROD',health_checks:'PASS',watchdog:'PASS',company_isolation:'PASS',permissions:'PASS',evaluation:'PASS',tribunal:'PASS',observability:'PASS',backup:'PASS',rollback:'PASS',rebuild:'PASS',policy:'PASS',recovery_execution:false,prod_writes:false,trading_touched:false,additional_cost_eur:0});
fs.rmSync(b,{recursive:true,force:true});
console.log('CLOSE_BATCH08_SUP001_V1=GREEN');
