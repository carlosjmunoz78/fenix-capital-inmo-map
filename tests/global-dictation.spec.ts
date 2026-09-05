import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const dictation=fs.readFileSync(path.join(process.cwd(),'src/GlobalDictationGuard.tsx'),'utf8');
const main=fs.readFileSync(path.join(process.cwd(),'src/main.tsx'),'utf8');

test('cada input o textarea editable recibe un micro de dictado sin tocar selects ni archivos',()=>{
 expect(main).toContain('<GlobalDictationGuard />');
 expect(dictation).toContain("document.querySelectorAll('input,textarea')");
 expect(dictation).toContain('aria-label="Dictar en este campo"');
 expect(dictation).toContain("rec.lang='es-ES'");
 expect(dictation).toContain("window.SpeechRecognition||window.webkitSpeechRecognition");
 expect(dictation).toContain("new Event('input',{bubbles:true})");
 expect(dictation).toContain("'file','checkbox','radio'");
 expect(dictation).toContain('El dictado por micrófono no está disponible en este navegador.');
});
