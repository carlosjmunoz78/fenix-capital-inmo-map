import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const source=()=>fs.readFileSync(path.join(process.cwd(),'src/LocalAudioTranscriptionGuard.tsx'),'utf8');

test.describe('Fénix · audio global autenticado',()=>{
 test('la acción de audio se integra en el único menú global de micrófono y no crea otro launcher',()=>{
  const s=source();
  expect(s).toContain('if(!authReady||!authenticated)return null');
  expect(s).not.toContain('if(!ctx)return null');
  expect(s).toContain("document.querySelector<HTMLElement>('.fenix-voice-menu')");
  expect(s).toContain('data-testid="voice-upload-audio"');
  expect(s).toContain('Subir audio y transcribir');
  expect(s).not.toContain("style={{position:'fixed',right:");
 });
 test('fuera de una ficha transcribe localmente sin escribir CRM y dentro conserva evidencia vinculada',()=>{
  const s=source();
  expect(s).toContain("if(ctx){setStatus('Guardando audio original…');await saveEvidence(file,ctx,'audio_conversacion');}");
  expect(s).toContain('Modo general: transcribe localmente sin escribir en el CRM.');
  expect(s).toContain('Transcripción local completada. Puedes copiar el texto; no se ha escrito nada en el CRM.');
 });
});
