import {expect,test} from '@playwright/test';

const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-only-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-09-15T00:00:00.000Z'}
};
const rows=[
 {expediente_code:'C-OLD',stage:'Finalizado',is_active:false,updated_at:'2026-11-01T10:00:00Z',fecha_finalizacion:'2026-09-01T09:00:00Z',version:1},
 {expediente_code:'A-NEW',stage:'Notaría',is_active:true,updated_at:'2026-11-06T12:00:00Z',version:1},
 {expediente_code:'C-RECENT',stage:'Finalizado',is_active:false,updated_at:'2026-10-22T10:00:00Z',fecha_finalizacion:'2026-10-20T09:00:00Z',version:1},
 {expediente_code:'A-OLD',stage:'Análisis',is_active:true,updated_at:'2026-11-03T12:00:00Z',version:1},
 {expediente_code:'C-FALLBACK',stage:'Baja',is_active:false,updated_at:'2026-10-05T10:00:00Z',version:1}
];
test('Expedientes muestra activos primero, inactivos por finalización descendente y filtros reales',async({page})=>{
 await page.addInitScript(s=>{
  localStorage.setItem('fenix-prod-auth-v1',JSON.stringify(s));
  localStorage.setItem('fenix-remember-device','true');
  sessionStorage.setItem('fenix-session-active','1');
 },session);
 await page.route('**/functions/v1/fenix-app-gateway/**',route=>{
  const u=route.request().url();
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  if(u.endsWith('/session/context'))return json({actor_code:'CARLOS-ADMIN',role:'Direccion'});
  if(u.endsWith('/navigation'))return json({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'}]});
  if(u.endsWith('/expedientes'))return json({ok:true,items:rows});
  return route.fulfill({status:404,contentType:'application/json',body:'{"ok":false}'});
 });
 await page.goto('/expedientes');
 await expect(page.locator('[data-testid="expedientes-live"]')).toContainText('EN CURSO');
 const live=page.locator('[data-testid="expedientes-live"]');
 await expect(live.locator('article').nth(1).locator('strong')).toHaveText('2');
 const ids=()=>page.locator('table.ops-sortable-table tbody tr').allTextContents();
 expect((await ids()).map(v=>v.match(/(?:A-NEW|A-OLD|C-RECENT|C-FALLBACK|C-OLD)/)?.[0])).toEqual(['A-NEW','A-OLD','C-RECENT','C-FALLBACK','C-OLD']);
 // Filtering is authoritative: a Finalizado filter must not reinsert active records.
 await page.getByLabel('FASE').selectOption('Finalizado');
 expect((await ids()).map(v=>v.match(/C-RECENT|C-OLD/)?.[0])).toEqual(['C-RECENT','C-OLD']);
 await page.getByRole('button',{name:'Limpiar'}).click();
 expect((await ids()).map(v=>v.match(/(?:A-NEW|A-OLD|C-RECENT|C-FALLBACK|C-OLD)/)?.[0])).toEqual(['A-NEW','A-OLD','C-RECENT','C-FALLBACK','C-OLD']);
});
