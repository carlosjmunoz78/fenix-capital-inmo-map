import test from 'node:test';import assert from 'node:assert/strict';import {routeWork} from '../router/model-router.mjs';
test('routes deterministic work without AI',()=>{const r=routeWork({task_type:'python'});assert.equal(r.ai_required,false);assert.equal(r.target,'python')});
test('prefers free model for reasoning',()=>{const r=routeWork({task_type:'reasoning',available_free_models:['local-model']});assert.equal(r.target,'local-model');assert.equal(r.cost_target_eur,0)});
test('blocks paid AI behind money limit',()=>{assert.equal(routeWork({task_type:'research',available_free_models:[],estimated_paid_cost_eur:1}).reason,'MONEY_LIMIT')});
