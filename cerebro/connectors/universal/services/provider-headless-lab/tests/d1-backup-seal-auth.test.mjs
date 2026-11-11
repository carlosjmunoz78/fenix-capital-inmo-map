import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertClaims,OIDC_AUDIENCE,BRANCH,REPO} from '../../../supabase/d1-backup-seal-lab/auth.mjs';
import {assertOrder,SEAL_ORDER,VERIFY_ORDER} from '../../../supabase/d1-backup-seal-lab/order.mjs';
const now=1794480000;
const good=()=>({iss:'https://token.actions.githubusercontent.com',aud:OIDC_AUDIENCE,repository:REPO,ref:BRANCH,
workflow_ref:REPO+'/.github/workflows/fact001-d1-encrypted-backup-once-lab.yml@'+BRANCH,event_name:'push',actor:'carlosjmunoz78',iat:now-40,exp:now+200});
test('signed exact-workflow claims are accepted',()=>assert.equal(assertClaims(good(),now).trusted,true));
test('other actor, event, branch, workflow, repo and audience are rejected',()=>{
 for(const [k,v] of [['actor','other'],['event_name','workflow_dispatch'],['ref','refs/heads/main'],['workflow_ref','other'],['repository','other'],['aud','other']])
 assert.throws(()=>assertClaims({...good(),[k]:v},now),/DENIED/);
});
test('stale and expired JWT claims rejected',()=>{
 assert.throws(()=>assertClaims({...good(),iat:now-901},now),/DENIED/);
 assert.throws(()=>assertClaims({...good(),exp:now-1},now),/DENIED/);
});
test('exact seal and verify LAB commands accepted',()=>{
 assert.equal(assertOrder({...SEAL_ORDER},'seal'),true);
 assert.equal(assertOrder({...VERIFY_ORDER},'verify'),true);
});
test('arbitrary provider writes and other company or PROD fail closed',()=>{
 for(const v of [{...SEAL_ORDER,environment:'PROD'},{...SEAL_ORDER,company_id:'other'},{...SEAL_ORDER,request_id:'other'},{...SEAL_ORDER,sql:'DROP TABLE'}])
 assert.throws(()=>assertOrder(v,'seal'),/DENIED/);
 assert.throws(()=>assertOrder(SEAL_ORDER,'delete'),/DENIED/);
});
test('Edge refuses unauthenticated calls before Vault and never returns plaintext',()=>{
 const s=readFileSync('cerebro/connectors/universal/supabase/d1-backup-seal-lab/index.ts','utf8');
 assert.ok(s.indexOf('await verifyGitHubOidc(bearer(req))')<s.indexOf('await vault()'));
 assert.ok(s.includes("return reply(401,{status:'UNAUTHORIZED'})"));
 assert.ok(s.includes("plaintext_returned:false")&&s.includes('plaintext.fill(0)'));
 assert.ok(!s.includes('service_role')&&!s.includes('DROP TABLE'));
});
