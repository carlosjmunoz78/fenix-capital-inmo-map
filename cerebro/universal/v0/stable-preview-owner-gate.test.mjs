import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import handler from '../../../api/cerebro-preview-owner.ts';

const ROOT='../../../';
const STABLE='fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects.vercel.app';
const OLD='fenix-capital-prep-git-326d86-carlosjmunozcabeza-2582s-projects.vercel.app';
const TOKEN='owner-session-jwt-for-stable-preview-1234567890'.repeat(11);
const KEY='public-owner-auth-key-test-value-1234567890';
const OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const req=(host=STABLE,override={})=>({
 method:'GET',headers:{host,origin:'https://'+host,authorization:'Bearer '+TOKEN,apikey:KEY},...override
});
async function invoke(input){
 const out={status:0,body:null};
 const res={setHeader(){},status(c){out.status=c;return res},json(x){out.body=x;return res}};
 await handler(input,res);
 return out;
}
test('same stable Preview hostname is recognized by UI, owner API, gateway, chat and universe without disabling owner gate',()=>{
 const files=[
 'src/CerebroConsoleHost.tsx','src/cerebroConsoleAccess.ts',
 'src/cerebroOperativaLabUniverseApi.ts','api/cerebro-preview-owner.ts',
 'api/cerebro-preview-gateway.ts','src/cerebroUniversalOperativaLabApi.ts',
 'api/cerebro-universal-preview.ts','src/CerebroOperativeCockpitV3.tsx'
 ];
 for(const path of files){
  const content=fs.readFileSync(new URL(ROOT+path,import.meta.url),'utf8');
  assert.ok(content.includes(STABLE.slice(0,-11)), 'stable host missing from '+path);
  assert.equal(content.includes(OLD.slice(0,-11)),false,'old stale hostname still authorized in '+path);
 }
 const host=fs.readFileSync(new URL(ROOT+'src/CerebroConsoleHost.tsx',import.meta.url),'utf8');
 assert.ok(host.includes("const previewOwnerGate=Boolean(isCerebroPath&&previewHost&&visualPreview)"));
 assert.ok(host.includes("fetch('/api/cerebro-preview-owner'"));
 const consoleAccess=fs.readFileSync(new URL(ROOT+'src/cerebroConsoleAccess.ts',import.meta.url),'utf8');
 assert.ok(consoleAccess.includes("'/api/cerebro-preview-gateway?resource='"));
 const app=fs.readFileSync(new URL(ROOT+'src/App.tsx',import.meta.url),'utf8');
 assert.equal(app.includes("location.pathname==='/cerebro') navigate('/inicio'"),false);
});
test('owner auth on stable preview is server-verified with existing principal, no new grants',async t=>{
 const fetchBefore=globalThis.fetch,env=process.env.VERCEL_ENV;
 t.after(()=>{globalThis.fetch=fetchBefore;process.env.VERCEL_ENV=env});
 process.env.VERCEL_ENV='preview';
 const calls=[];
 globalThis.fetch=async(url,opts)=>{
  calls.push({url,method:opts.method});
  return new Response(JSON.stringify({ok:true,context:{actor_code:'CARLOS-ADMIN'}}),{status:200});
 };
 const authorized=await invoke(req());
 assert.equal(authorized.status,200);
 assert.deepEqual(authorized.body,{allowed:true,source:'SERVER_VERIFIED_OWNER_CONTEXT'});
 assert.deepEqual(calls,[{url:OWNER,method:'GET'}]);
 assert.equal(JSON.stringify(authorized).includes(TOKEN),false);
 assert.equal(JSON.stringify(authorized).includes(KEY),false);
});
test('legacy alias, missing token, arbitrary host and production are denied before owner-network requests',async t=>{
 const fetchBefore=globalThis.fetch,env=process.env.VERCEL_ENV;
 t.after(()=>{globalThis.fetch=fetchBefore;process.env.VERCEL_ENV=env});
 let count=0;globalThis.fetch=async()=>{count++;throw Error('must not call provider')};
 process.env.VERCEL_ENV='preview';
 assert.equal((await invoke(req(OLD))).status,403);
 assert.equal((await invoke(req('app.fenixcapital.es'))).status,403);
 assert.equal((await invoke(req('not-vercel.example'))).status,403);
 assert.equal((await invoke(req(STABLE,{headers:{host:STABLE,origin:'https://evil.example',authorization:'Bearer '+TOKEN,apikey:KEY}}))).status,403);
 assert.equal((await invoke(req(STABLE,{headers:{host:STABLE,origin:'https://'+STABLE,authorization:'Bearer bad',apikey:KEY}}))).status,401);
 process.env.VERCEL_ENV='production';
 assert.equal((await invoke(req())).status,403);
 assert.equal(count,0);
});
test('server refuses non-owner even with a valid session and a trusted preview hostname',async t=>{
 const fetchBefore=globalThis.fetch,env=process.env.VERCEL_ENV;
 t.after(()=>{globalThis.fetch=fetchBefore;process.env.VERCEL_ENV=env});
 process.env.VERCEL_ENV='preview';
 globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,context:{actor_code:'OTHER'}}),{status:200});
 const blocked=await invoke(req());
 assert.equal(blocked.status,403);
 assert.equal(blocked.body.allowed,false);
});
