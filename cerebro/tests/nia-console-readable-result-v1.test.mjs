import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../console/supabase/nia_console_transport.ts',import.meta.url),'utf8');
test('NIA chat result directly verifies fixed allowlisted Notion Skill GET, no AI or writes',()=>{
 assert.match(source,/NOTION_PAGE_ID='41a81b1a-756d-815a-b877-f0d264a6a0d4'/);
 assert.match(source,/NOTION_EXPECTED_TITLE='NIA · Uso responsable de Notion Business en CEREBRO'/);
 assert.match(source,/method:'GET'/);
 assert.match(source,/validNiaPage\(page\)/);
 assert.match(source,/readVerifiedNiaSkill\(notionToken\)/);
 assert.match(source,/NIA_SKILL_VERIFIED_AND_QUEUED/);
 assert.match(source,/fact_completion_verified:false/);
 assert.match(source,/notion_ai_invoked:false/);
 assert.doesNotMatch(source,/notionRoot\s*\+[^\n]*\/(?:search|databases)/);
});
test('Notion token source is existing Vault and never embedded',()=>{
 assert.match(source,/NOTION_TOKEN_NAME='cerebro_notion_service_token_v1'/);
 assert.match(source,/vault\.decrypted_secrets/);
 assert.doesNotMatch(source,/secret_[A-Za-z0-9]{20,}/);
});
