import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-contact-detail-100pct-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const row={id:'c1',cliente:'CARMELO',estado:'Seguimiento',tipo:'Titular',relacion:'Cliente',responsable:'Belén',telefono:'600000000',email:'cliente@example.test',ultimo_contacto:'2026-09-01',proxima_accion:'Llamar mañana',expedientes:['EXP-1']};

test('ficha de Contacto aprovecha el ancho a zoom 100% sin overflow ni texto microscópico',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.setViewportSize({width:1600,height:900});
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true')},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Contactos',route:'/contactos'}]})});return r.fulfill({status:404,body:'{}'})});
 await page.route('**/functions/v1/fenix-notion-runtime-test/clientes/c1',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:row})}));
 await page.goto('/contactos/c1');
 await expect(page.getByRole('heading',{name:'CARMELO'})).toBeVisible();
 const metrics=await page.evaluate(()=>{const html=document.documentElement;const main=document.querySelector('.contact-detail-root .ops-main') as HTMLElement|null;const content=document.querySelector('.contact-detail-content') as HTMLElement|null;if(!main||!content)return null;const mr=main.getBoundingClientRect(),cr=content.getBoundingClientRect();const visible=[...document.querySelectorAll('.contact-detail-root button,.contact-detail-root input,.contact-detail-root textarea,.contact-detail-root td,.contact-detail-root p,.contact-detail-root span,.contact-detail-root small')].filter(n=>{const r=(n as HTMLElement).getBoundingClientRect(),s=getComputedStyle(n);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0});const fonts=visible.map(n=>parseFloat(getComputedStyle(n).fontSize)).filter(Number.isFinite);return{overflow:html.scrollWidth-html.clientWidth,ratio:cr.width/mr.width,leftGap:cr.left-mr.left,rightGap:mr.right-cr.right,minFont:Math.min(...fonts)}});
 expect(metrics).not.toBeNull();
 expect(metrics!.overflow).toBeLessThanOrEqual(1);
 expect(metrics!.ratio).toBeGreaterThanOrEqual(.92);
 expect(Math.abs(metrics!.leftGap-metrics!.rightGap)).toBeLessThanOrEqual(4);
 expect(metrics!.minFont).toBeGreaterThanOrEqual(10);
 const clipped=await page.locator('.contact-detail-ana,.contact-detail-title,.contact-detail-kpis,.contact-detail-tabs,.contact-detail-grid').evaluateAll(nodes=>nodes.some(node=>{const r=(node as HTMLElement).getBoundingClientRect();return r.right>document.documentElement.clientWidth+1||r.left<-1}));
 expect(clipped).toBe(false);
});
