import {test,expect} from '@playwright/test';

function encode(value:unknown){return Buffer.from(JSON.stringify(value)).toString('base64url')}
const accessToken=`${encode({alg:'none',typ:'JWT'})}.${encode({aud:'authenticated',role:'authenticated',sub:'carlos-admin-test-000000000000',email:'carlos.jarvis@fenix.test',exp:1999999999})}.test-signature`;
const session={access_token:accessToken,token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-refresh-not-real',user:{id:'carlos-admin-test-000000000000',aud:'authenticated',role:'authenticated',email:'carlos.jarvis@fenix.test',app_metadata:{},user_metadata:{full_name:'Carlos QA',actor_code:'CARLOS-ADMIN',role:'Dirección'},created_at:'2026-10-19T00:00:00.000Z'}};
const corsHeaders={'access-control-allow-origin':'http://127.0.0.1:4173','access-control-allow-headers':'authorization,apikey,content-type','access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json'};

test('Operativa premium separates Jarvis, shows real work in human Spanish and preserves canonical Gateway',async({page})=>{
 test.setTimeout(30_000);
 let postedChat:any=null;

 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');sessionStorage.setItem('fenix-session-active','1');class FakeRecognition{lang='';continuous=false;interimResults=false;maxAlternatives=1;onstart:any=null;onresult:any=null;onerror:any=null;onend:any=null;start(){this.onstart?.(new Event('start'))}stop(){this.onend?.(new Event('end'))}abort(){this.onend?.(new Event('end'))}};(window as any).SpeechRecognition=FakeRecognition},session);

 await page.route('http://127.0.0.1:54321/auth/v1/**',async route=>{const url=route.request().url();if(url.includes('/user'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify(session.user)});if(url.includes('/token'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify(session)});return route.fulfill({status:200,headers:corsHeaders,body:'{}'})});
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async route=>{if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:corsHeaders,body:''});const url=route.request().url();if(url.endsWith('/session/context'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Dirección'})});if(url.endsWith('/navigation'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'CEREBRO',route:'/cerebro',resource:'CEREBRO'}]})});return route.fulfill({status:404,headers:corsHeaders,body:'{}'})});
 await page.route('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v0/**',async route=>{const request=route.request();if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:corsHeaders,body:''});const url=request.url();if(url.endsWith('/health'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'ok',service:'cerebro-console-gateway-v0',environment:'TEST_ISOLATED',version:'e2e',authenticated_transport:true,direct_model_access:false,prod_execution_enabled:false,live_writes:false,chat_available:true,chat_mode:'OWNER_DECISION_BY_EXCEPTION_V1'})});if(url.endsWith('/preferences'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'ok',preferences:{response_length:'concise'}})});if(url.endsWith('/chat')){postedChat=request.postDataJSON();return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'OK',intent:'e2e_probe',message:'PONG_OPERATIVA',executed:false})})}return route.fulfill({status:404,headers:corsHeaders,body:'{}'})});
 await page.route('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-activity-v0/**',async route=>{if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:corsHeaders,body:''});return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'OK',observed_at:'2026-11-02T00:30:00.000Z',source:'GITHUB_ACTIONS',source_status:'LIVE',repository:'carlosjmunoz78/fenix-capital-inmo-map',runs:[{run_id:201,workflow_name:'CEREBRO FACT-001 Engine Factory',workflow_alias:'FACT-001',workflow_path:'.github/workflows/cerebro-factory.yml',status:'in_progress',conclusion:null,event:'workflow_dispatch',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/201',created_at:'2026-11-02T00:20:00.000Z',run_started_at:'2026-11-02T00:21:00.000Z',updated_at:'2026-11-02T00:29:00.000Z',engine_id:'FACT-001',company_id:'fenix',environment:'PREPROD',version:'abc123def456',source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',progress_percent:42,progress_completed_steps:8,progress_total_steps:19,current_step:'Scaffold · contracts',next_step:'Tribunal',progress_provenance:'REAL_GITHUB_JOBS'},{run_id:200,workflow_name:'CEREBRO QA completed',workflow_alias:'QA',workflow_path:'.github/workflows/qa.yml',status:'completed',conclusion:'success',event:'push',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/200',created_at:'2026-11-02T00:00:00.000Z',run_started_at:'2026-11-02T00:01:00.000Z',updated_at:'2026-11-02T00:10:00.000Z',engine_id:'QA-001',company_id:'fenix',environment:'PREPROD',version:'def456abc123',source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',progress_percent:100,progress_completed_steps:null,progress_total_steps:null,current_step:'Finalizado',next_step:null,progress_provenance:'TERMINAL_STATUS'},...Array.from({length:7},(_,i)=>({run_id:300+i,workflow_name:'UMS001 CEREBRO Facebook offline QA '+(i+1),workflow_alias:'UMS001',workflow_path:'.github/workflows/ums001-qa.yml',status:'queued',conclusion:null,event:'workflow_dispatch',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/'+(300+i),created_at:'2026-11-02T00:00:00.000Z',run_started_at:null,updated_at:'2026-11-02T00:15:00.000Z',engine_id:'UMS-001',company_id:'fenix',environment:'LAB',version:'abc123def456',source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',progress_percent:null,progress_completed_steps:null,progress_total_steps:null,current_step:null,next_step:null,progress_provenance:'UNAVAILABLE'}))]})})});

 await page.goto('/cerebro?section=operativa',{waitUntil:'domcontentloaded'});
 const operative=page.locator('.operativa-premium');
 await expect(operative).toBeVisible();
 // Verify the real authenticated-chat console's five-tab bar is not covering
 // the inline conversation; the old V3-only fixture was not representative.
 const bar=page.locator('.cerebro-interface-bar');
 await expect(bar).toHaveCSS('position','relative');
 const navGap=await page.evaluate(()=>{
  const nav=document.querySelector('.cerebro-interface-bar')?.getBoundingClientRect();
  const stage=document.querySelector('.cerebro-interface-stage')?.getBoundingClientRect();
  return {navBottom:nav?.bottom??Infinity,stageTop:stage?.top??-Infinity};
 });
 expect(navGap.navBottom).toBeLessThanOrEqual(navGap.stageTop+1);
 await page.setViewportSize({width:390,height:844});
 const menu=page.getByRole('navigation',{name:'Interfaces'});
 for(const name of ['Inicio','Jarvis','Operativa','Neuronal','Navegador']){
  const tab=menu.getByRole('button',{name:new RegExp(name,'i')});
  await expect(tab).toBeVisible();
  const bounds=await tab.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-1);
  expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(391);
 }
 await expect(operative.locator('textarea[aria-label="Mensaje para CEREBRO"]')).toBeVisible();
 await expect(operative.getByRole('textbox',{name:'Mensaje para CEREBRO'})).toBeVisible();
 // Keep the hint to a single readable line instead of clipping under the mobile send icon.
 await expect.poll(async()=>page.evaluate(()=>{
  const field=document.querySelector<HTMLTextAreaElement>('.operativa-dialogue textarea[aria-label="Mensaje para CEREBRO"]');
  if(!field)return false;
  const visible=field.getBoundingClientRect().width;
  const test=document.createElement('canvas').getContext('2d');
  if(!test)return false;
  const style=getComputedStyle(field);
  test.font=style.font;
  const innerWidth=visible-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  return test.measureText(field.placeholder).width<=innerWidth;
 })).toBe(true);

 // Mobile first screen must allow sending an owner instruction without scrolling.
 // This checks viewport geometry, not just Playwright's DOM-level visibility.
 await page.evaluate(()=>window.scrollTo(0,0));
 await expect.poll(async()=>page.evaluate(()=>{
  const field=document.querySelector('.operativa-dialogue textarea[aria-label="Mensaje para CEREBRO"]')?.getBoundingClientRect();
  const talk=document.querySelector('.operativa-dialogue');
  const deck=document.querySelector('.operativa-command-deck');
  const root=document.querySelector('.operativa-premium');
  if(!field||!talk||!deck||!root)return {fieldVisible:false,first:false,scrollY:window.scrollY};
  const rootStyle=getComputedStyle(root);
  return {
   fieldVisible:field.top>=0&&field.bottom<=window.innerHeight,
   first:rootStyle.display==='flex'&&Number(getComputedStyle(talk).order)<Number(getComputedStyle(deck).order),
   scrollY:window.scrollY
  };
 }),{timeout:5000}).toMatchObject({fieldVisible:true,first:true,scrollY:0});

 await page.screenshot({path:'test-results/operativa-real-chat-mobile.png',animations:'disabled'});
 await page.setViewportSize({width:1280,height:720});

 await expect(page.locator('.jarvis-work')).toHaveCount(0);
 await expect(operative.getByText('Ahora',{exact:true}).first()).toBeVisible();
 await expect(operative.getByRole('heading',{name:'Hay trabajo en marcha.'})).toBeVisible();
 await expect(operative.getByText('Construir y validar capacidades',{exact:true})).toBeVisible();
 await expect(operative.locator('.operativa-work-row').getByText('CEREBRO FACT-001 Engine Factory',{exact:true})).toBeVisible();
 await expect(operative.locator('.operativa-work-row').getByText('En cola de GitHub Actions; todavía no está ejecutándose.',{exact:true}).first()).toBeVisible();
 await expect(operative.locator('.operativa-work-row')).toHaveCount(5);
 await expect(operative.getByRole('button',{name:'Ver los 9 trabajos'})).toBeVisible();
 await expect(operative.locator('.operativa-work-row').getByText('UMS001 CEREBRO Facebook offline QA 1',{exact:true})).toBeVisible();
 await operative.getByRole('button',{name:'Ver los 9 trabajos'}).click();
 await expect(operative.locator('.operativa-work-row')).toHaveCount(9);
 await operative.getByRole('button',{name:'Mostrar menos trabajos'}).click();
 await expect(operative.locator('.operativa-work-row')).toHaveCount(5);

 await expect(operative.locator('.operativa-dialogue')).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/operativa-real-chat-desktop.png',fullPage:true,animations:'disabled'});

 expect(await operative.locator('.operativa-dialogue').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('.operativa-stage'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 await expect(operative.getByText('Preparando estructura y reglas',{exact:true})).toBeVisible();
 await expect(operative.getByText('42%',{exact:true})).toBeVisible();
 await expect(operative.getByText('Scaffold · contracts',{exact:true})).toHaveCount(0);
 await expect(operative.getByText('Tribunal',{exact:true})).toHaveCount(0);
 await expect(operative.getByText('Para ti',{exact:true})).toBeVisible();
 await expect(operative.getByRole('radio',{name:'Normal'})).toHaveAttribute('aria-checked','true');
 await expect(operative.getByRole('button',{name:'Archivos todavía no disponibles'})).toBeDisabled();
 const composer=operative.getByRole('textbox',{name:'Mensaje para CEREBRO'});
 const chatPanel=operative.locator('.operativa-dialogue');
 const inlineComposer=chatPanel.locator('.operativa-jarvis-composer');
 await expect(inlineComposer).toBeVisible();
 await expect(inlineComposer).toHaveCSS('position','relative');
 expect(await inlineComposer.evaluate(el=>el.parentElement?.classList.contains('operativa-dialogue'))).toBe(true);
 await expect(composer).toHaveAttribute('placeholder','Escribe o dicta…');
 await expect(operative.getByRole('button',{name:'Enviar mensaje'})).toBeDisabled();
 await expect(operative.getByRole('button',{name:'Dictar'})).toBeVisible();
 await expect(operative.getByRole('button',{name:'Conversación por voz'})).toBeVisible();

 await operative.getByText('Construir y validar capacidades',{exact:true}).click();
 const inspector=page.getByRole('dialog',{name:'Detalle del trabajo'});
 await expect(inspector).toBeVisible();
 await expect(inspector.getByText('Preparando estructura y reglas',{exact:true})).toBeVisible();
 await expect(inspector.getByText('Revisión independiente',{exact:true})).toBeVisible();
 await inspector.getByRole('button',{name:'Cerrar'}).click();

 await composer.fill('Prueba Operativa nueva');
 await expect(operative.getByRole('button',{name:'Enviar mensaje'})).toBeEnabled();
 await operative.getByRole('button').filter({has:page.locator('svg')}).count();
 await composer.press('Enter');
 await expect.poll(()=>postedChat?.message??null,{timeout:5_000}).toBe('Prueba Operativa nueva');
 await expect(operative.getByRole('log').getByText('Prueba Operativa nueva')).toBeVisible();

 await operative.getByRole('radio',{name:'Máximo'}).click();
 await expect.poll(()=>String(postedChat?.message||''),{timeout:5_000}).toContain('Solicito ritmo operativo Máximo');
 await expect(String(postedChat?.message||'')).toContain('Sin elevar permisos ni costes');

 const floatingPrivateChat=page.getByRole('button',{name:'Abrir chat interno'});
 if(await floatingPrivateChat.count())await expect(floatingPrivateChat).toBeHidden();
 const floatingVoice=page.getByRole('button',{name:'Abrir acciones por voz'});
 if(await floatingVoice.count())await expect(floatingVoice).toBeHidden();

 await page.goto('/cerebro?section=jarvis',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.jarvis-work')).toBeVisible();
 await expect(page.locator('.operativa-premium')).toHaveCount(0);

 await page.goto('/cerebro?section=legacy-v0',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.cerebro-host-v0.is-visible')).toBeVisible();
 await expect(page.locator('.operativa-premium')).toHaveCount(0);
});