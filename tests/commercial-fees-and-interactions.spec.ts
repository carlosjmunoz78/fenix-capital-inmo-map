import {test,expect} from '@playwright/test';
import {quoteInheritanceFee,quoteMortgageEconomics,quoteMortgageFee,quoteNewBuildFee} from '../src/fenixCommercialKnowledge';
import {buildEconomyProjection} from '../src/economyProjection';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-fees-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-29T00:00:00.000Z'}};

test('tarifario comercial canónico calcula categorías, 1100 por defecto y overrides negociados',()=>{
 expect(quoteMortgageFee(179999)?.baseEur).toBe(3500);
 expect(quoteMortgageFee(180000)?.baseEur).toBe(3600);
 expect(quoteMortgageFee(250000)?.baseEur).toBe(5000);
 expect(quoteMortgageFee(150000,3000)).toMatchObject({baseEur:3000,recommendedBaseEur:3500,overridden:true});
 expect(quoteMortgageFee(0)).toBeNull();
 expect(quoteNewBuildFee().baseEur).toBe(800);
 expect(quoteNewBuildFee(650)).toMatchObject({baseEur:650,recommendedBaseEur:800,overridden:true});
 expect(quoteInheritanceFee('direct_1_2').baseEur).toBe(600);
 expect(quoteInheritanceFee('direct_3_plus').baseEur).toBe(800);
 expect(quoteInheritanceFee('with_indirect').baseEur).toBe(1000);
 expect(quoteInheritanceFee('complex_mixed').baseEur).toBe(1200);
 expect(quoteInheritanceFee('with_indirect',850)).toMatchObject({baseEur:850,recommendedBaseEur:1000,overridden:true});
 expect(quoteMortgageEconomics(150000,{fromRealEstateAgency:true})).toMatchObject({grossBaseEur:3500,agencyCommissionEur:1100,fenixMarginBaseEur:2400,feeOverridden:false,commissionOverridden:false});
 expect(quoteMortgageEconomics(150000,{fromRealEstateAgency:true,agencyCommissionEur:900})).toMatchObject({grossBaseEur:3500,agencyCommissionEur:900,fenixMarginBaseEur:2600,commissionOverridden:true});
 expect(quoteMortgageEconomics(150000,{fromRealEstateAgency:true,negotiatedFeeEur:3000})).toMatchObject({grossBaseEur:3000,recommendedGrossBaseEur:3500,agencyCommissionEur:1100,fenixMarginBaseEur:1900,feeOverridden:true});
 expect(quoteMortgageEconomics(150000,{fromRealEstateAgency:false})).toMatchObject({grossBaseEur:3500,agencyCommissionEur:0,fenixMarginBaseEur:3500});
});

test('economía proyecta desde el alta, respeta negociación, resta comisión y saca caídos de cartera activa',()=>{
 const p=buildEconomyProjection([
  {id:'m1',importe_hipoteca:150000,origen:'Inmobiliaria',estado:'En curso'},
  {id:'m2',importe_hipoteca:200000,estado:'FEIN recibida'},
  {id:'m3',importe_hipoteca:150000,estado:'Caído'},
  {id:'m4',importe_hipoteca:150000,estado:'Firmado'},
  {id:'m5',importe_hipoteca:150000,estado:'En curso',honorarios_finales_eur:3000},
  {id:'m6',importe_hipoteca:150000,origen:'Inmobiliaria',estado:'En curso',honorarios_finales_eur:3000,comision_inmobiliaria_eur:800},
  {id:'demo-herencia-x',importe_hipoteca:999999,estado:'En curso'}
 ],[{id:'h1',numero_herederos_directos:2,estado:'En curso'},{id:'h2',numero_herederos_directos:2,estado:'En curso',honorarios_finales_eur:500}],[{id:'o1',estado:'En curso'},{id:'o2',estado:'En curso',honorarios_finales_eur:700}]);
 expect(p.active).toMatchObject({grossBaseEur:19600,marginBaseEur:17700,count:9});
 expect(p.advanced).toMatchObject({grossBaseEur:7500,marginBaseEur:7500,count:2});
 expect(p.signed).toMatchObject({grossBaseEur:3500,marginBaseEur:3500,count:1});
 expect(p.lost).toMatchObject({grossBaseEur:3500,marginBaseEur:3500,count:1});
 expect(p.collectionKnown).toBe(false);
});

test('controles clicables visibles tienen cursor y feedback de interacción global',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true')},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-QA',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Economía',route:'/economia'}]})});return r.fulfill({status:404,body:'{}'})});
 await page.route('**/functions/v1/fenix-notion-runtime-test/**',async r=>{const u=r.request().url();if(u.endsWith('/expedientes')||u.endsWith('/firmas'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});return r.fulfill({status:404,body:'{}'})});
 await page.route('**/functions/v1/fenix-special-cases-runtime-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.goto('/economia');
 const button=page.locator('.eco-ana-hero button:visible').first();
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
