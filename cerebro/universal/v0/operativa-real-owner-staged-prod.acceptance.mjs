import assert from 'node:assert/strict';
const root=process.env.STAGED_PROD_URL||'';
const parsed=new URL(root);
if(parsed.protocol!=='https:'||!/^fenix-capital-preprod-[a-z0-9]+\.vercel\.app$/.test(parsed.hostname))
 throw Error('STAGED_URL_MISMATCH');
const token=process.env.CEREBRO_E2E_USER_JWT||'';
const publishableKey=process.env.PROD_SUPABASE_PUBLISHABLE_KEY||'';
const bypass=process.env.VERCEL_AUTOMATION_BYPASS_SECRET||'';
const baseHeaders={'accept':'application/json',...(bypass?{'x-vercel-protection-bypass':bypass}:{})};
async function req(method,path,auth=false){
 const headers={...baseHeaders};
 if(auth){headers.authorization='Bearer '+token;headers.apikey=publishableKey;}
 const res=await fetch(new URL(path,root),{method,headers,redirect:'manual',signal:AbortSignal.timeout(20000),cache:'no-store'});
 let data=null;try{data=await res.json()}catch{}
 return {status:res.status,reason:data?.reason||'NON_JSON_RESPONSE',data};
}
function expectResponse(label,r,status,reason){
 if(r.status!==status||r.reason!==reason)
  throw Error(label+':EXPECTED_'+status+'_'+reason+'_GOT_'+r.status+'_'+r.reason);
}
expectResponse('MUTATION_BLOCKED',await req('POST','/api/cerebro-agent-directory?company_id=fenix'),405,'READ_ONLY');
expectResponse('TENANT_BLOCKED',await req('GET','/api/cerebro-agent-directory?company_id=other'),400,'INVALID_QUERY_OR_SCOPE');
expectResponse('NO_SESSION',await req('GET','/api/cerebro-agent-directory?company_id=fenix'),401,'OWNER_SESSION_REQUIRED');
if(!token||!publishableKey)throw Error('OWNER_REAL_E2E_BLOCKED_EXISTING_JWT_OR_PUBLISHABLE_KEY_ABSENT');
const jwtParts=token.split('.');
if(jwtParts.length!==3)throw Error('OWNER_REAL_E2E_BLOCKED_JWT_FORMAT');
let claims;
try{claims=JSON.parse(Buffer.from(jwtParts[1],'base64url').toString('utf8'))}catch{throw Error('OWNER_REAL_E2E_BLOCKED_JWT_CLAIMS')}
if(typeof claims.exp!=='number'||claims.exp*1000<=Date.now()+60000)
 throw Error('OWNER_REAL_E2E_BLOCKED_JWT_EXPIRED');
const authorized=await req('GET','/api/cerebro-agent-directory?company_id=fenix&kind=ALL&limit=25',true);
if(authorized.status!==200)throw Error('OWNER_REAL_E2E_DENIED_STATUS_'+authorized.status+'_REASON_'+authorized.reason);
const data=authorized.data;
assert.equal(data.status,'OK');
assert.equal(data.company_id,'fenix');
assert.equal(data.transport,'OWNER_PROD_READONLY');
assert.equal(data.read_only,true);
assert.equal(data.executed,false);
assert.equal(data.active_agents_verified,false);
assert.equal(data.subagent_instances_verified,false);
assert.equal(data.counts.total_runtime_instances,null);
assert.equal(data.page.total,2506);
assert.equal(data.records.length,25);
assert(data.records.every(x=>x.id&&x.name&&x.purpose_plain&&Array.isArray(x.engine_ids)));
console.log('OWNER_PROD_STAGED_E2E_SUCCESS: 2506 indexed; real owner validated; illegal verbs, wrong tenancy and no session rejected; no writes.');
