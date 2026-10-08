import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeRepositoryHygiene} from '../runtime/hygiene-audit.mjs';

const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40),D='d'.repeat(40);

test('HYG-001 is audit-only and never authorizes branch mutation or deletion',()=>{
  const report=analyzeRepositoryHygiene({
    branches:[
      {name:'main',sha:A,protected:true},
      {name:'feature/live-pr',sha:B},
      {name:'cerebro-rsi-recovery-001-prechange-snapshot-20261008',sha:C},
      {name:'cerebro-rsi-recovery-001-safety-backup-20261008',sha:C},
      {name:'cerebro-rsi-learning-state-v0',sha:D}
    ],
    open_pr_heads:['feature/live-pr'],
    now:'2026-10-08T15:30:00Z'
  });
  assert.equal(report.engine_id,'HYG-001');
  assert.equal(report.environment,'AUDIT_ONLY');
  assert.equal(report.destructive_changes_performed,0);
  assert.equal(report.delete_authorized,false);
  assert.equal(report.mutation_authorized,false);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.trading_access,false);
});

test('protected, PR, state and snapshot branches are classified conservatively',()=>{
  const report=analyzeRepositoryHygiene({
    branches:[
      {name:'main',sha:A,protected:true},
      {name:'cerebro-rsi-recovery-001-20261008',sha:B},
      {name:'cerebro-rsi-recovery-001a-final-snapshot-20261008',sha:C},
      {name:'cerebro-rsi-learning-outbox-v0',sha:D}
    ],
    open_pr_heads:['cerebro-rsi-recovery-001-20261008'],
    now:'2026-10-08T15:30:00Z'
  });
  const byName=Object.fromEntries(report.branches.map(row=>[row.branch,row]));
  assert.equal(byName.main.classification,'PROTECTED');
  assert.equal(byName['cerebro-rsi-recovery-001-20261008'].classification,'ACTIVE_PR_HEAD');
  assert.equal(byName['cerebro-rsi-recovery-001a-final-snapshot-20261008'].classification,'SNAPSHOT_CANDIDATE');
  assert.equal(byName['cerebro-rsi-learning-outbox-v0'].classification,'DURABLE_STATE');
  assert.ok(report.branches.every(row=>row.delete_authorized===false&&row.mutation_authorized===false));
});

test('duplicate heads are evidence only and do not become automatic deletion decisions',()=>{
  const report=analyzeRepositoryHygiene({
    branches:[{name:'branch-a',sha:A},{name:'branch-b',sha:A},{name:'branch-c',sha:B}],
    open_pr_heads:[],
    now:'2026-10-08T15:30:00Z'
  });
  assert.equal(report.duplicate_head_groups.length,1);
  assert.deepEqual(report.duplicate_head_groups[0].branches,['branch-a','branch-b']);
  const a=report.branches.find(row=>row.branch==='branch-a');
  assert.ok(a.reasons.includes('DUPLICATE_HEAD'));
  assert.equal(a.recommended_action,'REVIEW_DUPLICATE_HEAD');
  assert.equal(a.delete_authorized,false);
});

test('invalid branch SHA fails closed',()=>{
  assert.throws(()=>analyzeRepositoryHygiene({branches:[{name:'x',sha:'bad'}]}),/invalid sha/);
});
