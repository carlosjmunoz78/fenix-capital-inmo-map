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

test('OPERATIVA, V0 and recovered NEURAL share one authenticated Console state',async({page})=>{
  test.setTimeout(30_000);
  let postedChat:any=null;

  await page.addInitScript(s=>{
    localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));
    localStorage.setItem('fenix-remember-device','true');
    sessionStorage.setItem('fenix-session-active','1');
    sessionStorage.setItem('cerebro_console_view_v1','OPERATIVA');
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

  await page.goto('/cerebro',{waitUntil:'domcontentloaded'});

  const operativa=page.locator('.cerebro-operative');
  await expect(operativa).toBeVisible();
  await expect(operativa.getByRole('heading',{name:'Qué está haciendo CEREBRO'})).toBeVisible();
  await expect(operativa.getByText('Conectado',{exact:true})).toBeVisible();
  await expect(operativa.getByText('Sin métrica fiable',{exact:true})).toBeVisible();
  await expect(operativa.getByText('Sin datos ficticios',{exact:true})).toBeVisible();

  const visibleComposer=operativa.getByRole('textbox',{name:'Escribe una orden para CEREBRO'});
  await expect(visibleComposer).toBeEnabled();
  await visibleComposer.fill('Prueba E2E Operativa');
  await operativa.locator('.cerebro-send-button').click();

  await expect.poll(()=>postedChat?.message??null,{timeout:5_000}).toBe('Prueba E2E Operativa');
  await expect(operativa.getByText('PONG_OPERATIVA',{exact:true})).toBeVisible();
  await expect(operativa.getByText('DERIVED · evento observado',{exact:true})).toBeVisible();

  for(const demoValue of ['68%','80%','60%','45%','70%','90%']){
    await expect(operativa.getByText(demoValue,{exact:true})).toHaveCount(0);
  }

  await page.getByRole('button',{name:'NEURAL',exact:true}).click();
  await expect(page.locator('.cerebro-neural-view')).toBeVisible();
  await expect(page.locator('.cerebro-host-v0')).toHaveClass(/is-neural-overlay/);
  await expect(page.getByText('PONG_OPERATIVA',{exact:true})).toBeVisible();
  const neuralFrame=page.frameLocator('iframe.cerebro-neural-frame');
  await expect(neuralFrame.locator('.brand b')).toContainText('LAB V1.4.25',{timeout:8_000});
  await expect(neuralFrame.locator('body')).toContainText('SEGUIR SEÑAL');

  await page.getByRole('button',{name:'VISTA 0'}).click();
  await expect(page.locator('.cerebro-host-v0')).toHaveClass(/is-visible/);
  await expect(page.getByRole('heading',{name:'Transporte autenticado verificado'})).toBeVisible();
  await expect(page.getByText('PONG_OPERATIVA',{exact:true})).toBeVisible();

  await page.getByRole('button',{name:'OPERATIVA'}).click();
  await expect(operativa).toBeVisible();
  await expect(operativa.getByText('PONG_OPERATIVA',{exact:true})).toBeVisible();
});
