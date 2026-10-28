import {test,expect} from '@playwright/test';

function encode(value:unknown){return Buffer.from(JSON.stringify(value)).toString('base64url')}
const accessToken=`${encode({alg:'none',typ:'JWT'})}.${encode({aud:'authenticated',role:'authenticated',sub:'carlos-admin-test-000000000000',email:'carlos.jarvis@fenix.test',exp:1999999999})}.test-signature`;

const session={
  access_token:accessToken,
  token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-refresh-not-real',
  user:{id:'carlos-admin-test-000000000000',aud:'authenticated',role:'authenticated',email:'carlos.jarvis@fenix.test',app_metadata:{},user_metadata:{full_name:'Carlos QA',actor_code:'CARLOS-ADMIN',role:'Dirección'},created_at:'2026-10-19T00:00:00.000Z'}
};

const corsHeaders={
  'access-control-allow-origin':'http://127.0.0.1:4173',
  'access-control-allow-headers':'authorization,apikey,content-type',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'content-type':'application/json'
};

test('OPERATIVA is the visible real-work control surface around canonical V0 chat voice and evidence',async({page})=>{
  test.setTimeout(25_000);
  let postedChat:any=null;

  await page.addInitScript(s=>{
    localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));
    localStorage.setItem('fenix-remember-device','true');
    sessionStorage.setItem('fenix-session-active','1');
    class FakeRecognition{lang='';continuous=false;interimResults=false;maxAlternatives=1;onstart:any=null;onresult:any=null;onerror:any=null;onend:any=null;start(){this.onstart?.(new Event('start'))}stop(){this.onend?.(new Event('end'))}abort(){this.onend?.(new Event('end'))}}
    ;(window as any).SpeechRecognition=FakeRecognition;
  },session);

  await page.route('http://127.0.0.1:54321/auth/v1/**',async route=>{
    const url=route.request().url();
    if(url.includes('/user'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify(session.user)});
    if(url.includes('/token'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify(session)});
    return route.fulfill({status:200,headers:corsHeaders,body:'{}'});
  });

  await page.route('**/functions/v1/fenix-app-gateway-test/**',async route=>{
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:corsHeaders,body:''});
    const url=route.request().url();
    if(url.endsWith('/session/context'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Dirección'})});
    if(url.endsWith('/navigation'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'CEREBRO',route:'/cerebro',resource:'CEREBRO'}]})});
    return route.fulfill({status:404,headers:corsHeaders,body:'{}'});
  });

  await page.route('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v0/**',async route=>{
    const request=route.request();
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:corsHeaders,body:''});
    const url=request.url();
    if(url.endsWith('/health'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'ok',service:'cerebro-console-gateway-v0',environment:'TEST_ISOLATED',version:'e2e',authenticated_transport:true,direct_model_access:false,prod_execution_enabled:false,live_writes:false,chat_available:true,chat_mode:'OWNER_DECISION_BY_EXCEPTION_V1'})});
    if(url.endsWith('/preferences'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'ok',preferences:{response_length:'concise'}})});
    if(url.endsWith('/chat')){postedChat=request.postDataJSON();return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'OK',intent:'e2e_probe',message:'PONG_OPERATIVA',executed:false})})}
    return route.fulfill({status:404,headers:corsHeaders,body:'{}'});
  });

  await page.route('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-activity-v0/**',async route=>{
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:corsHeaders,body:''});
    return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'OK',observed_at:'2026-10-27T00:30:00.000Z',source:'GITHUB_ACTIONS',source_status:'LIVE',repository:'carlosjmunoz78/fenix-capital-inmo-map',runs:[
      {run_id:201,workflow_name:'CEREBRO FACT-001 Engine Factory',workflow_alias:'FACT-001',workflow_path:'.github/workflows/cerebro-factory.yml',status:'in_progress',conclusion:null,event:'workflow_dispatch',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/201',created_at:'2026-10-27T00:20:00.000Z',run_started_at:'2026-10-27T00:21:00.000Z',updated_at:'2026-10-27T00:29:00.000Z',engine_id:'FACT-001',company_id:'fenix',environment:'PREPROD',version:'abc123def456',source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',progress_percent:42,progress_completed_steps:8,progress_total_steps:19,current_step:'Scaffold · contracts',next_step:'Tribunal',progress_provenance:'REAL_GITHUB_JOBS'},
      {run_id:200,workflow_name:'CEREBRO QA completed',workflow_alias:'QA',workflow_path:'.github/workflows/qa.yml',status:'completed',conclusion:'success',event:'push',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/200',created_at:'2026-10-27T00:00:00.000Z',run_started_at:'2026-10-27T00:01:00.000Z',updated_at:'2026-10-27T00:10:00.000Z',engine_id:'QA-001',company_id:'fenix',environment:'PREPROD',version:'def456abc123',source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',progress_percent:100,progress_completed_steps:null,progress_total_steps:null,current_step:'Finalizado',next_step:null,progress_provenance:'TERMINAL_STATUS'}
    ]})});
  });

  await page.goto('/cerebro',{waitUntil:'domcontentloaded'});

  const work=page.locator('.jarvis-work');
  await expect(work).toBeVisible();
  await expect(page.locator('.cerebro-operative')).toHaveCount(0);
  await expect(work.getByText('OPERATIVA · CONTROL',{exact:true})).toBeVisible();
  await expect(work.getByRole('button',{name:'OPERATIVA'})).toBeVisible();
  await expect(work.getByText('JARVIS · WORK',{exact:true})).toHaveCount(0);
  await expect(work.getByRole('heading',{name:'Procesos reales'})).toBeVisible();
  await expect(work.getByRole('heading',{name:'Inspector'})).toBeVisible();
  await expect(work.getByText('FACT-001',{exact:true}).first()).toBeVisible();
  await expect(work.getByText('42%',{exact:true}).first()).toBeVisible();
  await expect(work.getByText('Scaffold · contracts',{exact:true})).toBeVisible();
  await expect(work.getByText('Tribunal',{exact:true})).toBeVisible();
  await expect(work.getByRole('link',{name:'Abrir evidencia real'})).toBeVisible();
  await expect(work.getByText('HUMAN_REQUIRED',{exact:true})).toBeVisible();

  const core=work.locator('.jarvis-work-core-shell');
  await expect(core.getByRole('heading',{name:'Transporte autenticado verificado'})).toBeVisible();
  const fields=core.locator('.cerebro-fields select');
  await expect(fields).toHaveCount(2);
  await expect(fields.nth(0)).toHaveValue('Fénix · sesión autenticada');
  await expect(fields.nth(1)).toHaveValue('GENERAL');

  const talk=core.getByRole('button',{name:'Hablar con CEREBRO'});
  await expect(talk).toBeVisible();
  await expect(talk).toBeEnabled();
  const composer=core.getByPlaceholder('También puedes escribir a CEREBRO…');
  await composer.fill('Prueba OPERATIVA sobre V0');
  await core.getByRole('button',{name:'Enviar'}).click();
  await expect.poll(()=>postedChat?.message??null,{timeout:5_000}).toBe('Prueba OPERATIVA sobre V0');
  await expect(core.getByText('PONG_OPERATIVA',{exact:true})).toBeVisible();

  const floatingVoice=page.getByRole('button',{name:'Abrir acciones por voz'});
  if(await floatingVoice.count())await expect(floatingVoice).toBeHidden();

  await page.goto('/cerebro?section=legacy-v0',{waitUntil:'domcontentloaded'});
  const legacy=page.locator('.cerebro-host-v0.is-visible');
  await expect(legacy).toBeVisible();
  await expect(page.locator('.jarvis-work')).toHaveCount(0);
  await expect(legacy.getByRole('heading',{name:'Transporte autenticado verificado'})).toBeVisible();
  await expect(page.getByRole('button',{name:'LEGACY V0'})).toBeVisible();

  await page.goto('/cerebro?section=v0',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.jarvis-work')).toBeVisible();
});
