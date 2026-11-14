import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const cli=new URL('../runtime/seo-workforce-cli-v0.mjs',import.meta.url);
const mission={mission_id:'SEO_READONLY_COPY_001',company_id:'fenix',environment:'LAB',version:'0_1_0',author_actor_id:'SEO_D15_AGENT',reviewer_actor_id:'SEO_D31_AGENT',judge_actor_id:'SEO_JUDGE_AGENT',budget_eur:0,allow_writes:false,allow_paid_ai:false,sources:['https://fenixcapital.es/'],text:'Calcular mi furura cuota. Reformas y constucción.'};
function run(input){return spawnSync(process.execPath,[cli.pathname],{input:JSON.stringify(input),encoding:'utf8',timeout:5000});}
test('work unit executes via actual node subprocess, returns auditable output and zero-cost no-write result',()=>{
 const p=run(mission);
 assert.equal(p.status,0,p.stderr);
 const e=JSON.parse(p.stdout);
 assert.equal(e.evidence.observations.length,2);
 assert.equal(e.verdict.decision,'LAB_FINDINGS_VERIFIED');
 assert.equal(e.evidence.source_freshness_verified,false);
 assert.equal(e.promotion.allowed,false);
 assert.equal(e.cost.additional_eur,0);
});
test('work unit exits nonzero on forbidden PROD and redacts input',()=>{
 const p=run({...mission,environment:'PROD'});
 assert.equal(p.status,1);
 assert.equal(JSON.parse(p.stderr).code,'ENVIRONMENT_DENIED');
 assert.equal(p.stderr.includes(mission.text),false);
});
