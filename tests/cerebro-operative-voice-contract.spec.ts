import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('JARVIS Work exposes the canonical V0 voice control directly, without an Operativa proxy',async()=>{
 const shell=read('src/CerebroConsoleShell.tsx');
 const host=read('src/CerebroConsoleHost.tsx');
 const work=read('src/CerebroJarvisWorkConsole.tsx');
 expect(host).toContain('<CerebroJarvisWorkConsole');
 expect(host).toContain('hidden={browser}');
 expect(host).not.toContain('CerebroOperativeConsole');
 expect(work).toContain("import CerebroConsoleShell from './CerebroConsoleShell';");
 expect(work).toContain('<CerebroConsoleShell/>');
 expect(work).not.toContain('querySelector');
 expect(shell).toContain('className="cerebro-voice-main"');
 expect(shell).toContain('onClick={toggleVoiceSession}');
 expect(shell).toContain("voiceSessionActive?'Finalizar conversación':'Hablar con CEREBRO'");
});

test('canonical V0 implements the required continuous listen → chat → TTS → re-listen loop',async()=>{
 const shell=read('src/CerebroConsoleShell.tsx');
 expect(shell).toContain('function scheduleListening(delay=350)');
 expect(shell).toContain('startListeningRef.current();');
 expect(shell).toContain('recognition.onstart=()=>setVoiceListening(true)');
 expect(shell).toContain('sendVoiceTextRef.current(transcript,confidence)');
 expect(shell).toContain('postCerebroConsoleChat(clean');
 expect(shell).toContain('if(voiceSessionRef.current)speakAndResume(response');
 expect(shell).toContain('finishSpeechPlan(token)');
 expect(shell).toContain('scheduleListening(180)');
 expect(shell).toContain('recognition.onend=()=>');
 expect(shell).toContain('scheduleListening(400)');
});

test('voice session shutdown remains distinct from TTS pause and releases browser media resources',async()=>{
 const shell=read('src/CerebroConsoleShell.tsx');
 expect(shell).toContain('function endVoiceSession()');
 expect(shell).toContain('stopRecognition();');
 expect(shell).toContain('stopInterruptRecognition();');
 expect(shell).toContain('stopVoiceActivityBargeIn();');
 expect(shell).toContain('window.speechSynthesis.cancel()');
 expect(shell).toContain('stream.getTracks().forEach(track=>track.stop())');
 expect(shell).toContain('function pauseSpeech()');
 expect(shell).toContain('function resumeSpeech()');
});
