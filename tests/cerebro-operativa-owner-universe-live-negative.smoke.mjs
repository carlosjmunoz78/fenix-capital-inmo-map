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
 assert.equal(opts.headers.get('access-control-allow-origin'),origin,'LAB should allow only known App origin');
 const headers=(opts.headers.get('access-control-allow-headers')||'').toLowerCase();
 assert.ok(headers.includes('authorization'),'CORS must allow Authorization header');
 assert.ok(headers.includes('apikey'),'CORS must allow apikey header');
 const r=await fetch(endpoint,{method:'GET',redirect:'manual',signal:controller.signal,
  headers:{Origin:origin,Accept:'application/json'}});
 assert.ok([401,403].includes(r.status),'Anonymous LAB Owner Universe must reject');
 const text=await r.text();
 const forbidden=['PRJ-SUPERAGENT-001','AUTHENTICATED_OWNER_CONTEXT','public_media_url',
   'cerebro_company_registry_preprod','SUPABASE_SERVICE_ROLE_KEY'];
 assert.ok(forbidden.every(x=>!text.includes(x)),'Anonymous response leaked owner detail');
 console.log(JSON.stringify({status:'LAB_ANON_DENIED_AND_APP_CORS_VERIFIED',
   preflight_status:opts.status,anon_status:r.status,app_origin_allowed:true,
   owner_data_exposed:false,positive_owner_E2E:'NOT_TESTED'}));
}finally{clearTimeout(abort)}
