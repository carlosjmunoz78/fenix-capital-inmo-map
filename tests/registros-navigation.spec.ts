import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-registros-navigation-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-25T00:00:00.000Z'}};
const items=[
 {label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},{label:'Visitadores',route:'/visitadores'},{label:'Economía',route:'/economia'},{label:'Agenda',route:'/agenda'},{label:'Informes',route:'/informes'},{label:'Notarías',route:'/notarias'},{label:'Registros de la Propiedad',route:'/registros-propiedad'},{label:'Avisos',route:'/notificaciones'},{label:'Comunicaciones',route:'/comunicaciones'},{label:'Buscar',route:'/buscar'}
];
const registryId='3c681b1a-756d-8140-a690-f422a9251c37';
const registros=[{id:registryId,registro:'Registro de la Propiedad de Cabra',activo:true,numero:'1',direccion:'Av. de ejemplo, 1',cp:'14940',municipio_sede:'Cabra',provincia:'Córdoba',municipios_cubiertos:'Cabra · Doña Mencía',registrador:'Profesional de prueba',telefono:'957 000 000',email:'registro@example.test',horario:'09:00–14:00',servicios_telematicos:'Nota simple · certificaciones',cita_online:true,nivel_verificacion:'A',ultima_revision:'2026-08-25',notas:'Ficha QA'}];
const personal=[{id:'3c681b1a-756d-9000-a690-f422a9251c37',persona:'Lucía Registro QA',cargo:'Oficial',tipo_entidad:'Registro de la Propiedad',provincia:'Córdoba',telefono_directo:'957 111 111',extension:'12',email_directo:'lucia@example.test',activo:true,nivel_verificacion:'A',observaciones:'Contacto operativo'}];

async function boot(page:any){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:0})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-ana-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_view_learning_inbox:false,can_correct_ana:true,can_decide_learning:false}})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion',items:[]})}));
 await page.route('**/functions/v1/fenix-registros-runtime-test/**',r=>{const u=r.request().url();const isDetail=u.includes(`/registros-propiedad/${registryId}`);return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(isDetail?{source:'notion',item:registros[0],personal}:{source:'notion',items:registros})});});
}
async function labels(page:any,selector:string){return page.locator(selector).getByRole('button').evaluateAll((nodes:any[])=>nodes.map(n=>(n.textContent||'').trim()).filter(Boolean));}

test('Registros de la Propiedad queda visible tras Notarías y abre el directorio autorizado',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await boot(page);
 await page.goto('/inicio');
 const menu=page.locator('.dir-sidebar .dir-nav');
 const registrosButton=menu.getByRole('button',{name:'Registros de la Propiedad',exact:true});
 await expect(registrosButton).toBeVisible();
 const homeLabels=await labels(page,'.dir-sidebar .dir-nav');
 expect(homeLabels.indexOf('Registros de la Propiedad')).toBe(homeLabels.indexOf('Notarías')+1);
 await registrosButton.click();
 await expect(page).toHaveURL(/\/registros-propiedad$/);
 await expect(page.locator('[data-testid="property-registry-live"]')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Registro de la Propiedad de Cabra'})).toBeVisible();
 await expect(page.getByText('Cabra · Doña Mencía')).toBeVisible();
 const shell=page.locator('.ops-side nav');
 await expect(shell.getByRole('button',{name:'Registros de la Propiedad',exact:true})).toBeVisible();
 const shellLabels=await labels(page,'.ops-side nav');
 expect(shellLabels).toEqual(homeLabels);
});

test('La ficha de registro carga datos canónicos y personal relacionado',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await boot(page);
 await page.goto('/registros-propiedad');
 await page.getByRole('button',{name:'Abrir ficha →'}).click();
 await expect(page).toHaveURL(new RegExp(`/registros-propiedad/${registryId}$`));
 await expect(page.getByRole('heading',{level:1,name:'Registro de la Propiedad de Cabra'})).toBeVisible();
 await expect(page.getByText('Nota simple · certificaciones')).toBeVisible();
 await expect(page.locator('[data-testid="property-registry-staff"]')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Lucía Registro QA'})).toBeVisible();
 await expect(page.getByText('Contacto operativo')).toBeVisible();
});
