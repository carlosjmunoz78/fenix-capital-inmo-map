import {test,expect} from '@playwright/test';
import {quoteInheritanceFee,quoteMortgageFee,quoteNewBuildFee} from '../src/fenixCommercialKnowledge';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-fees-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-29T00:00:00.000Z'}};

test('tarifario comercial canónico calcula solo categorías explícitas',()=>{
 expect(quoteMortgageFee(179999)?.baseEur).toBe(3500);
 expect(quoteMortgageFee(180000)?.baseEur).toBe(3600);
 expect(quoteMortgageFee(250000)?.baseEur).toBe(5000);
 expect(quoteMortgageFee(0)).toBeNull();
 expect(quoteNewBuildFee().baseEur).toBe(800);
 expect(quoteInheritanceFee('direct_1_2').baseEur).toBe(600);
 expect(quoteInheritanceFee('direct_3_plus').baseEur).toBe(800);
 expect(quoteInheritanceFee('with_indirect').baseEur).toBe(1000);
 expect(quoteInheritanceFee('complex_mixed').baseEur).toBe(1200);
});

test('controles clicables visibles tienen cursor y feedback de interacción global',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true')},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-QA',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Economía',route:'/economia'}]})});return r.fulfill({status:404,body:'{}'})});
 await page.route('**/functions/v1/fenix-notion-runtime-test/**',async r=>{const u=r.request().url();if(u.endsWith('/expedientes')||u.endsWith('/firmas'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});return r.fulfill({status:404,body:'{}'})});
 await page.goto('/economia');
 const button=page.locator('.eco-root button:not(:disabled)').first();
 await expect(button).toBeVisible();
 const style=await button.evaluate(el=>{const s=getComputedStyle(el);return{cursor:s.cursor,transitionDuration:s.transitionDuration}});
 expect(style.cursor).toBe('pointer');
 expect(style.transitionDuration).not.toBe('0s');
 await button.hover();
 const transform=await button.evaluate(el=>getComputedStyle(el).transform);
 expect(transform).not.toBe('none');
 await button.focus();
 await expect(button).toBeFocused();
});
