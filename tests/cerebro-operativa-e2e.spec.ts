import {test,expect} from '@playwright/test';

const session={
  access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJjYXJsb3MtYWRtaW4tdGVzdC0wMDAwMDAwMDAwMDAiLCJlbWFpbCI6ImNhcmxvcy5vcGVyYXRpdmFAdmZlbml4LnRlc3QiLCJleHAiOjE5OTk5OTk5OTl9.c2ln',
  token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-refresh-cerebro-operativa-not-real',
  user:{
    id:'carlos-admin-test-000000000000',aud:'authenticated',role:'authenticated',email:'carlos.operativa@fenix.test',
    app_metadata:{},user_metadata:{full_name:'Carlos QA',actor_code:'CARLOS-ADMIN',role:'Dirección'},
    created_at:'2026-10-19T00:00:00.000Z'
  }
};

const corsHeaders={
  'access-control-allow-origin':'http://127.0.0.1:4173',
  'access-control-allow-headers':'authorization,apikey,content-type',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'content-type':'application/json'
};

test('OPERATIVA projects real activity, preserves V0 and exposes the compact command bar',async({page})=>{
  test.setTimeout(20_000);
  let postedChat:any=null;

  await page.addInitScript(s=>{
    localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));
    localStorage.setItem('fenix-remember-device','true');
    sessionStorage.setItem('fenix-session-active','1');
    sessionStorage.setItem('cerebro_console_view_v1','OPERATIVA');
    class FakeRecognition{
      lang='';continuous=false;interimResults=false;maxAlternatives=1;
      onstart:any=null;onresult:any=null;onerror:any=null;onend:any=null;
      start(){
        this.onstart?.(new Event('start'));
        setTimeout(()=>{
          const alternative={transcript:'Dictado operativo',confidence:.96};
          this.onresult?.({results:{0:{0:alternative,length:1,isFinal:true},length:1}} as any);
          this.onend?.(new Event('end'));
        },20);
      }
      stop(){this.onend?.(new Event('end'))}
      abort(){this.onend?.(new Event('end'))}
    }
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
    if(url.endsWith('/health'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({
      status:'ok',service:'cerebro-console-gateway-v0',environment:'TEST_ISOLATED',version:'e2e',
      authenticated_transport:true,direct_model_access:false,prod_execution_enabled:false,live_writes:false,
      chat_available:true,chat_mode:'OWNER_DECISION_BY_EXCEPTION_V1'
    })});
    if(url.endsWith('/preferences'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'ok',preferences:{response_length:'concise'}})});
    if(url.endsWith('/chat')){
      postedChat=request.postDataJSON();
      return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'OK',intent:'e2e_probe',message:'PONG_OPERATIVA',executed:false})});
    }
    return route.fulfill({status:404,headers:corsHeaders,body:'{}'});
  });

  await page.route('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-activity-v0/**',async route=>{
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:corsHeaders,body:''});
    return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({
      status:'OK',observed_at:'2026-10-20T18:00:00.000Z',source:'GITHUB_ACTIONS',source_status:'LIVE',repository:'carlosjmunoz78/fenix-capital-inmo-map',
      runs:[
        {run_id:101,workflow_name:'CEREBRO SEO-001 city execution',workflow_path:'.github/workflows/cerebro-seo.yml',status:'in_progress',conclusion:null,event:'workflow_dispatch',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/101',created_at:'2026-10-20T17:54:00.000Z',run_started_at:'2026-10-20T17:55:00.000Z',updated_at:'2026-10-20T17:59:00.000Z',engine_id:'SEO-001',company_id:'fenix',environment:'PROD',version:'abc123def456',source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE'},
        {run_id:102,workflow_name:'CEREBRO FACT-001 build',workflow_path:'.github/workflows/cerebro-fact.yml',status:'queued',conclusion:null,event:'workflow_dispatch',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/102',created_at:'2026-10-20T17:58:00.000Z',run_started_at:null,updated_at:'2026-10-20T17:58:00.000Z',engine_id:'FACT-001',company_id:'fenix',environment:'PREPROD',version:'def456abc123',source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE'},
        {run_id:100,workflow_name:'CEREBRO JOB-001 worker',workflow_path:'.github/workflows/cerebro-job.yml',status:'completed',conclusion:'success',event:'push',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/100',created_at:'2026-10-20T17:40:00.000Z',run_started_at:'2026-10-20T17:41:00.000Z',updated_at:'2026-10-20T17:47:00.000Z',engine_id:'JOB-001',company_id:'fenix',environment:'PREPROD',version:'456abc123def',source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE'}
      ]
    })});
  });

  await page.goto('/cerebro',{waitUntil:'domcontentloaded'});

  const operativa=page.locator('.cerebro-operative');
  await expect(operativa).toBeVisible();
  await expect(operativa.getByRole('heading',{name:'Procesos reales de CEREBRO'})).toBeVisible();
  await expect(operativa.getByText('REAL · GitHub Actions en vivo',{exact:true})).toBeVisible();
  await expect(operativa.getByText('CEREBRO SEO-001 city execution',{exact:true})).toBeVisible();
  await expect(operativa.getByText('CEREBRO FACT-001 build',{exact:true})).toBeVisible();
  await expect(operativa.getByText('Estimación aún no disponible',{exact:true}).first()).toBeVisible();
  await expect(operativa.getByText('Sin % fiable',{exact:true})).toBeVisible();
  await expect(operativa.getByText('Sin datos ficticios',{exact:true})).toBeVisible();

  const visibleComposer=operativa.getByRole('textbox',{name:'Escribe una orden para CEREBRO'});
  await expect(visibleComposer).toBeEnabled();
  await expect(operativa.getByRole('button',{name:'Adjuntar archivo'})).toBeDisabled();
  await expect(operativa.getByRole('button',{name:'Dictar'})).toBeEnabled();
  await expect(operativa.getByRole('button',{name:'Hablar con CEREBRO'})).toBeVisible();
  await expect(operativa.getByRole('button',{name:'Enviar a CEREBRO'})).toBeVisible();
  await expect(operativa.locator('.cerebro-composer-actions')).toHaveCount(0);

  await operativa.getByRole('button',{name:'Dictar'}).click();
  await expect(visibleComposer).toHaveValue('Dictado operativo');
  await visibleComposer.press('Shift+Enter');
  await visibleComposer.type('segunda línea');
  await expect(visibleComposer).toHaveValue('Dictado operativo\nsegunda línea');
  await visibleComposer.press('Enter');

  await expect.poll(()=>postedChat?.message??null,{timeout:5_000}).toBe('Dictado operativo\nsegunda línea');
  await expect(operativa.getByText('PONG_OPERATIVA',{exact:true})).toBeVisible();
  await expect(operativa.getByText('DERIVED · evento observado',{exact:true})).toBeVisible();

  for(const demoValue of ['68%','80%','60%','45%','70%','90%']){
    await expect(operativa.getByText(demoValue,{exact:true})).toHaveCount(0);
  }

  await page.getByRole('button',{name:'VISTA 0'}).click();
  await expect(page.locator('.cerebro-host-v0')).toHaveClass(/is-visible/);
  await expect(page.getByRole('heading',{name:'Transporte autenticado verificado'})).toBeVisible();
  await expect(page.getByText('PONG_OPERATIVA',{exact:true})).toBeVisible();

  await page.getByRole('button',{name:'OPERATIVA'}).click();
  await expect(operativa).toBeVisible();
  await expect(operativa.getByText('PONG_OPERATIVA',{exact:true})).toBeVisible();
});
