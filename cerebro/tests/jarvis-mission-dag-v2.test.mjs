import test from 'node:test';
import assert from 'node:assert/strict';
import {buildJarvisDag} from '../runtime/jarvis-mission-dag-v2.mjs';

const MASTER_DIR='cerebro/jarvis/mission-001/master-parts';
const MASTER_SHA='278e3754ae032ec62f763d81d097110c8b35afb99972985d9c952fd0d564e05e';

test('MISSION-JARVIS-001 builds a large PREPROD DAG from verified RC2 master',()=>{
 const dag=buildJarvisDag({masterPath:MASTER_DIR});
 assert.equal(dag.mission_id,'MISSION-JARVIS-001');
 assert.equal(dag.program_count,18);
 assert.ok(dag.master_section_count>=400);
 assert.ok(dag.task_count>=5000);
 assert.equal(dag.source_sha256,MASTER_SHA);
 assert.equal(dag.source_transport,'multipart_gzip_base64');
 assert.equal(dag.source_part_count,7);
 assert.equal(dag.source_b64_length,53461);
 assert.equal(dag.safeguards.master_integrity_verified,true);
 assert.equal(dag.safeguards.environment,'PREPROD');
 assert.equal(dag.safeguards.prod_write,false);
 assert.equal(dag.safeguards.trading,false);
 assert.equal(dag.safeguards.deepseek_temporary,true);
 assert.equal(dag.safeguards.deepseek_dependency_target,0);
 const ids=new Set(dag.units.map(u=>u.work_unit_id));
 assert.equal(ids.size,dag.units.length);
 for(const u of dag.units) for(const dep of u.dependencies||[]) assert.ok(ids.has(dep),`missing ${dep}`);
});

test('MISSION-JARVIS-001 core gate precedes all programs',()=>{
 const dag=buildJarvisDag({masterPath:MASTER_DIR});
 const gate=dag.units.find(u=>u.work_unit_id==='MISSION-JARVIS-001.CORE.GATE');
 assert.ok(gate);
 for(const p of dag.programs){
  const unit=dag.units.find(u=>u.work_unit_id===`MISSION-JARVIS-001.${p.id}`);
  assert.deepEqual(unit.dependencies,['MISSION-JARVIS-001.CORE.GATE']);
 }
});
