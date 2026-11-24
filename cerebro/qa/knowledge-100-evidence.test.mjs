import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const PATH = '.github/workflows/cerebro-continuous-human-qa-v0.yml';
const MODULE_URL = new URL('./knowledge-100-v0.mjs', import.meta.url).href;
function runFixture(target, runs) {
  const cwd = mkdtempSync(join(tmpdir(), 'knowledge100-cp135-'));
  try {
    const script = `globalThis.fetch=async()=>new Response(JSON.stringify({workflow_runs:${JSON.stringify(runs)}}),{status:200});await import(${JSON.stringify(MODULE_URL)});`;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd, encoding: 'utf8', env: {...process.env, GITHUB_REPOSITORY:'fixture/repo', GITHUB_TOKEN:'fixture-not-a-secret', TARGET_SHA:target, GITHUB_SHA:''}, timeout:10000
    });
    assert.equal(child.error, undefined);
    return JSON.parse(readFileSync(join(cwd, 'artifacts/knowledge-100/report.json'), 'utf8'));
  } finally { rmSync(cwd,{recursive:true,force:true}); }
}
function row(extra={}) {return {id:1,name:'CEREBRO Continuous Human QA V0',path:PATH,head_sha:SHA,status:'completed',conclusion:'success',updated_at:new Date(Date.now()-1000).toISOString(),...extra};}
const qa = report => report.live_evidence.workflows.human_qa;
test('accepts canonical exact fresh successful QA run',()=>assert.equal(qa(runFixture(SHA,[row()])).accepted,true));
test('missing SHA rejects even successful canonical QA',()=>assert.equal(qa(runFixture('',[row()])),null));
test('malformed SHA rejects a matching fake run',()=>assert.equal(qa(runFixture('bad',[row({head_sha:'bad'})])),null));
test('different candidate SHA is not evidence',()=>assert.equal(qa(runFixture(SHA,[row({head_sha:OTHER})])),null));
test('same display name different workflow path is not evidence',()=>assert.equal(qa(runFixture(SHA,[row({path:'.github/workflows/unrelated.yml'})])),null));
test('same workflow path different name is not canonical evidence',()=>assert.equal(qa(runFixture(SHA,[row({name:'unrelated'})])),null));
test('latest failure cannot be masked by older success',()=>assert.equal(qa(runFixture(SHA,[row({updated_at:new Date(Date.now()-5000).toISOString()}),row({id:2,conclusion:'failure'})])).accepted,false));
test('stale success is rejected',()=>assert.equal(qa(runFixture(SHA,[row({updated_at:new Date(Date.now()-25*3600000).toISOString()})])),null));
test('scope suffix in canonical workflow path remains supported',()=>assert.equal(qa(runFixture(SHA,[row({path:PATH+'@refs/heads/main'})])).accepted,true));
