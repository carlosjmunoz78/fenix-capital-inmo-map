import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  JARVIS_BROWSER_VOICE_DEFAULTS,
  resolveJarvisVoicePreferences,
  preferredJarvisSpanishVoice,
  jarvisDictationProblem,
} from '../src/jarvisVoicePolicy.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('CUT44 only JARVIS: voice defaults are executive and es-ES browser fallback',()=>{
  assert.equal(JARVIS_BROWSER_VOICE_DEFAULTS.tone,'executive_formal');
  assert.equal(JARVIS_BROWSER_VOICE_DEFAULTS.speech_rate,'1.10');
  assert.equal(JARVIS_BROWSER_VOICE_DEFAULTS.speech_pitch,'0.98');
  const shell=read('src/CerebroConsoleShell.tsx');
  assert.match(shell,/preferredJarvisSpanishVoice\(spanishVoices\(\)\)/);
  assert.match(shell,/resolveJarvisVoicePreferences\(data.preferences\)/);
  const original=read('src/cerebroVoice.ts');
  assert.match(original,/export function preferredSpanishVoice/); // ANA/generic selector retained
  assert.doesNotMatch(read('src/jarvisVoicePolicy.ts'),/api\.deepseek\.com|service_role|SUPABASE/);
});

test('CUT44 rejects warm legacy tone but preserves valid user speed',()=>{
  const got=resolveJarvisVoicePreferences({tone:'warm_close_caring',speech_rate:'1.05',speech_pitch:'1.24'});
  assert.equal(got.tone,'executive_formal');
  assert.equal(got.speech_rate,'1.05');
  assert.equal(got.speech_pitch,'0.98');
  assert.equal(resolveJarvisVoicePreferences({speech_rate:'1000'}).speech_rate,'1.10');
  assert.equal(resolveJarvisVoicePreferences({speech_rate:'invalid'}).speech_rate,'1.10');
});

test('CUT44 prefers Spanish-Spain male-named voice without claiming clone',()=>{
  const voices=[
   {name:'Microsoft Elvira',lang:'es-ES',localService:true},
   {name:'Microsoft Pablo',lang:'es-ES',localService:true},
   {name:'Diego',lang:'es-MX',localService:true}
  ];
  assert.equal(preferredJarvisSpanishVoice(voices)?.name,'Microsoft Pablo');
  assert.equal(preferredJarvisSpanishVoice([{name:'English Male',lang:'en-US'}]),undefined);
  assert.equal(preferredJarvisSpanishVoice([]),undefined);
});

test('CUT44 microphone errors are specific and vendor-neutral',()=>{
  assert.match(jarvisDictationProblem('not-allowed'),/denegado/);
  assert.match(jarvisDictationProblem('network'),/conectarse/);
  assert.match(jarvisDictationProblem('audio-capture'),/micrófono/);
  assert.doesNotMatch(jarvisDictationProblem('service-not-allowed'),/Chrome/);
});

test('CUT44 draft is editable offline, but submission stays gated by owner Gateway',()=>{
  const shell=read('src/CerebroConsoleShell.tsx');
  assert.match(shell,/disabled=\{sending\} rows=\{3\}/);
  assert.match(shell,/disabled=\{!chatReady\|\|sending\|\|!message\.trim\(\)\}/);
  assert.match(shell,/const allowed=Boolean\(status===200&&data\?\.actor_code==='CARLOS-ADMIN'\)/);
  const dock=read('src/JarvisOmniDock.tsx');
  assert.match(dock,/applyVoiceContextHints\(recognition\)/);
  assert.match(dock,/jarvisDictationProblem\(String\(event\.error\|\|'\'\)\)/);
  assert.match(dock,/disabled=\{!state\.ready\|\|state\.sending\|\|!text\.trim\(\)\}/);
  assert.doesNotMatch(dock,/api\.deepseek\.com/);
});

test('CUT44 Operativa reports mic problems without claiming Chrome support',()=>{
 const src=read('src/JarvisOperativaComposerPortal.tsx');
 assert.match(src,/jarvisDictationProblem/);
 assert.doesNotMatch(src,/Chrome no ofrece reconocimiento/);
});
