import test from 'node:test';
import assert from 'node:assert/strict';
import {materializeProdSpecialistDepthMatrix,prodSpecialistDepthSummary} from '../knowledge/prod-specialist-depth-matrix-v1.mjs';

test('192 specialists receive all 12 deep knowledge sections',()=>{
  const matrix=materializeProdSpecialistDepthMatrix();
  assert.equal(matrix.specialists,192);
  assert.equal(matrix.sections_per_specialist,12);
  assert.equal(matrix.total_cells,2304);
  assert.equal(new Set(matrix.cells.map(x=>x.cell_id)).size,2304);
  const byRole=new Map();for(const cell of matrix.cells)byRole.set(cell.role_id,(byRole.get(cell.role_id)??0)+1);
  assert.equal(byRole.size,192);
  assert.ok([...byRole.values()].every(x=>x===12));
});

test('all knowledge cells remain governed and zero-cost',()=>{
  const matrix=materializeProdSpecialistDepthMatrix();
  assert.equal(matrix.prod_knowledge_active,true);
  assert.equal(matrix.prod_execution_authorized,false);
  assert.equal(matrix.knowledge_auto_promotion,false);
  assert.equal(matrix.additional_cost_eur,0);
  for(const cell of matrix.cells){
    assert.equal(cell.auto_promote,false);
    assert.equal(cell.prod_write_authorized,false);
    assert.equal(cell.tool_execution_authorized,false);
    assert.equal(cell.spend_authorized,false);
    assert.equal(cell.additional_cost_eur,0);
    assert.ok(cell.required_pipeline.includes('OLD_vs_NEW'));
    assert.ok(cell.required_pipeline.includes('tribunal'));
  }
});

test('every role has standards workflows research rights failures quality compute interoperability and future watch',()=>{
  const matrix=materializeProdSpecialistDepthMatrix();
  const required=new Set(matrix.sections);
  for(const roleId of new Set(matrix.cells.map(x=>x.role_id))){
    const sections=new Set(matrix.cells.filter(x=>x.role_id===roleId).map(x=>x.section));
    assert.deepEqual(sections,required);
  }
});

test('matrix creates active research instead of false mastery',()=>{
  const summary=prodSpecialistDepthSummary();
  assert.equal(summary.specialists,192);
  assert.equal(summary.total_cells,2304);
  assert.equal(summary.mastery_cells,0);
  assert.ok(summary.cells_with_evidence>0);
  assert.equal(summary.cells_with_active_queries,2304);
  assert.equal(summary.additional_cost_eur,0);
});
