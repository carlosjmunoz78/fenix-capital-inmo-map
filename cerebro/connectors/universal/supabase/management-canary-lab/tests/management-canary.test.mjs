import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../',import.meta.url);
test('operator fixed solely to synthetic slug and project',()=>{
 const p=readFileSync(new URL('index.ts',base),'utf8');
 assert.match(p,/const CANARY='cerebro-fact001-sb-mgmt-canary-lab'/);
 assert.match(p,/const PROJECT='cluhljgonannaafpmblx'/);
 assert.match(p,/function assertCommand/);
 assert.match(p,/await verifyGitHubOidc\(header.slice\(7\)\)/);
 assert.match(p,/VAULT_NAME='cerebro_supabase_management_pat_v1'/);
 assert.match(p,/SBMGT_CREATE_ALREADY_EXISTS/);
 assert.match(p,/SBMGT_CONCURRENT_OR_FOREIGN_RESOURCE/);
 assert.match(p,/SBMGT_DELETE_READBACK_DENIED/);
 assert.match(p,/verify_jwt:true/);
 assert.doesNotMatch(p,/\/database\/query|service_role|auth\/v1\/admin/);
});
test('workflow restricts actor, branch, signed OIDC and path',()=>{
 const p=readFileSync(new URL('policy.mjs',base),'utf8');
 assert.match(p,/payload.actor!=='carlosjmunoz78'/);
 assert.match(p,/payload.workflow_ref!==WORKFLOW_REF/);
 assert.match(p,/oidc/i);
 const workflow=readFileSync(new URL('../../../../../.github/workflows/fact001-supabase-mgmt-owner-lab-once.yml',base),'utf8');
 assert.match(workflow,/id-token: write/);
 assert.match(workflow,/github.actor == 'carlosjmunoz78'/);
 assert.match(workflow,/execute-once.v1.json/);
 assert.doesNotMatch(workflow,/workflow_dispatch:/);
});
