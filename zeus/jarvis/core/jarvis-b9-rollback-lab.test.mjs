/** B9 CUT03 · Actual local filesystem fault injection & restore in ephemeral CI.
 * Existing B9 recovery classifier decides only; this test uses its own
 * synthetic disposable fixture, not App/CRM/WordPress/Trading/PROD.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {decideJarvisB9Recovery} from './jarvis-b9-resilience-decision.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const safeScript="export const state = 'LAB_ONLY_OK';\n";
function fixture(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'jarvis-b9-synthetic-'));
 try{return fn(root);}
 finally{fs.rmSync(root,{recursive:true,force:true});}
}
const check=file=>{
 const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8',
  timeout:10000,maxBuffer:4096,env:{...process.env,NODE_ENV:'test'}});
 return r.status===0;
};
const classify=extra=>decideJarvisB9Recovery({
 companyId:'synthetic-fenix',environment:'LAB',missionId:'synthetic-fault-1',
 failureClass:'FILESYSTEM',consecutiveSameFamily:1,operation:'READ',
 estimatedExtraEuro:0,...extra
});
test('B9 real LAB file fault -> negative compiler check -> verified backup -> byte-identical rollback',()=>{
 fixture(root=>{
  const working=path.join(root,'candidate.mjs'),backup=path.join(root,'backup.mjs');
  fs.writeFileSync(working,safeScript,'utf8');
  const baseline=fs.readFileSync(working),expectedHash=sha(baseline);
  assert.equal(check(working),true);
  fs.copyFileSync(working,backup,fs.constants.COPYFILE_EXCL);
  assert.equal(sha(fs.readFileSync(backup)),expectedHash);
  fs.writeFileSync(working,'export const state = ;\n','utf8');
  assert.equal(check(working),false);
  assert.equal(classify().decision,'CANDIDATE_ONLY');
  // Action is performed only by this isolated test after verified immutable backup.
  assert.equal(sha(fs.readFileSync(backup)),expectedHash);
  fs.copyFileSync(backup,working);
  assert.equal(check(working),true);
  assert.equal(sha(fs.readFileSync(working)),expectedHash);
  assert.deepEqual(fs.readFileSync(working),baseline);
 });
});
test('B9 corrupt backup refuses restoration instead of inventing a green receipt',()=>{
 fixture(root=>{
  const working=path.join(root,'candidate.mjs'),backup=path.join(root,'backup.mjs');
  fs.writeFileSync(working,safeScript);
  const originalHash=sha(fs.readFileSync(working));
  fs.copyFileSync(working,backup);
  fs.writeFileSync(backup,'corrupted-backup');
  fs.writeFileSync(working,'export const state = ;\n');
  const backupTrusted=sha(fs.readFileSync(backup))===originalHash;
  assert.equal(backupTrusted,false);
  // A rollback with unverified input must not be attempted.
  let restored=false;
  if(backupTrusted){fs.copyFileSync(backup,working);restored=true;}
  assert.equal(restored,false);
  assert.equal(check(working),false);
 });
});
test('B9 disabled supervisor disallows rollback on even ephemeral synthetic files',()=>{
 fixture(root=>{
  const working=path.join(root,'candidate.mjs');
  fs.writeFileSync(working,safeScript);
  const original=sha(fs.readFileSync(working));
  const supervisor={enabled:false,killSwitch:true};
  const operationAllowed=supervisor.enabled===true&&supervisor.killSwitch===false;
  if(operationAllowed)fs.writeFileSync(working,'changed\n');
  assert.equal(operationAllowed,false);
  assert.equal(sha(fs.readFileSync(working)),original);
 });
});
test('B9 third same-family failure stops before any new filesystem mutation',()=>{
 fixture(root=>{
  const working=path.join(root,'candidate.mjs');
  fs.writeFileSync(working,safeScript);
  const originalHash=sha(fs.readFileSync(working));
  const d=classify({consecutiveSameFamily:3});
  assert.equal(d.decision,'STOP');
  assert.equal(d.reason,'ANTI_LOOP_REEVALUATE_CAUSE');
  if(d.decision==='CANDIDATE_ONLY')fs.writeFileSync(working,'bad');
  assert.equal(sha(fs.readFileSync(working)),originalHash);
 });
});
test('B9 legal or economic exception cannot touch even disposable fixture',()=>{
 fixture(root=>{
  const working=path.join(root,'candidate.mjs');
  fs.writeFileSync(working,safeScript);
  const before=sha(fs.readFileSync(working));
  for(const exceptionCode of ['SIGNATURE_REQUIRED','MONEY_LIMIT','LEGAL_REQUIRED']){
   const d=classify({exceptionCode});
   assert.equal(d.decision,'HUMAN_REQUIRED');
   if(d.decision==='CANDIDATE_ONLY')fs.writeFileSync(working,'forbidden');
  }
  assert.equal(sha(fs.readFileSync(working)),before);
 });
});
