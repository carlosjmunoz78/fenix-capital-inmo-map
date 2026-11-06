import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('CUT48 playback and dictation only on explicit click, never on mount',()=>{
 const s=read('src/JarvisPhysicalVoiceCheck.tsx');
 assert.match(s,/onClick=\{\(\)=>playback==='SPEAKING'\?stopPlayback\(\):tryPlayback\(\)\}/);
 assert.match(s,/onClick=\{tryRecognition\}/);
 assert.match(s,/new SpeechSynthesisUtterance\(TEST_GREETING\)/);
 assert.match(s,/createVoiceRecognition\(\)/);
 assert.doesNotMatch(s,/useEffect\(\(\)=>\{\s*(?:tryPlayback|tryRecognition)/);
 assert.match(s,/El dictado utiliza el reconocimiento del navegador/);
 assert.doesNotMatch(s,/postCerebroConsoleChat|fetch\(|MediaRecorder|api\.deepseek\.com|vidiq_voiceover_generate|service_role/i);
});

test('CUT48 native TTS NEVER claims it is the approved vidIQ cloned V2',()=>{
 const s=read('src/JarvisPhysicalVoiceCheck.tsx');
 assert.match(s,/voz provisional del navegador, no el clon JARVIS V2/);
 assert.match(s,/utterance\.rate=1\.10/);
 assert.match(s,/utterance\.pitch=0\.98/);
 assert.match(s,/NOT approved cloned \+0\.6 semitones/);
 assert.match(s,/¿Ha oído claramente la frase\?/);
 assert.match(s,/Sí, la he oído/);
 assert.match(s,/No, no la he oído/);
});

test('CUT48 call only from already-existing four-surface authenticated UI',()=>{
 const dock=read('src/JarvisOmniDock.tsx');
 const composer=read('src/JarvisOperativaComposerPortal.tsx');
 const host=read('src/CerebroConsoleHost.tsx');
 assert.match(dock,/<JarvisPhysicalVoiceCheck disabled=\{state\.voiceActive\|\|state\.sending\|\|listening\}/);
 assert.match(composer,/<JarvisPhysicalVoiceCheck disabled=\{snapshot\.voiceActive\|\|snapshot\.sending\|\|dictating\}/);
 assert.match(host,/ownerAccess!=='allowed'/);
 assert.match(host,/primaryView!=='JARVIS'\?<JarvisOmniDock/);
 assert.match(read('src/JarvisEmbeddedConsole.tsx'),/<JarvisOperativaComposerPortal\/>/);
});

test('CUT48 isolated rollback drill never executes deployment, uses exact OLD blobs',()=>{
 const s=read('scripts/jarvis-cut48-offline-rollback.mjs');
 assert.match(s,/mkdtempSync\(join\(tmpdir\(\)/);
 assert.match(s,/blob \$\{buffer\.length\}\\0/);
 assert.match(s,/44241c6abc3cb89560500336e332f0628219d0fc/);
 assert.match(s,/e00bb09ba9a024772f26fbd81159a9e9a584cd42/);
 assert.match(s,/JARVIS_CUT48_PROD_RESTORE_TESTED=FALSE/);
 assert.doesNotMatch(s,/supabase deploy|functions\.deploy|mcp__Supabase|https:\/\/.*supabase\.co|npm run deploy/i);
});
