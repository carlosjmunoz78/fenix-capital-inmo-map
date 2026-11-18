import assert from 'node:assert/strict';
import test from 'node:test';
import {selectPublicGithubRuns} from './public-github-fallback.mjs';
const repo='https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/';
function run(id,status='in_progress',name='CEREBRO SEO-001 live run'){return {id,name,path:'.github/workflows/seo.yml',status,updated_at:'2026-11-18T09:00:00Z',html_url:repo+id};}
test('verified real GitHub URL, id and workflow name are required',()=>{
 const s=selectPublicGithubRuns([run(12),{...run(13),html_url:'https://evil.example.com/13'},run(12),run(14,'completed','ordinary project'),run(16,'queued')]);
 assert.deepEqual(s.selected.map(x=>x.id),[12,16]);assert.equal(s.running_observed,1);assert.equal(s.queued_observed,1);
});
test('no synthetic jobs; unknown states and invalid IDs filtered',()=>{const s=selectPublicGithubRuns([{...run(1),id:'1'},run(2,'fake'),run(3,'completed')]);assert.deepEqual(s.selected.map(x=>x.id),[3]);});
test('unknown schema fails closed',()=>assert.throws(()=>selectPublicGithubRuns({a:1}),/SCHEMA_INVALID/));
test('zero matches means zero verified executions',()=>{const s=selectPublicGithubRuns([]);assert.equal(s.selected.length,0);assert.equal(s.running_observed,0);});
