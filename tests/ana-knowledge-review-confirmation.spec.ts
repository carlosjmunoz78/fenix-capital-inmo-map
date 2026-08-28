import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-knowledge-review-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};
const item={id:'knowledge-page-1',title:'TEST conocimiento',detail:'Cuando una inmobiliaria pida seguimiento, registrar la próxima acción.',status:'Pendiente Dirección',domain:'Inmobiliarias B2B',authority:'Según dominio',source:'VIS-A · APP PRE-PROD',context:'inmobiliaria · INMO-1',key:'knowledge:test-1',date:'2026-08-28'};

async function boot(page:any){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Agenda',route:'/agenda'}]})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-ana-api-test/**',async r=>{const u=r.request().url();if(u.endsWith('/capabilities'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_correct_ana:true,can_view_learning_inbox:true,can_decide_learning:true}})});if(u.endsWith('/corrections'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});return r.fulfill({status:404,contentType:'application/json',body:'{}'});});
}

test.describe('Fénix PRE-PROD · revisión de conocimiento de Ana',()=>{
 test('no clasifica hasta revisión y confirmación',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page);
  let decisionPosts=0;
  await page.route('**/functions/v1/fenix-ana-knowledge-test/**',async r=>{
   const u=r.request().url(),method=r.request().method();
   if(u.endsWith('/review-pending')&&method==='GET')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,items:[item],blocked_count:1,actor:{actor_code:'DIR-TEST',role:'Direccion'},capabilities:{can_review:true}})});
   if(u.endsWith('/knowledge/knowledge-page-1/decision')&&method==='POST'){decisionPosts++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,decision_kind:'regla',canonical:true})});}
   return r.fulfill({status:404,contentType:'application/json',body:'{}'});
  });
  await page.goto('/ana');
  await expect(page.getByTestId('ana-knowledge-review')).toBeVisible();
  await expect(page.getByText('1 aportación pendiente queda reservada a otra autoridad.')).toBeVisible();
  await page.getByLabel('Comentario revisión knowledge-page-1').fill('Aplicar como criterio B2B general.');
  await page.getByRole('button',{name:'Regla canónica'}).click();
  expect(decisionPosts).toBe(0);
  await expect(page.getByTestId('knowledge-decision-preview')).toBeVisible();
  await expect(page.getByText('Aplicar como criterio B2B general.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Confirmar clasificación'}).click();
  await expect.poll(()=>decisionPosts).toBe(1);
 });
});
