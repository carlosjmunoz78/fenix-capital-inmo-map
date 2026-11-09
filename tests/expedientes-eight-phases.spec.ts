import {expect,test} from '@playwright/test';
const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-only-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-09-15T00:00:00.000Z'}
};
test('Ocho fases principales, subpasos anidados, cambio manual y separación responsive',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop-chromium');
 const code='EXP-PHASE-V2';
 const row={expediente_code:code,cliente_alias:'Cliente de prueba',stage:'Análisis',version:4,payload_operacion:{cerebro_fases_v2:{subpaso:'Análisis'}},notas:'Original'};
 await page.addInitScript(s=>{localStorage.setItem('fenix-prod-auth-v1',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');sessionStorage.setItem('fenix-session-active','1');},session);
 await page.route('**/functions/v1/fenix-app-gateway/**',route=>{
  const u=route.request().url();
  const body=(data:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  if(u.endsWith('/session/context'))return body({actor_code:'CARLOS-ADMIN',role:'Direccion',display_name:'Dirección'});
  if(u.endsWith('/navigation'))return body({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'}]});
  if(u.endsWith('/inmobiliarias'))return body({items:[]});
  if(u.endsWith('/expedientes/'+code))return body({expediente:row});
  return route.fulfill({status:404,contentType:'application/json',body:'{"ok":false}'});
 });
 await page.goto('/expedientes/'+code);
 const track=page.locator('[data-testid="expediente-phase-line"] .detail-phase-track');
 await expect(track.locator(':scope > div')).toHaveCount(8);
 const names=await track.locator(':scope > div > small').allTextContents();
 expect(names).toEqual(['Entrada','Documentación','Banco','Tasación','FEIN','Notaría','Firma','Cierre']);
 await expect(track.locator('.detail-phase-substep')).toHaveText(['↳ Análisis','↳ Oferta']);
 await expect(page.locator('.detail-summary-card').first()).toContainText('Subpaso: Análisis');
 const panel=page.getByTestId('manual-phase-panel');
 await expect(panel).toBeVisible();
 await page.getByRole('button',{name:'Cambiar manualmente a fase FEIN'}).click();
 await expect(panel.getByRole('option',{name:'FEIN'})).toHaveCount(1);
 await expect(panel).toContainText('Subpaso integrado: Oferta');
 const geometry=await track.locator(':scope > div').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,right:r.right,width:r.width}}));
 expect(geometry.every((r,i)=>r.width>=70&&(i===0||r.x>=geometry[i-1].right-1))).toBeTruthy();
 await page.setViewportSize({width:390,height:844});
 await expect(track.locator(':scope > div')).toHaveCount(8);
 const mobile=await track.evaluate(el=>({width:el.scrollWidth,viewport:el.parentElement?.clientWidth||0}));
 expect(mobile.width).toBeGreaterThan(mobile.viewport);
});
