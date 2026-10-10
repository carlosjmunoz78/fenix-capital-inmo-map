import test from 'node:test';
import assert from 'node:assert/strict';
import {enrichDailySummary} from '../communication/enrich-daily-summary-with-qa.mjs';

const qa={
 state_type:'CEREBRO_CONTINUOUS_HUMAN_QA_STATE_V0',
 previous_quality_score:91,
 quality_score:94,
 quality_delta:3,
 new_issue_fingerprints:['n1'],
 resolved_issue_fingerprints:['r1','r2'],
 recurring_issues:1,
 targets:{APP:{status:'GREEN',executed:2,failed:0},WEB:{status:'RED',executed:2,failed:1},PRODUCT:{status:'POR_AUDITAR',executed:0,failed:0}},
 coverage:{app_authenticated:'POR_AUDITAR_PREPROD_HARNESS',products:'POR_AUDITAR_CANONICAL_PREPROD_TARGET'},
 learned_regression_tests:4,
 new_issues:[{kind:'WEB',severity:'MEDIUM',owner_engine:'WEB-001',title:'[WEB] responsive'}],
 dispatch_queue:[{fingerprint:'n1',owner_engine:'WEB-001',action:'REPRODUCE_AND_FIX_OR_ROUTE'}]
};

test('digest gets explicit quality delta, app/web/product status and routing',()=>{
 const out=enrichDailySummary({human:['base'],app_crm:[],seo_web:[],failures:[],next_safe_work:[]},qa);
 assert.match(out.human[0],/CALIDAD DIARIA · 91 → 94 · \+3/);
 assert.match(out.human[0],/1 fallos nuevos · 2 resueltos · 1 reincidentes/);
 assert.match(out.app_crm[0],/QA App: GREEN/);
 assert.ok(out.app_crm.some(x=>x.includes('QA Productos: POR AUDITAR')));
 assert.match(out.seo_web[0],/QA Web: RED/);
 assert.ok(out.failures.some(x=>x.includes('QA NUEVO')));
 assert.ok(out.next_safe_work.some(x=>x.includes('QA → WEB-001')));
});

test('missing QA state never fabricates a score',()=>{
 const out=enrichDailySummary({human:[]},null);
 assert.equal(out.human[0],'CALIDAD DIARIA · QA-001 aún sin estado verificable');
});
