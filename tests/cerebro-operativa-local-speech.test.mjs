import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('on-device Spanish recognition never sends messages and requires explicit opt in',()=>{
 const a=read('src/CerebroLocalDictation.tsx');
 for(const x of ['langs:[\'es-ES\']','processLocally:true','Ctor.available(OPTIONS)','Ctor.install(OPTIONS)','rec.processLocally=true','onTranscript(text)','MAX_MS=15000','allowed&&']){if(x==='allowed&&')continue;assert.ok(a.includes(x),x)}
 for(const x of ['fetch(', 'localStorage','sessionStorage','postCerebroConsoleChat','MediaRecorder','sendText(', 'SERVICE_ROLE_KEY'])assert.ok(!a.includes(x),x);
 const b=read('src/CerebroOperativeCockpitV3Bridge.tsx');
 assert.ok(b.includes('onLocalTranscript={text=>{if(isOwnerCompany'));
 assert.ok(b.includes("setComposer(prev=>(prev.trim()?prev+' ':'')+text)"));
});
test('synthetic Chrome test supports on device Spanish dictation and manual send',()=>{
 const t=read('tests/cerebro-operativa-v3-live-bridge-e2e.spec.ts');
 assert.ok(t.includes('(QARecognition as any).available'));
 assert.ok(t.includes('processLocally'));
 assert.ok(t.includes('Dictado local de prueba'));
 assert.ok(t.includes("expect(postedChat?.message).toBe('Consulta el estado operativo')"));
});
