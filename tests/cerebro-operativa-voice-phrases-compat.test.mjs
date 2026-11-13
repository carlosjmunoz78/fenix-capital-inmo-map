import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CEREBRO V3, shared voice and fallback never inject unsupported contextual phrases',()=>{
 for(const path of ['src/useCerebroOperativaChat.ts','src/CerebroOperativeCockpitV3Bridge.tsx','src/CerebroOperativeConsole.tsx']){
  const code=read(path);
  assert.doesNotMatch(code,/\bapplyVoiceContextHints\s*\(/,path);
  assert.match(code,/recognition\.lang='es-ES'/,path);
  assert.match(code,/recognition\.start\(\)/,path);
 }
});
test('Gateway, authorization and confirmation requirements remain unchanged',()=>{
 const hook=read('src/useCerebroOperativaChat.ts');
 assert.match(hook,/postCerebroConsoleChat/);
 assert.match(hook,/voiceNeedsManualConfirmation/);
 assert.match(hook,/voiceNeedsClarification/);
 assert.match(hook,/phrases-not-supported/);
 assert.match(hook,/stopVoice\(\)/);
 const bridge=read('src/CerebroOperativeCockpitV3Bridge.tsx');
 assert.match(bridge,/chat\.sendText\(text\)/);
 assert.match(bridge,/chat\.toggleVoice\(\)/);
});
test('Chromium QA simulates supported phrase property with unsupported recognition provider',()=>{
 const qa=read('tests/cerebro-operativa-v3-live-bridge-e2e.spec.ts');
 assert.match(qa,/SpeechRecognitionPhrase=QAPhrase/);
 assert.match(qa,/__qaPhraseUnsupportedCount/);
 assert.match(qa,/phrases-not-supported/);
});
