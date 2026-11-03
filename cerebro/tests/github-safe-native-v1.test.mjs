import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeGitHubSafeAction,executeGitHubSafeAction} from '../runtime/github-safe-native-v1.mjs';
const base={company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',version:'1.0.0',repo:'carlosjmunoz78/fenix-capital-inmo-map'};

test('read inventory is authorized without write authority',()=>{const r=authorizeGitHubSafeAction({...base,operation:'INVENTORY'});assert.equal(r.authorized,true);assert.equal(r.requires_write,false);assert.equal(r.prod_mutation_authorized,false);});
test('branch write requires rollback',()=>{const r=authorizeGitHubSafeAction({...base,operation:'BRANCH_CREATE',target_branch:'feature/x'});assert.equal(r.authorized,false);assert.ok(r.reasons.includes('ROLLBACK_REQUIRED'));});
test('direct main commit is denied',()=>{const r=authorizeGitHubSafeAction({...base,operation:'COMMIT_FILE',target_branch:'main',rollback_ready:true});assert.equal(r.authorized,false);assert.ok(r.reasons.includes('DIRECT_MAIN_COMMIT_DENIED'));});
test('merge requires PR, green checks, exact head and rollback',()=>{const ok=authorizeGitHubSafeAction({...base,operation:'MERGE',target_branch:'main',pr_number:735,checks_green:true,expected_head_sha:'a'.repeat(40),rollback_ready:true});assert.equal(ok.authorized,true);const bad=authorizeGitHubSafeAction({...base,operation:'MERGE',target_branch:'main',pr_number:735,checks_green:false,rollback_ready:true});assert.equal(bad.authorized,false);});
test('force and bypass are forbidden',()=>{assert.throws(()=>authorizeGitHubSafeAction({...base,operation:'MERGE',target_branch:'main',force:true}),/BYPASS_FORBIDDEN/);});
test('secret material fails closed',()=>{assert.throws(()=>authorizeGitHubSafeAction({...base,operation:'PR_CREATE',rollback_ready:true,payload:{token:'ghp_abcdefghijklmnopqrstuvwxyz123456'}}),/SECRET_MATERIAL_FORBIDDEN/);});
test('idempotency key is stable',()=>{const a=authorizeGitHubSafeAction({...base,operation:'COMPARE'});const b=authorizeGitHubSafeAction({...base,operation:'COMPARE'});assert.equal(a.idempotency_key,b.idempotency_key);});
test('injected connector adapter executes only authorized action',async()=>{let calls=0;const receipt=await executeGitHubSafeAction({...base,operation:'PR_CREATE',target_branch:'feature/x',rollback_ready:true,payload:{title:'safe'}},{PR_CREATE:async()=>{calls++;return {number:999,state:'open'};}});assert.equal(calls,1);assert.equal(receipt.executed,true);assert.equal(receipt.status,'EXECUTED_PREPROD_CONTROL_PLANE');assert.equal(receipt.prod_deploy_authorized,false);});
