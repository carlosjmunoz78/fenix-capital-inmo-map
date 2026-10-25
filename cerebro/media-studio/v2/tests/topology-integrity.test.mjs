import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSourceRegistry } from '../registry/role-registry.mjs';
import { REVIEW_ROUTING, GLOBAL_GUARDIANS, buildStaticEdges, requiredGuardiansForJob } from '../runtime/topology.mjs';

test('every department has review routing',()=>{
  const d=loadSourceRegistry();
  for(const dept of d.departments){
    const route=REVIEW_ROUTING[dept.id];
    assert.ok(route,`${dept.id} missing review route`);
    assert.ok(route.supervisors.length>=1,`${dept.id} missing supervisor`);
    assert.ok(route.tribunals.length>=1,`${dept.id} missing tribunal`);
  }
});

test('all routed supervisors and tribunals exist',()=>{
  const d=loadSourceRegistry();
  const supervisors=new Set(d.supervisors.map(x=>x.id));
  const tribunals=new Set(d.tribunals.map(x=>x.id));
  for(const route of Object.values(REVIEW_ROUTING)){
    for(const id of route.supervisors) assert.ok(supervisors.has(id),`unknown supervisor ${id}`);
    for(const id of route.tribunals) assert.ok(tribunals.has(id),`unknown tribunal ${id}`);
  }
});

test('all global guardians exist',()=>{
  const d=loadSourceRegistry();
  const guardians=new Set(d.guardians.map(x=>x.id));
  for(const id of GLOBAL_GUARDIANS) assert.ok(guardians.has(id),`unknown guardian ${id}`);
});

test('static graph chains brain departments specialists review and guardians',()=>{
  const edges=buildStaticEdges();
  assert.ok(edges.some(e=>e.from==='UMS-BRAIN-001'&&e.to==='D01'&&e.type==='ORCHESTRATES'));
  assert.ok(edges.some(e=>e.from==='D11'&&e.to==='D11-A04'&&e.type==='DELEGATES'));
  assert.ok(edges.some(e=>e.from==='D11'&&e.to==='SUP-11'&&e.type==='SUPERVISED_BY'));
  assert.ok(edges.some(e=>e.from==='D11'&&e.to==='T03'&&e.type==='JUDGED_BY'));
  assert.ok(edges.some(e=>e.from==='D11'&&e.to==='GRD-04'&&e.type==='GUARDED_BY'));
});

test('voice clone jobs add voice-consent guardian',()=>{
  const g=requiredGuardiansForJob({clone_type:'VOICE_CLONE'});
  assert.ok(g.includes('GRD-03'));
  assert.ok(g.includes('GRD-04'));
});

test('digital double jobs add likeness-consent guardian',()=>{
  const g=requiredGuardiansForJob({clone_type:'DIGITAL_DOUBLE'});
  assert.ok(g.includes('GRD-02'));
  assert.ok(g.includes('GRD-04'));
});
