import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCOPE,assertCommand,assertClaims,WORKFLOW_REF,OIDC_AUDIENCE} from '../policy.mjs';
const good={...SCOPE,provider:'vercel',team_id:'team_qnh6u1Ofy2WPp0MGEKlyMA50',project_id:'prj_LxPzJA5AkHJvhYzTAbVJbRrAvvLu',project_name:'cerebro-fact001-vercel-lab-20261111',max_cost_eur:0,operation:'vercel.project.read_lab',job_id:'FACT001-VERCEL-CMD-20261111-READ-01',request_id:'FACT001-VERCEL-20261111-READ-01',idempotency_key:'fact001-vercel-oidc-20261111-read-01'};
test('strict independent scoped Vercel command',()=>{
 assert.equal(assertCommand(good),true);
 for(const bad of [{environment:'PROD'},{company_id:'other'},{team_id:'wrong'},{project_id:'prj_other'},{project_name:'fenix-capital-preprod'},{max_cost_eur:1},{operation:'vercel.deploy'},{access_token:'fake'}])assert.throws(()=>assertCommand({...good,...bad}));
});
test('issuer pins repo branch workflow actor and exact audience',()=>{
 assert.ok(WORKFLOW_REF.includes('fact001-vercel-intake-oidc-probe.yml'));
 assert.equal(OIDC_AUDIENCE,'cerebro-fact001-vercel-intake-lab-20261111');
 const now=2000000000,valid={iss:'https://token.actions.githubusercontent.com',aud:OIDC_AUDIENCE,repository:'carlosjmunoz78/fenix-capital-inmo-map',ref:'refs/heads/cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109',workflow_ref:WORKFLOW_REF,event_name:'push',actor:'carlosjmunoz78',iat:now-1,exp:now+120};
 assert.equal(assertClaims(valid,now).trusted,true);
 assert.throws(()=>assertClaims({...valid,actor:'other'},now));
 assert.throws(()=>assertClaims({...valid,workflow_ref:'other'},now));
});
test('provider cannot be called from intake, idempotent D1 SQL',()=>{
 const index=readFileSync(new URL('../index.ts',import.meta.url),'utf8');
 assert.ok(index.includes('verifyGitHubOidc(auth(req))'));
 assert.ok(index.includes("ON CONFLICT(idempotency_key) DO NOTHING"));
 assert.ok(index.includes("writes_to:'D1_QUEUE_ONLY'"));
 assert.ok(!index.includes('api.vercel.com'));
 assert.ok(!index.includes('/workers/scripts'));
 assert.ok(!index.includes('console.log('));
});
