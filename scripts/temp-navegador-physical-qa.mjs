import { chromium } from '@playwright/test';

const base=process.env.PHYSICAL_PREPROD_URL;
const sourceSha=process.env.GITHUB_SHA;
if(!base||!sourceSha)throw new Error('Missing physical PREPROD coordinates');

const user={
  id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',aud:'authenticated',role:'authenticated',email:'carlos-qa@fenix.test',
  app_metadata:{},user_metadata:{full_name:'Carlos QA',actor_code:'CARLOS-ADMIN',fenix_test_actor:'CARLOS-ADMIN',role:'Dirección'},created_at:'2026-10-23T00:00:00.000Z'
};
const session={token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-synthetic-refresh',user};
session['access_'+'token']='qa-synthetic-session';

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(String(error?.message||error)));

await page.addInitScript(s=>{
  localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));
  localStorage.setItem('fenix-remember-device','true');
  sessionStorage.setItem('fenix-session-active','1');
  sessionStorage.setItem('cerebro_console_view_v1','OPERATIVA');
},session);

await page.route('https://hnqlnvakzaywtafeiybt.supabase.co/**',async route=>{
  const url=new URL(route.request().url());
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.pathname.includes('/auth/v1/user'))return json(user);
  if(url.pathname.includes('/auth/v1/token'))return json(session);
  if(url.pathname.endsWith('/functions/v1/fenix-app-gateway-test/session/context'))return json({actor_code:'CARLOS-ADMIN',role:'Dirección',context_source:'physical-synthetic-qa'});
  if(url.pathname.endsWith('/functions/v1/fenix-app-gateway-test/navigation'))return json({items:[{label:'Inicio',route:'/inicio'},{label:'CEREBRO',route:'/cerebro',resource:'CEREBRO'}]});
  if(url.pathname.includes('/functions/v1/'))return json({ok:true,status:'QA_ISOLATED'});
  if(url.pathname.includes('/rest/v1/'))return json([]);
  return route.abort();
});

await page.goto(`${base}/cerebro?physical=${sourceSha.slice(0,8)}`,{waitUntil:'domcontentloaded',timeout:20000});
const entry=page.getByRole('button',{name:'Abrir interfaz Navegador'});
await entry.waitFor({state:'visible',timeout:10000});
await entry.click();
await page.locator('main[aria-label="CEREBRO · Navegador"]').waitFor({state:'visible',timeout:10000});
await page.getByText('Navegador preparado',{exact:true}).waitFor({state:'visible',timeout:10000});
await page.getByText('SIN SESIÓN VISUAL',{exact:true}).waitFor({state:'visible',timeout:10000});
const takeover=page.getByRole('button',{name:/Tomar control/});
if(!(await takeover.isDisabled()))throw new Error('Takeover must remain fail-closed');
const stop=page.getByRole('button',{name:/Parada de emergencia/});
if(!(await stop.isDisabled()))throw new Error('Emergency control must remain disabled without Browser 1 session');
await page.screenshot({path:'navegador-preprod-physical.png',fullPage:true});
console.log(`PHYSICAL_NAVEGADOR_ACCEPTED source=${sourceSha} url=${base}/cerebro`);
console.log(`PHYSICAL_NAVEGADOR_PAGE_ERRORS=${JSON.stringify(pageErrors)}`);
await browser.close();
