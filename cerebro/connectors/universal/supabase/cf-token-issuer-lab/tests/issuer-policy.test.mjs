import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCOUNT_ID,SCOPE,TOKEN_OP,TOKEN_REQUEST_ID,CHILD_NAME,CHILD_EXPIRY,REPO,BRANCH,OIDC_AUDIENCE,WORKFLOW_REF,assertIssueOrder,d1ReadGroup,childPolicy,assertClaims,verifyGitHubOidc} from '../policy.mjs';
const body={...SCOPE,account_id:ACCOUNT_ID,client_id:'cerebro',operation:TOKEN_OP,request_id:TOKEN_REQUEST_ID};
const claim={iss:'https://token.actions.githubusercontent.com',aud:OIDC_AUDIENCE,repository:REPO,ref:BRANCH,workflow_ref:WORKFLOW_REF,event_name:'push',actor:'carlosjmunoz78',iat:1000,exp:1300};
test('4D approved operation',()=>assert.equal(assertIssueOrder(body),true));
test('no cross tenant',()=>assert.throws(()=>assertIssueOrder({...body,company_id:'other'})));
test('no cross account',()=>assert.throws(()=>assertIssueOrder({...body,account_id:'another'})));
test('no client substitution',()=>assert.throws(()=>assertIssueOrder({...body,client_id:'chatgpt'})));
test('no arbitrary operation',()=>assert.throws(()=>assertIssueOrder({...body,operation:'cloudflare.dns.edit'})));
test('no extra request parameters',()=>assert.throws(()=>assertIssueOrder({...body,api_token:'bad'})));
test('D1 Read selectable exact',()=>assert.equal(d1ReadGroup([{id:'a'.repeat(32),name:'D1 Read',is_selectable:true,scopes:['com.cloudflare.api.account']}]),'a'.repeat(32)));
test('D1 Read unselectable denied',()=>assert.throws(()=>d1ReadGroup([{id:'a'.repeat(32),name:'D1 Read',is_selectable:false,scopes:['com.cloudflare.api.account']}])));
test('duplicate D1 permission denied',()=>assert.throws(()=>d1ReadGroup([1,2].map(()=>({id:'a'.repeat(32),name:'D1 Read',is_selectable:true,scopes:['com.cloudflare.api.account']})))));
test('wrong permission id denied',()=>assert.throws(()=>childPolicy('!')));
test('child only D1 Read one account, finite expiry',()=>{const x=childPolicy('a'.repeat(32));assert.equal(x.name,CHILD_NAME);assert.equal(x.expires_on,CHILD_EXPIRY);assert.deepEqual(x.policies,[{effect:'allow',resources:{['com.cloudflare.api.account.'+ACCOUNT_ID]:'*'},permission_groups:[{id:'a'.repeat(32)}]}]);});
test('claims valid',()=>assertClaims(claim,1100));
test('claims expire',()=>assert.throws(()=>assertClaims(claim,1300)));
test('claims nonmatching workflow denied',()=>assert.throws(()=>assertClaims({...claim,workflow_ref:'other'},1100)));
test('claims nonmatching event denied',()=>assert.throws(()=>assertClaims({...claim,event_name:'workflow_dispatch'},1100)));
test('claims nonmatching actor denied by repo',()=>assert.throws(()=>assertClaims({...claim,repository:'attacker/repo'},1100)));
test('unsigned bearer denied',async()=>await assert.rejects(()=>verifyGitHubOidc('unsigned'),/OIDC_TOKEN_INVALID/));
test('source only LAB and exact workflow',()=>{assert.equal(SCOPE.environment,'LAB');assert.match(WORKFLOW_REF,/fact001-cf-issuer-bootstrap-lab.yml/);});

import {ISSUER_V2_NAME,ISSUER_V2_VAULT_NAME,ISSUER_V2_EXPIRY,ISSUER_V2_OP,ISSUER_V2_REQUEST_ID,
 assertIssuerV2Order,accountTokenWriteGroup,scopedIssuerPolicy,assertScopedIssuerMetadata} from '../policy.mjs';
const v2order={...SCOPE,account_id:ACCOUNT_ID,client_id:'cerebro',operation:ISSUER_V2_OP,request_id:ISSUER_V2_REQUEST_ID};
const write={id:'5bc3f8b21c554832afc660159ab75fa4',name:'Account API Tokens Write',is_selectable:true,scopes:['com.cloudflare.api.account']};
test('v2 requires fixed signed LAB issuer command',()=>{
 assert.equal(assertIssuerV2Order(v2order),true);
 assert.throws(()=>assertIssuerV2Order({...v2order,account_id:'other'}));
 assert.throws(()=>assertIssuerV2Order({...v2order,extra:'admin'}));
});
test('v2 group must be selectable account token write and unique',()=>{
 assert.equal(accountTokenWriteGroup([write]),write.id);
 assert.throws(()=>accountTokenWriteGroup([{...write,name:'Billing Write'}]));
 assert.throws(()=>accountTokenWriteGroup([write,write]));
});
test('v2 creates precisely one account scope and finite expiry',()=>{
 const body=scopedIssuerPolicy(write.id);
 assert.equal(body.name,ISSUER_V2_NAME);
 assert.equal(body.expires_on,ISSUER_V2_EXPIRY);
 assert.equal(body.policies.length,1);
 assert.deepEqual(body.policies[0].permission_groups,[{id:write.id}]);
 assert.equal(ISSUER_V2_VAULT_NAME,ISSUER_V2_NAME);
});
test('v2 metadata must deny broadened and unknown privileges',()=>{
 const body=scopedIssuerPolicy(write.id);
 const t={name:ISSUER_V2_NAME,status:'active',policies:body.policies};
 assert.equal(assertScopedIssuerMetadata(t,write.id),true);
 assert.throws(()=>assertScopedIssuerMetadata({...t,policies:[...t.policies,{effect:'allow',resources:{'*':'*'},permission_groups:[{id:'a'.repeat(32)}]}]},write.id));
 assert.throws(()=>assertScopedIssuerMetadata({...t,policies:[{...t.policies[0],permission_groups:[{id:write.id},{id:'b'.repeat(32)}]}]},write.id));
 assert.throws(()=>assertScopedIssuerMetadata({...t,status:'disabled'},write.id));
});

