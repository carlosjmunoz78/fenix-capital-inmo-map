import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectYMYLStaging} from '../runtime/seo-ymyl-claims-audit-v0.mjs';
const head='<html><head><title>Fénix Capital</title><meta name="robots" content="noindex"></head><body><h1>Fénix Capital</h1>';
test('D16 flags verifiable mortgage claims without asserting wrongdoing or publishing',()=>{
 const html=head+'<p>Hipoteca 100% con preestudio en 24 horas. Garantizamos tu hipoteca. Interés 3,5% TAE.</p></body></html>';
 const r=inspectYMYLStaging({html,status:200});
 assert.ok(r.claims_detected>=4,JSON.stringify(r.risk_codes));
 for(const k of ['LTV_100_PERCENT','SERVICE_SLA_24H','APPROVAL_GUARANTEE','RATE_CLAIM'])assert.ok(r.risk_codes.includes(k),k);
 assert.equal(r.fact_check_completed,false);
 assert.equal(r.review_required_for_pub,true);
 assert.ok(r.findings.every(x=>x.factual_verdict==='NOT_FACT_CHECKED'&&x.claim_text_not_stored));
 assert.equal(r.external_writes,0);
 assert.equal(r.prod_authorized,false);
});
test('D16 no matches is not an independent financial fact-check pass',()=>{
 const html=head+'<p>Servicios hipotecarios en Córdoba</p></body></html>';
 const r=inspectYMYLStaging({html,status:200});
 assert.equal(r.claims_detected,0);
 assert.equal(r.fact_check_completed,false);
 assert.equal(r.ready,false);
});
test('D16 denies indexable or off-host page and HTTP errors',()=>{
 const html=head+'</body></html>';
 assert.throws(()=>inspectYMYLStaging({html:html.replace('noindex','index'),status:200}),/YMYL_PUBLIC_STAGING_ONLY/);
 assert.throws(()=>inspectYMYLStaging({html,status:403}),/YMYL_PUBLIC_STAGING_ONLY/);
 assert.throws(()=>inspectYMYLStaging({html,status:200,url:'https://fenixcapital.es/'}),/STAGING_URL_NOT_ALLOWLISTED/);
});
