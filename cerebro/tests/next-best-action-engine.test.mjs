import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseNextBestAction} from '../operations/next-best-action-engine.mjs';
const context={company_id:'fenix',engine_id:'NBA-001',environment:'PREPROD',version:'0.1.0'};
test('selects deterministic best action',()=>{const r=chooseNextBestAction({context,authorized:true,confidence:.95,source_refs:['case:1'],candidates:[{id:'a',sla_urgency:2,value:4,risk:1},{id:'b',sla_urgency:5,value:2,risk:1}]});assert.equal(r.status,'NEXT_BEST_ACTION_READY');assert.equal(r.action_id,'b');assert.equal(r.executed,false);});
test('blocked actions are excluded',()=>{const r=chooseNextBestAction({context,authorized:true,confidence:.95,source_refs:['case:2'],candidates:[{id:'a',blocked:true,sla_urgency:10,value:10},{id:'b',sla_urgency:1,value:1}]});assert.equal(r.action_id,'b');});
test('low confidence escalates',()=>{const r=chooseNextBestAction({context,authorized:true,confidence:.5,source_refs:['case:3'],candidates:[{id:'a'}]});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'LOW_CONFIDENCE');});
