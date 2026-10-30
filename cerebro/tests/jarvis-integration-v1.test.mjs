import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {JarvisCerebroBindingV1} from '../jarvis/integration-v1/cerebro-binding-v1.mjs';

const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'jarvis-project-hub-'));
const context={request_id:'r1',company_id:'fenix',project_id:'jarvis',environment:'PREPROD',permissions:[],max_cost_eur:0};

test('binding is PREPROD-only and exposes existing Engine Registry as shared capability fabric without claiming operational state',()=>{const b=new JarvisCerebroBindingV1({project_state_dir:temp()});const c=b.contract();assert.equal(c.environment,'PREPROD');assert.equal(c.direct_model_access,false);assert.equal(c.prod_write_authorized,false);assert.equal(c.trading_access,false);assert.equal(c.capability_registry.registered_capability_count,177);assert.ok(c.capability_registry.fabric_capability_count>=178);assert.equal(c.capability_registry.operational_claim_count,0);assert.equal(c.capability_registry.rule,'REGISTERED_DOES_NOT_MEAN_OPERATIONAL');assert.ok(b.core.fabric.resolve({capability_id:'IAM-001',environment:'PREPROD',company_id:'fenix'}));assert.ok(b.core.fabric.resolve({capability_id:'ROUTE-001',environment:'PREPROD',company_id:'fenix'}));assert.ok(b.core.fabric.resolve({capability_id:'ORCH-001',environment:'PREPROD',company_id:'fenix'}));assert.throws(()=>new JarvisCerebroBindingV1({environment:'PROD',project_state_dir:temp()}),/PREPROD_ONLY/);});

test('gateway session preserves company and rejects silent cross-company switch',()=>{const b=new JarvisCerebroBindingV1({project_state_dir:temp()});b.createSession({session_id:'s1',company_id:'fenix'});assert.equal(b.inspectSession('s1').context.company_id,'fenix');assert.throws(()=>b.selectContext({session_id:'s1',company_id:'other'}),/cross-company/);});

test('existing IAM remains fail-closed and secret-free at binding layer',()=>{const b=new JarvisCerebroBindingV1({project_state_dir:temp()});const s=b.iamSummary();assert.equal(s.secret_values_registered,false);assert.equal(s.prod_authorized,false);assert.equal(s.trading_access,false);});

test('non-fenix route is explicitly PARCIAL instead of pretending multi-company operational',()=>{const b=new JarvisCerebroBindingV1({project_state_dir:temp()});const r=b.route({context:{...context,company_id:'other'},task_type:'research',available_resources:[]});assert.equal(r.status,'HOLD');assert.equal(r.implementation_state,'PARCIAL');});
