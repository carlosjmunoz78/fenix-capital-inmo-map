import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  normalizeHostConfig,hostPaths,runHostCycle,readHeartbeat,createLedgerBackup,verifyLedgerBackup,restoreLedgerBackup
} from '../runtime/rsi-learning-host.mjs';

function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-lrn-host-'));}
function config(root){return {company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.4.0',preprod_version:'0.4.0',data_dir:path.join(root,'data'),inbox_dir:path.join(root,'inbox'),backup_dir:path.join(root,'backups'),poll_interval_ms:5000,policy_pass:true,security_pass:true,local_persistence_enabled:true};}
function lowEvent(id='evt-host-low',company_id='fenix'){return {event_id:id,event_type:'SKILL_CANDIDATE_STATIC_LAB_GREEN',candidate_id:`candidate:${id}`,company_id,engine_id:'FACT-001',version:'0.1.0',reason:'STATIC_LAB_GREEN',evidence_ref:{source_ref:`source:${id}`},payload:{domain:'seo'},target_engine_bindings:['SEO-001']};}
function highEvent(id='evt-host-high'){return {event_id:id,event_type:'SECURITY_ADVISORY',candidate_id:`candidate:${id}`,company_id:'fenix',engine_id:'FACT-001',version:'0.1.0',severity:'HIGH',reason:'SECURITY_HIGH',evidence_ref:{source_ref:`source:${id}`},payload:{domain:'skills'}};}
function writeReport(cfg,name,events){fs.mkdirSync(cfg.inbox_dir,{recursive:true});fs.writeFileSync(path.join(cfg.inbox_dir,name),JSON.stringify({events}));}
function clock(){let n=0;return ()=>`2026-10-08T13:00:${String(n++).padStart(2,'0')}.000Z`;}
function writeLock(lockDir,owner){fs.mkdirSync(lockDir,{recursive:true});if(owner!==undefined)fs.writeFileSync(path.join(lockDir,'owner.json'),typeof owner==='string'?owner:JSON.stringify(owner));}

test('host config is exact PREPROD LRN-001, zero-cost and fail-closed',()=>{
  const root=temp();
  try{
    const cfg=normalizeHostConfig(config(root));
    assert.equal(cfg.engine_id,'LRN-001');assert.equal(cfg.environment,'PREPROD');assert.equal(cfg.additional_cost_eur,0);assert.equal(cfg.prod_authorized,false);assert.equal(cfg.trading_access,false);
    assert.throws(()=>normalizeHostConfig({...config(root),environment:'PROD'}),/exact PREPROD/);
    assert.throws(()=>normalizeHostConfig({...config(root),engine_id:'SEO-001'}),/LRN-001/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('host cycle persists once, preserves source, writes receipt and heartbeat, then skips same batch',()=>{
  const root=temp();const cfg=config(root);const now=clock();
  try{
    writeReport(cfg,'001.json',[lowEvent()]);
    const first=runHostCycle({config:cfg,now});
    assert.equal(first.status,'GREEN');assert.equal(first.last_result.persisted_total,1);assert.equal(first.last_result.processed_batches,1);
    assert.equal(fs.existsSync(path.join(cfg.inbox_dir,'001.json')),true);
    const paths=hostPaths(normalizeHostConfig(cfg));
    assert.equal(fs.existsSync(paths.ledger),true);assert.equal(fs.readdirSync(paths.receipts).length,1);
    const second=runHostCycle({config:cfg,now});
    assert.equal(second.status,'GREEN');assert.equal(second.last_result.processed_batches,0);assert.equal(second.last_result.skipped_receipts,1);
    const hb=readHeartbeat(normalizeHostConfig(cfg));assert.equal(hb.company_id,'fenix');assert.equal(hb.engine_id,'LRN-001');assert.equal(hb.prod_write_authorized,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('HIGH risk is held canonically and kill switch stops all new persistence',()=>{
  const root=temp();const cfg=config(root);const now=clock();
  try{
    writeReport(cfg,'001.json',[highEvent()]);
    const held=runHostCycle({config:cfg,now});assert.equal(held.status,'PARTIAL_HELD');assert.deepEqual(held.last_result.human_required,['HIGH_RISK']);
    const paths=hostPaths(normalizeHostConfig(cfg));fs.writeFileSync(paths.killSwitch,'enabled\n');
    writeReport(cfg,'002.json',[lowEvent('evt-after-kill')]);
    const killed=runHostCycle({config:cfg,now});assert.equal(killed.status,'KILLED');assert.equal(killed.kill_switch_enabled,true);
    assert.equal(fs.readdirSync(paths.receipts).length,1);
    assert.equal(killed.last_success_at,held.last_success_at);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('host rejects cross-company event batches instead of mixing tenant evidence',()=>{
  const root=temp();const cfg=config(root);const now=clock();
  try{
    writeReport(cfg,'foreign.json',[lowEvent('evt-foreign','other-company')]);
    assert.throws(()=>runHostCycle({config:cfg,now}),/CROSS_COMPANY_EVENT/);
    assert.equal(readHeartbeat(normalizeHostConfig(cfg)).status,'ERROR');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('three identical failures change strategy to HOLD_SAME_ERROR_FAMILY',()=>{
  const root=temp();const cfg=config(root);const now=clock();
  try{
    fs.mkdirSync(cfg.inbox_dir,{recursive:true});fs.writeFileSync(path.join(cfg.inbox_dir,'bad.json'),'{bad-json');
    for(let i=1;i<=2;i++) assert.throws(()=>runHostCycle({config:cfg,now}),/ERROR/);
    assert.throws(()=>runHostCycle({config:cfg,now}),/HOLD_SAME_ERROR_FAMILY/);
    assert.equal(readHeartbeat(normalizeHostConfig(cfg)).status,'HOLD_SAME_ERROR_FAMILY');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('backup refuses live host ownership, reclaims trusted stale host lock, and fails closed on ambiguous lock metadata',()=>{
  const root=temp();const cfg=config(root);const now=clock();const normalized=normalizeHostConfig(cfg);
  try{
    writeReport(cfg,'001.json',[lowEvent('evt-lock-backup')]);runHostCycle({config:cfg,now});
    const paths=hostPaths(normalized);
    writeLock(paths.hostLock,{schema_version:'1.0.0',kind:'LRN_HOST',pid:process.pid,started_at:'2026-10-08T12:00:00.000Z'});
    assert.throws(()=>createLedgerBackup({config:cfg,now}),/host lock is active/);
    fs.rmSync(paths.hostLock,{recursive:true,force:true});
    writeLock(paths.hostLock,{schema_version:'1.0.0',kind:'LRN_HOST',pid:2147483647,started_at:'2026-10-08T11:00:00.000Z'});
    const recovered=createLedgerBackup({config:cfg,now});
    assert.equal(recovered.status,'BACKUP_GREEN');assert.equal(fs.existsSync(paths.hostLock),false);
    writeLock(paths.hostLock);
    assert.throws(()=>createLedgerBackup({config:cfg,now}),/owner metadata missing/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('backup verifies checksum; restore requires kill switch and preserves current ledger first',()=>{
  const root=temp();const cfg=config(root);const now=clock();
  try{
    writeReport(cfg,'001.json',[lowEvent('evt-backup-a')]);runHostCycle({config:cfg,now});
    const backup=createLedgerBackup({config:cfg,now});assert.equal(backup.status,'BACKUP_GREEN');assert.equal(verifyLedgerBackup({config:cfg,manifest_file:backup.manifest_file}).status,'BACKUP_VERIFIED');
    writeReport(cfg,'002.json',[lowEvent('evt-backup-b')]);runHostCycle({config:cfg,now});
    const paths=hostPaths(normalizeHostConfig(cfg));assert.throws(()=>restoreLedgerBackup({config:cfg,manifest_file:backup.manifest_file,confirm_restore:true,now}),/kill switch/);
    fs.writeFileSync(paths.killSwitch,'enabled\n');
    const restored=restoreLedgerBackup({config:cfg,manifest_file:backup.manifest_file,confirm_restore:true,now});
    assert.equal(restored.status,'RESTORE_GREEN');assert.ok(restored.preservation_backup);assert.equal(restored.kill_switch_still_enabled,true);
    assert.equal(verifyLedgerBackup({config:cfg,manifest_file:backup.manifest_file}).sha256,restored.restored_sha256);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
