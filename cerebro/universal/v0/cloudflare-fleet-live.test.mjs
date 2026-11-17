import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../../../api/cerebro-cloudflare-fleet.ts',import.meta.url),'utf8');
const APP='/api/cerebro-cloudflare-fleet?company_id=fenix';
const HOST='fenix-capital-preprod-qa.vercel.app';
function invokeResponse(){let status=200,body=null;return{setHeader(){},status(v){status=v;return this},json(v){body=v;return this},get(){return{status,body}}}}
const ok=x=>new Response(JSON.stringify({success:true,result:x}),{status:200,headers:{'content-type':'application/json'}});
test('Cloudflare telemetry reads only fixed GET endpoints, never mutations, secrets, scripts, or PROD',()=>{
 assert.match(source,/PREVIEW_ONLY/);
 assert.match(source,/OWNER_SESSION_REQUIRED/);
 assert.match(source,/OWNER_DENIED/);
 assert.match(source,/read_only:true,controls_enabled:false/);
 assert.match(source,/active_agent_count:null/);
 assert.match(source,/scheduled:null/);
 assert.match(source,/item\.cron=schedule\.map/);
 assert.doesNotMatch(source,/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
 assert.doesNotMatch(source,/scripts\/.+\/content\/v2|scripts\/.+\/secrets/);
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY|CLOUDFLARE_TOKEN_WRITE|CF_WORKERS_TOKEN/);
});
test('Node24 imports new fleet lambda and blocks production before any network call',async t=>{
 const prev=process.env.VERCEL_ENV,old=globalThis.fetch;
 t.after(()=>{process.env.VERCEL_ENV=prev;globalThis.fetch=old});
 process.env.VERCEL_ENV='production';let count=0;globalThis.fetch=async()=>{count++;throw Error('UNSAFE_NETWORK')};
 const {default:handler}=await import('../../../api/cerebro-cloudflare-fleet.ts');
 const res=invokeResponse();
 await handler({method:'GET',url:APP,headers:{host:HOST}},res);
 assert.equal(res.get().status,403);
 assert.equal(res.get().body.reason,'PREVIEW_ONLY');
 assert.equal(count,0);
});
test('owner allowlist, source outage and per-Worker cron partial evidence are fail closed',async t=>{
 const old={env:process.env.VERCEL_ENV,token:process.env.CEREBRO_CF_READ_TOKEN_PREVIEW,fetch:globalThis.fetch};
 t.after(()=>{process.env.VERCEL_ENV=old.env;process.env.CEREBRO_CF_READ_TOKEN_PREVIEW=old.token;globalThis.fetch=old.fetch});
 process.env.VERCEL_ENV='preview';
 process.env.CEREBRO_CF_READ_TOKEN_PREVIEW='test-read-token-inert-000000000000000000';
 const {default:handler}=await import('../../../api/cerebro-cloudflare-fleet.ts');
 const headers={host:HOST,authorization:'Bearer '+('t'.repeat(40)),apikey:'public-inert-owner-key-test'};
 const post=invokeResponse();
 await handler({method:'POST',url:APP,headers},post);
 assert.equal(post.get().status,405);
 const unsafe=invokeResponse();
 await handler({method:'GET',url:'/api/cerebro-cloudflare-fleet?company_id=other',headers},unsafe);
 assert.equal(unsafe.get().status,403);
 const calls=[];
 globalThis.fetch=async(url,opts)=>{
  const u=String(url);calls.push({url:u,method:opts?.method});
  if(u.includes('/session/context'))return new Response(JSON.stringify({context:{actor_code:'CARLOS-ADMIN'}}),{status:200});
  if(u.endsWith('/workers/scripts?per_page=100'))
   return ok([{id:'cerebro-facebook-autoqual-lab',modified_on:'2026-11-15T08:00:00Z'},
     {id:'cerebro-instagram-autoqual-lab',modified_on:'2026-11-15T09:00:00Z'}]);
  if(u.includes('facebook-autoqual-lab/schedules'))return ok([]);
  if(u.includes('instagram-autoqual-lab/schedules'))return new Response('unavailable',{status:503});
  throw Error('UNEXPECTED_NETWORK:'+u);
 };
 const res=invokeResponse();
 await handler({method:'GET',url:APP+'&refresh=1',headers},res);
 assert.equal(res.get().status,200);
 const s=res.get().body;
 assert.equal(s.status,'PARTIAL');assert.equal(s.worker_count,2);
 assert.equal(s.without_cron,1);assert.equal(s.with_cron,0);assert.equal(s.cron_unknown_count,1);
 assert.equal(s.workers.find(x=>x.id==='cerebro-instagram-autoqual-lab').cron,null);
 assert.equal(s.active_agent_count,null);assert.equal(s.controls_enabled,false);
 assert.ok(calls.every(x=>x.method==='GET'));
 assert.ok(calls.every(x=>x.url.startsWith('https://api.cloudflare.com/client/v4/accounts/e39a57e1ac42650ca5a6d5307cf0ac8e/workers/scripts')||x.url.includes('/session/context')));
});
