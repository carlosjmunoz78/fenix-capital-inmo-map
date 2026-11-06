import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectJarvisGreeting} from '../src/jarvisOwnerDialogueProbe.ts';

const correct={status:'OK',intent:'greeting',executed:false,message:'A su disposición, señor. ¿Qué desea que revise?'};
test('CUT46 owner click safe greeting: expected executive result',async()=>{
 let calls=0;
 const r=await inspectJarvisGreeting(async message=>{calls++;assert.equal(message,'hola');return {status:200,data:correct}});
 assert.equal(calls,1);assert.equal(r.status,'PASS');assert.equal(r.voice_verified,false);
});
test('CUT46 old PROD greeting with "guapo" is explicitly rejected',async()=>{
 const r=await inspectJarvisGreeting(async()=>({status:200,data:{...correct,message:'Hola Carlos. ¿Qué tal guapo? Dime, ¿qué hacemos?'}}));
 assert.equal(r.status,'PERSONA_MISMATCH');
});
test('CUT46 a friendly but non-executive greeting is not accepted',async()=>{
 assert.equal((await inspectJarvisGreeting(async()=>({status:200,data:{...correct,message:'Hola, aquí estoy.'}}))).status,'PERSONA_MISMATCH');
});
test('CUT46 never passes off a declined or unauthorized action as greeting',async()=>{
 for(const data of [{...correct,executed:true},{...correct,action:{action_type:'something'}},{...correct,intent:'email_send'}]){
  const r=await inspectJarvisGreeting(async()=>({status:200,data}));
  assert.equal(r.status,'PERSONA_MISMATCH');
 }
});
test('CUT46 expired/absent owner JWT fails closed',async()=>{
 for(const status of [401,403])assert.equal((await inspectJarvisGreeting(async()=>({status,data:null}))).status,'AUTH_REQUIRED');
 assert.equal((await inspectJarvisGreeting(async()=>{throw new Error('offline')})).status,'GATEWAY_UNAVAILABLE');
});
test('CUT46 the UI only calls the smoke test by explicit button click',()=>{
 const component=readFileSync(new URL('../src/JarvisOwnerDialogueCheck.tsx',import.meta.url),'utf8');
 assert.match(component,/onClick=\{\(\)=>void check\(\)\}/);
 assert.doesNotMatch(component,/useEffect\(\(\)=>\{[^\n]+inspectJarvisGreeting/);
 assert.match(component,/postCerebroConsoleChat/);
 assert.doesNotMatch(component,/service_role|api\.deepseek\.com|setInterval\(/);
 const gateway=readFileSync(new URL('../supabase/functions/cerebro-console-gateway-v0/index.ts',import.meta.url),'utf8');
 assert.match(gateway,/if\(text\.length<10\|\|text\.length>2000\)return false/);
});
