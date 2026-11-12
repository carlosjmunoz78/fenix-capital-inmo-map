import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const original=readFileSync(new URL('../.github/workflows/cerebro-activity-feed-v1.yml',import.meta.url),'utf8');
test('feed refreshes from scheduled and first-party workflow completion, without recursion',()=>{
 assert.ok(original.includes('cron: "3-58/5 * * * *"'));
 assert.ok(original.includes('workflow_run:'));
 assert.ok(original.includes('types: [completed]'));
 assert.ok(original.includes('cancel-in-progress: false'));
 assert.ok(original.includes('github.event.workflow_run.head_repository.full_name == github.repository'));
 assert.ok(!original.includes('      - CEREBRO Activity · Authenticated GitHub metadata feed'));
 assert.ok(original.includes('contents: write'));
 assert.ok(original.includes('actions: read'));
 assert.ok(original.includes('refs/heads/cerebro-activity-feed-v1'));
 assert.ok(original.includes('--force-with-lease='));
});
