import {expect,test,type Page} from '@playwright/test';

const SUPABASE_PREPROD='https://hnqlnvakzaywtafeiybt.supabase.co';
const SUPABASE_PROD='https://cluhljgonannaafpmblx.supabase.co';

function b64url(value:unknown){
 return Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
}

function qaSession(){
 const now=Math.floor(Date.now()/1000);
 const metadata={actor_code:'CARLOS-ADMIN',role:'Dirección'};
 const accessToken=`${b64url({alg:'none',typ:'JWT'})}.${b64url({aud:'authenticated',exp:now+3600,sub:'jarvis-v1-preprod',email:'jarvis-v1@fenix.test',role:'authenticated',user_metadata:metadata})}.qa`;
 return{
  access_token:accessToken,
  token_type:'bearer',
  expires_in:3600,
  expires_at:now+3600,
  refresh_token:'qa-refresh-jarvis-v1-preview',
  user:{
   id:'jarvis-v1-preprod',aud:'authenticated',role:'authenticated',email:'jarvis-v1@fenix.test',
   email_confirmed_at:new Date().toISOString(),phone:'',confirmed_at:new Date().toISOString(),
   last_sign_in_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},
   user_metadata:metadata,identities:[],created_at:new Date().toISOString(),updated_at:new Date().toISOString(),is_anonymous:false
  }
 };
}

async function installIsolatedPreprod(page:Page){
 const session=qaSession();
 await page.addInitScript(value=>{
  localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(value));
  sessionStorage.setItem('fenix-session-active','1');
 },session);

 await page.route(`${SUPABASE_PREPROD}/functions/v1/**`,async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/fenix-app-gateway-test/session/context')){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Dirección',context_source:'qa-preprod-fixture'})});
   return;
  }
  if(url.pathname.endsWith('/fenix-app-gateway-test/navigation')){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{route:'/inicio',label:'Inicio'}]})});
   return;
  }
  await route.fulfill({status:200,contentType:'application/json',body:'{}'});
 });

 await page.route(`${SUPABASE_PROD}/functions/v1/cerebro-console-gateway-v0/**`,async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/health')){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',service:'CEREBRO Console Gateway',environment:'PREPROD_QA',version:'jarvis-v1-preview',authenticated_transport:true,direct_model_access:false,prod_execution_enabled:false,live_writes:false,chat_available:true,chat_mode:'DETERMINISTIC_READ_ONLY'})});
   return;
  }
  if(url.pathname.endsWith('/preferences')){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',preferences:{tone:'warm_close_caring',response_length:'concise',speech_rate:'1.08',speech_pitch:'1.04'}})});
   return;
  }
  if(url.pathname.endsWith('/chat')){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',intent:'qa_preview',message:'Respuesta aislada PREPROD.',executed:false,context_applied:true})});
   return;
  }
  await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({status:'error'})});
 });

 await page.route(`${SUPABASE_PROD}/functions/v1/cerebro-console-activity-v0/**`,async route=>{
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'OK',observed_at:new Date().toISOString(),source:'GITHUB_ACTIONS',source_status:'LIVE',repository:'carlosjmunoz78/fenix-capital-inmo-map',runs:[],physical_totals:{running_observed:0,queued_observed:0,active_observed:0,provenance:'GITHUB_ACTION_RUN_TOTALS',semantics:'LOWER_BOUND_PHYSICAL_JOBS'}})});
 });
}

async function expectPrimaryNavigation(page:Page){
 for(const label of ['Inicio','Jarvis','Operativa','Neuronal','Navegador'])await expect(page.getByRole('button',{name:label,exact:true})).toBeVisible();
}

async function expectNoHorizontalOverflow(page:Page){
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(1);
}

async function expectJarvisContract(page:Page){
 await expect(page.getByRole('heading',{name:'JARVIS'})).toBeVisible();
 await expectPrimaryNavigation(page);
 await expect(page.getByRole('combobox',{name:'Empresa',exact:true})).toHaveValue('Fénix · sesión autenticada');
 await expect(page.getByRole('combobox',{name:'Contexto',exact:true})).toHaveValue('GENERAL');
 await expect(page.getByText('Transporte autenticado verificado')).toBeVisible();
 await expect(page.getByText('HUMAN_REQUIRED',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Procesos reales',{exact:true})).toHaveCount(0);
 await expect(page.getByText('FÉNIX · GENERAL',{exact:true})).toHaveCount(0);
 await expectNoHorizontalOverflow(page);
}

test('Jarvis V1 PREPROD real React surface · desktop + chat + narrow viewport + Operativa regression',async({page})=>{
 await installIsolatedPreprod(page);
 await page.goto('/cerebro?section=jarvis');
 await expectJarvisContract(page);

 const composer=page.getByPlaceholder('También puedes escribir a CEREBRO…');
 await expect(composer).toBeEnabled();
 await composer.fill('Prueba aislada PREPROD');
 await page.getByRole('button',{name:'Enviar'}).click();
 await expect(page.getByText('Prueba aislada PREPROD',{exact:true})).toBeVisible();
 await expect(page.getByText('Respuesta aislada PREPROD.',{exact:true})).toBeVisible();
 const assistantLabel=page.locator('.cerebro-chat-cerebro strong').last();
 await expect(assistantLabel).toBeVisible();
 const pseudoContent=await assistantLabel.evaluate(el=>getComputedStyle(el,'::after').content);
 expect(pseudoContent).toContain('JARVIS');
 await page.screenshot({path:'test-results/jarvis-v1-desktop.png',fullPage:true});

 await page.setViewportSize({width:695,height:900});
 await expectJarvisContract(page);
 await expectNoHorizontalOverflow(page);
 await page.screenshot({path:'test-results/jarvis-v1-narrow-695.png',fullPage:true});

 await page.setViewportSize({width:1440,height:900});
 await page.getByRole('button',{name:'Operativa',exact:true}).click();
 await expect(page.locator('main.operativa-premium[aria-label="Operativa"]')).toBeVisible();
 await expectPrimaryNavigation(page);
 await expectNoHorizontalOverflow(page);
 await page.screenshot({path:'test-results/operativa-v4-regression.png',fullPage:true});
});
