import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-100pct-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const id='aaaaaaaa111141118111bbbbbbbbbbbb';
const item={id,expediente:'EXPEDIENTE 100%',cliente:'Cliente de prueba',fase:'Tasación',precio_vivienda:180000,importe_solicitado:170000,proxima_accion:'2026-09-10',version:3};

test('ficha de expediente aprovecha el ancho a zoom 100% sin overflow horizontal',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.setViewportSize({width:1600,height:900});
 await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion',display_name:'Dirección'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'}]})});return r.fulfill({status:404,body:'{}'});});
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[item]})}));
 await page.goto(`/expedientes/${id}`);
 await expect(page.getByText('FICHA MAESTRA')).toBeVisible();
 const metrics=await page.evaluate(()=>{
  const html=document.documentElement;
  const main=document.querySelector('.detail-exp-main') as HTMLElement|null;
  const content=document.querySelector('.detail-exp-content') as HTMLElement|null;
  if(!main||!content)return null;
  const mr=main.getBoundingClientRect(),cr=content.getBoundingClientRect();
  return {overflow:html.scrollWidth-html.clientWidth,mainWidth:mr.width,contentWidth:cr.width,ratio:cr.width/mr.width,leftGap:cr.left-mr.left,rightGap:mr.right-cr.right};
 });
 expect(metrics).not.toBeNull();
 expect(metrics!.overflow).toBeLessThanOrEqual(1);
 expect(metrics!.ratio).toBeGreaterThanOrEqual(.92);
 expect(Math.abs(metrics!.leftGap-metrics!.rightGap)).toBeLessThanOrEqual(4);
 const clipped=await page.locator('.detail-summary-grid,.detail-journey,.detail-next-action,#seguimiento-contextual,[data-testid="expediente-operational-edit"]').evaluateAll(nodes=>nodes.some(node=>{const r=(node as HTMLElement).getBoundingClientRect();return r.right>document.documentElement.clientWidth+1||r.left<-1;}));
 expect(clipped).toBe(false);
});
