import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-firma-create-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};
const navigation=[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Firmas',route:'/firmas'}];

test('Nueva firma usa el hero canónico de Ana sin tarjeta lateral incrustada',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:navigation})});return r.fulfill({status:404,body:'{}'});});
 await page.goto('/firmas/nuevo');
 const hero=page.getByTestId('firma-create-ana-canonical');
 await expect(hero).toBeVisible();
 await expect(hero.locator(':scope > .inmo-ana-photo')).toHaveCount(1);
 await expect(hero.locator(':scope > .inmo-ana-body')).toHaveCount(1);
 await expect(hero.locator(':scope > .inmo-correct')).toHaveCount(0);
 await expect(page.getByTestId('firma-create-safety-control')).toBeVisible();
 await expect(hero.getByRole('img',{name:'Ana'})).toBeVisible();
});
