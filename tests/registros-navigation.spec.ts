import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-registros-navigation-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-25T00:00:00.000Z'}};
const items=[
 {label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},{label:'Visitadores',route:'/visitadores'},{label:'Economía',route:'/economia'},{label:'Agenda',route:'/agenda'},{label:'Informes',route:'/informes'},{label:'Notarías',route:'/notarias'},{label:'Registros de la Propiedad',route:'/registros-propiedad'},{label:'Avisos',route:'/notificaciones'},{label:'Comunicaciones',route:'/comunicaciones'},{label:'Buscar',route:'/buscar'}
];

async function boot(page:any){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:0})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-ana-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_view_learning_inbox:false,can_correct_ana:true,can_decide_learning:false}})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',items:[]})}));
}
async function labels(page:any,selector:string){return page.locator(selector).getByRole('button').evaluateAll((nodes:any[])=>nodes.map(n=>(n.textContent||'').trim()).filter(Boolean));}

test('Registros de la Propiedad queda visible tras Notarías y abre su ruta autorizada',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await boot(page);
 await page.goto('/inicio');
 const menu=page.locator('.dir-sidebar .dir-nav');
 const registros=menu.getByRole('button',{name:'Registros de la Propiedad',exact:true});
 await expect(registros).toBeVisible();
 const homeLabels=await labels(page,'.dir-sidebar .dir-nav');
 expect(homeLabels.indexOf('Registros de la Propiedad')).toBe(homeLabels.indexOf('Notarías')+1);
 await registros.click();
 await expect(page).toHaveURL(/\/registros-propiedad$/);
 await expect(page.locator('[data-testid="property-registry-placeholder"]')).toBeVisible();
 const shell=page.locator('.ops-side nav');
 await expect(shell.getByRole('button',{name:'Registros de la Propiedad',exact:true})).toBeVisible();
 const shellLabels=await labels(page,'.ops-side nav');
 expect(shellLabels).toEqual(homeLabels);
});
