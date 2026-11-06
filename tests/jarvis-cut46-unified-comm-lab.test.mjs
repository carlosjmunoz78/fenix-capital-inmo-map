import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {closeOwnerGreeting} from '../supabase/functions/cerebro-console-gateway-v0/owner-greeting.ts';
import {JARVIS_BROWSER_VOICE_DEFAULTS,resolveJarvisVoicePreferences,preferredJarvisSpanishVoice} from '../src/jarvisVoicePolicy.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('CUT46: one JARVIS protocol from gateway greetings to voice and UI',()=>{
 const ownerGreeting=closeOwnerGreeting();
 assert.match(ownerGreeting,/\bseñor\b/iu);
 assert.doesNotMatch(ownerGreeting,/guapo|guapa|cariño|colega|crack|carlos/iu);
 assert.equal(JARVIS_BROWSER_VOICE_DEFAULTS.tone,'executive_formal');
 assert.equal(resolveJarvisVoicePreferences({tone:'warm_close_caring'}).tone,'executive_formal');
 const gateway=read('supabase/functions/cerebro-console-gateway-v0/index.ts');
 assert.match(gateway,/import \{closeOwnerGreeting\} from "\.\/owner-greeting\.ts"/);
 assert.match(gateway,/tone:"executive_formal"/);
 assert.doesNotMatch(gateway,/Hola Carlos\. ¿Qué tal guapo\?|Hola guapo\.|Aquí estoy guapo/);
 const shell=read('src/CerebroConsoleShell.tsx');
 assert.match(shell,/resolveJarvisVoicePreferences/);
 assert.match(shell,/preferredJarvisSpanishVoice/);
 assert.match(shell,/A su disposición, señor/);
 assert.match(shell,/status===401\?/);
});

test('CUT46: messages only through signed owner-Gateway, never from a UI title',()=>{
 const shell=read('src/CerebroConsoleShell.tsx');
 const operativa=read('src/JarvisOperativaComposerPortal.tsx');
 const dock=read('src/JarvisOmniDock.tsx');
 const gateway=read('supabase/functions/cerebro-console-gateway-v0/index.ts');
 assert.match(shell,/actor_code==='CARLOS-ADMIN'/);
 assert.match(shell,/disabled=\{!chatReady\|\|sending\|\|!message\.trim\(\)\}/);
 assert.match(operativa,/ready:shared\.ready===true/);
 assert.doesNotMatch(operativa,/ready:Boolean\(textarea&&!textarea\.disabled\)/);
 assert.match(dock,/disabled=\{!state\.ready\|\|state\.sending\|\|!text\.trim\(\)\}/);
 assert.match(gateway,/auth\.auth\.getUser\(bearer\.slice\(7\)\)/);
 assert.match(gateway,/actor==="CARLOS-ADMIN"/);
 assert.match(gateway,/confirmation_mode: "EXACT_PROPOSAL_SINGLE_EXPLICIT_YES"/);
 assert.match(gateway,/trading_access: false/);
});

test('CUT46: speech preference does not alter generic ANA browser speech implementation',()=>{
 const generic=read('src/cerebroVoice.ts');
 const own=read('src/jarvisVoicePolicy.ts');
 assert.match(generic,/export function preferredSpanishVoice/);
 assert.doesNotMatch(generic,/JARVIS_BROWSER_VOICE_DEFAULTS/);
 assert.doesNotMatch(own,/Deno\.env|SUPABASE_SERVICE_ROLE_KEY|sk-[A-Za-z0-9]/);
 const voices=[
 {name:'Microsoft Elvira',lang:'es-ES',localService:true},
 {name:'Microsoft Pablo',lang:'es-ES',localService:true},
 ];
 assert.equal(preferredJarvisSpanishVoice(voices)?.name,'Microsoft Pablo');
});

test('CUT46: no direct model dependency or unsafe action rights have been introduced',()=>{
 const api=read('src/cerebroConsoleApi.ts');
 const dock=read('src/JarvisOmniDock.tsx');
 const gateway=read('supabase/functions/cerebro-console-gateway-v0/index.ts');
 assert.match(api,/Authorization:`Bearer \$\{token\}`/);
 assert.doesNotMatch(dock,/api\.deepseek\.com/);
 assert.match(gateway,/direct_model_access: false/);
 assert.match(gateway,/prod_execution_enabled: false/);
 assert.match(gateway,/live_writes: false/);
});
