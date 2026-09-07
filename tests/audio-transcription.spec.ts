import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('L5 universal microphone stays native and isolated from canonical writes',async()=>{
 const source=read('src/AudioTranscriptionGuard.tsx');
 expect(source).toContain("recognition.lang='es-ES'");
 expect(source).toContain('recognition.continuous=true');
 expect(source).toContain('recognition.interimResults=true');
 expect(source).toContain('navigator.clipboard.writeText');
 expect(source).toContain("domain:'financiacion'");
 expect(source).toContain("navigate(`/ana?");
 expect(source).not.toContain('fetchAppApi');
 expect(source).not.toContain('supabase.from');
});

test('L5 launcher is icon-only and restores the four approved actions',async()=>{
 const source=read('src/AudioTranscriptionGuard.tsx');
 const css=read('src/audio-transcription.css');
 for(const label of ['Corregir','Dar conocimiento','Tarea','Hablar con Ana'])expect(source).toContain(label);
 expect(source).toContain('aria-label="Abrir acciones por voz"');
 expect(source).not.toContain('<span>Dictar</span>');
 expect(css).toContain('background:#ff5a1f');
 expect(css).toContain('.fenix-audio-actions');
});

test('L5 audio transcription has permission and unsupported-browser fallbacks',async()=>{
 const source=read('src/AudioTranscriptionGuard.tsx');
 expect(source).toContain('webkitSpeechRecognition');
 expect(source).toContain("error==='not-allowed'");
 expect(source).toContain("error==='no-speech'");
 expect(source).toContain('Dictado automático no disponible en este navegador.');
});

test('L5 audio transcription is globally mounted without reopening main routing',async()=>{
 const main=read('src/main.tsx');
 const wrapper=read('src/IntelligentDocumentIngestionGuard.tsx');
 expect(main).toContain('<IntelligentDocumentIngestionGuard />');
 expect(wrapper).toContain("import AudioTranscriptionGuard from './AudioTranscriptionGuard';");
 expect(wrapper).toContain('<AudioTranscriptionGuard />');
});
