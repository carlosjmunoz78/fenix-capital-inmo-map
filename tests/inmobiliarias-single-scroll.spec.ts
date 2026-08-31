import {test,expect} from '@playwright/test';

const fakeSession={
  access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-single-scroll-not-real',
  user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{full_name:'Belén Muñoz'},created_at:'2026-08-23T00:00:00.000Z'}
};
const navigation={items:[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Informes',route:'/informes'}]};

test('Inmobiliarias no crea scroll vertical en body y desplaza solo ops-main',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(navigation)});return r.fulfill({status:404,body:'{}'});});
  await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:Array.from({length:40},(_,i)=>({id:`inmo-${i}`,inmobiliaria:`Inmobiliaria ${i}`,localidad:'Córdoba',estado:'Activa'}))})}));
  await page.goto('/inmobiliarias');
  await expect(page.locator('.inmo-root')).toBeVisible();
  const metrics=await page.evaluate(()=>{const main=document.querySelector('.inmo-root>.ops-main') as HTMLElement|null;const root=document.querySelector('.inmo-root') as HTMLElement|null;return{bodyScroll:document.documentElement.scrollHeight>window.innerHeight||document.body.scrollHeight>window.innerHeight,rootOverflow:root?getComputedStyle(root).overflow:'',mainOverflow:main?getComputedStyle(main).overflowY:'',mainScrollable:Boolean(main&&main.scrollHeight>main.clientHeight)}});
  expect(metrics.bodyScroll).toBe(false);
  expect(metrics.rootOverflow).toBe('hidden');
  expect(metrics.mainOverflow).toBe('auto');
  expect(metrics.mainScrollable).toBe(true);
  const main=page.locator('.inmo-root>.ops-main');
  await main.evaluate(el=>{el.scrollTop=700});
  await expect.poll(()=>main.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.scrollY)).toBe(0);
});
