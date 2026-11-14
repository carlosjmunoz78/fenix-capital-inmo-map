import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseOwnerSessionVerifierLab} from '../governance/supabase-owner-session-verifier-lab-v0.mjs';
import {ActionGatewayV1} from '../gateway/action-gateway-v1.mjs';
import {installUniversalOwnerGatewayLab} from '../gateway/universal-excellence-owner-binding-v0.mjs';
const c={company_id:'fenix',project_ref:'cluhljgonannaafpmblx',
 expected_owner_user_id:'11111111-2222-4333-8444-555555555555',
 publishable_key:'sb_publishable_'+'a'.repeat(32)};
const token='header.'+'p'.repeat(66)+'.'+'s'.repeat(42);
const user={id:c.expected_owner_user_id,role:'authenticated',
 is_anonymous:false,email_confirmed_at:'2026-01-01T00:00:00Z'};
const good=(u=user)=>async (url,request)=>{
 assert.equal(url,'https://cluhljgonannaafpmblx.supabase.co/auth/v1/user');
 assert.equal(request.method,'GET');
 assert.equal(request.redirect,'error');
 assert.equal(request.headers.apikey,c.publishable_key);
 assert.equal(request.headers.Authorization,'Bearer '+token);
 return {ok:true,status:200,json:async()=>u};
};
test('private allowlisted owner UUID is checked through Supabase Auth user endpoint, not user metadata',async()=>{
 const verify=createSupabaseOwnerSessionVerifierLab({...c,fetchImpl:good({...user,user_metadata:{role:'GUEST'}})});
 const r=await verify({session_ref:token,company_id:'fenix',required_role:'OWNER'});
 assert.equal(r.verified,true);
 assert.equal(r.owner_id_matches_private_allowlist,true);
 assert.equal(r.user_metadata_used_for_permissions,false);
 assert.equal(r.session_revocation_independently_verified,false);
 assert.equal(JSON.stringify(r).includes(token),false);
 assert.equal(JSON.stringify(r).includes(c.expected_owner_user_id),false);
});
test('another company, spoofed user ID, anonymous/unconfirmed users, invalid JWT and failed provider fail closed',async()=>{
 const verify=createSupabaseOwnerSessionVerifierLab({...c,fetchImpl:good()});
 const cross=await verify({session_ref:token,company_id:'other',required_role:'OWNER'});
 assert.equal(cross.verified,false);
 const missing=await verify({session_ref:'bad',company_id:'fenix',required_role:'OWNER'});
 assert.equal(missing.verified,false);
 for(const u of [
  {...user,id:'99999999-2222-4333-8444-555555555555'},
  {...user,role:'anon'},
  {...user,is_anonymous:true},
  {...user,email_confirmed_at:null}
 ]){
  const v=createSupabaseOwnerSessionVerifierLab({...c,fetchImpl:good(u)});
  assert.equal((await v({session_ref:token,company_id:'fenix',required_role:'OWNER'})).verified,false);
 }
 const unauthorized=createSupabaseOwnerSessionVerifierLab({...c,
  fetchImpl:async()=>({ok:false,status:401})});
 assert.equal((await unauthorized({session_ref:token,company_id:'fenix',required_role:'OWNER'})).verified,false);
 const offline=createSupabaseOwnerSessionVerifierLab({...c,fetchImpl:async()=>{throw Error('offline')}});
 assert.equal((await offline({session_ref:token,company_id:'fenix',required_role:'OWNER'})).verified,false);
});
test('server config cannot be omitted or use privileged service key instead of publishable',()=>{
 assert.throws(()=>createSupabaseOwnerSessionVerifierLab({}),/OWNER_AUTH_PRIVATE_SERVER_CONFIG_REQUIRED/);
 assert.throws(()=>createSupabaseOwnerSessionVerifierLab({...c,publishable_key:'sb_secret_not_allowed'}),/OWNER_AUTH_PRIVATE_SERVER_CONFIG_REQUIRED/);
});
test('provider verified owner can reach ACTGW-001 proposal but cannot get APIs or PROD grants',async()=>{
 const verify=createSupabaseOwnerSessionVerifierLab({...c,fetchImpl:good()});
 const gateway=new ActionGatewayV1();
 const binding=installUniversalOwnerGatewayLab({actionGateway:gateway,verifyTrustedOwnerSession:verify});
 const out=await binding.request({session_ref:token,request_id:'owner-provider-001',request_type:'API_ACCESS',
  capability_requested:'EXTRA_EXISTING_API_ACCESS'});
 assert.equal(out.status,'ACTION_EXECUTED');
 assert.equal(out.result.owner_authority_verified_by_trusted_bootstrap,true);
 assert.equal(out.result.api_token_issued,false);
 assert.equal(out.result.prod_authorized,false);
 assert.equal(out.result.permissions_changed,false);
 assert.equal(JSON.stringify(gateway.auditLog()).includes(token),false);
});
