import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('CEREBRO protects the first audible words after the microphone audio route opens',async()=>{
 const shell=read('src/CerebroConsoleShell.tsx');
 expect(shell).toContain('const SPEECH_AUDIO_LEAD_IN_MS=320;');
 expect(shell).toContain('const speechLeadInTimerRef=useRef<number|null>(null);');
 expect(shell).toContain('function clearSpeechLeadInTimer()');
 expect(shell).toMatch(/prepareVoiceActivityBargeIn\(\)\.then\([\s\S]*speechLeadInTimerRef\.current=window\.setTimeout\([\s\S]*speakSegment\(startIndex,startCharIndex\)[\s\S]*SPEECH_AUDIO_LEAD_IN_MS/);
 expect(shell).toMatch(/function endVoiceSession\(\)[\s\S]*clearSpeechLeadInTimer\(\)/);
 expect(shell).toMatch(/function pauseSpeech\(\)[\s\S]*clearSpeechLeadInTimer\(\)/);
});
