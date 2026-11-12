import {test,expect} from '@playwright/test';

function encode(value:unknown){return Buffer.from(JSON.stringify(value)).toString('base64url')}
const accessToken=`${encode({alg:'none',typ:'JWT'})}.${encode({aud:'authenticated',role:'authenticated',sub:'carlos-admin-test-000000000000',email:'carlos.jarvis@fenix.test',exp:1999999999})}.test-signature`;
const session={access_token:accessToken,token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-refresh-not-real',user:{id:'carlos-admin-test-000000000000',aud:'authenticated',role:'authenticated',email:'carlos.jarvis@fenix.test',app_metadata:{},user_metadata:{full_name:'Carlos QA',actor_code:'CARLOS-ADMIN',role:'Dirección'},created_at:'2026-10-19T00:00:00.000Z'}};
const corsHeaders={'access-control-allow-origin':'http://127.0.0.1:4173','access-control-allow-headers':'authorization,apikey,content-type','access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json'};

test('Cockpit premium V3 is a real one-click console over the original authenticated client',async({page})=>{
 test.setTimeout(60_000);
 let postedChat:any=null;

 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');sessionStorage.setItem('fenix-session-active','1');class FakeRecognition{lang='';continuous=false;interimResults=false;maxAlternatives=1;onstart:any=null;onresult:any=null;onerror:any=null;onend:any=null;start(){this.onstart?.(new Event('start'))}stop(){this.onend?.(new Event('end'))}abort(){this.onend?.(new Event('end'))}};(window as any).SpeechRecognition=FakeRecognition},session);

 await page.route('http://127.0.0.1:54321/auth/v1/**',async route=>{const url=route.request().url();if(url.includes('/user'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify(session.user)});if(url.includes('/token'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify(session)});return route.fulfill({status:200,headers:corsHeaders,body:'{}'})});
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async route=>{if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:corsHeaders,body:''});const url=route.request().url();if(url.endsWith('/session/context'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Dirección'})});if(url.endsWith('/navigation'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'CEREBRO',route:'/cerebro',resource:'CEREBRO'}]})});return route.fulfill({status:404,headers:corsHeaders,body:'{}'})});
 await page.route('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v0/**',async route=>{const request=route.request();if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:corsHeaders,body:''});const url=request.url();if(url.endsWith('/health'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'ok',service:'cerebro-console-gateway-v0',environment:'TEST_ISOLATED',version:'e2e',authenticated_transport:true,direct_model_access:false,prod_execution_enabled:false,live_writes:false,chat_available:true,chat_mode:'OWNER_DECISION_BY_EXCEPTION_V1'})});if(url.endsWith('/preferences'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'ok',preferences:{response_length:'concise'}})});if(url.endsWith('/chat')){postedChat=request.postDataJSON();return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'OK',intent:'e2e_probe',message:'PONG_OPERATIVA',executed:false})})}return route.fulfill({status:404,headers:corsHeaders,body:'{}'})});
 await page.route('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-activity-v0/**',async route=>{if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:corsHeaders,body:''});return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'OK',observed_at:'2026-11-02T00:30:00.000Z',source:'GITHUB_ACTIONS',source_status:'LIVE',repository:'carlosjmunoz78/fenix-capital-inmo-map',runs:[{run_id:201,workflow_name:'CEREBRO FACT-001 Engine Factory',workflow_alias:'FACT-001',workflow_path:'.github/workflows/cerebro-factory.yml',status:'in_progress',conclusion:null,event:'workflow_dispatch',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/201',created_at:'2026-11-02T00:20:00.000Z',run_started_at:'2026-11-02T00:21:00.000Z',updated_at:'2026-11-02T00:29:00.000Z',engine_id:'FACT-001',company_id:'fenix',environment:'PREPROD',version:'abc123def456',source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',progress_percent:42,progress_completed_steps:8,progress_total_steps:19,current_step:'Scaffold · contracts',next_step:'Tribunal',progress_provenance:'REAL_GITHUB_JOBS'},{run_id:200,workflow_name:'CEREBRO QA completed',workflow_alias:'QA',workflow_path:'.github/workflows/qa.yml',status:'completed',conclusion:'success',event:'push',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/200',created_at:'2026-11-02T00:00:00.000Z',run_started_at:'2026-11-02T00:01:00.000Z',updated_at:'2026-11-02T00:10:00.000Z',engine_id:'QA-001',company_id:'fenix',environment:'PREPROD',version:'def456abc123',source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',progress_percent:100,progress_completed_steps:null,progress_total_steps:null,current_step:'Finalizado',next_step:null,progress_provenance:'TERMINAL_STATUS'}]})})});


 await page.goto('/cerebro?section=operativa&visual_lab=cockpit-v3',{waitUntil:'domcontentloaded'});
 const cockpit=page.locator('.op3-root');
 await expect(cockpit).toBeVisible();
 await expect(page.locator('.operativa-premium')).toHaveCount(0);
 const navigation=page.getByRole('navigation',{name:'Interfaces'});
 for(const name of ['Inicio','Jarvis','Operativa','Neuronal','Navegador']){
  await expect(navigation.getByRole('button',{name:new RegExp(name,'i')})).toBeVisible();
 }
 await expect(cockpit.getByRole('heading',{name:'¿Qué necesitas hacer?'})).toBeVisible();
 await expect(cockpit.getByText('Fuente conectada')).toBeVisible();
 await expect(cockpit.locator('.op3-pulse.is-working')).toBeVisible();
 await expect(cockpit.getByText('En ejecución')).toBeVisible();
 await expect(cockpit.getByText('1', {exact:true}).first()).toBeVisible();
 await page.screenshot({path:'test-results/cockpit-v3-desktop.png',fullPage:true,animations:'disabled'});

 await cockpit.getByRole('button',{name:'Motores'}).click();
 await expect(cockpit.getByRole('heading',{name:'Motores observados'})).toBeVisible();
 await expect(cockpit.getByText('FACT-001',{exact:true})).toBeVisible();
 await cockpit.getByRole('button',{name:'Trabajos'}).click();
 await expect(cockpit.getByRole('heading',{name:'Trabajos y ejecuciones'})).toBeVisible();
 await cockpit.getByRole('button',{name:/Inspeccionar/}).first().click();
 await expect(page.getByRole('dialog',{name:'Detalle del trabajo'})).toBeVisible();
 await page.getByRole('dialog',{name:'Detalle del trabajo'}).getByRole('button',{name:'Cerrar'}).click();
 await cockpit.getByRole('button',{name:'Proyectos'}).click();
 await expect(cockpit.getByText('Sin inventario de proyectos verificado en esta interfaz')).toBeVisible();
 await cockpit.getByRole('button',{name:'Resumen'}).click();
 await expect(cockpit.getByRole('heading',{name:'¿Qué necesitas hacer?'})).toBeVisible();

 const input=cockpit.getByRole('textbox',{name:'Pregunta u orden'});
 await expect(input).toBeEnabled();
 await input.fill('Consulta el estado operativo');
 await expect(cockpit.locator('.op3-pulse.is-typing')).toBeVisible();
 await cockpit.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect.poll(()=>postedChat?.message??null,{timeout:5_000}).toBe('Consulta el estado operativo');
 await page.setViewportSize({width:390,height:844});
 await expect(cockpit.getByRole('heading',{name:'¿Qué necesitas hacer?'})).toBeVisible();
 await page.screenshot({path:'test-results/cockpit-v3-mobile.png',fullPage:true,animations:'disabled'});
 const overflows=await page.evaluate(()=>({
  scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth
 }));
 expect(overflows.scroll).toBeLessThanOrEqual(overflows.view+2);
});
