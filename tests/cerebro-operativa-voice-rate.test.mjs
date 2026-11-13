import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CEREBRO voices speak modestly faster with consistent 1.15 rate',()=>{
 const hook=read('src/useCerebroOperativaChat.ts');
 const bridge=read('src/CerebroOperativeCockpitV3Bridge.tsx');
 const diag=read('src/CerebroAudioDiagnostics.tsx');
 for(const code of [hook,bridge,diag]) assert.match(code,/utterance\.rate=1\.15;/);
 assert.match(hook,/utterance\.voice=preferredSpanishVoice/);
 assert.match(bridge,/utterance\.voice=preferredSpanishVoice/);
 assert.match(hook,/voiceNeedsManualConfirmation/);
 assert.match(bridge,/chat\.sendText\(text\)/);
});
