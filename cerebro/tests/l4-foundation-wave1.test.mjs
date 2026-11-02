import test from 'node:test';
import assert from 'node:assert/strict';
const IDS=['DOC-001','DOC-002','DOC-003','DOC-004','KYC-001','AML-001','COH-001','REC-001','TAS-001','PROP-001','REGP-001','CAT-001','NOT-001','PAY-001','SLA-001','BLK-001','NBA-001','AGD-001','3RD-001'];
const PARTIAL=new Set(['DOC-001','PROP-001','PAY-001','NBA-001','AGD-001']);
const file=id=>`../runtime/l4/${id.toLowerCase().replaceAll('-','')}-foundation-v1.mjs`;
const base={company_id:'fenix',principal_company_id:'fenix',environment:'PREPROD',version:'0.1.0-foundation'};

test('all 19 L4 foundation modules are executable and safe',async()=>{
  for(const id of IDS){const m=await import(file(id));assert.equal(m.manifest.engine_id,id);assert.equal(m.manifest.layer,'L4');assert.equal(m.manifest.additional_cost_eur,0);assert.equal(m.manifest.prod_writes,false);assert.equal(m.manifest.trading_access,false);assert.equal(m.manifest.network_execution,false);assert.equal(m.manifest.preserve_existing,PARTIAL.has(id));const r=m.run(base);assert.ok(['FOUNDATION_OK','HUMAN_REQUIRED'].includes(r.status));assert.equal(r.prod_write,false);assert.equal(r.cost_eur,0);}
});

test('multi-company isolation and PROD fail closed for every L4 foundation',async()=>{
  for(const id of IDS){const m=await import(file(id));assert.throws(()=>m.run({...base,principal_company_id:'other'}),/CROSS_COMPANY_DENIED/);assert.throws(()=>m.run({...base,environment:'PROD'}),/LAB or PREPROD/);}
});

test('DOC-002 computes pending documents only from caller-supplied contract',async()=>{const {run}=await import(file('DOC-002'));const r=run({...base,required_documents:['A','B'],available_documents:['B']});assert.deepEqual(r.result.pending,['A']);assert.equal(r.result.complete,false);});
test('DOC-004 escalates supplied high-risk signal without declaring fraud',async()=>{const {run}=await import(file('DOC-004'));const r=run({...base,signals:[{code:'X',severity:'HIGH'}]});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.human_required_code,'HIGH_RISK');});
test('AML-001 external regulated action is LEGAL_REQUIRED',async()=>{const {run}=await import(file('AML-001'));const r=run({...base,external_action:true});assert.equal(r.human_required_code,'LEGAL_REQUIRED');});
test('REC-001 final financial recommendation is HIGH_RISK',async()=>{const {run}=await import(file('REC-001'));const r=run({...base,request_final_recommendation:true});assert.equal(r.human_required_code,'HIGH_RISK');});
test('PAY-001 reconciles cents exactly and never executes payment',async()=>{const {run}=await import(file('PAY-001'));const r=run({...base,items:[{amount:'10.01'},{amount:'2.99'}]});assert.equal(r.result.total_cents,1300);assert.equal(r.result.execution,false);const blocked=run({...base,execute_payment:true});assert.equal(blocked.human_required_code,'HIGH_RISK');});
test('SLA-001 uses only caller-supplied timestamps',async()=>{const {run}=await import(file('SLA-001'));assert.equal(run({...base,now_ms:20,due_ms:10}).result.state,'BREACHED');});
test('AGD-001 sorts only supplied agenda items and performs no external action',async()=>{const {run}=await import(file('AGD-001'));const r=run({...base,items:[{at_ms:2,id:'b'},{at_ms:1,id:'a'}]});assert.equal(r.result.items[0].id,'a');assert.equal(r.external_execution,false);});
