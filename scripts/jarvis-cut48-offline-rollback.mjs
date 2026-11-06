/**
 * CUT48 · SOURCE-ONLY rollback drill. NEVER touches Supabase, PROD or App.
 * Uses an independently preserved Git tree and copies into temporary folders.
 * Must not be described as a tested server restore or production readiness.
 */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const oldBranch='refs/heads/cerebro/jarvis-omnichannel-interlocutor-lab-20261106';
const root='supabase/functions/cerebro-console-gateway-v0/';
const files=[
 {file:'index.ts',sha:'44241c6abc3cb89560500336e332f0628219d0fc'},
 {file:'knowledge.ts',sha:'e00bb09ba9a024772f26fbd81159a9e9a584cd42'}
];
const git=(...args)=>execFileSync('git',args,{encoding:'buffer',stdio:['ignore','pipe','pipe'],timeout:25000,maxBuffer:2_000_000});
const gitHash=buffer=>createHash('sha1')
 .update(Buffer.from(`blob ${buffer.length}\0`,'utf8')).update(buffer).digest('hex');

let temp;
try{
 // Independent baseline checkout is read from an existing preserved PR branch.
 // No tags, no secrets or writes to the checkout.
 git('fetch','--no-tags','--depth=1','origin',oldBranch);
 temp=mkdtempSync(join(tmpdir(),'cerebro-cut48-rollback-'));
 mkdirSync(join(temp,'new'),{recursive:true});
 mkdirSync(join(temp,'restored-old'),{recursive:true});
 let count=0;
 for(const entry of files){
  const remotePath=root+entry.file;
  const oldCode=git('show',`FETCH_HEAD:${remotePath}`);
  assert.equal(gitHash(oldCode),entry.sha,`OLD immutable Git blob mismatch: ${entry.file}`);
  const currentNew=readFileSync(remotePath);
  const newHash=gitHash(currentNew);
  const newPath=join(temp,'new',entry.file);
  const isolatedPath=join(temp,'restored-old',entry.file);
  writeFileSync(newPath,currentNew,{mode:0o600});
  writeFileSync(isolatedPath,currentNew,{mode:0o600});
  // Simulated rollback in a temp-only directory.
  writeFileSync(isolatedPath,oldCode,{mode:0o600});
  assert.equal(gitHash(readFileSync(isolatedPath)),entry.sha,`Restore verification failed: ${entry.file}`);
  // Simulated reapply NEW inside temp only.
  writeFileSync(isolatedPath,readFileSync(newPath),{mode:0o600});
  assert.equal(gitHash(readFileSync(isolatedPath)),newHash,`Reapply verification failed: ${entry.file}`);
  if(entry.file==='index.ts'){
   assert.match(oldCode.toString('utf8'),/Hola Carlos\. ¿Qué tal guapo\?/);
   assert.doesNotMatch(currentNew.toString('utf8'),/Hola Carlos\. ¿Qué tal guapo\?/);
  }else assert.equal(newHash,entry.sha,'Knowledge module must not change');
  count++;
 }
 console.log(`JARVIS_CUT48_TEMP_ONLY_RESTORE_AND_REAPPLY=PASS_${count}_FILES`);
 console.log('JARVIS_CUT48_PROD_RESTORE_TESTED=FALSE');
 console.log('JARVIS_CUT48_NO_SUPABASE_OR_APP_WRITE=TRUE');
}finally{if(temp)rmSync(temp,{recursive:true,force:true})}
