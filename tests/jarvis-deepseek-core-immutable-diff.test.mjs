import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=(path)=>readFileSync(path,'utf8');
function showAt(ref,path){
 return execFileSync('git',['show',ref+':'+path],{encoding:'utf8',maxBuffer:1024*1024});
}
test('ÚNICA diferencia en Console core: puerto opcional de presentación, ninguna alteración de voz o Gateway',()=>{
 const base=process.env.CEREBRO_CANONICAL_BASE_SHA;
 assert.match(base??'',/^[a-f0-9]{40}$/);
 const path='src/CerebroConsoleShell.tsx';
 const old=showAt(base,path);
 const expected=old.replace(
  'useState,type FormEvent',
  'useState,type FormEvent,type ReactNode'
 ).replace(
  'export default function CerebroConsoleShell(){',
  "/** Extensión de SOLO renderizado (sin modificación del chat, permisos ni voz). */\ntype ConsolePresentationPort={renderAssistantMessage?:(text:string)=>ReactNode};\nexport default function CerebroConsoleShell({renderAssistantMessage}:ConsolePresentationPort={}){"
 ).replace(
  '<span>{renderMessage(line.text)}</span>',
  "{line.role==='cerebro'&&renderAssistantMessage?renderAssistantMessage(line.text):<span>{renderMessage(line.text)}</span>}"
 );
 assert.notEqual(expected,old,'Puerto no encontrado en baseline: fail closed');
 assert.equal(read(path),expected,'Cualquier otro cambio en Console bloquea la revisión');
});
test('Las fuentes canónicas de voz, datos, Gateway y controles se preservan byte a byte',()=>{
 const base=process.env.CEREBRO_CANONICAL_BASE_SHA;
 assert.match(base??'',/^[a-f0-9]{40}$/);
 for(const path of [
  'src/cerebroConsoleApi.ts',
  'src/cerebroVoice.ts',
  'src/CerebroConsoleHost.tsx',
  'src/CerebroOperativeConsole.tsx',
  'src/AnaVoiceQueryBlock.tsx',
  'src/JarvisOperativaComposerPortal.tsx',
  'src/CerebroJarvisWorkConsole.tsx',
 ]){
  assert.equal(read(path),showAt(base,path),'Cambio protegido no autorizado: '+path);
 }
});
test('El render opcional está limitado a LAB y tiene recuperación a texto original',()=>{
 const embedded=read('src/JarvisEmbeddedConsole.tsx');
 const view=read('src/jarvis-deepseek-lab/JarvisResponseView.tsx');
 const boundary=read('src/jarvis-deepseek-lab/JarvisMarkdownRenderBoundary.tsx');
 assert.ok(embedded.includes("import.meta.env.MODE==='lab'&&import.meta.env.VITE_JARVIS_DEEPSEEK_MARKDOWN_LAB==='1'"));
 assert.ok(embedded.includes('<CerebroConsoleShell key={workspaceKey||\'jarvis-default\'}/>'));
 assert.ok(!embedded.includes('JarvisMarkdownLabSidecar'));
 assert.ok(view.includes('<JarvisMarkdownRenderBoundary'));
 assert.ok(boundary.includes("data-jarvis-markdown-fallback=\"true\""));
 assert.ok(!boundary.includes('console.log'));
 assert.ok(!boundary.includes('console.error'));
});
