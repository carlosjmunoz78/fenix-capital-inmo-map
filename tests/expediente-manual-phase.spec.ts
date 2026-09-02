import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-manual-phase-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}};
const id='aaaaaaaa111141118111bbbbbbbbbbbb';

test('cambio manual de fase exige motivo, revisión y confirmación antes de escribir',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 let item:any={id,expediente:'EXP-FASE-MANUAL',cliente:'Cliente Fase',fase:'Entrada',notas:'Nota previa',version:3};let writes=0;let saved:any=null;
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true')},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion',display_name:'Dirección'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Documentación',route:'/documentacion'}]})});return r.fulfill({status:404,body:'{}'})});
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.route(`**/functions/v1/fenix-notion-actions-test/expedientes/${id}/action`,async r=>{writes++;saved=JSON.parse(r.request().postData()||'{}');item={...item,fase:saved.changes.stage,notas:saved.changes.notas,version:item.version+1};return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})})});
 await page.goto(`/expedientes/${id}`);
 const panel=page.getByTestId('manual-phase-panel');
 await expect(panel).toContainText('Pulsa cualquier fase');
 await page.getByRole('button',{name:'Cambiar manualmente a fase Análisis'}).click();
 await expect(panel).toContainText('Entrada');
 await expect(panel).toContainText('Estás saltando una o más fases');
 expect(writes).toBe(0);
 await panel.getByPlaceholder('Explica el motivo operativo, excepción o evidencia que justifica el cambio…').fill('La documentación ya está completa y revisada.');
 await panel.getByRole('button',{name:'Revisar cambio',exact:true}).click();
 expect(writes).toBe(0);
 await expect(panel.getByText('¿Seguro que quieres cambiar')).toBeVisible();
 await expect(panel.getByRole('button',{name:'Añadir documento justificativo'})).toBeVisible();
 await panel.getByRole('button',{name:'Sí, cambiar fase'}).click();
 await expect.poll(()=>writes).toBe(1);
 expect(saved.action).toBe('update');expect(saved.changes.stage).toBe('Análisis');expect(saved.changes.notas).toContain('Nota previa');expect(saved.changes.notas).toContain('[CAMBIO MANUAL DE FASE] Entrada → Análisis');expect(saved.changes.notas).toContain('La documentación ya está completa y revisada.');expect(saved.changes.notas).toContain('Usuario: Dirección');
 await expect(panel).toContainText('Fase cambiada y motivo registrado.');
});
