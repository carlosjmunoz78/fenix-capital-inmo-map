import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-evidence-mime-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-22T00:00:00.000Z'}};
const expediente='aaaaaaaa111141118111bbbbbbbbbbbb';

async function boot(page:any){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async(r:any)=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Documentación',route:'/documentacion'}]})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-notion-runtime-test/documentos',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
}

test.describe('Fénix PRE-PROD · MIME seguro de evidencia contextual',()=>{
 test('usa extensión conocida cuando el navegador no informa MIME',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page);
  const payloads:any[]=[];
  await page.route('**/functions/v1/fenix-evidence-universal-test/prepare',async r=>{payloads.push(r.request().postDataJSON());return r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'qa-stop-after-prepare'})});});
  await page.goto(`/documentacion?expediente=${expediente}&upload=1`);
  await page.locator('input[type=file]').setInputFiles({name:'vida-laboral.PDF',mimeType:'',buffer:Buffer.from('qa')});
  await expect.poll(()=>payloads.length).toBe(1);
  expect(payloads[0]).toMatchObject({origin_type:'expediente',origin_code:expediente,evidence_kind:'documento',filename:'vida-laboral.PDF',mime_type:'application/pdf'});
 });

 test('normaliza audio M4A compatible y lo clasifica como conversación',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page);
  const payloads:any[]=[];
  await page.route('**/functions/v1/fenix-evidence-universal-test/prepare',async r=>{payloads.push(r.request().postDataJSON());return r.fulfill({status:400,contentType:'application/json',body:'{}'});});
  await page.goto(`/documentacion?expediente=${expediente}&upload=1`);
  await page.locator('input[type=file]').setInputFiles({name:'llamada.m4a',mimeType:'audio/x-m4a',buffer:Buffer.from('qa-audio')});
  await expect.poll(()=>payloads.length).toBe(1);
  expect(payloads[0]).toMatchObject({evidence_kind:'audio_conversacion',mime_type:'audio/x-m4a'});
 });

 test('un tipo desconocido se conserva como binario y sí llega al backend universal',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page);
  const payloads:any[]=[];
  await page.route('**/functions/v1/fenix-evidence-universal-test/prepare',async r=>{payloads.push(r.request().postDataJSON());return r.fulfill({status:400,contentType:'application/json',body:'{}'});});
  await page.goto(`/documentacion?expediente=${expediente}&upload=1`);
  await page.locator('input[type=file]').setInputFiles({name:'archivo.binario-raro',mimeType:'application/octet-stream',buffer:Buffer.from('qa')});
  await expect.poll(()=>payloads.length).toBe(1);
  expect(payloads[0]).toMatchObject({evidence_kind:'documento',mime_type:'application/octet-stream',filename:'archivo.binario-raro'});
 });
});
