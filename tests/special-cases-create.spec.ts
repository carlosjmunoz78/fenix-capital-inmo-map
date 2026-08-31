import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJiYmJiYmJiYi1iYmJiLTRiYmItOGJiYi1iYmJiYmJiYmJiYmIiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-special-create-not-real',user:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',aud:'authenticated',role:'authenticated',email:'qa-special-create@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-29T00:00:00.000Z'}};
const nav=[{label:'Inicio',route:'/inicio'},{label:'Herencias',route:'/herencias'},{label:'Obras Nuevas',route:'/obras-nuevas'}];
const createdId='cccccccc-3333-4333-8333-cccccccccccc';

async function boot(page:any,{role='Direccion',postStatus=201}:{role?:string;postStatus?:number}={}){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true')},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Direccion'?'DIR-QA':'FIN-QA',role})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:nav})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:0})});return r.fulfill({status:404,body:'{}'})});
 await page.route('**/functions/v1/fenix-ana-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_view_learning_inbox:false,can_correct_ana:true,can_decide_learning:false}})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.route('**/functions/v1/fenix-special-cases-runtime-test/**',async r=>{
  const u=r.request().url();
  if(r.request().method()==='POST'){
   if(postStatus===403)return r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({ok:false,error:'forbidden'})});
   const body=JSON.parse(r.request().postData()||'{}');
   return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,item:{id:createdId,nombre:body.nombre,estado:body.estado,fase:body.fase,siguiente_accion:body.siguiente_accion,activo:true,requiere_validacion:false,firma_realizada:false}})});
  }
  if(u.includes(`/herencias/${createdId}`))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:{id:createdId,nombre:'Herencia Canon QA',estado:'Nueva',fase:'Análisis administrativo',siguiente_accion:'Revisar certificado',activo:true,requiere_validacion:false,firma_realizada:false},intervinientes:[]})});
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});
 });
}

test('Dirección revisa, confirma y navega a la herencia creada',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await boot(page);
 let posted:any=null;
 page.on('request',req=>{if(req.url().includes('/fenix-special-cases-runtime-test/herencias')&&req.method()==='POST')posted=JSON.parse(req.postData()||'{}')});
 await page.goto('/herencias/nuevo');
 await expect(page.getByRole('heading',{level:1,name:'Nueva herencia'})).toBeVisible();
 await page.getByLabel('Nombre / referencia').fill('Herencia Canon QA');
 await page.getByLabel('Fase').selectOption('Análisis administrativo');
 await page.getByLabel('Siguiente acción').fill('Revisar certificado');
 await expect(page.getByRole('button',{name:'Confirmar creación'})).toHaveCount(0);
 await page.getByRole('button',{name:'Revisar antes de crear'}).click();
 await expect(page.getByTestId('special-case-create-preview')).toContainText('Herencia Canon QA');
 await expect(page.getByTestId('special-case-create-preview')).toContainText('Análisis administrativo');
 await page.getByRole('button',{name:'Confirmar creación'}).click();
 await expect.poll(()=>posted).not.toBeNull();
 expect(posted).toEqual({nombre:'Herencia Canon QA',estado:'Nueva',fase:'Análisis administrativo',siguiente_accion:'Revisar certificado'});
 await expect(page).toHaveURL(new RegExp(`/herencias/${createdId}$`));
 await expect(page.getByRole('heading',{level:1,name:'Herencia Canon QA'})).toBeVisible();
});

test('un rol no autorizado recibe 403 al confirmar y no simula creación',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await boot(page,{role:'Financiero',postStatus:403});
 await page.goto('/obras-nuevas/nuevo');
 await page.getByLabel('Nombre / referencia').fill('Obra QA sin permiso');
 await page.getByRole('button',{name:'Revisar antes de crear'}).click();
 await page.getByRole('button',{name:'Confirmar creación'}).click();
 await expect(page.getByTestId('special-case-create-error')).toHaveText('Tu perfil no tiene permiso para crear este tipo de caso.');
 await expect(page).toHaveURL(/\/obras-nuevas\/nuevo$/);
});
