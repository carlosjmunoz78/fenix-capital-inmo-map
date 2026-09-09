import test from 'node:test';
import assert from 'node:assert/strict';
import { PolicyEngine, HumanExceptionEngine } from '../governance/policy.mjs';

const ctx=()=>({company_id:'co-a',engine_id:'CMD-001',environment:'PREPROD',version:'0.1.0'});
const rule=(over={})=>({rule_id:'R1',version:'1',effect:'ALLOW',priority:1,...over});

test('plain-data boundary rejects Proxy values before proxy traps execute',()=>{
  let traps=0;
  const target={action:'x'};
  const proxy=new Proxy(target,{
    getPrototypeOf(){traps++;return Object.prototype;},
    ownKeys(){traps++;return Reflect.ownKeys(target);},
    getOwnPropertyDescriptor(t,k){traps++;return Object.getOwnPropertyDescriptor(t,k);}
  });
  const p=new PolicyEngine({rules:[rule()]});
  assert.throws(()=>p.evaluate(ctx(),proxy),/proxy objects are forbidden/);
  assert.equal(traps,0);

  const ruleTarget=rule();
  const proxyRule=new Proxy(ruleTarget,{
    getPrototypeOf(){traps++;return Object.prototype;},
    ownKeys(){traps++;return Reflect.ownKeys(ruleTarget);},
    getOwnPropertyDescriptor(t,k){traps++;return Object.getOwnPropertyDescriptor(t,k);}
  });
  assert.throws(()=>new PolicyEngine({rules:[proxyRule]}),/proxy objects are forbidden/);
  assert.equal(traps,0);
});

test('highest canonical HUMAN_REQUIRED reason wins across direct and policy gates',()=>{
  const p=new PolicyEngine({rules:[rule({min_confidence_bp:9000,max_amount_eur_cents:100})]});
  const result=p.evaluate(ctx(),{action:'x',confidence_bp:8000,amount_eur_cents:101,customer_human_request:true});
  assert.equal(result.status,'HUMAN_REQUIRED');
  assert.equal(result.reason,'MONEY_LIMIT');

  const h=new HumanExceptionEngine();
  const item=h.ingest(result,{requester_company_id:'co-a',event_id:'evt-money-1'});
  assert.equal(item.priority,70);
  assert.equal(item.assigned_role,'FINANCE');
});

test('higher direct safety reason still outranks money and lower-priority reasons',()=>{
  const p=new PolicyEngine({rules:[rule({min_confidence_bp:9000,max_amount_eur_cents:100})]});
  const result=p.evaluate(ctx(),{action:'x',confidence_bp:8000,amount_eur_cents:101,high_risk:true,customer_human_request:true});
  assert.equal(result.reason,'HIGH_RISK');
});

test('tied authoritative rules apply their gates before POLICY_CONFLICT routing',()=>{
  const p=new PolicyEngine({rules:[
    rule({rule_id:'A',max_amount_eur_cents:100}),
    rule({rule_id:'B',max_amount_eur_cents:100})
  ]});
  const result=p.evaluate(ctx(),{action:'x',amount_eur_cents:101});
  assert.equal(result.status,'HUMAN_REQUIRED');
  assert.equal(result.reason,'MONEY_LIMIT');
  const h=new HumanExceptionEngine();
  const item=h.ingest(result,{requester_company_id:'co-a',event_id:'evt-tie-1'});
  assert.equal(item.priority,70);
  assert.equal(item.assigned_role,'FINANCE');
});

test('HEX deduplicates retries by stable event identity even if result changes',()=>{
  const h=new HumanExceptionEngine();
  const first=h.ingest({status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',context:ctx(),action:'transfer',policy:'p1'},{requester_company_id:'co-a',event_id:'transfer-001'});
  const retry=h.ingest({status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT',context:ctx(),action:'transfer-updated',policy:'p2'},{requester_company_id:'co-a',event_id:'transfer-001'});
  const second=h.ingest({status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT',context:ctx(),action:'transfer',policy:'p2'},{requester_company_id:'co-a',event_id:'transfer-002'});
  assert.equal(first.exception_id,retry.exception_id);
  assert.equal(retry.reason,'LOW_CONFIDENCE');
  assert.equal(retry.policy,'p1');
  assert.notEqual(first.exception_id,second.exception_id);
  assert.equal(h.list({requester_company_id:'co-a'}).length,2);
  assert.deepEqual(new Set(h.list({requester_company_id:'co-a'}).map(x=>x.event_id)),new Set(['transfer-001','transfer-002']));
});

test('HEX rejects ingestion without a stable event identity',()=>{
  const h=new HumanExceptionEngine();
  const result={status:'HUMAN_REQUIRED',reason:'HIGH_RISK',context:ctx(),action:'x',policy:null};
  assert.throws(()=>h.ingest(result,{requester_company_id:'co-a'}),/event_id/);
});
