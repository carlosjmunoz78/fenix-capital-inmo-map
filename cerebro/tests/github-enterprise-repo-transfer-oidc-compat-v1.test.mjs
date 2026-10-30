import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const OLD_REPO='carlosjmunoz78/fenix-capital-inmo-map';
const NEW_REPO='fenix-cerebro/fenix-capital-inmo-map';
const files=[
  'supabase/functions/cerebro-browser-dispatch-v1/index.ts',
  'supabase/functions/cerebro-browser-dispatch-v2/index.ts',
  'supabase/functions/cerebro-browser-work-total-dispatch-v1-prod/index.ts',
  'supabase/functions/cerebro-browser-work-total-v1-prod/index.ts',
];
const repoRoot=new URL('../../',import.meta.url);
const readRepoFile=(file)=>fs.readFileSync(new URL(file,repoRoot),'utf8');

for(const file of files){
  test(`${file} keeps OLD+NEW OIDC repo compatibility`,()=>{
    const source=readRepoFile(file);
    assert.match(source,new RegExp(OLD_REPO.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    assert.match(source,new RegExp(NEW_REPO.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    assert.match(source,/new Set\s*\(\s*\[/);
    assert.match(source,/const repository=String\(payload\.repository\?\?/);
    assert.match(source,/\.has\(repository\)/);
    assert.doesNotMatch(source,/payload\.repository\s*!==\s*(?:REPO|GITHUB_REPOSITORY)/);
  });
}

test('workflow_ref validation follows the repository claim rather than a fixed owner',()=>{
  for(const file of files){
    const source=readRepoFile(file);
    assert.match(source,/\$\{repository\}\//,`${file} must build workflow_ref from verified repository claim`);
  }
});
