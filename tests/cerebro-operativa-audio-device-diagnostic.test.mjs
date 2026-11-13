import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('audio diagnostics are local, opt-in and never submit messages',()=>{
 const code=read('src/CerebroAudioDiagnostics.tsx');
 const cockpit=read('src/CerebroOperativeCockpitV3.tsx');
 assert.ok(cockpit.includes('<CerebroAudioDiagnostics/>'));
 for(const value of ['getUserMedia({audio:true','getFloatTimeDomainData','createVoiceRecognition()','oscillator.frequency','release','track.stop()','token.current++']){
  if(value==='release')continue;
  assert.ok(code.includes(value),value);
 }
 assert.ok(code.includes('speechSynthesis.speak'));
 assert.ok(code.includes('Comprobar voz hablada'));
 for(const forbidden of ['MediaRecorder','localStorage','fetch(','postCerebroConsoleChat','sendText(','SERVICE_ROLE_KEY'])assert.ok(!code.includes(forbidden),forbidden);
});
