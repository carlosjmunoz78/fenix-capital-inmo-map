/** B6 CUT01: physical synthetic mutation/compensation on disposable CI filesystem.
 * This proves backup, postcondition verification and rollback, NOT PROD write rights
 * nor B2/B3 live authorization. Never accepts model text, user path or arbitrary shell.
 */
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,copyFile,rename,realpath,rm,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const dir=await mkdtemp(join(tmpdir(),'jarvis-b6-lab-safe-'));
const target=join(dir,'fixture.json');
const backup=join(dir,'fixture.snapshot');
const staged=join(dir,'fixture.staged');
const oldState={company_id:'fenix',environment:'LAB',engine_id:'JARVIS-CORE-001',
 mission_id:'synthetic-b6-fixture',revision:1,mutation:'not-applied'};
const expectedNew={...oldState,revision:2,mutation:'synthetic-applied'};
try{
 assert.equal(await realpath(dir),dir);
 await writeFile(target,JSON.stringify(oldState),{encoding:'utf8',mode:0o600,flag:'wx'});
 assert.equal((await lstat(target)).isSymbolicLink(),false);
 assert.equal(dirname(target),dir);
 const original=await readFile(target);
 const beforeHash=sha(original);
 await copyFile(target,backup);
 assert.equal(sha(await readFile(backup)),beforeHash);
 // In a PROD implementation, this point requires persistent B3, B6 journal,
 // idempotency, independent policy + rollback approval. None are connected here.
 await writeFile(staged,JSON.stringify(expectedNew),{encoding:'utf8',mode:0o600,flag:'wx'});
 await rename(staged,target);
 const after=await readFile(target);
 assert.notEqual(sha(after),beforeHash);
 assert.deepEqual(JSON.parse(after.toString('utf8')),expectedNew);
 // Independent postcondition verification before acknowledging synthetic write.
 const post=JSON.parse((await readFile(target,'utf8')));
 assert.equal(post.revision,2);
 assert.equal(post.mutation,'synthetic-applied');
 // Exercise compensation: snapshot must restore original file bytes exactly.
 const compensation=join(dir,'compensation.staged');
 await copyFile(backup,compensation);
 await rename(compensation,target);
 const restored=await readFile(target);
 assert.equal(sha(restored),beforeHash);
 assert.deepEqual(JSON.parse(restored.toString('utf8')),oldState);
 console.log('B6_LAB_SANDBOX_MUTATION_AND_ROLLBACK_PASS: real synthetic file write, independent postcondition, snapshot and byte-identical compensation; no PROD mutation.');
}finally{
 await rm(dir,{recursive:true,force:true});
}
