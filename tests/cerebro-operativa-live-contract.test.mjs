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

test('Operativa sends through the existing authenticated React conversation',()=>{
 const operative=source('src/CerebroOperativeConsole.tsx');
 const shell=source('src/CerebroConsoleShell.tsx');
 const bridge=source('src/jarvisConversationBridge.ts');
 assert.match(operative,/driverRef\.current\.sendText\(clean\)/);
 assert.match(operative,/JarvisConversationBridgeContext\.Provider/);
 assert.match(operative,/JarvisTranscriptContext\.Provider/);
 assert.match(shell,/transcriptSink\?\.\(lines\.slice\(-24\)\)/);
 assert.match(bridge,/JarvisTranscriptContext/);
 assert.doesNotMatch(operative,/requestSubmit\(/);
 assert.doesNotMatch(operative,/setReactTextareaValue\(/);
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

test('Generic browser voice remains separate from future canonical JARVIS',()=>{
 const shell=source('src/CerebroConsoleShell.tsx');
 const operative=source('src/CerebroOperativeConsole.tsx');
 assert.match(shell,/window\.speechSynthesis\.speak\(utterance\)/);
 assert.match(operative,/createVoiceRecognition\(/);
 assert.doesNotMatch(operative,/VOICE-001.*synthesize|voiceover_generate/);
});
