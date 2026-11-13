import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('master registry exposes exactly 179 definitions, without converting design to runtime',()=>{
 const data=JSON.parse(read('cerebro/registry/engine-registry-detailed-20261113.json'));
 const base=JSON.parse(read('cerebro/registry/engine-registry.v1.json'));
 assert.equal(data.total,179);
 assert.equal(base.count,179);
 assert.deepEqual(data.engines.map(x=>x.engine_id),base.engine_ids);
 assert.equal(new Set(data.engines.map(x=>x.engine_id)).size,179);
 assert.equal(data.semantics,'HISTORICAL_DESIGN_ONLY_NOT_LIVE_STATUS');
 assert.ok(data.engines.find(x=>x.engine_id==='FACT-001')?.purpose);
 assert.ok(data.engines.find(x=>x.engine_id==='VOICE-001')?.tools);
});
test('owner-only UI separates design, binding, observable activity and gateway runtime state',()=>{
 const ui=read('src/CerebroEngineCatalog.tsx');
 const universe=read('src/CerebroOperativaUniverseViews.tsx');
 for(const label of ['Todos los motores','Con actividad observada','Registrados en Gateway','Catálogo / scaffold','Ejecución observada','Runtime sin verificar','No existe binding'])
  assert.ok(ui.includes(label),label);
 assert.ok(ui.includes("scope!=='fenix'&&scope!=='all'"));
 assert.ok(ui.includes('bindings.engines'));
 assert.ok(ui.includes('registry.engines'));
 assert.ok(ui.includes('No implica control autónomo'));
 assert.ok(universe.includes('<CerebroEngineCatalog'));
});
test('stopping voice is possible via button and escape without routing stop to the gateway',()=>{
 const hook=read('src/useCerebroOperativaChat.ts'),bridge=read('src/CerebroOperativeCockpitV3Bridge.tsx'),view=read('src/CerebroOperativeCockpitV3.tsx');
 assert.match(hook,/voiceInterruptRequested\(transcript\)/);
 assert.match(hook,/window.speechSynthesis.cancel\(\)/);
 assert.match(hook,/stopInterruptRecognition\(\)/);
 assert.match(hook,/listenForStopWhileSpeaking\(\)/);
 assert.match(hook,/toggleVoice,stopVoice/);
 assert.match(bridge,/event.key==='Escape'/);
 assert.match(bridge,/onStopVoice=\{stopAllAudio\}/);
 assert.match(view,/aria-label="Parar voz ahora"/);
 assert.match(view,/snapshot.voiceActive\|\|snapshot.voiceSpeaking\|\|ttsActive/);
 assert.match(bridge,/chat.sendText\(text\)/);
});
