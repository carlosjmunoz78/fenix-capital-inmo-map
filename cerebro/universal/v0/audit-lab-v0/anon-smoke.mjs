import assert from 'node:assert/strict';
// Test only the explicitly isolated PREPROD LAB audit endpoint, no owner tokens,
// no service credentials, no redirects and no user data.
const url='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-operativa-lab-audit-v0';
const response=await fetch(url,{method:'POST',redirect:'manual',
 headers:{accept:'application/json','content-type':'application/json'},
 body:JSON.stringify({action:'FACT001_DRY_RUN_AUDIT',company_id:'fenix',environment:'LAB',
  engine_id:'FACT-001',capability_id:'fact.registry.summary',version:'0.1.0-lab',
  dry_run:true,policy_decision:'DRY_RUN_VALIDATED',idempotency_key:'lab-security-negative-anon-20261113'}),
 signal:AbortSignal.timeout(12000)});
assert.ok([401,403].includes(response.status),'unexpected anonymous audit status '+response.status);
console.log(JSON.stringify({test:'PREPROD_AUDIT_ANONYMOUS_DENIED',status:response.status,
 no_auth:true,no_secrets:true,no_prod:true}));
