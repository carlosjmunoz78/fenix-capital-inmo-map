import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-ana-learning-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};
const correction={correction_code:'corr-1',created_by_actor_code:'FIN-A',scope_type:'expediente',scope_code:'exp-1',ana_suggestion:'Enviar mensaje',user_reason:'Falta validar dato',proposed_rule:'Validar dato antes de contactar',status:'Pendiente',version:3};

async function boot(page:any){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Agenda',route:'/agenda'},{label:'Contactos',route:'/contactos'}]})});return r.fulfill({status:404,body:'{}'});});
}

test.describe('Fénix PRE-PROD · gates de aprendizaje de Ana',()=>{
 test('corrección y clasificación no escriben hasta revisión y confirmación',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page);
  let correctionPosts=0,decisionPosts=0;
  await page.route('**/functions/v1/fenix-ana-api-test/**',async r=>{
    const u=r.request().url(),method=r.request().method();
    if(u.endsWith('/capabilities'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_correct_ana:true,can_view_learning_inbox:true,can_decide_learning:true}})});
    if(u.endsWith('/corrections')&&method==='GET')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[correction]})});
    if(u.endsWith('/corrections')&&method==='POST'){correctionPosts++;return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true})});}
    if(u.endsWith('/corrections/corr-1/decision')&&method==='POST'){decisionPosts++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});}
    return r.fulfill({status:404,contentType:'application/json',body:'{}'});
  });
  await page.goto('/ana?scope_type=expediente&scope_code=exp-1');
  await page.getByLabel('¿Qué sugirió Ana?').fill('Enviar ahora');
  await page.getByLabel('¿Por qué no debe hacerse así?').fill('Falta validar identidad');
  await page.getByRole('button',{name:'Revisar antes de guardar'}).click();
  expect(correctionPosts).toBe(0);
  await expect(page.getByTestId('ana-correction-preview')).toBeVisible();
  await page.getByLabel('Posible criterio o aprendizaje (opcional)').fill('Validar identidad primero');
  await expect(page.getByTestId('ana-correction-preview')).toHaveCount(0);
  expect(correctionPosts).toBe(0);
  await page.getByRole('button',{name:'Revisar antes de guardar'}).click();
  await page.getByRole('button',{name:'Confirmar y guardar'}).click();
  await expect.poll(()=>correctionPosts).toBe(1);

  await page.getByLabel('Comentario Belén corr-1').fill('Aplicar solo con identidad validada');
  await page.getByRole('button',{name:'Criterio general',exact:true}).click();
  expect(decisionPosts).toBe(0);
  await expect(page.getByTestId('ana-decision-preview')).toBeVisible();
  await expect(page.getByText('Aplicar solo con identidad validada',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Confirmar clasificación'}).click();
  await expect.poll(()=>decisionPosts).toBe(1);
 });
});
