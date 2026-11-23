import test from 'node:test';
import assert from 'node:assert/strict';
import {parseInlineSafe,parseSafeMarkdown} from '../src/jarvis-deepseek-lab/markdownSafe.ts';

test('Parser LAB: headings, lists, quote and fenced code',()=>{
 const mark=['## Cabecera','','- Uno','- Dos','','> Cita','','\x60'.repeat(3)+'html','<script>alert(1)</script>','\x60'.repeat(3)].join('\n');
 const b=parseSafeMarkdown(mark);
 assert.deepEqual(b.map(x=>x.kind),['heading','list','quote','code']);
 assert.equal(b[1].items.length,2);
 assert.equal(b[3].content,'<script>alert(1)</script>');
});
test('HTML untrusted remains literal text',()=>{
 const b=parseSafeMarkdown('<img src=x onerror=alert(1)>');
 assert.equal(b[0].kind,'paragraph');
 assert.equal(b[0].content,'<img src=x onerror=alert(1)>');
});
test('Inline emphasis and code are separate tokens',()=>{
 const b=parseInlineSafe('**dos** *tres* '+ '\x60cuatro\x60');
 assert.deepEqual(b.filter(x=>x.type!=='text').map(x=>x.type),['strong','em','code']);
});
test('Untrusted Markdown link remains a candidate for safety check',()=>{
 const b=parseInlineSafe('[Fuente](https://example.org/info) [Peligro](javascript:alert)');
 assert.equal(b[0].type,'link');
 assert.equal(b[0].href,'https://example.org/info');
 assert.ok(b.some(x=>x.type==='link'&&x.href==='javascript:alert'));
});
test('Autolink preserves punctuation',()=>{
 const b=parseInlineSafe('Mira https://example.org/a.');
 assert.deepEqual(b.map(x=>x.type),['text','link','text']);
 assert.equal(b[1].value,'https://example.org/a');
 assert.equal(b[2].value,'.');
});
test('Unicode and line breaks survive unchanged',()=>{
 const original='Córdoba y Jaén\nlínea dos';
 assert.equal(parseSafeMarkdown(original)[0].content,original);
});
test('Large replies never silently truncate',()=>{
 const input='x'.repeat(120001);
 const parsed=parseSafeMarkdown(input);
 assert.equal(parsed.length,1);
 assert.equal(parsed[0].content.length,input.length);
});
test('Malformed image syntax is rendered as text or safe links, not an image',()=>{
 const input='![img](data:text/html,<svg/onload=alert(1)>)';
 assert.equal(parseSafeMarkdown(input)[0].kind,'paragraph');
});
