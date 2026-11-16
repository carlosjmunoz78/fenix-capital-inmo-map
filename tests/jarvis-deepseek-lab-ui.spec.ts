import {test,expect,type Page} from '@playwright/test';
const PRE='https://hnqlnvakzaywtafeiybt.supabase.co';
const PROD='https://cluhljgonannaafpmblx.supabase.co';
const answer=[
 '## Informe de JARVIS',
 '',
 '**Resultado:** correcto. Puedes ver [Fuente](https://example.org/info).',
 '',
 '- Punto uno',
 '- Punto dos',
 '',
 '[Acción insegura](javascript:alert)',
 '',
 '\x60'.repeat(3)+'html',
 '<script>window.__JARVIS_XSS=1</script>',
 '\x60'.repeat(3),
].join('\n');
function b64url(input:unknown){return Buffer.from(JSON.stringify(input)).toString('base64url')}
function fakeSession(){
 const now=Math.floor(Date.now()/1000),metadata={actor_code:'CARLOS-ADMIN',role:'Dirección'};
 return {
  access_token:[b64url({alg:'none',typ:'JWT'}),b64url({aud:'authenticated',exp:now+3600,sub:'jarvis-ui-lab-owner',email:'qa@fenix.test',role:'authenticated',user_metadata:metadata}),'qa'].join('.'),
  token_type:'bearer',expires_in:3600,expires_at:now+3600,refresh_token:'qa-ui-lab',
  user:{id:'jarvis-ui-lab-owner',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:metadata,identities:[]}
 };
}
async function boot(page:Page){
 await page.addInitScript(session=>{
  localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(session));
  sessionStorage.setItem('fenix-session-active','1');
 },fakeSession());
 await page.route(PRE+'/functions/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/session/context'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Dirección'})});
  if(path.endsWith('/navigation'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{route:'/inicio',label:'Inicio'}]})});
  if(path.endsWith('/projects'))return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  return route.fulfill({status:200,contentType:'application/json',body:'{}'});
 });
 await page.route(PROD+'/functions/v1/cerebro-console-gateway-v0/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/health'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',authenticated_transport:true,direct_model_access:false,prod_execution_enabled:false,live_writes:false,chat_available:true,chat_mode:'DETERMINISTIC_READ_ONLY'})});
  if(path.endsWith('/preferences'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',preferences:{}})});
  if(path.endsWith('/chat'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',message:answer,executed:false})});
  return route.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.route(PROD+'/functions/v1/cerebro-console-activity-v0/**',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'OK',source_status:'LIVE',observed_at:new Date().toISOString(),runs:[],physical_totals:{running_observed:0,queued_observed:0}})}));
}
test('JARVIS: responder por Gateway simulado con Markdown seguro en desktop y móvil',async({page})=>{
 await boot(page);await page.setViewportSize({width:1440,height:900});await page.goto('/cerebro?section=jarvis');
 await page.getByRole('button',{name:/Auditoría Total/}).first().click();
 const composer=page.locator('.operativa-composer-form textarea').first();
 await expect(composer).toBeVisible();
 await composer.fill('Prueba de Markdown desde el Gateway');await page.locator('.operativa-send').click();
 const result=page.locator('[data-jarvis-markdown-lab="true"]').first();
 await expect(result).toBeVisible();
 await expect(page.locator('[data-jarvis-markdown-slot]')).toHaveCount(0);
 await expect(page.locator('[data-message-source="canonical-console-react"]').first()).toBeVisible();
 await expect(result.locator('h4')).toHaveText('Informe de JARVIS');
 await expect(result.locator('ul li')).toHaveCount(2);
 await expect(result.locator('a[href="https://example.org/info"]')).toHaveCount(1);
 await expect(result.locator('a[href^="javascript:"]')).toHaveCount(0);
 await expect(result.locator('script')).toHaveCount(0);
 await expect(result.locator('pre')).toContainText('<script>window.__JARVIS_XSS=1</script>');
 expect(await page.evaluate(()=>(window as unknown as {__JARVIS_XSS?:number}).__JARVIS_XSS)).toBeUndefined();
 await page.setViewportSize({width:390,height:844});
 await expect(result).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});
test('JARVIS: la mejora visual no modifica el contrato de envío ni permisos',async({page})=>{
 await boot(page);
 const requests:unknown[]=[];
 await page.route(PROD+'/functions/v1/cerebro-console-gateway-v0/chat',async route=>{
  requests.push(route.request().postDataJSON());
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',message:answer,executed:false})});
 });
 await page.goto('/cerebro?section=jarvis');
 await page.getByRole('button',{name:/Auditoría Total/}).first().click();
 await page.locator('.operativa-composer-form textarea').first().fill('Consulta segura');
 await page.locator('.operativa-send').click();
 await expect(page.locator('[data-jarvis-markdown-lab="true"]').first()).toBeVisible();
 expect(requests.length).toBe(1);
 const request=requests[0] as {message:string;pending_action:unknown;conversation_context:unknown[]};
 expect(request.message).toBe('Consulta segura');
 expect(request.pending_action).toBeNull();
 expect(request.conversation_context).toEqual([]);
});
