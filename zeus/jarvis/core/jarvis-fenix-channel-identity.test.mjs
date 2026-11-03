import test from 'node:test';
import assert from 'node:assert/strict';
import {FenixOwnerChannelIdentityProvider} from './jarvis-fenix-channel-identity.mjs';
const token='signed-valid-access-token';
function fixture({actor='CARLOS-ADMIN',sub='user-abc',session='session-1',companies=['fenix','aion'],ctxOk=true}={}){
  const authClient={auth:{getUser:async()=>({data:{user:{id:'user-abc',user_metadata:{role:'OWNER_ROOT'}}},error:null}),getClaims:async()=>({data:{claims:{sub,session_id:session}},error:null})}};
  const contextClient={rpc:async()=>({data:{ok:ctxOk,actor_code:actor},error:null})};
  return new FenixOwnerChannelIdentityProvider({authClient,contextClient,resolveCompanies:async()=>companies});
}
test('stable owner identity independent of channel session',async()=>{const a=await fixture().verify(token);const b=await fixture({session:'session-2'}).verify(token);assert.equal(a.ownerId,b.ownerId);assert.notEqual(a.sessionId,b.sessionId);assert.deepEqual(a.authorizedCompanies,['fenix','aion']);});
test('reject forged user_metadata role',async()=>assert.rejects(fixture({actor:'VIEWER'}).verify(token),/OWNER_ROOT_REQUIRED/));
test('reject subject mismatch, absent session and wildcard authorization',async()=>{await assert.rejects(fixture({sub:'other'}).verify(token),/AUTH_DENIED/);await assert.rejects(fixture({session:''}).verify(token),/AUTH_DENIED/);await assert.rejects(fixture({companies:['*']}).verify(token),/COMPANY_SCOPE_DENIED/);});
test('reject missing credentials and incomplete adapters',async()=>{await assert.rejects(fixture().verify(''),/AUTH_DENIED/);assert.throws(()=>new FenixOwnerChannelIdentityProvider({}),/IDENTITY_ADAPTERS_REQUIRED/);});