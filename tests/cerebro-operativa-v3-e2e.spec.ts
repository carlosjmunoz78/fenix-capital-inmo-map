import {test,expect} from '@playwright/test';

function encode(value:unknown){return Buffer.from(JSON.stringify(value)).toString('base64url')}
const accessToken=`${encode({alg:'none',typ:'JWT'})}.${encode({aud:'authenticated',role:'authenticated',sub:'carlos-admin-test-000000000000',email:'carlos.jarvis@fenix.test',exp:1999999999})}.test-signature`;

const session={
  access_token:accessToken,
  token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-refresh-not-real',
  user:{
    id:'carlos-admin-test-000000000000',aud:'authenticated',role:'authenticated',email:'carlos.jarvis@fenix.test',
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

test('JARVIS is the real V0 core with authenticated Gateway chat, voice and reversible legacy presentation',async({page})=>{
  test.setTimeout(20_000);
  let postedChat:any=null;

  await page.addInitScript(s=>{
    localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));
    localStorage.setItem('fenix-remember-device','true');
    sessionStorage.setItem('fenix-session-active','1');
    class FakeRecognition{
      lang='';continuous=false;interimResults=false;maxAlternatives=1;
      onstart:any=null;onresult:any=null;onerror:any=null;onend:any=null;
      start(){this.onstart?.(new Event('start'))}
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
    if(url.endsWith('/health'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'ok',service:'cerebro-console-gateway-v0',environment:'TEST_ISOLATED',version:'e2e',authenticated_transport:true,direct_model_access:false,prod_execution_enabled:false,live_writes:false,chat_available:true,chat_mode:'OWNER_DECISION_BY_EXCEPTION_V1'})});
    if(url.endsWith('/preferences'))return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'ok',preferences:{response_length:'concise'}})});
    if(url.endsWith('/chat')){postedChat=request.postDataJSON();return route.fulfill({status:200,headers:corsHeaders,body:JSON.stringify({status:'OK',intent:'e2e_probe',message:'PONG_JARVIS_V0',executed:false})})}
    return route.fulfill({status:404,headers:corsHeaders,body:'{}'});
  });

  await page.goto('/cerebro',{waitUntil:'domcontentloaded'});

  const jarvis=page.locator('.cerebro-host-v0.cerebro-jarvis-shell');
  await expect(jarvis).toBeVisible();
  await expect(page.locator('.cerebro-operative')).toHaveCount(0);
  await expect(jarvis.getByRole('heading',{name:'Transporte autenticado verificado'})).toBeVisible();
  await expect(jarvis.getByLabel('Empresa')).toBeVisible();
  await expect(jarvis.getByLabel('Contexto')).toBeVisible();
  await expect(jarvis.getByText('Decisión humana por excepción',{exact:true})).toBeVisible();

  const floatingVoice=page.getByRole('button',{name:'Abrir acciones por voz'});
  if(await floatingVoice.count())await expect(floatingVoice).toBeHidden();

  const talk=jarvis.getByRole('button',{name:'Hablar con CEREBRO'});
  await expect(talk).toBeVisible();
  await expect(talk).toBeEnabled();

  const composer=jarvis.getByPlaceholder('También puedes escribir a CEREBRO…');
  await expect(composer).toBeEnabled();
  await composer.fill('Prueba JARVIS sobre V0');
  await jarvis.getByRole('button',{name:'Enviar'}).click();
  await expect.poll(()=>postedChat?.message??null,{timeout:5_000}).toBe('Prueba JARVIS sobre V0');
  await expect(jarvis.getByText('PONG_JARVIS_V0',{exact:true})).toBeVisible();

  await page.goto('/cerebro?section=legacy-v0',{waitUntil:'domcontentloaded'});
  const legacy=page.locator('.cerebro-host-v0.is-visible');
  await expect(legacy).toBeVisible();
  await expect(legacy).not.toHaveClass(/cerebro-jarvis-shell/);
  await expect(legacy.getByRole('heading',{name:'Transporte autenticado verificado'})).toBeVisible();
  await expect(page.getByRole('button',{name:'LEGACY V0'})).toBeVisible();
  await expect(page.getByRole('button',{name:'JARVIS'})).toBeVisible();

  await page.goto('/cerebro?section=v0',{waitUntil:'domcontentloaded'});
  const oldV0Route=page.locator('.cerebro-host-v0.cerebro-jarvis-shell');
  await expect(oldV0Route).toBeVisible();
  await expect(oldV0Route.getByRole('heading',{name:'Transporte autenticado verificado'})).toBeVisible();
});
