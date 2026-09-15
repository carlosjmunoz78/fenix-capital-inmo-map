import {test,expect} from '@playwright/test';

const session={
  access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJjY2NjY2NjYy1jY2NjLTRjY2MtOGNjYy1jY2NjY2NjY2NjY2MiLCJlbWFpbCI6InByb2JlQGZlbml4LnRlc3QiLCJleHAiOjE5OTk5OTk5OTl9.c2ln',
  token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-probe-not-real',
  user:{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',aud:'authenticated',role:'authenticated',email:'probe@fenix.test',app_metadata:{},user_metadata:{full_name:'QA Probe'},created_at:'2026-09-15T00:00:00.000Z'}
};

test('isolated visual runtime recognizes persisted QA session and mounts workspace',async({page})=>{
  test.setTimeout(15_000);
  const pageErrors:string[]=[];
  const failedRequests:string[]=[];
  const navigations:string[]=[];
  page.on('pageerror',error=>pageErrors.push(String(error?.message||error)));
  page.on('requestfailed',request=>failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText||'failed'}`));
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations.push(frame.url())});

  await page.addInitScript(s=>{
    localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));
    localStorage.setItem('fenix-remember-device','true');
    sessionStorage.setItem('fenix-session-active','1');
  },session);

  // Keep every Supabase auth call inside the synthetic CI runtime. The visual
  // suite validates App mounting/UI, not GoTrue network behaviour.
  await page.route('http://127.0.0.1:54321/auth/v1/**',async route=>{
    const url=route.request().url();
    if(url.includes('/user'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(session.user)});
    if(url.includes('/token'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(session)});
    return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async route=>{
    const url=route.request().url();
    if(url.endsWith('/session/context'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'FIN-PROBE',role:'Financiero'})});
    if(url.endsWith('/navigation'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'}]})});
    return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });
  await page.route('**/functions/v1/fenix-notion-runtime-test/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));

  await page.goto('/expedientes',{waitUntil:'domcontentloaded',timeout:5_000});

  const authShell=page.locator('.auth-shell');
  const transition=page.locator('.fenix-transition');
  const opsRoot=page.locator('.ops-root');
  await expect.poll(async()=>({
    auth:await authShell.count(),
    transition:await transition.count(),
    ops:await opsRoot.count()
  }),{timeout:5_000,message:`mount failed; navigations=${JSON.stringify(navigations)} errors=${JSON.stringify(pageErrors)} failed=${JSON.stringify(failedRequests)}`})
    .toEqual({auth:0,transition:0,ops:1});

  expect(pageErrors,`browser errors: ${pageErrors.join(' | ')}`).toEqual([]);
  await expect(opsRoot).toBeVisible();
});
