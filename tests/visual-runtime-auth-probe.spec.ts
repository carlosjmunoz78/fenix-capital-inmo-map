import {test,expect} from '@playwright/test';

const session={
  access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJjY2NjY2NjYy1jY2NjLTRjY2MtOGNjYy1jY2NjY2NjY2NjY2MiLCJlbWFpbCI6InByb2JlQGZlbml4LnRlc3QiLCJleHAiOjE5OTk5OTk5OTl9.sig',
  token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-probe-not-real',
  user:{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',aud:'authenticated',role:'authenticated',email:'probe@fenix.test',app_metadata:{},user_metadata:{full_name:'QA Probe'},created_at:'2026-09-15T00:00:00.000Z'}
};

test('isolated visual runtime recognizes persisted QA session and mounts workspace',async({page})=>{
  const pageErrors:string[]=[];
  const failedRequests:string[]=[];
  page.on('pageerror',error=>pageErrors.push(String(error?.message||error)));
  page.on('requestfailed',request=>failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText||'failed'}`));

  await page.addInitScript(s=>{
    localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));
    localStorage.setItem('fenix-remember-device','true');
    sessionStorage.setItem('fenix-session-active','1');
  },session);

  await page.route('**/functions/v1/fenix-app-gateway-test/**',async route=>{
    const url=route.request().url();
    if(url.endsWith('/session/context'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'FIN-PROBE',role:'Financiero'})});
    if(url.endsWith('/navigation'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'}]})});
    return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });
  await page.route('**/functions/v1/fenix-notion-runtime-test/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));

  // Diagnose application bootstrap, not third-party/resource load completion.
  // DOMContentLoaded is sufficient for the React mount and avoids masking the
  // real cause behind an unrelated long-lived request during synthetic CI.
  await page.goto('/expedientes',{waitUntil:'domcontentloaded',timeout:10_000});
  await page.waitForTimeout(1000);

  const diag=await page.evaluate(()=>({
    href:location.href,
    storageKeys:Object.keys(localStorage),
    authPresent:Boolean(localStorage.getItem('fenix-preprod-auth-v2')),
    remembered:localStorage.getItem('fenix-remember-device'),
    sessionActive:sessionStorage.getItem('fenix-session-active'),
    bodyText:(document.body?.innerText||'').slice(0,800),
    hasAuthShell:Boolean(document.querySelector('.auth-shell')),
    hasTransition:Boolean(document.querySelector('.fenix-transition')),
    hasOpsRoot:Boolean(document.querySelector('.ops-root')),
    hasExpedientesRoot:Boolean(document.querySelector('[data-testid="expedientes-live"]'))
  }));
  console.log('VISUAL_RUNTIME_DIAG',JSON.stringify({diag,pageErrors,failedRequests}));

  expect(diag.authPresent).toBe(true);
  expect(pageErrors,`browser errors: ${pageErrors.join(' | ')}`).toEqual([]);
  expect(diag.hasAuthShell,`unexpected login shell; diag=${JSON.stringify(diag)}`).toBe(false);
  expect(diag.hasTransition,`runtime stuck in transition; diag=${JSON.stringify(diag)}`).toBe(false);
  await expect(page.locator('.ops-root')).toBeVisible();
});
