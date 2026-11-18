import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('Cross-origin preview requests go only to local owner-verified Vercel LAB gateway',()=>{
 const access=read('src/cerebroConsoleAccess.ts'),activity=read('src/cerebroActivityApi.ts'),universe=read('src/cerebroOperativaLabUniverseApi.ts');
 for(const file of [access,activity,universe]){
  assert.match(file,/get\('visual_lab'\)==='cockpit-v3'/);
  assert.match(file,/fenix-capital-preprod-/);
  assert.match(file,/cerebro-preview-gateway/);
 }
 assert.ok(access.includes("['health','preferences','chat']"));
 assert.ok(activity.includes("'activity'")||activity.includes('resource=activity'));
 assert.ok(universe.includes('resource=universe'));
});
test('Preview server enforces owner rights and never allows confirmation actions',()=>{
 const server=read('api/cerebro-preview-gateway.ts');
 for(const text of ["verifiedPrivateGatewayHost(host,process.env.VERCEL_ENV,process.env.VERCEL_URL)","HOST.test(host)","origin&&origin!=='https://'+host",
 "identity?.actor_code!=='CARLOS-ADMIN'","METHOD_NOT_ALLOWED","RESOURCE_NOT_ALLOWED",
 "pending_action:null","read_context:null","learning_candidate:null","COMPANY_SCOPE_DENIED",
 "source==='chat'","postBody=JSON.stringify","source==='universe'"]){
  assert.ok(server.includes(text),text);
 }
 assert.ok(!server.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(!server.includes('SERVICE_ROLE'));
 assert.ok(!server.includes('console.log'));
 assert.ok(!server.includes("req.query?.url"));
 assert.ok(!server.includes('cookie'));
});
test('PROD V3 default preserves classic fallback and corrected navigation',()=>{
 const host=read('src/CerebroConsoleHost.tsx'),style=read('src/cerebro-interface-bar.css');
 assert.ok(host.includes("const showPremiumV3=(realProduction||visualPreview)&&!legacyRequested"));
 assert.ok(host.includes("params.get('operativa_legacy')==='1'"));
 assert.ok(host.includes('showPremiumV3?<CerebroOperativeCockpitV3Bridge/>'));
 assert.ok(host.includes('<CerebroOperativeConsole/>'));
 assert.ok(style.includes('.cerebro-console-host.view-operativa > .cerebro-interface-bar'));
});

test('PREVIEW preserves verified owner context when navigating among the five existing interfaces',()=>{
 const host=read('src/CerebroConsoleHost.tsx');
 assert.ok(host.includes("previewOwnerGate?'&visual_lab=cockpit-v3':''"));
 assert.ok(host.includes("SECTION_BY_VIEW[next]"));
 assert.ok(host.includes("if(previewOwnerGate&&!previewLogged)return null"));
});

test('V3 labels accurately distinguish production private canary from LAB',()=>{
 const cockpit=read('src/CerebroOperativeCockpitV3.tsx');
 assert.ok(cockpit.includes("window.location.hostname==='app.fenixcapital.es'"));
 assert.ok(cockpit.includes('V3 EN PRODUCCIÓN · VISTA PRIVADA DEL PROPIETARIO'));
 assert.ok(cockpit.includes('ENSAYO VISUAL · SIN PROMOCIÓN A PRODUCCIÓN'));
});

test('Production-config private deployment is allowed only on its exact own host',async()=>{
 const {verifiedOwnerPreviewScope}=await import('../api/cerebro-preview-owner.ts');
 const exact='fenix-capital-preprod-eptv5utjp.vercel.app';
 assert.equal(verifiedOwnerPreviewScope(exact,'production',exact),true);
 assert.equal(verifiedOwnerPreviewScope(exact,'production','fenix-capital-preprod-other.vercel.app'),false);
 assert.equal(verifiedOwnerPreviewScope('app.fenixcapital.es','production','app.fenixcapital.es'),false);
 assert.equal(verifiedOwnerPreviewScope(exact,'staging',exact),false);
 assert.equal(verifiedOwnerPreviewScope('malicious.example','preview',undefined),false);
});

test('Gateway production-config stage helper matches existing preview-owner policy',async()=>{
 const {verifiedPrivateGatewayHost}=await import('../api/cerebro-preview-gateway.ts');
 const {verifiedOwnerPreviewScope}=await import('../api/cerebro-preview-owner.ts');
 const variants=[
  ['fenix-capital-preprod-6an9j5zpv.vercel.app','production','fenix-capital-preprod-6an9j5zpv.vercel.app'],
  ['fenix-capital-preprod-6an9j5zpv.vercel.app','production','fenix-capital-preprod-old.vercel.app'],
  ['fenix-capital-preprod-6an9j5zpv.vercel.app','preview',undefined],
  ['app.fenixcapital.es','production','app.fenixcapital.es'],
  ['attacker.example','preview',undefined],
  ['fenix-capital-preprod-6an9j5zpv.vercel.app','development','fenix-capital-preprod-6an9j5zpv.vercel.app']
 ];
 for(const [host,env,unique] of variants){
  assert.equal(verifiedPrivateGatewayHost(host,env,unique),verifiedOwnerPreviewScope(host,env,unique));
 }
});
test('Exact production-config gateway executes strictly owner GET and blocks cross-origin',async()=>{
 const {default:gateway}=await import('../api/cerebro-preview-gateway.ts');
 const oldEnv=process.env.VERCEL_ENV,oldUrl=process.env.VERCEL_URL,oldFetch=globalThis.fetch;
 const host='fenix-capital-preprod-6an9j5zpv.vercel.app';
 process.env.VERCEL_ENV='production';process.env.VERCEL_URL=host;
 const request=(headers={},method='GET')=>({method,url:'/api/cerebro-preview-gateway?resource=activity',
   headers:{host,authorization:'Bearer '+'x'.repeat(60),apikey:'sb_publishable_demo',...headers}});
 const response=()=>{let status=200,body=null;return{setHeader(){},status(n){status=n;return this},json(b){body=b;return this},get state(){return{status,body}}}};
 try{
  let calls=[];
  globalThis.fetch=async url=>{
   calls.push(url);
   if(String(url).includes('fenix-app-gateway/session/context'))return {status:200,json:async()=>({context:{actor_code:'CARLOS-ADMIN'}})};
   if(String(url).includes('cerebro-console-activity-v0'))return {status:200,headers:{get:()=>null},json:async()=>({status:'OK',source:'GITHUB_ACTIONS',runs:[]})};
   throw Error('UNEXPECTED_TARGET');
  };
  const owner=response();await gateway(request(),owner);
  assert.equal(owner.state.status,200);assert.equal(owner.state.body.status,'OK');assert.equal(calls.length,2);
  const badOrigin=response();await gateway(request({origin:'https://evil.example'}),badOrigin);
  assert.equal(badOrigin.state.status,403);assert.equal(calls.length,2);
  const noToken=response();await gateway(request({authorization:''}),noToken);
  assert.equal(noToken.state.status,401);assert.equal(calls.length,2);
  const badMethod=response();await gateway(request({},'POST'),badMethod);
  assert.equal(badMethod.state.status,405);assert.equal(calls.length,2);
  globalThis.fetch=async url=>({status:200,json:async()=>({context:{actor_code:'OTHER'}})});
  const other=response();await gateway(request(),other);
  assert.equal(other.state.status,403);
  process.env.VERCEL_URL='fenix-capital-preprod-other.vercel.app';
  const wrongDeployment=response();await gateway(request(),wrongDeployment);
  assert.equal(wrongDeployment.state.status,403);
 }finally{
  globalThis.fetch=oldFetch;
  if(oldEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=oldEnv;
  if(oldUrl===undefined)delete process.env.VERCEL_URL;else process.env.VERCEL_URL=oldUrl;
 }
});
