/**
 * Auth boundary smoke against existing *LAB ONLY* Gateway.
 * Tests browser CORS and denial of unauthenticated callers.
 * Do NOT use any secret, JWT, auth key, or data mutation.
 * Successful DENIAL is the goal, not a shortcut around owner login.
 */
import assert from 'node:assert/strict';
const endpoint='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v36-followups-lab/owner-universe?company_id=fenix';
const origin='https://app.fenixcapital.es';
const controller=new AbortController();
const abort=setTimeout(()=>controller.abort(),18000);
try{
 const opts=await fetch(endpoint,{method:'OPTIONS',signal:controller.signal,redirect:'manual',
  headers:{Origin:origin,'Access-Control-Request-Method':'GET',
   'Access-Control-Request-Headers':'authorization,apikey'}});
 assert.equal(opts.status,204,'Browser preflight to LAB must be 204');
 const corsOrigin=opts.headers.get('access-control-allow-origin');
 assert.ok(corsOrigin===origin||corsOrigin==='*','App origin must pass preflight');
 const credentials=opts.headers.get('access-control-allow-credentials');
 // Supabase platform may handle preflight before the function allowlist and
 // return '*'. This is acceptable only if credentialed cookies are NOT allowed;
 // bearer authorization must be revalidated on every actual request.
 if(corsOrigin==='*')assert.notEqual(credentials,'true','Wildcard CORS must not allow cookies');

 const headers=(opts.headers.get('access-control-allow-headers')||'').toLowerCase();
 assert.ok(headers.includes('authorization'),'CORS must allow Authorization header');
 assert.ok(headers.includes('apikey'),'CORS must allow apikey header');
 const r=await fetch(endpoint,{method:'GET',redirect:'manual',signal:controller.signal,
  headers:{Origin:origin,Accept:'application/json'}});
 assert.ok([401,403].includes(r.status),'Anonymous LAB Owner Universe must reject');
 const text=await r.text();
 const forged=await fetch(endpoint,{method:'GET',redirect:'manual',signal:controller.signal,
  headers:{Origin:origin,Accept:'application/json',Authorization:'Bearer qa-invalid-not-a-jwt'}});
 assert.ok([401,403].includes(forged.status),'A forged authorization header must not access owner LAB');
 const forgedText=await forged.text();
 assert.ok(!forgedText.includes('PRJ-SUPERAGENT-001')&&!forgedText.includes('AUTHENTICATED_OWNER_CONTEXT'),
   'Invalid token revealed owner details');
 const forbidden=['PRJ-SUPERAGENT-001','AUTHENTICATED_OWNER_CONTEXT','public_media_url',
   'cerebro_company_registry_preprod','SUPABASE_SERVICE_ROLE_KEY'];
 assert.ok(forbidden.every(x=>!text.includes(x)),'Anonymous response leaked owner detail');
 console.log(JSON.stringify({status:'LAB_ANON_DENIED_AND_APP_CORS_VERIFIED',
   preflight_status:opts.status,anon_status:r.status,forged_status:forged.status,app_origin_allowed:true,cors_origin: corsOrigin==='*'?'WILDCARD_PLATFORM_PREFLIGHT':'EXACT_APP_ORIGIN',
   cookie_credentials_allowed:credentials==='true',owner_data_exposed:false,positive_owner_E2E:'NOT_TESTED'}));
}finally{clearTimeout(abort)}
