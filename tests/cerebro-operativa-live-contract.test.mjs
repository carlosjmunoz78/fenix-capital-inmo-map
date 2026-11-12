import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Activity backend uses canonical GitHub repo without changing owner auth',()=>{
 const activity=source('supabase/functions/cerebro-console-activity-v0/index.ts');
 assert.match(activity,/const REPOSITORY="carlosjmunoz78\/fenix-capital-inmo-map"/);
 assert.match(activity,/authorizedOwner\(req\)/);
 assert.match(activity,/actor_code\)==="CARLOS-ADMIN"/);
 assert.match(activity,/source_status:"UNAVAILABLE"/);
 assert.doesNotMatch(activity,/const REPOSITORY="fenix-cerebro\//);
});

test('Operativa talks to the existing owner-only Gateway without a second JARVIS core',()=>{
 const operative=source('src/CerebroOperativeConsole.tsx');
 const hook=source('src/useCerebroOperativaChat.ts');
 assert.match(operative,/useCerebroOperativaChat\(\)/);
 assert.match(operative,/chat\.sendText\(clean\)/);
 assert.match(operative,/transcript\.map\(/);
 assert.match(hook,/postCerebroConsoleChat\(clean,actionRef\.current,readContextRef\.current/);
 assert.match(hook,/fetchCerebroConsoleHealth\(\)/);
 assert.match(hook,/authenticated_transport===true/);
 assert.match(hook,/direct_model_access===false/);
 assert.doesNotMatch(operative,/requestSubmit\(|setReactTextareaValue\(|CerebroConsoleShell/);
});

test('Tenant scope remains fail-closed until authorized by server',()=>{
 const operative=source('src/CerebroOperativeConsole.tsx');
 assert.match(operative,/disabled=\{value!=='fenix'\}/);
 assert.match(operative,/if\(company!=='fenix'\)return false/);
 assert.match(operative,/setRuns\(\(data\.runs\|\|\[\]\)\.filter\(run=>run\.company_id==='fenix'\)\)/);
});

test('Failing activity is not advertised as healthy or zero work',()=>{
 const operative=source('src/CerebroOperativeConsole.tsx');
 assert.match(operative,/Estado sin verificar/);
 assert.match(operative,/setSourceReason\(data\?\.reason/);
 assert.match(operative,/No se puede comprobar el estado de trabajos/);
});

test('Generic browser voice stays isolated from JARVIS and ANA',()=>{
 const operative=source('src/CerebroOperativeConsole.tsx');
 const hook=source('src/useCerebroOperativaChat.ts');
 assert.match(hook,/window\.speechSynthesis\.speak\(utterance\)/);
 assert.match(hook,/new SpeechSynthesisUtterance/);
 assert.match(operative,/createVoiceRecognition\(/);
 assert.doesNotMatch(hook,/VOICE-001|voiceover_generate|jarvisVoiceSurfacePolicy/);
});
