import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ATTACHMENT_LIMITS,composeCerebroMessage,detectAttachmentKind,sanitizeAttachmentText} from '../../src/cerebroAttachments.ts';

const sample=(overrides={})=>({id:'a1',name:'datos.csv',mime:'text/csv',size:128,kind:'text',sha256:'0123456789abcdef'.repeat(4),text:'nombre,valor\nuno,1',truncated:false,...overrides});

test('recognizes the governed local document formats',()=>{
 assert.equal(detectAttachmentKind('nota.md','text/markdown'),'text');
 assert.equal(detectAttachmentKind('contrato.docx',''),'docx');
 assert.equal(detectAttachmentKind('cuadro.xlsx',''),'xlsx');
 assert.equal(detectAttachmentKind('informe.pdf','application/pdf'),'pdf');
 assert.equal(detectAttachmentKind('captura.png','image/png'),null);
});

test('sanitizes and bounds extracted text',()=>{
 const out=sanitizeAttachmentText(`a\u0000\n\n\n\n${'x'.repeat(4000)}`,120);
 assert.equal(out.text.includes('\u0000'),false);
 assert.equal(out.text.length,120);
 assert.equal(out.truncated,true);
});

test('composes attachments through the existing text gateway with hard headroom',()=>{
 const huge='x'.repeat(20000);
 const message=composeCerebroMessage('Analiza esto',[sample({text:huge,truncated:true}),sample({id:'a2',name:'otro.txt',text:huge})]);
 assert.ok(message.includes('CONTEXTO DE ARCHIVOS ADJUNTOS'));
 assert.ok(message.includes('sha256='));
 assert.ok(message.length<=ATTACHMENT_LIMITS.maxGatewayChars);
 assert.ok(ATTACHMENT_LIMITS.maxGatewayChars<12000);
});

test('attachment-only orders receive an explicit analysis instruction',()=>{
 const message=composeCerebroMessage('',[sample()]);
 assert.match(message,/Analiza los archivos adjuntos/);
 assert.match(message,/datos\.csv/);
});

test('source contract is local-only and does not create a parallel upload channel',()=>{
 const helper=fs.readFileSync(new URL('../../src/cerebroAttachments.ts',import.meta.url),'utf8');
 const bridge=fs.readFileSync(new URL('../../src/CerebroAttachmentBridge.tsx',import.meta.url),'utf8');
 assert.equal(/supabase\.storage|storage\.from|FormData\s*\(|fetch\s*\(/i.test(`${helper}\n${bridge}`),false);
 assert.match(bridge,/\.cerebro-chat-form/);
 assert.match(bridge,/form\.requestSubmit\(\)/);
 assert.match(helper,/maxFileBytes:5\*1024\*1024/);
 assert.match(helper,/maxTotalBytes:12\*1024\*1024/);
});
