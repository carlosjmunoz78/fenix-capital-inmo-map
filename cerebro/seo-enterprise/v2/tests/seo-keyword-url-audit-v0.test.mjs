import test from 'node:test';
import assert from 'node:assert/strict';
import {auditKeywordAssignments} from '../runtime/seo-keyword-url-audit-v0.mjs';
const a={company_id:'fenix',environment:'LAB',version:'0_1_0',source_kind:'LAB_FIXTURE',source_ref:'SYNTHETIC_GSC_FIXTURE_NO_LIVE_DATA',analyst_id:'SEO_D05_ANALYST',qa_actor_id:'SEO_D31_QA',rows:[
 {keyword:'hipoteca 100 Córdoba',url:'https://fenixcapital.es/hipotecas/hipoteca-100/',clicks:3,impressions:100},
 {keyword:'HIPOTECA 100 CÓRDOBA',url:'https://fenixcapital.es/hipotecas/hipoteca-100/cordoba/',clicks:2,impressions:50},
 {keyword:'hipotecas funcionarios',url:'https://fenixcapital.es/hipotecas/hipoteca-100/funcionarios/',clicks:5,impressions:80}
]};
test('D05/D08 inspect keyword-URL evidence in LAB and flag only candidates',()=>{
 const x=auditKeywordAssignments(a);assert.equal(x.report.d05_unique_keywords,2);
 assert.equal(x.report.d08_cannibalization_candidates.length,1);
 assert.equal(x.report.d08_cannibalization_candidates[0].assigned_urls.length,2);
 assert.equal(x.report.d08_cannibalization_candidates[0].not_confirmed_cannibalization,true);
 assert.equal(x.report.route_mutations_allowed,false);
 assert.equal(x.report.source_freshness_verified,false);
 assert.equal(x.report.identity_proof_verified,false);
});
test('Fénix tenant binding forbids PROD and cross-company scope',()=>{
 assert.throws(()=>auditKeywordAssignments({...a,environment:'PROD'}),/ENVIRONMENT_DENIED/);
 assert.throws(()=>auditKeywordAssignments({...a,company_id:'competitor'}),/TENANT_ADAPTER_NOT_CONFIGURED/);
 assert.throws(()=>auditKeywordAssignments({...a,qa_actor_id:a.analyst_id}),/INDEPENDENT_QA_REQUIRED/);
});
test('rejects spoofed hostname, impossible traffic and missing provenance',()=>{
 assert.throws(()=>auditKeywordAssignments({...a,rows:[{keyword:'test',url:'https://evilfenixcapital.es/',clicks:0,impressions:1}]}),/ROW_INVALID/);
 assert.throws(()=>auditKeywordAssignments({...a,rows:[{keyword:'test',url:'https://fenixcapital.es/',clicks:8,impressions:1}]}),/METRIC_CONFLICT/);
 assert.throws(()=>auditKeywordAssignments({...a,source_ref:''}),/PROVENANCE_REQUIRED/);
});
