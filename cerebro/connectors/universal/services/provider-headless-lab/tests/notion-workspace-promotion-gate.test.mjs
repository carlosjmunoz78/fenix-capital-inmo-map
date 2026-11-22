import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateNotionWorkspacePromotion,NOTION_PROMOTION_REQUIRED_GATES} from '../notion-workspace-promotion-gate.mjs';
const full=()=>Object.fromEntries(NOTION_PROMOTION_REQUIRED_GATES.map(k=>[k,true]));
const sample=()=>({...full(),backup_kind:'FULL_NOTION_WORKSPACE',backup_sha256:'a'.repeat(64),
 restore_evidence_ref:'FACT001-LAB-RESTORE-20261110-ONE',multi_company_boundaries:true,trading_isolated:true,
 prod_authorized:true,inventory:{workspace_roots:3,exported_roots:3,pages:70,exported_pages:70,
 databases:7,exported_databases:7,missing_permissions:0}});
test('no evidence, empty input or scoped Wiki backup never unlocks PROD',()=>{
 for(const a of [undefined,null,{},[],{backup_kind:'SCOPED_WIKI_ONLY'}]){
  const out=evaluateNotionWorkspacePromotion(a);
  assert.equal(out.status,'BLOCKED');assert.equal(out.all_verified,false);
 }
});
test('any single missing gate remains fail closed even if other gates pass',()=>{
 for(const gate of NOTION_PROMOTION_REQUIRED_GATES){
  const value=sample();value[gate]=false;const out=evaluateNotionWorkspacePromotion(value);
  assert.equal(out.status,'BLOCKED');assert.ok(out.failed_gates.includes(gate));
 }
});
test('workspace not fully shared blocks even with valid D1 backup and tested D1 rollback',()=>{
 const a=sample();a.inventory.missing_permissions=1;
 assert.ok(evaluateNotionWorkspacePromotion(a).failed_gates.includes('INVENTORY_PARITY'));
 a.inventory.missing_permissions=0;a.inventory.exported_pages=69;
 assert.ok(evaluateNotionWorkspacePromotion(a).failed_gates.includes('INVENTORY_PARITY'));
});
test('scoped or malformed backup SHA and missing isolated recovery fail independently',()=>{
 const a=sample();a.backup_kind='FACT001_D1_LOGICAL_SQL';a.restore_evidence_ref='';
 const out=evaluateNotionWorkspacePromotion(a);
 assert.equal(out.status,'BLOCKED');assert.ok(out.failed_gates.includes('FULL_RESTORE_PROVENANCE'));
});
test('zero roots are not a completed workspace; company and trading isolation mandatory',()=>{
 const a=sample();a.inventory.workspace_roots=0;a.inventory.exported_roots=0;
 assert.ok(evaluateNotionWorkspacePromotion(a).failed_gates.includes('INVENTORY_PARITY'));
 a.inventory.workspace_roots=3;a.inventory.exported_roots=3;a.trading_isolated=false;
 assert.ok(evaluateNotionWorkspacePromotion(a).failed_gates.includes('POLICY_APPROVAL'));
});
test('even fully evidenced gate never directly deploys PROD, only permits review',()=>{
 const result=evaluateNotionWorkspacePromotion(sample());
 assert.equal(result.status,'ELIGIBLE_FOR_GRADUAL_PROMOTION_REVIEW');
 assert.equal(result.prod_deployed,false);assert.equal(result.provider_writes_performed,0);
 assert.equal(result.requires_gradual_promotion,true);
});
