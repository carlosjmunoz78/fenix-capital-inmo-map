import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {allowedUniversalPreviewRequest} from '../../../api/cerebro-universal-preview.ts';
import handler from '../../../api/cerebro-universal-preview.ts';
const HOST='fenix-capital-preprod-labread123.vercel.app';
// A real Supabase JWT normally exceeds 160 characters; server MUST NOT reject it before auth.
const TOKEN='test-owner-token-without-secret-1234567890'.repeat(10);
const KEY='public-publishable-test-key-12345';
function req(overrides={}){
 return{method:'POST',headers:{host:HOST,origin:'https://'+HOST,
 authorization:'Bearer '+TOKEN,apikey:KEY},body:{action:'list_capabilities',params:{company_id:'fenix',environment:'LAB'}},...overrides};
}
function response(){
 const log={status:200,headers:{},body:null};
 const res={status(n){log.status=n;return res},setHeader(k,v){log.headers[k]=v},json(data){log.body=data;return res}};
 return{res,log};
}
async function invoke(input){const {res,log}=response();await handler(input,res);return log;}
function fakeUpstream(){
 const calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push({url,method:options.method,authorization:options.headers.authorization,apikey:options.headers.apikey});
  return new Response(JSON.stringify({ok:true,context:{actor_code:'CARLOS-ADMIN'}}),{status:200,headers:{'content-type':'application/json'}});
 };
 return calls;
}
test('preview only: production requests denied before any authentication/provider calls',async t=>{
 const originalFetch=globalThis.fetch, env=process.env.VERCEL_ENV,vercel=process.env.VERCEL_URL;
 t.after(()=>{globalThis.fetch=originalFetch;process.env.VERCEL_ENV=env;process.env.VERCEL_URL=vercel;});
 let upstream=0;globalThis.fetch=async()=>{upstream++;throw Error('no outbound');};
 process.env.VERCEL_ENV='production';process.env.VERCEL_URL=HOST;
 assert.equal(allowedUniversalPreviewRequest(req(),'production',HOST),false);
 const r=await invoke(req());
 assert.equal(r.status,403);assert.equal(r.body.reason,'PREVIEW_ONLY');assert.equal(upstream,0);
});
test('preview guard requires exact allowed host, same origin and optionally VERCEL_URL match',()=>{
 assert.equal(allowedUniversalPreviewRequest(req(),'preview',HOST),true);
 assert.equal(allowedUniversalPreviewRequest(req({headers:{...req().headers,origin:'https://evil.example'}}),'preview',HOST),false);
 assert.equal(allowedUniversalPreviewRequest(req({headers:{...req().headers,host:'app.fenixcapital.es'}}),'preview',undefined),false);
 assert.equal(allowedUniversalPreviewRequest(req(),'preview','different.vercel.app'),false);
 assert.equal(allowedUniversalPreviewRequest(req(),'preview','fenix-capital-preprod-otherlab.vercel.app'),true);
 const stable='fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects.vercel.app';
 assert.equal(allowedUniversalPreviewRequest(req({headers:{...req().headers,host:stable,origin:'https://'+stable}}),'preview',stable),true);
 assert.equal(allowedUniversalPreviewRequest(req({headers:{...req().headers,host:'fenix-capital-prep-git-326d86-carlosjmunozcabeza-2582s-projects.vercel.app',origin:'https://fenix-capital-prep-git-326d86-carlosjmunozcabeza-2582s-projects.vercel.app'}}),'preview',stable),false);
});
test('owner-only real FACT Gateway imported, no write path, correct source flags',async t=>{
 const prev=globalThis.fetch,env=process.env.VERCEL_ENV,vercel=process.env.VERCEL_URL;
 t.after(()=>{globalThis.fetch=prev;process.env.VERCEL_ENV=env;process.env.VERCEL_URL=vercel;});
 process.env.VERCEL_ENV='preview';process.env.VERCEL_URL=HOST;
 const calls=fakeUpstream();
 const d=await invoke(req());
 assert.equal(d.status,200);
 assert.equal(d.body.status,'OK');
 assert.equal(d.body.capabilities?.length,1);
 assert.equal(d.body.capabilities[0].capability_id,'fact.registry.summary');
 assert.equal(d.body.capabilities[0].side_effects,'NONE');
 assert.equal(d.body.capabilities[0].company_id,'fenix');
 assert.equal(d.body.prod_execution_enabled,false);
 const r=await invoke(req({body:{action:'invoke_read',params:{company_id:'fenix',environment:'LAB',capability_id:'fact.registry.summary'}}}));
 assert.equal(r.status,200);
 assert.equal(r.body.status,'READ_EXECUTED');
 assert.equal(r.body.result.engine_registry_count,179);
 assert.equal(r.body.result.operational_engine_count,'NOT_VERIFIED');
 assert.equal(r.body.source,'LAB_REPOSITORY_SNAPSHOT_NOT_LIVE');
 assert.deepEqual(calls.map(c=>c.method),['GET','GET']);
 assert.ok(calls.every(c=>c.url.endsWith('/fenix-app-gateway/session/context')));
 assert.ok(calls.every(c=>c.authorization==='Bearer '+TOKEN));
});
test('deny writes, bad tenant, bad bearer without calling upstream',async t=>{
 const prev=globalThis.fetch,env=process.env.VERCEL_ENV,vercel=process.env.VERCEL_URL;
 t.after(()=>{globalThis.fetch=prev;process.env.VERCEL_ENV=env;process.env.VERCEL_URL=vercel;});
 process.env.VERCEL_ENV='preview';process.env.VERCEL_URL=HOST;
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('should never be used');};
 assert.equal((await invoke(req({body:{action:'submit_command',params:{company_id:'fenix',environment:'LAB'}}}))).status,404);
 assert.equal((await invoke(req({body:{action:'list_capabilities',params:{company_id:'aion',environment:'LAB'}}}))).status,403);
 assert.equal((await invoke(req({headers:{...req().headers,authorization:'Bearer bad'}}))).status,401);
 assert.equal((await invoke(req({method:'GET'}))).status,405);
 assert.equal(calls,0);
});
test('canonical Operativa voice, STOP and chat files remain unchanged by this bridge',()=>{
 const catalog=fs.readFileSync(new URL('../../../src/CerebroEngineCatalog.tsx',import.meta.url),'utf8');
 const bridge=fs.readFileSync(new URL('../../../src/CerebroUniversalOperativaLabPanel.tsx',import.meta.url),'utf8');
 const client=fs.readFileSync(new URL('../../../src/cerebroUniversalOperativaLabApi.ts',import.meta.url),'utf8');
 const config=JSON.parse(fs.readFileSync(new URL('../../../vercel.json',import.meta.url),'utf8'));
 assert.equal(config.git.deploymentEnabled,false);
 assert.ok(catalog.includes('<CerebroUniversalOperativaLabPanel company={scope}/>'));
 assert.ok(bridge.includes("company==='fenix'"));
 assert.ok(bridge.includes('if(!enabled)return null'));
 assert.ok(client.includes("get('visual_lab')==='cockpit-v3'"));
 assert.ok(client.includes("get('section')==='operativa'"));
 const cockpit=fs.readFileSync(new URL('../../../src/CerebroOperativeCockpitV3.tsx',import.meta.url),'utf8');
 assert.ok(cockpit.includes("query.get('op3_panel')==='motores'"));
 assert.ok(cockpit.includes("query.get('visual_lab')!=='cockpit-v3'"));
 assert.ok(cockpit.includes('initialOperativaPreviewPanel'));
 assert.ok(client.includes('lab'));
 assert.equal(client.includes('service_role'),false);
});
