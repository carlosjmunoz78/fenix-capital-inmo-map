import {test,expect} from '@playwright/test';

const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJiYmJiYmJiYi1iYmJiLTRiYmItOGJiYi1iYmJiYmJiYmJiYmJiIiwiZW1haWwiOiJxYS1yZXNwb25zaXZlQGZlbml4LnRlc3QiLCJleHAiOjE5OTk5OTk5OTl9.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-responsive-not-real',
 user:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',aud:'authenticated',role:'authenticated',email:'qa-responsive@fenix.test',app_metadata:{},user_metadata:{full_name:'QA Responsive'},created_at:'2026-08-29T00:00:00.000Z'}
};

async function boot(page:any){
 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');},session);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
  const u=r.request().url();
  if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'FIN-R',role:'Financiero'})});
  if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Agenda',route:'/agenda'}]})});
  return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
}

test('navegación se adapta en 360, 390, 768, 820, 1024 y desktop',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await boot(page);
 await page.goto('/expedientes');
 const shell=page.locator('.ops-root');
 await expect(shell).toBeVisible();

 for(const width of [360,390]){
  await page.setViewportSize({width,height:844});
  const menu=shell.getByRole('button',{name:'Abrir menú'});
  await expect(menu,`hamburguesa visible a ${width}px`).toBeVisible();
  await expect(shell.locator(':scope > .ops-side'),`sidebar desktop oculto a ${width}px`).toBeHidden();
  await menu.click();
  await expect(page.getByRole('dialog',{name:'Navegación principal'}),`drawer visible a ${width}px`).toBeVisible();
  await expect(page.getByRole('dialog',{name:'Navegación principal'}).getByRole('button',{name:'Expedientes',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(shell).toHaveAttribute('data-mobile-nav','closed');
 }

 for(const width of [768,820,1024,1440]){
  await page.setViewportSize({width,height:900});
  await expect(shell.getByRole('button',{name:'Abrir menú'}),`hamburguesa oculta a ${width}px`).toBeHidden();
  const sidebar=shell.locator(':scope > .ops-side');
  await expect(sidebar,`sidebar visible a ${width}px`).toBeVisible();
  const box=await sidebar.boundingBox();
  expect(box?.width||0,`sidebar con anchura útil a ${width}px`).toBeGreaterThan(80);
  await expect(sidebar.getByRole('button',{name:'Expedientes',exact:true})).toBeVisible();
 }
});
