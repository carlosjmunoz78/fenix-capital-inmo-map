// Temporary one-shot issuer review. After E2E, restore strict read-only baseline tests.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const root='cerebro/connectors/universal/supabase/cf-token-issuer-lab/';
const source=readFileSync(root+'index.ts','utf8');
test('temporary LAB D1 Write issuer requires signed OIDC owner, fixed order, Vault only',()=>{
 assert.ok(source.includes("verifyGitHubOidc(bearer(req))"));
 assert.ok(source.includes("assertGatewayD1Order(await req.json())"));
 assert.ok(source.includes("gatewayD1TokenPolicy(groups)"));
 assert.ok(source.includes("vault.create_secret"));
 assert.ok(source.includes("D1_WRITER_SEALED_PENDING_VERIFICATION"));
 assert.ok(source.includes("verifyGatewayD1Writer"));
 assert.ok(source.includes("D1_WRITER_EFFECTIVE_PENDING"));
 assert.ok(source.includes("admin_denied:true"));
 assert.ok(source.includes("D1_WRITER_ISSUE_RECONCILE_REQUIRED"));
 assert.ok(source.includes("GATEWAY_D1_DB_ID"));
});
test('temporary one-shot route cannot access previous ad hoc child issuer/write API paths',()=>{
 assert.ok(source.includes("['health','verify-scoped-issuer-v2','issue-gateway-d1-writer-once','verify-gateway-d1-writer'].includes(route)"));
 for(const path of ["'v2-child-create'","'v2-child-revoke'","'issue-d1-read-lab'","'issue-scoped-issuer-v2'"])
   assert.ok(!source.includes(path),path);
 assert.ok(!source.includes("ISSUER_NAME"));
});
