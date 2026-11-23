import test from 'node:test';
import assert from 'node:assert/strict';
import {fromGatewayResponse,fromLegacyConsoleText} from '../src/jarvis-deepseek-lab/JarvisResponseContract.ts';

test('Direct React contract consumes existing Gateway payload without network',()=>{
 const msg=fromGatewayResponse({message:'## **Córdoba**'});
 assert.deepEqual(msg,{role:'cerebro',text:'## **Córdoba**',source:'gateway-response'});
});
test('Invalid or missing Gateway messages fail closed for the rich renderer',()=>{
 for(const source of [null,undefined,{message:''},{message:'   '},{message:null},{message:12}]){
  assert.equal(fromGatewayResponse(source),null);
 }
});
test('Legacy LAB bridge is explicitly distinguished from verified Gateway data',()=>{
 assert.deepEqual(fromLegacyConsoleText('Hola'),{role:'cerebro',text:'Hola',source:'legacy-console-lab'});
 assert.equal(fromLegacyConsoleText(null),null);
});
test('No truncation or hidden transformation of large Gateway text',()=>{
 const message='A'.repeat(124000);
 assert.equal(fromGatewayResponse({message})?.text.length,124000);
});
test('Escaped HTML remains data in the presentation contract',()=>{
 const message='<img src=x onerror=alert(1)>';
 assert.equal(fromGatewayResponse({message})?.text,message);
});
