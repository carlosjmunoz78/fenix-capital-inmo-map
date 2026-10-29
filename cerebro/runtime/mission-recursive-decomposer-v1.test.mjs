import assert from 'node:assert/strict';
import { buildMissionDag, defaultMissionRoots, loadCanonicalMissionRoots, readyQueue } from './mission-recursive-decomposer-v1.mjs';

const canonical=loadCanonicalMissionRoots();
const roots=defaultMissionRoots();
const opts={environment:'PREPROD',generated_at:'1970-01-01T00:00:00.000Z'};
const a=buildMissionDag(roots,opts);
const b=buildMissionDag(roots,opts);

assert.equal(canonical.hydrated,true,'canonical 28_MACROFRENTES.md must hydrate all mission roots in normal operation');
assert.match(canonical.sha256,/^[a-f0-9]{64}$/);
assert.equal(a.mission_count,28);
assert.equal(a.hydrated_mission_count,28);
assert.equal(a.scope_hydrated,true);
assert.equal(a.canonical_source_sha256,canonical.sha256);
assert.equal(a.roots.length,28);
assert.equal(new Set(a.roots).size,28);
assert.ok(a.work_unit_count>=2000,`expected >=2000 work units; got ${a.work_unit_count}`);
assert.ok(a.atomic_count>=2000,`expected >=2000 atomic units; got ${a.atomic_count}`);
assert.equal(a.capability_work_unit_count,28*6);
assert.equal(a.graph_fingerprint,b.graph_fingerprint,'same source must create same graph fingerprint');
assert.equal(new Set(a.units.map(u=>u.work_unit_id)).size,a.work_unit_count);
assert.equal(new Set(a.units.map(u=>u.idempotency_key)).size,a.work_unit_count);
assert.ok(a.units.every(u=>u.environment==='PREPROD'));
assert.ok(a.units.every(u=>u.estimated_cost_eur===0));
assert.ok(a.units.every(u=>u.paid_ai_allowed===false));
assert.ok(a.units.every(u=>u.prod_write_allowed===false));
assert.ok(a.units.every(u=>u.trading_access===false));
assert.ok(a.units.every(u=>u.source_status==='CANONICAL_SCOPE_HYDRATED'));
assert.ok(a.units.every(u=>typeof u.mission_scope==='string'&&u.mission_scope.length>20));
assert.ok(a.units.every(u=>/^[a-f0-9]{64}$/.test(u.scope_fingerprint)));
assert.equal(roots[0].title,'Runtime compartido + JOB-001');
assert.equal(roots[0].scope_text,'Cola durable, scheduler/work pump, leases, heartbeat, retries, dead-letter, pause/resume, recovery tras caída.');
assert.equal(roots[27].title,'Seguridad, Legal, Backup/Rebuild, PROD gates y Trading aislado');
assert.match(roots[27].scope_text,/Trading LAB físicamente aislado/);
assert.equal(readyQueue(a).length,28);

const fallback=defaultMissionRoots({scope_file:'/definitely/missing/28_MACROFRENTES.md'});
assert.equal(fallback.length,28);
assert.ok(fallback.every(r=>r.source_status==='CANONICAL_REF_BOUND_SCOPE_TEXT_NOT_EMBEDDED'));
assert.ok(fallback.every(r=>r.scope_text===null));
const fallbackGraph=buildMissionDag(fallback,opts);
assert.equal(fallbackGraph.scope_hydrated,false);
assert.equal(fallbackGraph.hydrated_mission_count,0);

assert.throws(()=>buildMissionDag(roots,{environment:'PROD'}),/refuses PROD/);
assert.throws(()=>buildMissionDag(roots.slice(0,27),opts),/exactly 28/);
console.log(JSON.stringify({ok:true,mission_count:a.mission_count,hydrated_mission_count:a.hydrated_mission_count,scope_hydrated:a.scope_hydrated,canonical_source_sha256:a.canonical_source_sha256,work_unit_count:a.work_unit_count,atomic_count:a.atomic_count,capability_work_unit_count:a.capability_work_unit_count,ready_roots:readyQueue(a).length,graph_fingerprint:a.graph_fingerprint}));
