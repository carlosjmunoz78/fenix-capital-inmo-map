import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const root='cerebro/connectors/universal/supabase/cf-token-issuer-lab/';
const source=readFileSync(root+'index.ts','utf8');
test('active v2 LAB verifier is read-only, no issuance/revoke or old issuer',()=>{
 assert.ok(source.includes("verifyGitHubOidc(bearer(req))"));
 assert.ok(source.includes("verify-scoped-issuer-v2"));
 assert.ok(source.includes("existingTokenWritePermissionId(groups)"));
 assert.ok(source.includes("assertScopedIssuerMetadata(hits[0],perm)"));
 assert.ok(!source.includes("ISSUER_NAME"));
 assert.ok(!source.includes("CHILD_V2_VAULT_NAME"));
 assert.ok(!/method:\s*'POST'|method:\s*'DELETE'|cloudflare\('POST'|cloudflare\('DELETE'|vault\.create_secret/.test(source));
});
test('old token test-write URLs are unreachable from active allowlist',()=>{
 assert.ok(source.includes("!['health','verify-scoped-issuer-v2'].includes(route)"));
 assert.ok(!source.includes("'v2-child-create'")&&!source.includes("'v2-child-revoke'")&&!source.includes("'issue-d1-read-lab'"));
});
