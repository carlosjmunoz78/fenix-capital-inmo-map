import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectOwnerGateway} from '../scripts/jarvis-cut40-owner-gateway-readonly-e2e.mjs';
import {inspectJwtFreshness} from '../scripts/jarvis-cut40-jwt-freshness.mjs';
const env={jwt:'TEST_JWT_FOR_MOCK_ONLY_AAAAAA_BBBBBBBB_CCCCCCCC',
 publishableKey:'sb_publishable_FAKE_TEST_ONLY_NOT_VALID'};

function setup({anonymousStatus=403,ownerStatus=200,unsafe=false}={}){
 const requests=[];
 const fetchImpl=async(url,opt)=>{
  requests.push({url,method:opt.method,auth:!!opt.headers.authorization});
  assert.equal(opt.method,'GET');
  assert.equal(opt.cache,'no-store');
  const segment=url.split('/').pop();
  const auth=!!opt.headers.authorization;
  if(!auth)return{status:anonymousStatus,json:async()=>({status:'FORBIDDEN'})};
  if(ownerStatus!==200)return{status:ownerStatus,json:async()=>({})};
  const data=segment==='health'
   ?{status:'ok',authenticated_transport:true,direct_model_access:false,
      prod_execution_enabled:false,live_writes:unsafe}
   :segment==='contract'
   ?{gateway_required:true,direct_model_access:false,prod_execution_enabled:false,trading_access:false}
   :{engines:['CONSOLE-001','CHAT-001','CTX-001','CMD-001','ACTGW-001'].map(engine_id=>({engine_id}))};
  return{status:200,json:async()=>data};
 };
 return {requests,fetchImpl};
}
test('CUT40 physical owner E2E mock never POSTs or calls any provider',async()=>{
 const {requests,fetchImpl}=setup();
 const result=await inspectOwnerGateway({...env,fetchImpl});
 assert.equal(result.status,'OWNER_GATEWAY_LIVE_READONLY_GREEN');
 assert.equal(result.prod_writes,false);
 assert.equal(result.provider_calls,0);
 assert.equal(result.declared_engines,5);
 assert.equal(requests.length,4);
 assert.deepEqual(requests.map(r=>r.method),['GET','GET','GET','GET']);
 assert.equal(requests[0].auth,false);
 assert.equal(requests.slice(1).every(r=>r.auth),true);
});
test('CUT40 no credentials means zero requests and a closed gate',async()=>{
 const {requests,fetchImpl}=setup();
 await assert.rejects(()=>inspectOwnerGateway({...env,jwt:'',fetchImpl}),/OWNER_JWT_NOT_AVAILABLE/);
 assert.equal(requests.length,0);
});
test('CUT40 fails if anonymous caller reaches the protected owner route',async()=>{
 const {fetchImpl}=setup({anonymousStatus:200});
 await assert.rejects(()=>inspectOwnerGateway({...env,fetchImpl}),/GATEWAY_ANON_NOT_DENIED/);
});
test('CUT40 fails if owner token is invalid or gateway is write-enabled',async()=>{
 await assert.rejects(()=>inspectOwnerGateway({...env,fetchImpl:setup({ownerStatus:401}).fetchImpl}),/GATEWAY_OWNER_HEALTH_HTTP_401/);
 await assert.rejects(()=>inspectOwnerGateway({...env,fetchImpl:setup({unsafe:true}).fetchImpl}),/UNSAFE_GATEWAY_HEALTH_CONTRACT/);
});

test('CUT40 local JWT freshness gate never needs a signature or reveals claims',()=>{
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const jwt=claims=>encode({alg:'none',typ:'JWT'})+'.'+encode(claims)+'.signature';
 const now=1793990000000;
 assert.equal(inspectJwtFreshness('',now),'MISSING');
 assert.equal(inspectJwtFreshness('not-jwt-but-long-enough-to-check-structure',now),'MALFORMED');
 assert.equal(inspectJwtFreshness(jwt({exp:1793990000-100}),now),'EXPIRED_OR_NEAR_EXPIRY');
 assert.equal(inspectJwtFreshness(jwt({exp:1793990000+120}),now),'POSSIBLY_FRESH_NOT_AUTHENTICATED');
 assert.equal(inspectJwtFreshness(jwt({exp:1793990000+1000,nbf:1793990000+300}),now),'NOT_YET_VALID');
 assert.equal(inspectJwtFreshness(jwt({other:'data'}),now),'MISSING_EXP');
});
