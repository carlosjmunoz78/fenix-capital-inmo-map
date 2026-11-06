import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..','..','..');
const script=join(here,'jarvis-deepseek-autonomy-v1.mjs');
const state=join(root,'zeus','jarvis','state','jarvis-deepseek-autonomy-ledger-v1.json');
test('CUT37 perpetual LAB ledger is explicit, EUR50 policy USD40 subcap',()=>{
 const l=JSON.parse(readFileSync(state,'utf8'));
 assert.equal(l.schema,'jarvis.deepseek.autonomy.ledger.v1');
 assert.equal(l.company_id,'fenix');
 assert.equal(l.engine_id,'JARVIS');
 assert.equal(l.environment,'LAB');
 assert.ok(['ACTIVE','RESERVED','PAUSED','QUALITY_HALT','LIMIT_REACHED'].includes(l.status),'Unexpected ledger state: '+l.status);
 assert.equal(l.owner_permission_eur,50);
 assert.equal(l.lifetime_guard_usd,40);
 assert.equal(l.auto_recharge,false);
 assert.equal(l.auto_promote,false);
 assert.equal(l.synthetic_only,true);
 assert.equal(l.production_mutation,false);
 assert.ok(l.spent_estimate_usd>0&&l.spent_estimate_usd<40);
 if(l.status==='RESERVED'){
  assert.ok(l.pending&&typeof l.pending==='object'&&!Array.isArray(l.pending),'Missing durable reservation');
  assert.match(String(l.pending.run_id),/^\\d{6,20}$/);
  assert.equal(l.pending.cursor,l.cycle_cursor,'Reserved cursor mismatch');
  assert.ok(Number.isSafeInteger(l.pending.cycles)&&l.pending.cycles>=1&&l.pending.cycles<=12);
  assert.ok(Number.isFinite(l.pending.reserved_usd)&&l.pending.reserved_usd>0&&l.pending.reserved_usd<=1.8);
  assert.ok(l.spent_estimate_usd+l.pending.reserved_usd<=l.lifetime_guard_usd,'Reserved total exceeds hard cap');
 } else {
  assert.equal(l.pending,null,'Non-reserved state must not retain pending spend');
 }
});
test('CUT37 autonomy dry-run does not use credentials or network',()=>{
 const p=spawnSync(process.execPath,[script,'--dry-run'],{encoding:'utf8',env:{PATH:process.env.PATH}});
 assert.equal(p.status,0,p.stderr);
 assert.match(p.stdout,/JARVIS_AUTONOMY_DRY_RUN/);
 assert.match(p.stdout,/"only_lab":true/);
});
test('CUT37 cannot spend without branch, owner-enabled LAB and environment secret',()=>{
 const p=spawnSync(process.execPath,[script,'--reserve'],{encoding:'utf8',
 env:{PATH:process.env.PATH,JARVIS_LAB_AUTONOMY_ENABLE:'YES',GITHUB_REF:'refs/heads/main',
   GITHUB_REPOSITORY:'carlosjmunoz78/fenix-capital-inmo-map',
   GITHUB_RUN_ID:'12345678',GITHUB_RUN_ATTEMPT:'1',GITHUB_EVENT_NAME:'push'}});
 assert.notEqual(p.status,0);
 assert.match(p.stderr,/AUTONOMY_BRANCH_OR_SECRET_GATE/);
});
test('CUT37 requires durable Git push, not artifact-only budget memory',()=>{
 const src=readFileSync(script,'utf8');
 assert.match(src,/gitSave\('chore\(jarvis\): CUT37 reserve/);
 assert.match(src,/gitSave\('chore\(jarvis\): CUT37 settle/);
 assert.match(src,/gitSave\('chore\(jarvis\): CUT37 cumulative budget reached/);
 assert.match(src,/HEAD:refs\/heads\//);
 assert.match(src,/s\.pending\)throw Error\('PENDING_BUDGET_RESERVATION_NEEDS_RECONCILIATION'\)/);
 assert.match(src,/readFileSync\(join\(dir,'jarvis-study-'/);
 assert.doesNotMatch(src,/refs\/heads\/main/);
});
