import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=(path)=>fs.readFile(new URL(`../../${path}`,import.meta.url),'utf8');

test('Browser viewer fills the complete governed viewport',async()=>{
  const css=await read('public/browser-ergonomics-v1.css');
  assert.match(css,/\.cerebro-browser-viewport>img\{[^}]*width:100%!important;[^}]*height:100%!important;[^}]*object-fit:fill!important/);
  assert.match(css,/cerebro-browser-frame--expanded \.cerebro-browser-viewport img\{object-fit:fill!important\}/);
});

test('Human typing is batched before React so normal typing is not serialized character by character',async()=>{
  const js=await read('public/browser-ergonomics-v1.js');
  assert.match(js,/const TEXT_BATCH_MS=180/);
  assert.match(js,/__cerebroTypingBatch/);
  assert.match(js,/state\.value=`\$\{state\.value\}\$\{event\.key\}`\.slice\(0,4000\)/);
  assert.match(js,/document\.addEventListener\('paste'/);
});

test('Full-size stretching preserves remote click coordinates',async()=>{
  const js=await read('public/browser-ergonomics-v1.js');
  assert.match(js,/const x=\(\(event\.clientX-rect\.left\)\/rect\.width\)\*naturalWidth/);
  assert.match(js,/const y=\(\(event\.clientY-rect\.top\)\/rect\.height\)\*naturalHeight/);
  assert.match(js,/__cerebroPointerMapped/);
  assert.match(js,/document\.addEventListener\('dblclick',remapPointer,true\)/);
});
