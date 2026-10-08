import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {BoundedRecoveryLedger,planRecovery,isCanonicalHumanRequired} from '../runtime/bounded-recovery-supervisor.mjs';

function tmp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-recovery-supervisor-'));}
function observation(failure_family='REMOTE_HTTP_503',extra={}){return {company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.9.0',failure_family,observed_at:'2026-10-08T16:00:00Z',evidence_ref:`evidence:${failure_family}`,prod_authorized:false,trading_access:false,...extra};}

test('security money and policy exceptions go directly to canonical HUMAN_REQUIRED',()=>{
  for(const [family,code] of [['SECURITY_SECRET_EXPOSURE','SECURITY_INCIDENT'],['MONEY_COST_LIMIT','MONEY_LIMIT'],['POLICY_PERMISSION_CONFLICT','POLICY_CONFLICT']]){
    const plan=planRecovery(observation(family));
    assert.equal(plan.state,'HUMAN_REQUIRED');assert.equal(plan.human_required,code);assert.equal(isCanonicalHumanRequired(code),true);assert.equal(plan.action,null);assert.equal(plan.prod_authorized,false);
  }
});

test('transient recovery changes strategy before repeating same action a third time',()=>{
  const o=observation();
  const first=planRecovery(o,{attempts:0,previous_actions:[]});
  const second=planRecovery(o,{attempts:1,previous_actions:[first.action]});
  const third=planRecovery(o,{attempts:2,previous_actions:[first.action,second.action]});
  assert.equal(first.action,'REFETCH_REMOTE_EVIDENCE');
  assert.equal(second.action,'REFETCH_REMOTE_EVIDENCE');
  assert.notEqual(third.action,'REFETCH_REMOTE_EVIDENCE');
  assert.equal(third.strategy_change_required,true);
});

test('after three failed bounded attempts supervisor stops with LOW_CONFIDENCE',()=>{
  const root=tmp();
  try{
    const ledger=new BoundedRecoveryLedger({file_path:path.join(root,'recovery.v8')});const opened=ledger.open(observation());const id=opened.case.case_id;
    for(let i=1;i<=3;i++){
      const attempt=ledger.beginAttempt(id);assert.equal(attempt.attempt,i);
      const result=ledger.recordResult(id,{success:false,test_green:false,evidence_ref:`attempt:${i}`,completed_at:`2026-10-08T16:0${i}:00Z`});
      if(i<3)assert.notEqual(result.state,'HUMAN_REQUIRED');
    }
    const final=ledger.next(id);assert.equal(final.state,'HUMAN_REQUIRED');assert.equal(final.human_required,'LOW_CONFIDENCE');assert.equal(isCanonicalHumanRequired(final.human_required),true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('successful recovery requires a green test and emits non-PROD learning evidence',()=>{
  const root=tmp();
  try{
    const file=path.join(root,'recovery.v8');const ledger=new BoundedRecoveryLedger({file_path:file});const id=ledger.open(observation('LOCAL_STATE_JOURNAL')).case.case_id;ledger.beginAttempt(id);
    assert.throws(()=>ledger.recordResult(id,{success:true,test_green:false,evidence_ref:'test:red'}),/requires green test/);
    const done=ledger.recordResult(id,{success:true,test_green:true,evidence_ref:'test:green',completed_at:'2026-10-08T16:05:00Z'});
    assert.equal(done.state,'RESOLVED');assert.equal(done.learning_event.event_type,'RECOVERY_OUTCOME');assert.equal(done.learning_event.prod_authorized,false);assert.equal(done.trading_access,false);
    const reopened=new BoundedRecoveryLedger({file_path:file});assert.equal(reopened.next(id).state,'RESOLVED');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('detected regression forces rollback action on the next bounded attempt',()=>{
  const root=tmp();
  try{
    const ledger=new BoundedRecoveryLedger({file_path:path.join(root,'recovery.v8')});const id=ledger.open(observation('REMOTE_HTTP_503')).case.case_id;ledger.beginAttempt(id);
    const failed=ledger.recordResult(id,{success:false,regression:true,evidence_ref:'regression:1',completed_at:'2026-10-08T16:06:00Z'});assert.equal(failed.state,'ROLLBACK_REQUIRED');
    const next=ledger.next(id);assert.equal(next.state,'RECOVERY_PLANNED');assert.equal(next.action,'ROLLBACK_LAST_CANDIDATE');assert.equal(next.requires_rollback_on_regression,true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('supervisor rejects PROD context and expanded authority',()=>{
  assert.throws(()=>planRecovery({...observation(),environment:'PROD'}),/exact PREPROD/);
  assert.throws(()=>planRecovery({...observation(),prod_authorized:true}),/authority expanded/);
});
