import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-dark-surfaces-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-23T00:00:00.000Z'}};
const nav={items:[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Informes',route:'/informes'}]};

async function boot(page:any){
 await page.addInitScript((s:any)=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');localStorage.setItem('fenix-theme','dark');localStorage.setItem('fenix-global-theme','dark');sessionStorage.setItem('fenix-theme','dark')},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async(r:any)=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-QA',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(nav)});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id:'i1',nombre:'Inmo QA',localidad:'Córdoba',estado:'Activa'}]})}));
 await page.route('**/functions/v1/fenix-reports-api-test/reports',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id:'r1',titulo:'Informe QA',categoria:'General'}]})}));
}

async function expectNotWhite(page:any,selector:string){
 const bg=await page.locator(selector).first().evaluate((el:any)=>getComputedStyle(el).backgroundColor);
 expect(bg).not.toBe('rgb(255, 255, 255)');
}

test('modo oscuro no deja tarjetas blancas ni en contenido ni en el footer compartido',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await boot(page);
 await page.goto('/inmobiliarias');
 await expect(page.locator('.inmo-root')).toHaveAttribute('data-theme','dark');
 await expectNotWhite(page,'.inmo-kpis article');
 await expectNotWhite(page,'.inmo-filter');
 await expectNotWhite(page,'.inmo-correct');
 await expect(page.locator('.ops-shared-quick')).toBeVisible();
 await expectNotWhite(page,'.ops-shared-quick .dir-quick-grid button');
 await page.goto('/informes');
 await expect(page.locator('.informes-root')).toHaveAttribute('data-theme','dark');
 await expectNotWhite(page,'.informes-kpis article');
 await expectNotWhite(page,'.informes-correct');
 await expect(page.locator('.ops-shared-quick')).toBeVisible();
 await expectNotWhite(page,'.ops-shared-quick .dir-quick-grid button');
});
