import {test,expect,type Page} from '@playwright/test';

/** Comprobación OLD del Gateway SIMULADO. Nada contra PROD. */
const PRE='https://hnqlnvakzaywtafeiybt.supabase.co';
const PROD='https://cluhljgonannaafpmblx.supabase.co';
function b64url(obj:unknown){return Buffer.from(JSON.stringify(obj)).toString('base64url')}
function fakeSession(){
 const now=Math.floor(Date.now()/1000);
 const metadata={actor_code:'CARLOS-ADMIN',role:'Dirección'};
 return {
  access_token:[b64url({alg:'none',typ:'JWT'}),b64url({aud:'authenticated',exp:now+3600,sub:'qa-old-renderer',role:'authenticated',user_metadata:metadata}),'qa'].join('.'),
  token_type:'bearer',expires_at:now+3600,expires_in:3600,refresh_token:'qa-old-renderer',
  user:{id:'qa-old-renderer',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:metadata,identities:[]}
 };
}
async function installFixture(page:Page){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(session));sessionStorage.setItem('fenix-session-active','1')},fakeSession());
 await page.route(PRE+'/functions/v1/**',async r=>{
  const path=new URL(r.request().url()).pathname;
  if(path.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Dirección'})});
  if(path.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{route:'/inicio',label:'Inicio'}]})});
  if(path.endsWith('/projects'))return r.fulfill({status:404,contentType:'application/json',body:'{}'});
  return r.fulfill({status:200,contentType:'application/json',body:'{}'});
 });
 await page.route(PROD+'/functions/v1/cerebro-console-gateway-v0/**',async r=>{
  const path=new URL(r.request().url()).pathname;
  const body=path.endsWith('/health')
   ?{status:'ok',authenticated_transport:true,direct_model_access:false,prod_execution_enabled:false,live_writes:false,chat_available:true,chat_mode:'DETERMINISTIC_READ_ONLY'}
   :path.endsWith('/preferences')?{status:'ok',preferences:{}}
   :{status:'ok',message:'## Sin reemplazo\\n\\n**Respuesta original**',executed:false};
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.route(PROD+'/functions/v1/cerebro-console-activity-v0/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'OK',source_status:'LIVE',runs:[],observed_at:new Date().toISOString(),physical_totals:{running_observed:0,queued_observed:0}})}));
}
test('Flag OFF: JARVIS usa exclusivamente el renderizado canónico sin añadir sidecar',async({page})=>{
 await installFixture(page);
 await page.goto('/cerebro?section=jarvis');
 await page.getByRole('button',{name:/Auditoría Total/}).first().click();
 const textarea=page.locator('.operativa-composer-form textarea').first();
 await expect(textarea).toBeVisible();
 await textarea.fill('Consulta OLD');await page.locator('.operativa-send').click();
 const original=page.locator('.cerebro-chat-line.cerebro-chat-cerebro > span').last();
 await expect(original).toBeVisible();
 await expect(original).toContainText('## Sin reemplazo');
 await expect(page.locator('[data-jarvis-response-contract]')).toHaveCount(0);
 await expect(page.locator('[data-jarvis-markdown-lab]')).toHaveCount(0);
 await expect(page.locator('[data-jarvis-markdown-slot]')).toHaveCount(0);
});
