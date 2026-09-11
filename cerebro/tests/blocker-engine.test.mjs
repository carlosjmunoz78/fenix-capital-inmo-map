import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyBlocker} from '../operations/blocker-engine.mjs';
const context={company_id:'fenix',engine_id:'BLK-001',environment:'PREPROD',version:'0.1.0'};
test('classifies blocker with owner',()=>{const r=classifyBlocker({context,authorized:true,confidence:.95,source_refs:['case:1'],category:'BANCO',owner:'bank_team',severity:3});assert.equal(r.status,'BLOCKER_ACTIVE');assert.equal(r.next_action,'TRACK');assert.equal(r.prod_writes,false);});
test('legal severe blocker escalates',()=>{const r=classifyBlocker({context,authorized:true,confidence:.95,source_refs:['case:2'],category:'LEGAL',owner:'legal',severity:5});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'HIGH_RISK');});
test('unknown category fails closed',()=>{assert.throws(()=>classifyBlocker({context,authorized:true,confidence:.95,source_refs:['x'],category:'OTHER',owner:'x'}),/INVALID_BLOCKER_CATEGORY/);});
