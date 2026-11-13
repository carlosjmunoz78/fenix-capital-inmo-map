import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const host=read('src/CerebroConsoleHost.tsx');
const bridge=read('src/CerebroOperativeCockpitV3Bridge.tsx');
const original=read('src/CerebroOperativeConsole.tsx');
const hook=read('src/useCerebroOperativaChat.ts');
const css=read('src/cerebro-interface-bar.css');
const cockpit=read('src/CerebroOperativeCockpitV3.tsx');
test('V3 is opt-in and old owner chat stays default',()=>{
 assert.ok(host.includes("get('visual_lab')==='cockpit-v3'"));
 assert.ok(host.includes('visualPreview?<CerebroOperativeCockpitV3Bridge/>:<CerebroOperativeConsole/>'));
 assert.ok(original.includes('Conversación con CEREBRO'));
 assert.ok(css.includes('.cerebro-console-host.view-operativa > .cerebro-interface-bar'));
});
test('V3 uses one canonical chat and voice implementation',()=>{
 assert.ok(bridge.includes('useCerebroOperativaChat()'));
 assert.ok(hook.includes('postCerebroConsoleChat'));
 assert.ok(hook.includes('voiceNeedsManualConfirmation'));
 assert.ok(bridge.includes('chat.sendText(text)'));
 assert.ok(bridge.includes('chat.toggleVoice()'));
 assert.ok(bridge.includes('chatLines={isOwnerCompany?chat.lines:[]}'));
 assert.ok(!bridge.includes('<CerebroConsoleShell/>'));
 assert.ok(!bridge.includes('querySelector'));
 assert.ok(!bridge.includes('localStorage'));
 assert.ok(!bridge.includes('SUPABASE_SERVICE_ROLE_KEY'));
});
test('V3 can never grant tenant rights or hide missing data',()=>{
 assert.ok(bridge.includes("const isOwnerCompany=company==='fenix'"));
 assert.ok(bridge.includes('scopeCanExecute={isOwnerCompany}'));
 assert.ok(bridge.includes("run.company_id==='fenix'"));
 assert.ok(cockpit.includes('Sin fases internas verificadas')||cockpit.includes('fases internas no verificadas'));
 const adapter=read('src/cerebroOperativaLabUniverseApi.ts');
 assert.ok(adapter.includes("raw.live_writes!==false"));
 assert.ok(adapter.includes("raw.prod_execution_enabled!==false"));
 assert.ok(adapter.includes("method:'GET'"));
});

test('isolated preview validates canonical owner server-side and never grants access by client metadata',()=>{
 const host=read('src/CerebroConsoleHost.tsx');
 const api=read('api/cerebro-preview-owner.ts');
 assert.ok(host.includes('previewOwnerGate'));
 assert.ok(host.includes("fetch('/api/cerebro-preview-owner'"));
 assert.ok(api.includes("process.env.VERCEL_ENV!=='preview'"));
 assert.ok(api.includes("ctx.actor_code!=='CARLOS-ADMIN'"));
 assert.ok(api.includes("req.method!=='GET'"));
 assert.ok(!api.includes('service_role'));
 assert.ok(!api.includes('SERVICE_ROLE_KEY'));
});
