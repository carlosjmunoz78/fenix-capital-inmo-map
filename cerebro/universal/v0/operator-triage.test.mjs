import {test} from 'node:test';
import assert from 'node:assert/strict';
import {triageFleet} from '../../../src/cerebroOperativaTriage.ts';
const repo='carlosjmunoz78/fenix-capital-inmo-map';
const at=(ms=0)=>new Date(Date.now()-ms).toISOString();
const run=(id,name,conclusion,age=1000,status='completed')=>({
 run_id:id,name,status,conclusion,updated_at:at(age),engine_id:null,agent_id:null,subagent_id:null,
 url:'https://github.com/'+repo+'/actions/runs/'+id
});
const feed=(recent=[],state='LIVE')=>({
 kind:'ready',reason:'',snapshot:{
  company_id:'fenix',environment:'LAB',verified_owner:true,observed_at:at(1000),
  sources:[{platform:'GitHub',repo,name:'App / CEREBRO',state,
   observed_at:at(1000),recent},{platform:'Cloudflare',name:'Cloudflare',
   state:'UNAVAILABLE',reason:'READ_TOKEN_MISSING',observed_at:null}]
 }
});
test('last successful completed workflow supersedes older failed run',()=>{
 const result=triageFleet(feed([
  run(1,'QA workflow','failure',20000),
  run(2,'QA workflow','success',10000),
  run(3,'Second workflow','failure',8000),
  run(4,'Third workflow',null,1000,'in_progress')
 ]));
 assert.equal(result.status,'READY_PARTIAL');
 assert.equal(result.verified_failure_count,1);
 assert.equal(result.needs_attention_count,0);
 assert.equal(result.unavailable_source_count,1);
 assert.equal(result.sampled_run_count,4);
 assert.ok(result.items.some(x=>x.title.includes('Second workflow')));
 assert.ok(!result.items.some(x=>x.title.includes('QA workflow')));
 assert.ok(!result.items.some(x=>x.title.includes('Third workflow')));
 assert.equal(result.executed,false);
});
test('subsequent running job is NOT considered repaired',()=>{
 const result=triageFleet(feed([run(9,'QA workflow','failure',3000),run(10,'QA workflow',null,1000,'in_progress')]));
 assert.equal(result.verified_failure_count,1);
 assert.match(result.items[0].next_action,/inspeccionar logs/i);
});
test('action_required is not conflated with failed job',()=>{
 const result=triageFleet(feed([run(11,'Manual approval','action_required')]));
 assert.equal(result.verified_failure_count,0);
 assert.equal(result.needs_attention_count,1);
 assert.equal(result.items[0].kind,'WORKFLOW_ACTION_REQUIRED');
});
test('denied and stale never display false zero incidents',()=>{
 const denied=triageFleet({kind:'denied',snapshot:null,reason:'OWNER_REQUIRED'});
 assert.equal(denied.status,'UNAVAILABLE');
 assert.equal(denied.reason,'OWNER_REQUIRED');
 const stale=feed([run(7,'QA','failure')]);
 stale.snapshot.observed_at='2026-01-01T00:00:00Z';
 assert.equal(triageFleet(stale).status,'UNAVAILABLE');
});
test('stale source is a connection gap rather than a verified failure',()=>{
 const input=feed([run(12,'QA','failure')]);
 input.snapshot.sources[0].observed_at='2026-01-01T00:00:00Z';
 const result=triageFleet(input);
 assert.equal(result.verified_failure_count,0);
 assert.equal(result.unavailable_source_count,2);
 assert.ok(result.items.some(x=>x.reason==='SOURCE_STALE'));
});
test('old failures are historical, not confirmed current incidents',()=>{
 const result=triageFleet(feed([run(15,'Ancient QA','failure',10*86400000)]));
 assert.equal(result.verified_failure_count,0);
 assert.equal(result.unavailable_source_count,1);
});
test('unsafe URL and invalid timestamp cannot create verified incident',()=>{
 const input=feed([run(20,'QA','failure')]);
 input.snapshot.sources[0].recent[0].url='https://example.invalid/actions/runs/20';
 assert.equal(triageFleet(input).verified_failure_count,0);
 const future=feed([run(21,'QA','failure',-3600000)]);
 assert.equal(triageFleet(future).verified_failure_count,0);
});
test('gaps have unknown cost ETA and cannot mutate providers',()=>{
 const result=triageFleet(feed());
 assert.equal(result.items[0].eta,'SIN_BASE_SUFICIENTE');
 assert.equal(result.items[0].cost,'NO_MEDIDO');
 assert.equal(result.items[0].evidence_url,null);
 assert.match(result.items[0].next_action,/solo lectura/);
});
