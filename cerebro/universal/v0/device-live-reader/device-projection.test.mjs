import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectDeviceLiveSummary} from './device-projection.mjs';
const observedAt='2026-11-15T21:30:00.000Z';
const agent=(environment,lastSeen)=>({
 company_id:'fenix',environment,status:'ONLINE',last_seen_at:lastSeen,revoked_at:null});
const cmd=(id,state,environment,created,completed)=>({
 company_id:'fenix',environment,command_id:id,device_id:'private-device',
 state,created_at:created,completed_at:completed});
test('LAB time-bound real heartbeat is not an autonomous agent count',()=>{
 const result=projectDeviceLiveSummary({observedAt,agents:[
  agent('LAB','2026-11-15T21:29:00.000Z'),
  agent('LAB','2026-11-14T21:00:00.000Z'),
  agent('PREPROD','2026-11-13T10:00:00.000Z')
 ],commands:[],results:[]});
 assert.equal(result.status,'OK');
 assert.equal(result.environments[0].heartbeat_5m_count,1);
 assert.equal(result.environments[0].heartbeat_24h_count,1);
 assert.equal(result.environments[0].stored_online_count,2);
 assert.equal(result.environments[1].heartbeat_24h_count,0);
 assert.equal(result.active_agents_verified,null);
 assert.equal(result.active_subagents_verified,null);
 assert.equal(result.active_jobs_verified,null);
 assert.equal(result.contains_device_ids,false);
 assert.ok(!JSON.stringify(result).includes('private-device'));
});
test('scoped completed commands and joined semantic receipts yield real historical p50/p90',()=>{
 const commands=[
  cmd('private-command-1','COMPLETED','LAB','2026-11-15T21:20:00.000Z','2026-11-15T21:20:10.000Z'),
  cmd('private-command-2','COMPLETED','LAB','2026-11-15T21:21:00.000Z','2026-11-15T21:21:20.000Z'),
  cmd('private-command-3','FAILED','PREPROD','2026-11-15T21:22:00.000Z','2026-11-15T21:22:08.000Z')
 ];
 const results=[
  {command_id:'private-command-1',device_id:'private-device',semantic_verified:true},
  {command_id:'private-command-2',device_id:'private-device',semantic_verified:false},
  {command_id:'private-command-3',device_id:'private-device',semantic_verified:false}
 ];
 const r=projectDeviceLiveSummary({observedAt,agents:[],commands,results});
 assert.equal(r.environments[0].commands_completed,2);
 assert.equal(r.environments[0].receipt_count,2);
 assert.equal(r.environments[0].semantically_verified_receipts,1);
 assert.equal(r.environments[0].p50_completed_seconds,15);
 assert.equal(r.environments[0].p90_completed_seconds,19);
 assert.equal(r.environments[1].commands_failed,1);
 assert.equal(r.environments[1].p50_completed_seconds,null);
 assert.equal(r.cost_eur_measured,null);
 const encoded=JSON.stringify(r);
 assert.ok(!encoded.includes('private-device')&&!encoded.includes('private-command'));
});
test('stale historical ONLINE does not prove live heartbeat, missing time evidence remains null',()=>{
 const r=projectDeviceLiveSummary({observedAt,agents:[agent('LAB','2026-10-30T12:00:00Z')],
 commands:[cmd('a','COMPLETED','LAB','unknown','unknown')],results:[]});
 assert.equal(r.environments[0].heartbeat_5m_count,0);
 assert.equal(r.environments[0].heartbeat_24h_count,0);
 assert.equal(r.environments[0].p50_completed_seconds,null);
 assert.equal(r.environments[0].comparable_successful_duration_samples,0);
});
test('unauthorized tenant/env, ambiguous receipts, duplications and oversize fail closed',()=>{
 const baseline={observedAt,agents:[],commands:[],results:[]};
 for(const change of [
  {observedAt:'invalid'},
  {agents:[agent('PROD',observedAt)]},
  {agents:[{...agent('LAB',observedAt),company_id:'competitor'}]},
  {commands:[{...cmd('x','COMPLETED','LAB',observedAt,observedAt),company_id:'competitor'}]},
  {commands:[cmd('x','COMPLETED','LAB',observedAt,observedAt),cmd('x','COMPLETED','LAB',observedAt,observedAt)]},
  {results:[{command_id:'forged',device_id:'private-device',semantic_verified:true}]},
  {agents:Array(101).fill(agent('LAB',observedAt))},
  {commands:Array(401).fill(cmd('a','COMPLETED','LAB',observedAt,observedAt))}
 ])assert.equal(projectDeviceLiveSummary({...baseline,...change}),null);
});
