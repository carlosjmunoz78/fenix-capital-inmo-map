import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-exp-list-100pct-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}};
const rows=Array.from({length:8},(_,i)=>({id:`exp-${i+1}`,expediente:`EXP-${String(i+1).padStart(3,'0')}`,cliente:`Cliente ${i+1}`,fase:i%3===0?'Tasación':i%3===1?'Banco':'Estudio',estado:'En curso',riesgo:i===0?'Revisar':'Bajo',proxima_accion:'2026-09-10'}));

test('listado Expedientes aprovecha el ancho a zoom 100% sin overflow ni texto microscópico',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.setViewportSize({width:1600,height:900});
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'BELEN-DIR',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Documentación',route:'/documentacion'},{label:'Agenda',route:'/agenda'}]})});return r.fulfill({status:404,contentType:'application/json',body:'{}'});});
 await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:rows})}));
 await page.goto('/expedientes');
 await expect(page.getByRole('heading',{name:'Expedientes',exact:true})).toBeVisible();
 await expect(page.getByTestId('expedientes-live')).toBeVisible();
 const metrics=await page.evaluate(()=>{
  const html=document.documentElement;
  const content=document.querySelector('.inmo-content') as HTMLElement|null;
  const main=content?.parentElement as HTMLElement|null;
  if(!content||!main)return null;
  const c=content.getBoundingClientRect(),m=main.getBoundingClientRect();
  const selectors=['.inmo-ana-hero','.ops-title','.inmo-kpis','.inmo-insights','.exp-filter-card','.ops-table-card'];
  const clipped=selectors.some(sel=>Array.from(document.querySelectorAll(sel)).some(node=>{const r=(node as HTMLElement).getBoundingClientRect();return r.right>html.clientWidth+1||r.left<-1;}));
  const entries=Array.from(document.querySelectorAll('.inmo-content button,.inmo-content input,.inmo-content select,.inmo-content td,.inmo-content th,.inmo-content p,.inmo-content span')).filter(el=>{const r=(el as HTMLElement).getBoundingClientRect();return r.width>0&&r.height>0;}).map(el=>({size:parseFloat(getComputedStyle(el).fontSize),tag:el.tagName.toLowerCase(),cls:typeof (el as HTMLElement).className==='string'?(el as HTMLElement).className:'',text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,90)})).filter(x=>Number.isFinite(x.size)).sort((a,b)=>a.size-b.size);
  return {overflow:html.scrollWidth-html.clientWidth,ratio:c.width/m.width,leftGap:c.left-m.left,rightGap:m.right-c.right,clipped,minFont:entries[0]?.size??999,smallest:entries.slice(0,8)};
 });
 expect(metrics).not.toBeNull();
 expect(metrics!.overflow).toBeLessThanOrEqual(1);
 expect(metrics!.ratio).toBeGreaterThanOrEqual(.92);
 expect(Math.abs(metrics!.leftGap-metrics!.rightGap)).toBeLessThanOrEqual(4);
 expect(metrics!.clipped).toBe(false);
 expect(metrics!.minFont,JSON.stringify(metrics!.smallest)).toBeGreaterThanOrEqual(10);
});
