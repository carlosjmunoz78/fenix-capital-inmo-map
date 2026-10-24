import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-voice-visual-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'owner@fenix.test',app_metadata:{},user_metadata:{actor_code:'CARLOS-ADMIN',role:'Direccion'},created_at:'2026-10-13T00:00:00.000Z'}};

async function boot(page:any){
 await page.addInitScript(session=>{
  localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));
  localStorage.setItem('fenix-remember-device','true');
  (window as any).__cerebroVisualVoiceEvents=[];
  window.addEventListener('CEREBRO_VOICE_VISUAL_EVENT',(event:any)=>{(window as any).__cerebroVisualVoiceEvents.push(event.detail)});
  let recognitionStarts=0;
  class FakeRecognition{lang='';continuous=false;interimResults=false;maxAlternatives=1;phrases:any[]=[];onstart:any=null;onresult:any=null;onerror:any=null;onend:any=null;start(){recognitionStarts+=1;this.onstart?.({});setTimeout(()=>{if(recognitionStarts===1)this.onresult?.({results:{length:1,0:{length:1,isFinal:true,0:{transcript:'consulta hablada exacta',confidence:.99}}}});this.onend?.({});},12)}stop(){this.onend?.({})}abort(){}}
  ;(window as any).SpeechRecognition=FakeRecognition;(window as any).webkitSpeechRecognition=FakeRecognition;
 },fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
  const url=r.request().url(),method=r.request().method();
  if(url.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Direccion'})});
  if(url.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Ana',route:'/ana'},{label:'CEREBRO',route:'/cerebro'}]})});
  if(url.includes('/chat?limit=')&&method==='GET')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:200,items:[]})});
  return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.route('**/functions/v1/fenix-ana-api-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_ana_help:true,can_manual_execute:true,can_upload_evidence:false,can_correct_ana:true,can_view_learning_inbox:false,can_decide_learning:false,ana_execute_requires_action_context:true}})}));
 await page.route('**/functions/v1/cerebro-console-gateway-v0/health',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',environment:'PROD',version:'v33',authenticated_transport:true,direct_model_access:false,prod_execution_enabled:false,live_writes:false,chat_available:true,chat_mode:'OWNER_DECISION_BY_EXCEPTION_V1'})}));
 await page.route('**/functions/v1/cerebro-console-gateway-v0/preferences',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'OK',preferences:{speech_rate:'1.08',speech_pitch:'1.04'}})}));
 await page.route('**/functions/v1/cerebro-console-gateway-v0/chat',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'OK',message:'respuesta de CEREBRO por el contrato textual',executed:false})}));
}

test.describe('VOICE-001 → Visual Motion semantic bridge',()=>{
 test('canonical Console voice emits observe-only event sequence without changing /chat',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page);
  const bodies:any[]=[];
  await page.route('**/functions/v1/cerebro-console-gateway-v0/chat',async r=>{bodies.push(r.request().postDataJSON());await new Promise(resolve=>setTimeout(resolve,80));return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'OK',message:'respuesta de CEREBRO por el contrato textual',executed:false})})});
  await page.goto('/cerebro');
  const ui=page.locator('main.cerebro-console');
  await expect(ui).toBeVisible();
  await ui.getByRole('button',{name:'Hablar con CEREBRO'}).click();
  await expect(ui).toContainText('respuesta de CEREBRO por el contrato textual');
  await page.waitForFunction(()=>((window as any).__cerebroVisualVoiceEvents||[]).some((e:any)=>e.type==='VOICE_RESPONSE_READY'));

  const beforeEnd=await page.evaluate(()=>({events:(window as any).__cerebroVisualVoiceEvents,bridge:(window as any).CEREBRO_VOICE_VISUAL_EVENT_BRIDGE}));
  const types=beforeEnd.events.map((event:any)=>event.type);
  for(const required of ['VOICE_SESSION_START','VOICE_LISTEN_START','VOICE_INTENT','VOICE_RESPONSE_START','VOICE_RESPONSE_READY'])expect(types).toContain(required);
  expect(types.indexOf('VOICE_SESSION_START')).toBeLessThan(types.indexOf('VOICE_LISTEN_START'));
  expect(types.indexOf('VOICE_INTENT')).toBeLessThan(types.indexOf('VOICE_RESPONSE_START'));
  expect(types.indexOf('VOICE_RESPONSE_START')).toBeLessThan(types.indexOf('VOICE_RESPONSE_READY'));
  const intent=beforeEnd.events.find((event:any)=>event.type==='VOICE_INTENT');
  expect(intent.text).toBe('consulta hablada exacta');
  expect(intent.targetCluster).toBe(4);
  expect(intent.targetReason).toBe('VOICE_CHANNEL_COMMS_DEFAULT');
  expect(beforeEnd.bridge.prod_authorized).toBe(false);
  expect(beforeEnd.bridge.authority).toBe('OBSERVE_ONLY');
  expect(beforeEnd.bridge.source).toBe('CEREBRO_CONSOLE_DOM_V1');
  expect(bodies).toHaveLength(1);
  expect(bodies[0].message).toBe('consulta hablada exacta');

  await ui.getByRole('button',{name:'Finalizar conversación'}).click();
  await page.waitForFunction(()=>((window as any).__cerebroVisualVoiceEvents||[]).some((e:any)=>e.type==='VOICE_END'));
  const afterEnd=await page.evaluate(()=>(window as any).__cerebroVisualVoiceEvents);
  expect(afterEnd.at(-1).type).toBe('VOICE_END');
 });
});
