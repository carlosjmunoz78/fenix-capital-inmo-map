import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('CEREBRO primes the browser audio sink after cancel without changing the real utterance',async()=>{
 const guard=read('src/CerebroSpeechOutputGuard.tsx');
 expect(guard).toContain("if(consoleVoiceActive())needsPreroll=true");
 expect(guard).toContain('const primer=new SpeechSynthesisUtterance(primerText(utterance.text))');
 expect(guard).toContain('primer.volume=PREROLL_VOLUME');
 expect(guard).toContain('originalSpeak.call(synthesis,primer)');
 expect(guard).toContain('originalSpeak.call(synthesis,utterance)');
 expect(guard).not.toContain('utterance.text=');
});

test('TTS preroll is scoped to the CEREBRO console and mounted by the canonical host',async()=>{
 const guard=read('src/CerebroSpeechOutputGuard.tsx');
 const host=read('src/CerebroConsoleHost.tsx');
 expect(guard).toContain("document.documentElement.dataset[CEREBRO_CONSOLE_DATASET_KEY]==='1'");
 expect(host).toContain("import CerebroSpeechOutputGuard from './CerebroSpeechOutputGuard'");
 expect(host).toContain('<CerebroSpeechOutputGuard/>');
});

test('TTS preroll remains practically inaudible and uses only the response prefix',async()=>{
 const guard=read('src/CerebroSpeechOutputGuard.tsx');
 expect(guard).toContain('const PREROLL_MAX_CHARS=48');
 expect(guard).toContain('const PREROLL_VOLUME=0.001');
 expect(guard).toContain('const clipped=clean.slice(0,PREROLL_MAX_CHARS)');
});
