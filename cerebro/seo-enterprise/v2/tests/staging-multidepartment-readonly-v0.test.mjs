import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCrossDepartmentPage} from '../runtime/staging-multidepartment-readonly-v0.mjs';
const html='<html><head><title>Fénix Capital Córdoba</title><meta name="robots" content="noindex"><script type="application/ld+json">{"@type":"FAQPage","mainEntity":[]}</script></head><body><h1>Fénix Capital</h1><h2>Preguntas frecuentes Córdoba</h2><a href="/hipotecas/">Hipotecas</a><img src="/photo.webp"><img src="/logo.svg" alt=""><form method="post"></form><a href="tel:11111111">Llamar</a></body></html>';
test('8 domain probes detect bounded real-looking snapshot facts but never claim department readiness',()=>{
 const r=inspectCrossDepartmentPage({html,headers:'',status:200});
 assert.equal(r.observations.length,8);
 assert.equal(r.technical_gate,true);
 assert.equal(r.full_department_ready,false);
 assert.equal(r.external_writes,0);
 const get=id=>r.observations.find(x=>x.department_id==='SEO-'+id);
 assert.equal(get('D12').indicators.jsonld_parsed,1);
 assert.equal(get('D24').indicators.form_count,1);
 assert.equal(get('D26').indicators.missing_alt_attribute,1);
 assert.equal(get('D26').indicators.empty_alt_attribute,1);
});
test('noindex required to run read-only probes; wrong environment and 404 blocked',()=>{
 assert.throws(()=>inspectCrossDepartmentPage({html:html.replace('noindex','index'),status:200}),/STAGING_PRECHECK_FAILED/);
 assert.throws(()=>inspectCrossDepartmentPage({html,status:404}),/STAGING_PRECHECK_FAILED/);
 assert.throws(()=>inspectCrossDepartmentPage({html,status:200,url:'https://fenixcapital.es/'}),/STAGING_URL_NOT_ALLOWLISTED/);
});
