import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSnapshot,isCerebroRun,sanitizeRun} from '../scripts/cerebro-activity-feed-v1.mjs';

const run={id:512,name:'CEREBRO FACT-001 Build',path:'.github/workflows/fact.yml',status:'queued',conclusion:null,event:'workflow_dispatch',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/512',created_at:'2026-11-12T15:00:00Z',run_started_at:null,updated_at:'2026-11-12T15:00:00Z',head_sha:'ab'.repeat(20),actor:{email:'sensitive@example.com'},inputs:{secret:'never-publish'}};
test('only public workflow metadata published',()=>{
 assert.equal(isCerebroRun(run),true);
 assert.equal(isCerebroRun({...run,name:'Unrelated Job',path:'.github/workflows/unrelated.yml'}),false);
 assert.deepEqual(Object.keys(sanitizeRun(run)).sort(),['id','name','path','status','conclusion','event','html_url','created_at','run_started_at','updated_at','head_sha'].sort());
 assert.equal(JSON.stringify(sanitizeRun(run)).includes('sensitive@example.com'),false);
 assert.equal(JSON.stringify(sanitizeRun(run)).includes('never-publish'),false);
 assert.equal(sanitizeRun({...run,html_url:'https://evil.example.com/123'}),null);
});
test('snapshot shows observed counts, no invented jobs, no secrets',()=>{
 const source={running:{total_count:0,workflow_runs:[]},queued:{total_count:26,workflow_runs:[run,{...run,id:517,name:'Other task',path:'misc'}]},recent:{workflow_runs:[{...run,id:510,status:'completed',conclusion:'success'}]}};
 const feed=buildSnapshot(source,'2026-11-12T15:00:00.000Z');
 assert.equal(feed.schema,'cerebro-actions-feed-v1');
 assert.equal(feed.repository,'carlosjmunoz78/fenix-capital-inmo-map');
 assert.equal(feed.queued.total_count,26);
 assert.equal(feed.queued.workflow_runs.length,1);
 assert.equal(feed.history.workflow_runs.length,1);
 assert.equal(feed.in_progress.total_count,0);
 assert.equal(feed.method,'AUTHENTICATED_GITHUB_ACTIONS');
 assert.equal(JSON.stringify(feed).includes('never-publish'),false);
});
test('publisher isolated to own branch with least privileges, no Supabase key',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/cerebro-activity-feed-v1.yml',import.meta.url),'utf8');
 assert.ok(workflow.includes('branches: [main]'));
 assert.ok(workflow.includes('contents: write'));
 assert.ok(workflow.includes('actions: read'));
 assert.ok(workflow.includes('--force-with-lease='));
 assert.ok(workflow.includes('refs/heads/cerebro-activity-feed-v1'));
 assert.ok(workflow.includes('persist-credentials: false'));
 assert.ok(!workflow.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(workflow.includes('schema!=="cerebro-actions-feed-v1"'));
});
