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
function job(extra={}) { return {id:9,run_id:1,run_attempt:1,head_sha:SHA,name:'continuous-human-qa',status:'completed',conclusion:'success',steps:[{name:'Assert candidate App acceptance CP141',status:'completed',conclusion:'success'}],...extra}; }
function runFixture(target, runs, jobs=[job()], jobHttp=200) {
  const cwd = mkdtempSync(join(tmpdir(), 'knowledge100-cp135-'));
  try {
    const script = `globalThis.fetch=async(url)=>String(url).includes('/attempts/')?new Response(JSON.stringify({jobs:${JSON.stringify(jobs)}}),{status:${jobHttp}}):new Response(JSON.stringify({workflow_runs:${JSON.stringify(runs)}}),{status:200});await import(${JSON.stringify(MODULE_URL)});`;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd, encoding: 'utf8', env: {...process.env, GITHUB_REPOSITORY:'fixture/repo', GITHUB_TOKEN:'fixture-not-a-secret', TARGET_SHA:target, GITHUB_SHA:''}, timeout:10000
    });
    assert.equal(child.error, undefined);
    return JSON.parse(readFileSync(join(cwd, 'artifacts/knowledge-100/report.json'), 'utf8'));
  } finally { rmSync(cwd,{recursive:true,force:true}); }
}
function row(extra={}) {return {id:1,run_attempt:1,name:'CEREBRO Continuous Human QA V0',path:PATH,head_sha:SHA,status:'completed',conclusion:'success',updated_at:new Date(Date.now()-1000).toISOString(),...extra};}
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
test('controller success without candidate acceptance is HOLD',()=>assert.equal(qa(runFixture(SHA,[row()],[job({steps:[]})])).accepted,false));
test('skipped candidate acceptance cannot certify App',()=>assert.equal(qa(runFixture(SHA,[row()],[job({steps:[{name:'Assert candidate App acceptance CP141',status:'completed',conclusion:'skipped'}]})])).accepted,false));
test('wrong job SHA cannot certify the candidate',()=>assert.equal(qa(runFixture(SHA,[row()],[job({head_sha:OTHER})])).accepted,false));
test('wrong job attempt cannot certify the candidate',()=>assert.equal(qa(runFixture(SHA,[row()],[job({run_attempt:2})])).accepted,false));
test('unavailable job evidence is HOLD',()=>assert.equal(qa(runFixture(SHA,[row()],[],403)).accepted,false));
test('duplicate matching jobs are rejected',()=>assert.equal(qa(runFixture(SHA,[row()],[job(),job({id:10})])).accepted,false));
test('missing run attempt is HOLD',()=>assert.equal(qa(runFixture(SHA,[row({run_attempt:undefined})])).accepted,false));

const readiness = report => report.live_evidence.workflows.promotion_readiness;
const readinessRow = extra => row({id:2,name:'CEREBRO Human Intelligence Promotion Readiness V1',path:'.github/workflows/cerebro-human-intelligence-promotion-readiness-v1.yml',event:'pull_request',...extra});
const readinessJob = extra => job({id:10,run_id:2,name:'scoped-readiness',steps:[{name:'Assert applicable Knowledge readiness CP142',status:'completed',conclusion:'success'}],...extra});
test('exact applicable readiness accepted',()=>assert.equal(readiness(runFixture(SHA,[readinessRow()],[readinessJob()])).accepted,true));
test('unrelated candidate readiness not accepted',()=>assert.equal(readiness(runFixture(SHA,[readinessRow({head_sha:OTHER})],[readinessJob()])),null));
test('manual readiness cannot prove PR applicability',()=>assert.equal(readiness(runFixture(SHA,[readinessRow({event:'workflow_dispatch'})],[readinessJob()])).accepted,false));
test('successful N/A without applicable marker is HOLD',()=>assert.equal(readiness(runFixture(SHA,[readinessRow()],[readinessJob({steps:[]})])).accepted,false));
test('skipped readiness marker is HOLD',()=>assert.equal(readiness(runFixture(SHA,[readinessRow()],[readinessJob({steps:[{name:'Assert applicable Knowledge readiness CP142',status:'completed',conclusion:'skipped'}]})])).accepted,false));
test('different attempt and wrong job SHA fail closed',()=>{for(const wrong of [{run_attempt:2},{head_sha:OTHER},{run_id:3}])assert.equal(readiness(runFixture(SHA,[readinessRow()],[readinessJob(wrong)])).accepted,false);});
test('latest failure cannot be masked by old readiness success',()=>assert.equal(readiness(runFixture(SHA,[readinessRow({updated_at:new Date(Date.now()-5000).toISOString()}),readinessRow({id:3,conclusion:'failure'})],[readinessJob()])).accepted,false));
test('readiness API unavailable and duplicate job fail closed',()=>{assert.equal(readiness(runFixture(SHA,[readinessRow()],[],403)).accepted,false);assert.equal(readiness(runFixture(SHA,[readinessRow()],[readinessJob(),readinessJob({id:11})])).accepted,false);});
