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
  const item=h.ingest(result,{requester_company_id:'co-a'});
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
  const item=h.ingest(result,{requester_company_id:'co-a'});
  assert.equal(item.priority,70);
  assert.equal(item.assigned_role,'FINANCE');
});
