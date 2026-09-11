import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('stack flotante único: calculadora, micrófono y chat',()=>{
  const css=fs.readFileSync(path.resolve('src/calculator-no-pro.css'),'utf8');
  const audio=fs.readFileSync(path.resolve('src/LocalAudioTranscriptionGuard.tsx'),'utf8');
  const voice=fs.readFileSync(path.resolve('src/GlobalCommunicationCommandGuard.tsx'),'utf8');
  const calculator=fs.readFileSync(path.resolve('src/CalculatorLabelGuard.tsx'),'utf8');
  const chat=fs.readFileSync(path.resolve('src/ChatShell.tsx'),'utf8');

  expect(css).toContain('.calc-launcher');
  expect(css).toContain('bottom:118px!important');
  expect(css).toContain('.fenix-voice-hub{right:18px!important;bottom:68px!important}');
  expect(css).toContain('.fenix-chat-launcher{right:18px!important;bottom:18px!important');
  expect(css).toContain('.fenix-voice-main{width:46px!important;height:46px!important;border-radius:14px!important;padding:0!important;background:var(--orange)!important');
  expect(css).toContain('.fenix-chat-launcher{right:18px!important;bottom:18px!important;width:46px!important;height:46px!important;border-radius:14px!important;background:var(--orange)!important');
  expect(calculator).toContain('if(node.nodeType===Node.TEXT_NODE)node.remove()');
  expect(chat).toContain('aria-label="Abrir chat de equipo"');
  expect(voice).toContain('aria-label="Abrir acciones por voz"');

  // La subida/transcripción de audio se conserva dentro del menú del único botón de micrófono.
  expect(audio).toContain("document.querySelector<HTMLElement>('.fenix-voice-menu')");
  expect(audio).toContain('data-testid="voice-upload-audio"');
  expect(audio).toContain('Subir audio y transcribir');
  expect(audio).not.toContain('aria-label="Subir audio y transcribir" title="Audio → texto" onClick={()=>setOpen(true)} style={{position:\'fixed\'');
});
