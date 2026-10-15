import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildObsidianPreprodBindings} from '../skills/skill-obsidian-preprod-bindings-v1.mjs';
import {judgeObsidianPreprodBindings} from '../skills/skill-obsidian-preprod-binding-judge-v1.mjs';
import {tribunalObsidianPreprodBindings} from '../skills/skill-obsidian-preprod-binding-tribunal-v1.mjs';

const surface=JSON.parse(fs.readFileSync(new URL('../human-intelligence/knowledge/knowledge-surface-map.v1.json',import.meta.url),'utf8'));
const ids=['RSH-001','KNW-001','TRN-001','TRNBOOT-001','RAG-001','PRV-001'];

test('Obsidian maps measured synthetic improvements to exactly the six relevant PREPROD engines',()=>{
  const report=buildObsidianPreprodBindings({knowledgeSurface:surface});
  assert.equal(report.status,'GREEN_PREPROD_BINDINGS_ALL_RELEVANT_ENGINES');
  assert.equal(report.binding_count,6);
  assert.deepEqual(report.bindings.map(x=>x.engine_id),ids);
  assert.ok(report.bindings.every(x=>x.environment==='PREPROD'));
  assert.ok(report.bindings.every(x=>x.measurable_non_regressing_improvement===true));
  assert.ok(report.bindings.every(x=>x.status==='PREPROD_BINDING_OLD_VS_NEW_GREEN'));
  assert.ok(report.bindings.every(x=>x.activation_authorized===false));
});

test('every Obsidian binding is reversible, idempotent-shaped and zero-authority',()=>{
  const report=buildObsidianPreprodBindings({knowledgeSurface:surface});
  for(const binding of report.bindings){
    assert.equal(binding.before_state,'DISABLED');
    assert.equal(binding.after_state,'DISABLED');
    assert.equal(binding.rollback_proven,true);
    assert.equal(binding.rebuild_default_disabled,true);
    assert.match(binding.idempotency_key,/^obsidian-preprod-binding-v1:/);
    assert.equal(binding.external_skill_code_execution,false);
    assert.equal(binding.live_obsidian_cli_execution,false);
    assert.equal(binding.filesystem_write,false);
    assert.equal(binding.canonical_knowledge_migration_authorized,false);
    assert.equal(binding.customer_data_used,false);
    assert.equal(binding.prod_authorized,false);
    assert.equal(binding.prod_write_authorized,false);
    assert.equal(binding.trading_access,false);
    assert.equal(binding.additional_cost_eur,0);
  }
  assert.equal(report.real_vault_used,false);
  assert.equal(report.notion_or_rag_migration_authorized,false);
});

test('independent judge and tribunal accept the six bindings only for further FULL buildout',()=>{
  const report=buildObsidianPreprodBindings({knowledgeSurface:surface});
  const judge=judgeObsidianPreprodBindings({report});
  assert.equal(judge.decision,'GREEN_FOR_BINDING_TRIBUNAL');
  assert.equal(judge.green,true);
  const tribunal=tribunalObsidianPreprodBindings({report,judge});
  assert.equal(tribunal.decision,'GREEN_BINDINGS_FOR_FULL_BUILDOUT');
  assert.deepEqual(tribunal.approved_binding_ids,ids);
  assert.equal(tribunal.binding_activation_authorized,false);
  assert.equal(tribunal.prod_write_authorized,false);
  assert.equal(tribunal.trading_access,false);
  assert.equal(tribunal.additional_cost_eur,0);
  assert.equal(tribunal.human_required,null);
  assert.equal(tribunal.next_gate,'CONNECT_OBSERVABILITY_AUDIT_FINOPS_LRN_AND_DURABLE_IDEMPOTENT_BINDING');
});

test('judge and tribunal fail closed when one engine binding loses measured improvement or rollback',()=>{
  const report=structuredClone(buildObsidianPreprodBindings({knowledgeSurface:surface}));
  report.bindings[0].measurable_non_regressing_improvement=false;
  report.bindings[0].rollback_proven=false;
  const judge=judgeObsidianPreprodBindings({report});
  assert.equal(judge.decision,'HOLD');
  assert.ok(judge.blockers.includes('NO_MEASURED_IMPROVEMENT:RSH-001'));
  assert.ok(judge.blockers.includes('ROLLBACK_REBUILD_NOT_GREEN:RSH-001'));
  const tribunal=tribunalObsidianPreprodBindings({report,judge});
  assert.equal(tribunal.decision,'HOLD');
  assert.equal(tribunal.binding_activation_authorized,false);
});
