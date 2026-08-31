import { test, expect } from '@playwright/test';

const fakeSession = {
  access_token: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhYUBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 1999999999,
  refresh_token: 'qa-refresh-not-real',
  user: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', aud: 'authenticated', role: 'authenticated', email: 'qaa@fenix.test', app_metadata: {}, user_metadata: {}, created_at: '2026-08-19T00:00:00.000Z'
  }
};

const id='11111111-1111-4111-8111-111111111111';
const nav={items:[{label:'Inicio',route:'/inicio',resource:'Inicio App'},{label:'Expedientes',route:'/expedientes',resource:'Expedientes'}]};

async function prepare(page:any){
  await page.addInitScript(session=>{
    window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));
    window.localStorage.setItem('fenix-remember-device','true');
  },fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async route=>{
    const url=route.request().url();
    if(url.endsWith('/session/context'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,context:{actor_code:'DIR-TEST',role:'Direccion'}})});
    if(url.endsWith('/navigation'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(nav)});
    return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });
}

test.describe('Fénix PRE-PROD · acciones Notion contextuales',()=>{
  test('Dirección revisa, confirma, guarda seguimiento canónico y refresca la ficha',async({page},testInfo)=>{
    if(!testInfo.project.name.includes('desktop'))test.skip();
    await prepare(page);
    let reads=0;let mutation:any=null;
    await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,async route=>{
      reads++;
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item:{id,expediente:'QA · Expediente contextual',fase:'Estudio',notas:''}})});
    });
    await page.route(`**/functions/v1/fenix-notion-actions-test/expedientes/${id}/action`,async route=>{
      mutation=route.request().postDataJSON();
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,resource:'expedientes',id,updated:['Notas','Próxima acción']})});
    });
    await page.goto(`/expedientes/${id}`);
    await expect(page.getByRole('heading',{name:'QA · Expediente contextual'})).toBeVisible();
    await expect(page.getByText('Seguimiento contextual')).toBeVisible();
    await page.getByLabel('Notas').fill('QA seguimiento contextual');
    await page.getByLabel('Próxima acción').fill('2026-08-25');
    await page.getByRole('button',{name:'Guardar seguimiento'}).click();
    expect(mutation).toBeNull();
    const dialog=page.getByRole('dialog',{name:'Vista previa del seguimiento'});
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button',{name:'Confirmar y guardar',exact:true}).click();
    await expect(page.getByText('Seguimiento guardado y auditado en Notion.')).toBeVisible();
    expect(mutation).toEqual({action:'update',changes:{notas:'QA seguimiento contextual',proxima_accion:'2026-08-25'}});
    expect(reads).toBeGreaterThanOrEqual(2);
  });

  test('403 de escritura se muestra tras confirmación como permiso correcto, sin falso éxito',async({page},testInfo)=>{
    if(!testInfo.project.name.includes('desktop'))test.skip();
    await prepare(page);
    await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item:{id,expediente:'QA · Expediente bloqueado',fase:'Estudio'}})}));
    await page.route(`**/functions/v1/fenix-notion-actions-test/expedientes/${id}/action`,route=>route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({ok:false,error:'forbidden'})}));
    await page.goto(`/expedientes/${id}`);
    await page.getByLabel('Notas').fill('Intento no autorizado');
    await page.getByRole('button',{name:'Guardar seguimiento'}).click();
    const dialog=page.getByRole('dialog',{name:'Vista previa del seguimiento'});
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button',{name:'Confirmar y guardar',exact:true}).click();
    await expect(page.getByText('Tu perfil no puede modificar esta ficha.')).toBeVisible();
    await expect(page.getByText('Seguimiento guardado y auditado en Notion.')).toHaveCount(0);
  });

  test('403 de lectura no expone ficha ni controles de modificación',async({page},testInfo)=>{
    if(!testInfo.project.name.includes('desktop'))test.skip();
    await prepare(page);
    await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,route=>route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({ok:false,error:'forbidden'})}));
    await page.goto(`/expedientes/${id}`);
    await expect(page.getByText('Tu perfil no puede abrir esta ficha.')).toBeVisible();
    await expect(page.getByText('Seguimiento contextual')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Guardar seguimiento'})).toHaveCount(0);
  });
});
