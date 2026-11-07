import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../cloudflare-lab/provision-eu-d1-cli.mjs',import.meta.url));
const env={...process.env,CLOUDFLARE_API_TOKEN_JARVIS:'',JARVIS_EU_CREATE_APPROVED:''};
test('CUT27 cloud operator CLI without token must stop before any network or create',()=>{
 const p=spawnSync(process.execPath,[cli,'--create'],{
  env,encoding:'utf8',timeout:5000
 });
 assert.equal(p.status,2);
 assert.match(p.stderr,/CUT27_NEEDS_PROTECTED_CLOUDFLARE_TOKEN/);
 assert.equal(p.stdout,'');
});
test('CUT27 cloud operator CLI refuses unexpected arguments without token',()=>{
 const p=spawnSync(process.execPath,[cli,'--force','--create'],{
  env,encoding:'utf8',timeout:5000
 });
 assert.equal(p.status,2);
 assert.match(p.stderr,/CUT27_INVALID_MODE/);
 assert.equal(p.stdout,'');
});
