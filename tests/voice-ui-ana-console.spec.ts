import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-voice-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'owner@fenix.test',app_metadata:{},user_metadata:{actor_code:'CARLOS-ADMIN',role:'Direccion'},created_at:'2026-10-13T00:00:00.000Z'}};

async function boot(page:any){
 await page.addInitScript(session=>{
   localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));
   localStorage.setItem('fenix-remember-device','true');
   class FakeRecognition{
     lang='';continuous=false;interimResults=false;maxAlternatives=1;phrases:any[]=[];onstart:any=null;onresult:any=null;onerror:any=null;onend:any=null;
     start(){this.onstart?.({});setTimeout(()=>{this.onresult?.({results:{length:1,0:{length:1,isFinal:true,0:{transcript:'consulta hablada exacta',confidence:.99}}}});this.onend?.({});},5)}
     stop(){this.onend?.({})} abort(){}
   }
   ;(window as any).SpeechRecognition=FakeRecognition;(window as any).webkitSpeechRecognition=FakeRecognition;
 },fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
   const url=r.request().url(),method=r.request().method();
   if(url.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Direccion'})});
   if(url.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Ana',route:'/ana'},{label:'CEREBRO',route:'/cerebro'}]})});
   if(url.endsWith('/v2/ana/knowledge/answer')&&method==='POST')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,message:'respuesta de Ana por el contrato textual',prod_authority_changed:false})});
   if(url.includes('/chat?limit=')&&method==='GET')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:200,items:[]})});
   return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.route('**/functions/v1/fenix-ana-api-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_ana_help:true,can_manual_execute:true,can_upload_evidence:false,can_correct_ana:true,can_view_learning_inbox:false,can_decide_learning:false,ana_execute_requires_action_context:true}})}));
 await page.route('**/functions/v1/cerebro-console-gateway-v0/preferences',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'OK',preferences:{speech_rate:'1.08',speech_pitch:'1.04'}})}));
 await page.route('**/functions/v1/cerebro-console-gateway-v0/chat',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'OK',message:'respuesta de CEREBRO por el contrato textual',executed:false})}));
}

test.describe('CEREBRO · VOICE-001 · Ana + Console',()=>{
 test('Ana voz usa exactamente el mismo endpoint de conocimiento que Ana texto',async({page},testInfo)=>{
   if(!testInfo.project.name.includes('desktop'))test.skip();
   await boot(page);
   const bodies:any[]=[];
   page.on('request',request=>{if(request.url().includes('/v2/ana/knowledge/answer')&&request.method()==='POST')bodies.push(request.postDataJSON())});
   await page.goto('/ana');
   const card=page.getByTestId('ana-voice-query');
   await expect(card).toBeVisible();
   await card.getByRole('button',{name:'Hablar'}).click();
   await expect(card).toContainText('respuesta de Ana por el contrato textual');
   expect(bodies).toHaveLength(1);
   expect(bodies[0]).toEqual({question:'consulta hablada exacta'});
 });

 test('Console voz reutiliza /chat y conserva el contexto conversacional textual',async({page},testInfo)=>{
   if(!testInfo.project.name.includes('desktop'))test.skip();
   await boot(page);
   const bodies:any[]=[];
   await page.route('**/functions/v1/cerebro-console-gateway-v0/chat',async r=>{bodies.push(r.request().postDataJSON());return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'OK',message:'respuesta de CEREBRO por el contrato textual',executed:false})})});
   await page.goto('/cerebro');
   const consoleUi=page.getByTestId('cerebro-console');
   await expect(consoleUi).toBeVisible();
   await consoleUi.getByRole('button',{name:'Hablar'}).click();
   await expect(consoleUi).toContainText('respuesta de CEREBRO por el contrato textual');
   expect(bodies).toHaveLength(1);
   expect(bodies[0].message).toBe('consulta hablada exacta');
   expect(bodies[0].conversation_context.at(-1)).toEqual({role:'user',text:'consulta hablada exacta'});
 });

 test('sin reconocimiento de voz ambos canales conservan el envío por texto',async({page},testInfo)=>{
   if(!testInfo.project.name.includes('desktop'))test.skip();
   await boot(page);
   await page.addInitScript(()=>{delete (window as any).SpeechRecognition;delete (window as any).webkitSpeechRecognition});
   await page.goto('/cerebro');
   const consoleUi=page.getByTestId('cerebro-console');
   await consoleUi.getByLabel('Mensaje para CEREBRO').fill('consulta escrita exacta');
   await consoleUi.getByRole('button',{name:'Enviar'}).click();
   await expect(consoleUi).toContainText('respuesta de CEREBRO por el contrato textual');
   await page.goto('/ana');
   const ana=page.getByTestId('ana-voice-query');
   await expect(ana.getByRole('button',{name:'Hablar'})).toBeDisabled();
   await ana.getByLabel('Consulta a Ana').fill('consulta escrita intacta');
   await expect(ana.getByRole('button',{name:'Enviar'})).toBeEnabled();
 });
});
