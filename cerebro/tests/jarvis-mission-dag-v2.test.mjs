import test from 'node:test';
import assert from 'node:assert/strict';
import {buildJarvisDag} from '../runtime/jarvis-mission-dag-v2.mjs';

test('MISSION-JARVIS-001 builds a large PREPROD DAG from RC2 master',()=>{
 const dag=buildJarvisDag({masterPath:'cerebro/jarvis/mission-001/JARVIS_MASTER_V1_RC2_2026-10-30.md.gz.b64'});
 assert.equal(dag.mission_id,'MISSION-JARVIS-001');
 assert.equal(dag.program_count,18);
 assert.ok(dag.master_section_count>=400);
 assert.ok(dag.task_count>=5000);
 assert.equal(dag.safeguards.environment,'PREPROD');
 assert.equal(dag.safeguards.prod_write,false);
 assert.equal(dag.safeguards.trading,false);
 assert.equal(dag.safeguards.deepseek_temporary,true);
 assert.equal(dag.safeguards.deepseek_dependency_target,0);
 const ids=new Set(dag.units.map(u=>u.work_unit_id));
 assert.equal(ids.size,dag.units.length);
 for(const u of dag.units) for(const dep of u.dependencies||[]) assert.ok(ids.has(dep),`missing ${dep}`);
});
