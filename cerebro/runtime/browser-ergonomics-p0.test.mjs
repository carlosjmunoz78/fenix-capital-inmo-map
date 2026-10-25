import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=(path)=>fs.readFile(new URL(`../../${path}`,import.meta.url),'utf8');

test('Browser viewer fills the complete governed viewport from the Phase 3 UI surface',async()=>{
  const source=await read('src/cerebroBrowserInteractive.ts');
  assert.match(source,/\.cerebro-browser-console \.cerebro-browser-viewport>img\{[^}]*width:100%!important;[^}]*height:100%!important;[^}]*object-fit:fill!important/);
  assert.match(source,/cerebro-browser-frame--expanded \.cerebro-browser-viewport>img\{object-fit:fill!important\}/);
});

test('Human typing is batched before React so normal typing is not serialized character by character',async()=>{
  const source=await read('src/cerebroBrowserInteractive.ts');
  assert.match(source,/const HUMAN_TEXT_BATCH_MS=180/);
  assert.match(source,/__cerebroTypingBatch/);
  assert.match(source,/typing\.value=`\$\{typing\.value\}\$\{event\.key\}`\.slice\(0,4000\)/);
  assert.match(source,/document\.addEventListener\('paste',onPaste,true\)/);
});

test('Full-size stretching preserves remote click coordinates',async()=>{
  const source=await read('src/cerebroBrowserInteractive.ts');
  assert.match(source,/const remoteX=\(\(event\.clientX-rect\.left\)\/rect\.width\)\*naturalWidth/);
  assert.match(source,/const remoteY=\(\(event\.clientY-rect\.top\)\/rect\.height\)\*naturalHeight/);
  assert.match(source,/__cerebroPointerMapped/);
  assert.match(source,/document\.addEventListener\('dblclick',remapPointer,true\)/);
});
