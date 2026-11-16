import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('./preview-immutable-candidate-anon-smoke.mjs',import.meta.url),'utf8');
test('reference candidate is pinned to immutable preprod hostname and cannot target a production domain',()=>{
 assert.match(script,/const HOST='fenix-capital-preprod-hyr2rrwvi\\.vercel\\.app'/);
 assert.match(script,/assert\.equal\(value,ROOT/);
 assert.match(script,/redirect:'manual'/);
 assert.match(script,/new Set\(\[301,302,303,307,308,401,403\]\)/);
 assert.doesNotMatch(script,/app\.fenixcapital\.es|cluhljgonannaafpmblx\.supabase\.co/);
});
test('candidate HTTP security smoke has no credentials and cannot dispatch a valid command',()=>{
 assert.match(script,/company_id=otraempresa/);
 assert.match(script,/body:'\{\}'/);
 assert.doesNotMatch(script,/authorization:|apikey:|cookie:|service_role|x-vercel-protection-bypass/);
 assert.match(script,/OWNER_REVOKED_SESSION_E2E=PENDING/);
});
