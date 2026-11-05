import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const raw=readFileSync(new URL('../../../src/cerebroFreeBrowserVoice.ts',import.meta.url),'utf8');
const js=stripTypeScriptTypes(raw,{mode:'strip'});
const{selectCerebroFreeBrowserVoice}=await import('data:text/javascript,'+encodeURIComponent(js));
const v=(name,lang,localService=false)=>({name,lang,localService});
test('Google Spanish Spain preferred over OS even if OS is feminine',()=>{
 const r=selectCerebroFreeBrowserVoice([v('Microsoft Helena','es-ES',true),v('Google español de España','es-ES',false)]);
 assert.equal(r.name,'Google español de España');
});
test('Google Spain preferred over Google Latin America',()=>{
 const r=selectCerebroFreeBrowserVoice([v('Google español latino','es-MX'),v('Google español de España','es-ES')]);
 assert.equal(r.lang,'es-ES');
});
test('OS es-ES fallback when Google absent',()=>{
 assert.equal(selectCerebroFreeBrowserVoice([v('English US','en-US'),v('Microsoft Helena','es-ES')]).lang,'es-ES');
});
test('Spanish other region fallback only when Spain missing',()=>{
 assert.equal(selectCerebroFreeBrowserVoice([v('Español México','es-MX')]).lang,'es-MX');
});
test('no Spanish voice does not invent Google',()=>{
 assert.equal(selectCerebroFreeBrowserVoice([v('English US','en-US')]),undefined);
});
test('empty voice list fail closed',()=>{
 assert.equal(selectCerebroFreeBrowserVoice([]),undefined);
});
test('stable order for equal candidates',()=>{
 assert.equal(selectCerebroFreeBrowserVoice([v('Voice A','es-ES'),v('Voice B','es-ES')]).name,'Voice A');
});
