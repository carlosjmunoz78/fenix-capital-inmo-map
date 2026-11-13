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
 for(const text of ["process.env.VERCEL_ENV!=='preview'","HOST.test(host)","origin&&origin!=='https://'+host",
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
