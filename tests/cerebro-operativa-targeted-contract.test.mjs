import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Operativa uses existing owner-authorized Gateway, never submits hidden DOM forms',()=>{
 const ui=load('src/CerebroOperativeConsole.tsx');
 const client=load('src/useCerebroOperativaChat.ts');
 assert.match(ui,/chat\.sendText\(clean\)/);
 assert.match(ui,/transcript\.map\(/);
 assert.match(client,/postCerebroConsoleChat\(/);
 assert.match(client,/fetchCerebroConsoleHealth\(/);
 assert.match(client,/authenticated_transport===true/);
 assert.match(client,/direct_model_access===false/);
 assert.doesNotMatch(ui,/requestSubmit\(|setReactTextareaValue\(/);
 assert.doesNotMatch(ui,/<CerebroConsoleShell/);
});
test('Only the Fenix company context is enabled without backend tenant permissions',()=>{
 const ui=load('src/CerebroOperativeConsole.tsx');
 assert.match(ui,/if\(company!=='fenix'\)return false/);
 assert.match(ui,/disabled=\{value!=='fenix'\}/);
 assert.match(ui,/source==='UNAVAILABLE'\?'Estado sin verificar/);
});
test('Generic browser speech without JARVIS V2 or paid TTS',()=>{
 const chat=load('src/useCerebroOperativaChat.ts');
 assert.match(chat,/new SpeechSynthesisUtterance\(/);
 assert.match(chat,/window\.speechSynthesis\.speak\(utterance\)/);
 assert.match(chat,/voiceNeedsManualConfirmation/);
 assert.doesNotMatch(chat,/voiceover_generate\(|preferredJarvisMaleBrowserVoice\(/);
});
test('Preserve existing Jarvis and Browser surfaces and rollback V0',()=>{
 const host=load('src/CerebroConsoleHost.tsx');
 assert.match(host,/CerebroJarvisWorkConsole/);
 assert.match(host,/CerebroBrowserConsole/);
 assert.match(host,/CerebroOperativeConsole/);
 assert.match(host,/CerebroNeuralView/);
 assert.match(host,/CerebroConsoleShell/);
 assert.match(host,/legacy-v0/);
 assert.match(host,/actor_code==='CARLOS-ADMIN'/);
});
