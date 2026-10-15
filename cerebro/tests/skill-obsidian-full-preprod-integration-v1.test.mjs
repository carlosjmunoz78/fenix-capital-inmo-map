import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runObsidianFullPreprodIntegration,ObsidianBindingReceiptStoreV1} from '../skills/skill-obsidian-full-preprod-integration-v1.mjs';
import {buildObsidianPreprodBindings} from '../skills/skill-obsidian-preprod-bindings-v1.mjs';

const surface=()=>JSON.parse(fs.readFileSync(new URL('../human-intelligence/knowledge/knowledge-surface-map.v1.json',import.meta.url),'utf8'));
const registry=()=>JSON.parse(fs.readFileSync(new URL('../registry/skill-full-adoption-v1.json',import.meta.url),'utf8'));
const ids=['RSH-001','KNW-001','TRN-001','TRNBOOT-001','RAG-001','PRV-001'];

function tempRoot(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-obsidian-full-test-'));}

test('Obsidian FULL PREPROD reuses durable observability audit finops and LRN buses for all six bindings',()=>{
  const root=tempRoot();
  try{
    const report=runObsidianFullPreprodIntegration({rootDir:root,knowledgeSurface:surface(),adoptionRegistry:registry()});
    assert.equal(report.status,'PREPROD_INTEGRATION_COMPLETE');
    assert.deepEqual(report.target_engine_bindings,ids);
    assert.equal(report.binding_count,6);
    assert.equal(report.binding_judge_decision,'GREEN_FOR_BINDING_TRIBUNAL');
    assert.equal(report.binding_tribunal_decision,'GREEN_BINDINGS_FOR_FULL_BUILDOUT');
    assert.equal(report.durable_binding_receipts.first_persisted,6);
    assert.equal(report.durable_binding_receipts.replay_duplicates,6);
    assert.equal(report.durable_binding_receipts.operation_count,6);
    assert.equal(report.durable_binding_receipts.idempotency_proven,true);
    assert.ok(report.observability_records>=12);
    assert.ok(report.audit_records>=12);
    assert.ok(report.finops_records>=12);
    assert.equal(report.audit_chain_valid,true);
    assert.equal(report.measured_additional_cost_eur,0);
    assert.equal(report.lrn001_feedback.first_status,'GREEN_PERSISTENT_PREPROD_LEARNING');
    assert.equal(report.lrn001_feedback.first_persisted,6);
    assert.equal(report.lrn001_feedback.replay_persisted,0);
    assert.equal(report.lrn001_feedback.replay_duplicates,6);
    assert.equal(report.lrn001_feedback.held_total,0);
    assert.deepEqual(report.lrn001_feedback.human_required,[]);
    assert.equal(report.lrn001_feedback.idempotency_proven,true);
    assert.equal(report.lrn001_feedback.supabase_required,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Obsidian FULL PREPROD remains shadow-only and does not replace canonical knowledge or gain authority',()=>{
  const root=tempRoot();
  try{
    const report=runObsidianFullPreprodIntegration({rootDir:root,knowledgeSurface:surface(),adoptionRegistry:registry()});
    assert.equal(report.final_binding_state,'DISABLED');
    assert.equal(report.binding_activation_authorized,false);
    assert.equal(report.rollback_proven,true);
    assert.equal(report.rebuild_default_disabled,true);
    assert.equal(report.canonical_knowledge_replaced,false);
    assert.equal(report.notion_or_rag_migration_authorized,false);
    assert.equal(report.real_vault_used,false);
    assert.equal(report.filesystem_write,false);
    assert.equal(report.external_skill_code_execution,false);
    assert.equal(report.live_obsidian_cli_execution,false);
    assert.equal(report.customer_data_used,false);
    assert.equal(report.prod_data_used,false);
    assert.equal(report.prod_authorized,false);
    assert.equal(report.prod_write_authorized,false);
    assert.equal(report.trading_access,false);
    assert.equal(report.paid_fallback,false);
    assert.equal(report.permission_expansion,false);
    assert.equal(report.autonomous_prod_promotion,false);
    assert.equal(report.additional_cost_eur,0);
    assert.equal(report.human_required,null);
    assert.equal(report.next_gate,'VALIDATE_FULL_SAFE_PREPROD_CLOSURE');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Obsidian durable binding receipts fail closed on same-key evidence drift',()=>{
  const root=tempRoot();
  try{
    const report=buildObsidianPreprodBindings({knowledgeSurface:surface()});
    const store=new ObsidianBindingReceiptStoreV1({file_path:path.join(root,'receipts.v8')});
    const first=report.bindings[0];
    assert.equal(store.append(first).accepted,true);
    assert.equal(store.append(first).duplicate,true);
    const drifted=structuredClone(first);
    drifted.evidence[0].delta=999;
    assert.throws(()=>store.append(drifted),/OBSIDIAN_BINDING_RECEIPT_CONFLICT/);
    const reopened=new ObsidianBindingReceiptStoreV1({file_path:path.join(root,'receipts.v8')});
    assert.equal(reopened.operation_count,1);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