import {existingTokenWritePermissionId,TOKEN_WRITE_GROUP_ID,ISSUER_V2_ID} from '../policy.mjs';
test('existing issuer can prove Write even when self-delegation is not selectable',()=>{
 const present=[{id:TOKEN_WRITE_GROUP_ID,name:'Account API Tokens Write',is_selectable:false,scopes:['com.cloudflare.api.account']}];
 assert.equal(existingTokenWritePermissionId(present),TOKEN_WRITE_GROUP_ID);
 assert.equal(ISSUER_V2_ID,'86074f623bacb356c9b19c7695986c54');
 assert.throws(()=>accountTokenWriteGroup(present),/ISSUER_GROUP_NOT_SELECTABLE/);
});
test('existing scope verifier rejects spoofed groups and duplicate ids',()=>{
 const x={id:TOKEN_WRITE_GROUP_ID,name:'Account API Tokens Write',is_selectable:false,scopes:['com.cloudflare.api.account']};
 assert.throws(()=>existingTokenWritePermissionId([{...x,id:'a'.repeat(32)}]));
 assert.throws(()=>existingTokenWritePermissionId([x,x]));
 assert.throws(()=>existingTokenWritePermissionId([{...x,scopes:['com.cloudflare.api.user']}]));
});

import {CHILD_V2_NAME,CHILD_V2_VAULT_NAME,CHILD_V2_ID_VAULT_NAME,CHILD_V2_EXPIRY,
 CHILD_V2_OPERATION,CHILD_V2_REQUEST_ID,assertV2ChildOrder,childV2Policy,verifyChildV2Metadata} from '../policy.mjs';
test('v2 child E2E is a fixed 4D LAB owner order only',()=>{
 const b={...SCOPE,client_id:'cerebro',account_id:ACCOUNT_ID,operation:CHILD_V2_OPERATION,request_id:CHILD_V2_REQUEST_ID};
 assert.equal(assertV2ChildOrder(b),true);
 for(const extra of [{environment:'PROD'},{operation:'cloudflare.billing.write'},{api_token:'forbidden'},{company_id:'foreign'}])
  assert.throws(()=>assertV2ChildOrder({...b,...extra}));
});
test('v2 child only D1 read, one account, short expiry and distinct Vault names',()=>{
 const g={id:'192192df92ee43ac90f2aeeffce67e35',name:'D1 Read',is_selectable:true,scopes:['com.cloudflare.api.account']};
 const body=childV2Policy([g]);
 assert.equal(body.name,CHILD_V2_NAME);assert.equal(body.expires_on,CHILD_V2_EXPIRY);
 assert.equal(body.policies.length,1);assert.deepEqual(body.policies[0].permission_groups,[{id:g.id}]);
 assert.equal(verifyChildV2Metadata({...body,status:'active'},g.id),true);
 assert.notEqual(CHILD_V2_VAULT_NAME,CHILD_V2_ID_VAULT_NAME);
 assert.throws(()=>childV2Policy([{...g,is_selectable:false}]));
 assert.throws(()=>verifyChildV2Metadata({...body,status:'disabled'},g.id));
});

test('token broker owner-only JWT claims block collaborator and bot pushes',()=>{
 assert.throws(()=>assertClaims({...claim,actor:'external-collaborator'},1100),/OIDC_SCOPE_DENIED/);
 assert.throws(()=>assertClaims({...claim,actor:'github-actions[bot]'},1100),/OIDC_SCOPE_DENIED/);
});

import {GATEWAY_D1_ORDER,GATEWAY_D1_REQUEST,GATEWAY_D1_DB_ID,GATEWAY_D1_EXPIRY,
 assertGatewayD1Order,gatewayD1TokenPolicy,GATEWAY_D1_TOKEN_NAME} from '../policy.mjs';
test('Gateway D1 writer is issued only from exact signed 4D LAB order',()=>{
 const cmd={...SCOPE,account_id:ACCOUNT_ID,client_id:'cerebro',operation:GATEWAY_D1_ORDER,request_id:GATEWAY_D1_REQUEST};
 assert.equal(assertGatewayD1Order(cmd),true);
 for(const patch of [{environment:'PROD'},{client_id:'chatgpt'},{operation:'cloudflare.dns.write'},{api_key:'forbidden'}])
  assert.throws(()=>assertGatewayD1Order({...cmd,...patch}));
});
test('Gateway writer is account-scoped D1 Write only, expiry finite, and queue ID fixed',()=>{
 const g={id:'09b2857d1c31407795e75e3fed8617a1',name:'D1 Write',is_selectable:true,scopes:['com.cloudflare.api.account']};
 const p=gatewayD1TokenPolicy([g]);
 assert.equal(p.name,GATEWAY_D1_TOKEN_NAME);assert.equal(p.expires_on,GATEWAY_D1_EXPIRY);
 assert.equal(GATEWAY_D1_DB_ID,'1305f791-7c44-47f9-946b-f330a09c88aa');
 assert.deepEqual(p.policies[0].permission_groups,[{id:g.id}]);
 assert.throws(()=>gatewayD1TokenPolicy([{...g,is_selectable:false}]));
 assert.throws(()=>gatewayD1TokenPolicy([g,g]));
});
