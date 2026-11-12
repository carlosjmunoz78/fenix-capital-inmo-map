import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCOUNT_RESOURCE,ISSUER_V1,ISSUER_V2,REQUIRED,describeIssuer,assertMinimalIssuer,inspectIssuerV1,makeMinimalIssuerPolicy,assertChildRequest} from '../services/provider-headless-lab/cloudflare-issuer-policy.mjs';
const pids={'one':'Account API Tokens Write','two':'Billing Write','three':'Integration Write'};
const t=(name,ids)=>({name,status:'active',policies:[{effect:'allow',resources:{[ACCOUNT_RESOURCE]:'*'},permission_groups:ids.map(id=>({id}))}]});
test('legacy issuer cannot pass minimum scope gate',()=>{
 const s=describeIssuer(t(ISSUER_V1,['one','two','three']),pids);
 assert.equal(inspectIssuerV1(s).state,'BLOCKED_OVERPRIVILEGED');
 assert.throws(()=>assertMinimalIssuer(s),/ISSUER_SCOPE_NOT_MINIMAL/);
});
test('replacement requires exactly one permission group and account resource',()=>{
 const s=describeIssuer(t(ISSUER_V2,['one']),pids);assert.equal(assertMinimalIssuer(s),true);
 assert.throws(()=>assertMinimalIssuer({...s,permissions:[REQUIRED,'Billing Read']}),/ISSUER_SCOPE_NOT_MINIMAL/);
 assert.throws(()=>assertMinimalIssuer({...s,resources:['com.cloudflare.api.account.other']}),/ISSUER_SCOPE_NOT_MINIMAL/);
 assert.throws(()=>assertMinimalIssuer({...s,status:'inactive'}),/ISSUER_SCOPE_NOT_MINIMAL/);
});
test('unknown permissions fail closed',()=>{
 const s=describeIssuer(t(ISSUER_V2,['missing']),pids);
 assert.throws(()=>assertMinimalIssuer(s),/ISSUER_SCOPE_NOT_MINIMAL/);
});
test('replacement payload allows only API tokens edit',()=>{
 const group=[{name:REQUIRED,id:'5bc3f8b21c554832afc660159ab75fa4'}];
 const payload=makeMinimalIssuerPolicy(group);
 assert.deepEqual(payload.policies[0].permission_groups,[{id:group[0].id}]);
 assert.deepEqual(Object.keys(payload.policies[0].resources),[ACCOUNT_RESOURCE]);
 assert.throws(()=>makeMinimalIssuerPolicy([...group,...group]),/PERMISSION_GROUP_UNVERIFIED/);
});
test('child request requires independent signed owner and fixed 0 EUR D1 read LAB contract',()=>{
 const principal={verified:true,client_id:'cerebro',identity_ref:'iam:owner:verified-signed',environment:'LAB'};
 const order={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',source:'owner_order',
  operation:'cloudflare.token.child.readonly.create',capability:'cloudflare.d1.read',request_id:'CF-TOKEN-ISSUER-001-20261111',max_cost_eur:0};
 const d=assertChildRequest(order,principal);
 assert.equal(d.token_response_destination,'VAULT_DIRECT_ONLY');
 assert.throws(()=>assertChildRequest({...order,max_cost_eur:1},principal),/CHILD_ORDER_SCOPE_DENIED/);
 assert.throws(()=>assertChildRequest({...order,permission:'Billing Write'},principal),/CHILD_ORDER_SCOPE_DENIED/);
 assert.throws(()=>assertChildRequest(order,{...principal,verified:false}),/OWNER_SIGNATURE_REQUIRED/);
 assert.throws(()=>assertChildRequest(order,{...principal,environment:'PROD'}),/OWNER_SIGNATURE_REQUIRED/);
});
test('metadata output does not include token values',()=>{
 const s=describeIssuer({...t(ISSUER_V1,['one']),value:'TOP-SECRET'},pids);
 assert.equal(JSON.stringify(s).includes('TOP-SECRET'),false);
});
