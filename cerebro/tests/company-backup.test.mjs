import test from 'node:test';import assert from 'node:assert/strict';import {planCompanyBackup} from '../company/company-backup.mjs';
const base={context:{company_id:'fenix',engine_id:'COMP-BKP-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,estimated_additional_cost_eur:0};
test('COMP-BKP creates zero-cost backup/rebuild plan',()=>{const r=planCompanyBackup(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.restore_test_required,true);assert.equal(r.backup_scope.includes('restore_manifest'),true)});
test('COMP-BKP blocks cost',()=>{assert.equal(planCompanyBackup({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT')});
