import {test,expect} from '@playwright/test';

const session={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhQGZlbml4LnRlc3QiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-communications-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-23T00:00:00.000Z'}};

async function boot(page:any,role:string){
 await page.addInitScript((s:any)=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true')},session);
 let commCalls=0;
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async(r:any)=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Direccion'?'DIR-QA':'FIN-QA',role})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'}]})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-communications-gateway-test/**',async(r:any)=>{commCalls++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});});
 await page.goto('/comunicaciones');
 return()=>commCalls;
}

test.describe('Fénix PRE-PROD · Comunicaciones reservadas a Dirección',()=>{
 test('Financiero no recibe formulario ni consulta el runtime de comunicaciones',async({page},testInfo)=>{if(!testInfo.project.name.includes('desktop'))test.skip();const calls=await boot(page,'Financiero');const root=page.locator('.ops-root').filter({has:page.getByRole('heading',{name:'Llamada, WhatsApp y Email'})});await expect(root).toBeVisible();await expect(root.getByText('Tu perfil no tiene acceso al módulo de Comunicaciones.',{exact:true})).toBeVisible();await expect(root.getByText('Vista previa exacta antes de actuar',{exact:true})).toHaveCount(0);await expect(root.getByRole('button',{name:/Preparar para revisión/})).toHaveCount(0);expect(calls()).toBe(0);});
 test('Dirección conserva el formulario controlado y la lectura autorizada',async({page},testInfo)=>{if(!testInfo.project.name.includes('desktop'))test.skip();const calls=await boot(page,'Direccion');const root=page.locator('.ops-root').filter({has:page.getByRole('heading',{name:'Llamada, WhatsApp y Email'})});await expect(root).toBeVisible();await expect(root.getByText('Vista previa exacta antes de actuar',{exact:true})).toBeVisible();await expect(root.getByRole('button',{name:/Preparar para revisión/})).toBeVisible();await expect.poll(calls).toBe(1);});
});
