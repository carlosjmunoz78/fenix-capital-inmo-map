import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const shell=()=>read('src/CerebroConsoleShell.tsx');
const portal=()=>read('src/JarvisOperativaComposerPortal.tsx');
const api=()=>read('src/cerebroConsoleApi.ts');

test('JARVIS portal directly submits via accepted event; no stale React textarea requestSubmit race',()=>{
 const s=shell(),p=portal();
 assert.match(s,/window\.addEventListener\('jarvis:direct-chat-submit-v1',onDirectSubmit\)/);
 assert.match(s,/payload\.accepted=directChatSubmitRef\.current\(payload\.message\)/);
 assert.match(s,/if\(!text\.trim\(\)\|\|!chatReady\|\|sendingRef\.current\)return false/);
 assert.match(p,/window\.dispatchEvent\(new CustomEvent\('jarvis:direct-chat-submit-v1',\{detail\}\)\)/);
 assert.match(p,/if\(!detail\.accepted\)/);
 assert.doesNotMatch(p,/form\.requestSubmit\(\)/);
 assert.doesNotMatch(p,/setReactTextareaValue/);
});
test('the visible composer becomes ready only if canonical real chat input is enabled',()=>{
 const p=portal();
 assert.match(p,/ready:Boolean\(coreInput&&!coreInput\.disabled\)/);
 assert.doesNotMatch(p,/ready:title\.includes/);
});
test('voice conversation displays interim text, submits final once, never interim command',()=>{
 const s=shell();
 assert.match(s,/recognition\.interimResults=true/);
 assert.match(s,/const finalChunks:string\[\]=\[\]/);
 assert.match(s,/if\(result\.isFinal!==false\)/);
 assert.match(s,/if\(preview\)setMessage\(preview\)/);
 assert.match(s,/if\(transcript&&!finalSent\)/);
 assert.match(s,/speakSegment\(startIndex,startCharIndex\);\s*void prepareVoiceActivityBargeIn\(\)\.then/);
 assert.match(s,/finalSent=true/);
});
test('dictation shows provisional text but does not auto-confirm or send dangerous orders',()=>{
 const p=portal();
 assert.match(p,/recognition\.interimResults=true/);
 assert.match(p,/dictationBaseRef\.current=composer\.trim\(\)/);
 assert.match(p,/setComposer\(\x60\$\{prefix\}/);
 assert.match(p,/Dictar \(solo transcribe; después pulsa Enviar\)/);
 assert.match(p,/Conversación por voz \(envía y responde\)/);
 assert.doesNotMatch(p,/recognition\.onresult=[^\n]*sendCommand\(/);
});
test('a hung network chat request has a finite timeout with visible error',()=>{
 const s=api();
 assert.match(s,/const controller=new AbortController\(\)/);
 assert.match(s,/setTimeout\(\(\)=>controller\.abort\(\),20000\)/);
 assert.match(s,/signal:controller\.signal/);
 assert.match(s,/finally\{clearTimeout\(timeout\)\}/);
 assert.match(s,/status:'TIMEOUT',message:'JARVIS ha tardado más de 20 segundos/);
});
test('no server-side permissions, CRM APIs or active production autonomy added in UI repair',()=>{
 const p=portal(),s=shell(),a=api();
 assert.doesNotMatch(p,/service_role|SUPABASE_SERVICE_ROLE_KEY|\/rest\/v1\//);
 assert.match(s,/const chatReady=Boolean\(ready&&health\?\.chat_available/);
 assert.match(s,/ownerAccess!=='allowed'/);
 assert.match(a,/const headers=await authHeaders\(\)/);
 assert.match(a,/Authorization:\x60Bearer \$\{token\}\x60/);
});
