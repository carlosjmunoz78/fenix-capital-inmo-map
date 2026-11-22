import {expect,test} from '@playwright/test';

const id='EXP-QA-ISOLATED-001';
const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-prod-contract-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-09-15T00:00:00.000Z'}
};
test('PROD-shaped: PATCH canónico con versión, motivo e histórico, UI actualiza sin recarga',async({page})=>{
 let item={expediente_code:id,cliente_alias:'QA aislado',stage:'Entrada',notas:'Nota anterior',version:7};
 let requests=0;let payload:Record<string,unknown>|null=null;
 await page.addInitScript(s=>{
  localStorage.setItem('fenix-prod-auth-v1',JSON.stringify(s));
  localStorage.setItem('fenix-remember-device','true');
  sessionStorage.setItem('fenix-session-active','1');
 },session);
 await page.route('**/functions/v1/fenix-app-gateway/**',async route=>{
  const url=route.request().url(),request=route.request();
  const json=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.endsWith('/session/context'))return json({actor_code:'CARLOS-ADMIN',role:'Direccion',display_name:'Carlos'});
  if(url.endsWith('/navigation'))return json({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'}]});
  if(url.endsWith('/inmobiliarias'))return json({items:[]});
  if(url.endsWith('/expedientes/'+id)){
   if(request.method()==='PATCH'){
    requests++;payload=request.postDataJSON();
    if(payload?.expected_version!==item.version)return json({ok:false,status:409,error:'version_conflict'},409);
    item={...item,stage:String(payload?.stage??item.stage),notas:String(payload?.notas??item.notas),version:item.version+1};
    return json({ok:true,status:200,expediente:item});
   }
   return json({expediente:item});
  }
  return json({ok:false},404);
 });
 await page.goto('/expedientes/'+id);
 const panel=page.getByTestId('manual-phase-panel');
 await expect(panel).toContainText('Pulsa cualquier fase');
 await expect(page.locator('[data-testid="expediente-phase-line"] .detail-phase-track>div')).toHaveCount(8);
 await page.getByRole('button',{name:'Cambiar manualmente a fase Banco'}).click();
 await expect(page.getByRole('button',{name:'Guardar cambio de fase'})).toBeDisabled();
 await panel.getByPlaceholder('Explica el motivo operativo, excepción o evidencia que justifica el cambio…').fill('Cliente listo para presentar a entidades');
 await page.getByRole('button',{name:'Guardar cambio de fase'}).click();
 await expect.poll(()=>requests).toBe(1);
 expect(payload).toMatchObject({expected_version:7,stage:'Banco',cliente_alias:null,inmobiliaria_code:null,proxima_accion:null});
 expect(String(payload?.notas)).toContain('Nota anterior');
 expect(String(payload?.notas)).toContain('Motivo: Cliente listo para presentar a entidades');
 expect(String(payload?.notas)).toContain('Usuario: Carlos');
 await expect(panel).toContainText('Motivo registrado.');
 await expect(page.getByText('Fase actual: Banco')).toBeVisible();
 await expect(page).toHaveURL('/expedientes/'+id);
});
