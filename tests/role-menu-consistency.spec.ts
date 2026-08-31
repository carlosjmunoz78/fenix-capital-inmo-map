import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-menu-consistency-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-23T00:00:00.000Z'}};
const items=[
 {label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},{label:'Visitadores',route:'/visitadores'},{label:'Obras Nuevas',route:'/obras-nuevas'},{label:'Herencias',route:'/herencias'},{label:'Agenda',route:'/agenda'},{label:'Economía',route:'/economia'},{label:'Informes',route:'/informes'},{label:'Notarías',route:'/notarias'},{label:'Registros de la Propiedad',route:'/registros-propiedad'},{label:'Comunicaciones',route:'/comunicaciones'},{label:'Notificaciones',route:'/notificaciones'}
];

async function boot(page:any){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:0})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-ana-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_view_learning_inbox:false,can_correct_ana:true,can_decide_learning:false}})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',items:[]})}));
 await page.route('**/functions/v1/fenix-reports-api-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.route('**/functions/v1/fenix-communications-gateway-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
}
async function labels(page:any,selector:string){return page.locator(selector).getByRole('button').evaluateAll((nodes:any[])=>nodes.map(n=>(n.textContent||'').trim()).filter(Boolean));}
async function waitFullMenu(page:any,selector:string){await expect(page.locator(selector).getByRole('button',{name:'Inmobiliarias',exact:true})).toBeVisible();await expect(page.locator(selector).getByRole('button',{name:'Notificaciones',exact:true})).toBeVisible();}

async function expectUnifiedAnaCorrection(page:any){
 const block=page.getByTestId('ana-top-correction');
 await expect(block).toBeVisible();
 await expect(block.getByRole('heading',{name:'¿En qué me equivoco?',exact:true})).toBeVisible();
 await expect(block.getByLabel('Corrección para Ana')).toBeVisible();
}

test('Dirección conserva exactamente el mismo menú aprobado en Inicio, Inmobiliarias, Informes, Comunicaciones y Ana',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await boot(page);
 await page.goto('/inicio');
 await waitFullMenu(page,'.dir-sidebar .dir-nav');
 const home=await labels(page,'.dir-sidebar .dir-nav');
 expect(home).toEqual(items.map(x=>x.label));
 await page.goto('/inmobiliarias');
 await waitFullMenu(page,'.ops-side nav');
 const inmo=await labels(page,'.ops-side nav');
 expect(inmo).toEqual(items.map(x=>x.label));
 await expectUnifiedAnaCorrection(page);
 await page.goto('/informes');
 await waitFullMenu(page,'.ops-side nav');
 const informes=await labels(page,'.ops-side nav');
 expect(informes).toEqual(items.map(x=>x.label));
 await expect(page.locator('.informes-root .ops-top')).toBeVisible();
 await expect(page.locator('.informes-ana-hero')).toBeVisible();
 await expectUnifiedAnaCorrection(page);
 await expect(page.locator('.informes-correct')).toBeHidden();
 await page.goto('/comunicaciones');
 await waitFullMenu(page,'.ops-side nav');
 const comunicaciones=await labels(page,'.ops-side nav');
 expect(comunicaciones).toEqual(items.map(x=>x.label));
 await expect(page.locator('.comm-root .ops-top')).toBeVisible();
 await expect(page.locator('.comm-ana-hero')).toBeVisible();
 await expectUnifiedAnaCorrection(page);
 await expect(page.locator('.comm-correct')).toBeHidden();
 await page.goto('/ana');
 await waitFullMenu(page,'.ops-side nav');
 const ana=await labels(page,'.ops-side nav');
 expect(ana).toEqual(items.map(x=>x.label));
});
