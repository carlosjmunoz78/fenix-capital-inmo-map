import {test,expect} from '@playwright/test';

const session={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-kpi-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{full_name:'Carlos Muñoz'},created_at:'2026-08-19T00:00:00.000Z'}};

async function boot(page:any){
 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');},session);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Direccion',active:true,display_name:'Carlos Muñoz'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:['/inicio','/expedientes','/firmas','/economia']})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});return r.fulfill({status:404,contentType:'application/json',body:'{}'});});
 await page.route('**/functions/v1/fenix-notion-runtime-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.route('**/functions/v1/fenix-direction-kpis-test?**',async r=>{const u=new URL(r.request().url());const key=u.searchParams.get('key');const payload=key==='honorarios-pendientes'?{ok:true,key,count:1,complete:true,total:2400,unresolved:0,items:[{expediente:'EXP-001',fecha_firma:'2026-08-28',honorarios_fenix_base:3500,comision_inmobiliaria:1100,neto_pendiente_base:2400}]}:{ok:true,key,count:1,items:key==='firmas-previstas'||key==='firmadas'?[{firma:'FIR-001',fecha_firma:'2026-08-28',estado:key==='firmadas'?'Firmado':'Firma programada',notaria:'Notaría QA'}]:[{expediente:'EXP-001',fase:'Banco',semaforo:key==='expedientes-en-riesgo'?'Urgente':'Normal',proxima_accion:'2026-08-25',importe_solicitado:180000}]};return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});});
 await page.goto('/inicio');await expect(page.locator('.dir-shell')).toBeVisible();
}

test('Inicio abre cada KPI con su población canónica exacta',async({page},testInfo)=>{if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page);
 const cases=[
  ['EXPEDIENTES','/expedientes?estado=en-curso&kpi=expedientes-en-curso','Expedientes en curso'],
  ['FIRMAS','/firmas?firma=mes-actual&estado=prevista&kpi=firmas-previstas','Firmas previstas este mes'],
  ['FIRMADOS','/firmas?firma=mes-actual&estado=firmada&kpi=firmadas','Firmados este mes'],
  ['EN RIESGO','/expedientes?riesgo=si&kpi=expedientes-en-riesgo','Expedientes en riesgo'],
  ['HONORARIOS','/economia?honorarios=pendientes&mes=actual&kpi=honorarios-pendientes','Honorarios pendientes este mes']
 ] as const;
 for(const [needle,path,title] of cases){const b=page.locator('.dir-kpi').filter({hasText:needle}).first();await expect(b).toBeVisible();await b.click();await expect(page).toHaveURL(new RegExp(path.replace(/[?]/g,'\\?')));await expect(page.getByTestId('direction-kpi-drilldown')).toBeVisible();await expect(page.getByRole('heading',{name:title})).toBeVisible();await page.getByRole('button',{name:/Volver a Inicio/}).click();await expect(page.locator('.dir-shell')).toBeVisible();}
 await expect(page.locator('.dir-kpi').filter({hasText:'HONORARIOS'}).locator('strong')).toHaveText('2.400 €');
});
