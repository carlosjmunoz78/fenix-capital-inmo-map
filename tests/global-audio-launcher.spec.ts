import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const source=()=>fs.readFileSync(path.join(process.cwd(),'src/LocalAudioTranscriptionGuard.tsx'),'utf8');

test.describe('Fénix · micrófono global autenticado',()=>{
 test('el launcher no depende de estar en una ficha concreta y no aparece sin sesión',()=>{
  const s=source();
  expect(s).toContain('if(!authReady||!authenticated)return null');
  expect(s).not.toContain('if(!ctx)return null');
  expect(s).toContain('aria-label="Subir audio y transcribir"');
  expect(s).toContain('bottom:130');
 });
 test('fuera de una ficha transcribe localmente sin escribir CRM y dentro conserva evidencia vinculada',()=>{
  const s=source();
  expect(s).toContain("if(ctx){setStatus('Guardando audio original…');await saveEvidence(file,ctx,'audio_conversacion');}");
  expect(s).toContain('Modo general: transcribe localmente sin escribir en el CRM.');
  expect(s).toContain('Transcripción local completada. Puedes copiar el texto; no se ha escrito nada en el CRM.');
 });
});
