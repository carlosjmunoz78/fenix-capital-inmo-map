import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJiYmJiYmJiYi1iYmJiLTRiYmItOGJiYi1iYmJiYmJiYmJiYmIiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-ana-knowledge-not-real',user:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST',full_name:'Dirección QA'},created_at:'2026-08-28T00:00:00.000Z'}};

async function boot(page:any){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
  const u=r.request().url();
  if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,context:{actor_code:'DIR-TEST',role:'Direccion'}})});
  if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,items:[{label:'Inicio',route:'/inicio'}]})});
  if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:0})});
  return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
}

test.describe('Fénix PRE-PROD · Dar conocimiento a Ana',()=>{
 test('no escribe hasta revisión y confirmación; historial usa el mismo canal canónico',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page);
  let posts=0,historyGets=0;
  await page.route('**/functions/v1/fenix-ana-knowledge-test/**',async r=>{
   const u=r.request().url(),method=r.request().method();
   if(u.endsWith('/recent')&&method==='GET'){
    historyGets++;
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,items:[{id:'k1',detail:'Regla ya aportada',status:'Pendiente Dirección',domain:'Operaciones',date:'2026-08-28'}]})});
   }
   if(u.endsWith('/knowledge')&&method==='POST'){
    posts++;
    return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,status:201,reused:false,authority:'Según dominio',domain:'Operaciones',knowledge_page_id:'k2',task_page_id:'t2'})});
   }
   return r.fulfill({status:404,contentType:'application/json',body:'{}'});
  });

  await page.goto('/inicio');
  const card=page.getByLabel('Dar conocimiento a Ana');
  await expect(card).toBeVisible();
  const input=card.getByPlaceholder('Escribe aquí lo que Ana debe saber o recordar…');
  await input.fill('Cuando ocurra X, actuar así.');
  await card.getByRole('button',{name:'Revisar antes de añadir'}).click();
  expect(posts).toBe(0);
  await expect(card.getByTestId('ana-knowledge-preview')).toBeVisible();

  await input.fill('Cuando ocurra X, validar Y antes de actuar.');
  await expect(card.getByTestId('ana-knowledge-preview')).toHaveCount(0);
  expect(posts).toBe(0);
  await card.getByRole('button',{name:'Revisar antes de añadir'}).click();
  await card.getByRole('button',{name:'Confirmar y añadir'}).click();
  await expect.poll(()=>posts).toBe(1);
  await expect(card.getByRole('status')).toContainText('Conocimiento registrado');

  await card.getByRole('button',{name:'Historial'}).click();
  await expect.poll(()=>historyGets).toBe(1);
  await expect(card.getByTestId('ana-knowledge-recent')).toContainText('Regla ya aportada');
 });
});
