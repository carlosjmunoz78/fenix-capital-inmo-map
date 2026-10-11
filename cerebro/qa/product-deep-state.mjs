#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function arg(name,fallback=null){const i=process.argv.indexOf(name);return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;}
function readJson(file,fallback={}){if(!file||!fs.existsSync(file))return fallback;return JSON.parse(fs.readFileSync(file,'utf8'));}
function flatten(report={}){
  const out=[];
  const walk=suite=>{
    for(const spec of suite.specs??[])for(const t of spec.tests??[]){const r=(t.results??[]).at(-1)??{};out.push({title:spec.title,status:t.status??r.status??'unknown',result:r.status??t.status??'unknown'});}
    for(const child of suite.suites??[])walk(child);
  };
  for(const suite of report.suites??[])walk(suite);
  return out;
}
function failed(t){return ['unexpected','failed','timedOut','interrupted'].includes(t.status)||['failed','timedOut','interrupted'].includes(t.result);}
export function buildProductDeepState({report={},previous={},productId='AION-P001',now=new Date().toISOString()}={}){
  const tests=flatten(report).filter(t=>t.status!=='skipped');
  const failures=tests.filter(failed);
  const green=tests.length>0&&failures.length===0;
  const last={...(previous.last_verified_at??{})};
  if(green)last[productId]=now;
  const products=['AION-P001','AION-P002','AION-P003','AION-B005','AION-B008'];
  const verified=products.filter(p=>last[p]);
  const freshnessDays=7;
  const fresh=products.filter(p=>last[p]&&((Date.parse(now)-Date.parse(last[p]))<=freshnessDays*86400000));
  return {
    schema_version:'0.1.0',state_type:'CEREBRO_QA_PRODUCT_DEEP_STATE_V0',company_id:'aion',engine_id:'QA-001',environment:'PREPROD',version:'0.1.0',updated_at:now,
    status:green?'PREPROD_GREEN':'RED',current_product:productId,tests:{executed:tests.length,passed:tests.length-failures.length,failed:failures.length},
    journey:['PURCHASE_SIMULATION_ZERO_EUR','GENERATION','FULFILLMENT','TEST_MAILBOX_EMAIL','PRIVATE_RESULT','PRIVATE_ARTIFACT'],
    last_verified_at:last,products_verified:verified,products_fresh_7d:fresh,coverage:{verified_total:verified.length,fresh_7d_total:fresh.length,total:products.length,all_fresh_7d:fresh.length===products.length},
    authority:{real_charge_authorized:false,commercial_evidence:false,prod_authorized:false,prod_write_authorized:false},
    safety:{real_charge_eur:0,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0}
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const report=arg('--report'),previous=arg('--previous'),product=arg('--product'),out=arg('--out');
  if(!report||!product||!out)throw new Error('usage: product-deep-state.mjs --report <json> [--previous <json>] --product <id> --out <json>');
  const state=buildProductDeepState({report:readJson(report,{}),previous:readJson(previous,{}),productId:product});
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({status:state.status,current_product:state.current_product,tests:state.tests,coverage:state.coverage,safety:state.safety}));
  if(state.status!=='PREPROD_GREEN')process.exitCode=1;
}
