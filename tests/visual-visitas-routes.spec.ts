import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InZpc2l0YWRvckBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-visitas-routes-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'visitador@fenix.test',app_metadata:{},user_metadata:{full_name:'Visitador QA'},created_at:'2026-08-19T00:00:00.000Z'}};

async function boot(page:any){
  await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true')},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',r=>{
    const u=r.request().url();
    if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,context:{actor_code:'VIS-A',role:'Visitador',active:true}})});
    if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,items:['/inicio','/inmobiliarias','/visitas','/agenda']})});
    return r.fulfill({status:404,body:'{}'});
  });
}

test.describe('Fénix PRE-PROD · rutas dedicadas de Visitas',()=>{
  test('nueva visita usa formulario dedicado y mantiene preview antes de escritura',async({page},testInfo)=>{
    if(!testInfo.project.name.includes('desktop'))test.skip();
    await boot(page);
    let creates=0;
    await page.route('**/functions/v1/fenix-visitas-api-test/visitas',async r=>{
      if(r.request().method()==='GET')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});
      creates++;
      return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true})});
    });
    await page.goto('/visitas/nueva');
    const root=page.locator('.visitas-root');
    await expect(root.getByRole('heading',{level:1,name:'Nueva visita / gestión',exact:true})).toBeVisible();
    await root.getByLabel('Inmobiliaria').fill('INM-001');
    await root.getByLabel('Resultado').fill('Visita realizada');
    await root.getByRole('button',{name:'Revisar antes de registrar'}).click();
    expect(creates).toBe(0);
    await expect(root.getByLabel('Vista previa de nueva gestión')).toBeVisible();
    await root.getByRole('button',{name:'Confirmar y registrar'}).click();
    await expect.poll(()=>creates).toBe(1);
    await expect(page).toHaveURL(/\/visitas$/);
  });

  test('ficha de visita deriva solo de la lista autorizada y permite preview de cierre',async({page},testInfo)=>{
    if(!testInfo.project.name.includes('desktop'))test.skip();
    await boot(page);
    const row={activity_code:'VIS-001',owner_actor_code:'VIS-A',inmobiliaria_code:'INM-001',canal:'Visita',resultado:'Presentación',proximo_contacto:'2026-08-25',proxima_accion:'Llamar',estado:'Pendiente',version:1};
    let updates=0;
    await page.route('**/functions/v1/fenix-visitas-api-test/visitas',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[row]})}));
    await page.route('**/functions/v1/fenix-visitas-api-test/visitas/VIS-001',r=>{updates++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});});
    await page.goto('/visitas/VIS-001');
    const root=page.locator('.visitas-root');
    await expect(root.getByRole('heading',{level:1,name:'Ficha de visita / gestión',exact:true})).toBeVisible();
    const ficha=root.getByLabel('Ficha de visita');
    await expect(ficha).toBeVisible();
    await expect(ficha).toContainText('INM-001');
    await expect(ficha).toContainText('Presentación');
    await expect(ficha).toContainText('Llamar');
    await root.getByRole('button',{name:'Revisar para marcar hecha'}).click();
    expect(updates).toBe(0);
    await expect(root.getByLabel('Vista previa de actualización de gestión')).toBeVisible();
    await root.getByRole('button',{name:'Confirmar actualización'}).click();
    await expect.poll(()=>updates).toBe(1);
  });

  test('ficha inexistente en el ámbito autorizado no fabrica datos',async({page},testInfo)=>{
    if(!testInfo.project.name.includes('desktop'))test.skip();
    await boot(page);
    await page.route('**/functions/v1/fenix-visitas-api-test/visitas',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
    await page.goto('/visitas/VIS-FUERA');
    const root=page.locator('.visitas-root');
    await expect(root.getByText('La gestión no está disponible en tu ámbito autorizado.')).toBeVisible();
    await expect(root.getByText('INM-001',{exact:true})).toHaveCount(0);
  });
});
