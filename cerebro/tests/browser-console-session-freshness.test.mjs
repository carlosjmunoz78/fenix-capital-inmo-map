import test from 'node:test';
import assert from 'node:assert/strict';
import {isActionableBrowserSession} from '../../src/cerebroBrowserSessionFreshness.ts';

const now=Date.parse('2026-11-19T18:00:00Z');
const ago=minutes=>new Date(now-minutes*60_000).toISOString();
const baseline={state:'CONNECTING',opened_at:ago(30),updated_at:ago(30),last_heartbeat_at:null};

test('orphan CONNECTING is no longer an active UI blocker',()=>{
 assert.equal(isActionableBrowserSession(baseline,now),false);
});
test('fresh CONNECTING retains startup protection',()=>{
 assert.equal(isActionableBrowserSession({...baseline,opened_at:ago(1),updated_at:ago(1)},now),true);
});
test('fresh human control remains active',()=>{
 assert.equal(isActionableBrowserSession({...baseline,state:'HUMAN_CONTROLLED',last_heartbeat_at:ago(1)},now),true);
});
test('closed session never blocks start',()=>{
 assert.equal(isActionableBrowserSession({...baseline,state:'CLOSED',updated_at:ago(1)},now),false);
});
test('old heartbeat is not an active session',()=>{
 assert.equal(isActionableBrowserSession({...baseline,state:'CEREBRO_CONTROLLED',last_heartbeat_at:ago(17)},now),false);
});
test('invalid timestamps fail closed',()=>{
 assert.equal(isActionableBrowserSession({...baseline,updated_at:'invalid',opened_at:'invalid'},now),false);
});
