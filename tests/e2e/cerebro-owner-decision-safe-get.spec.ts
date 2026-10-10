import { expect, test } from '@playwright/test';

const approvalId='APR-20990101-ABCDEF12';
const route=`/cerebro/tests/owner-decision-harness.html?approval_id=${approvalId}&intent=AUTORIZO`;

function fakeJwt(){
  const b64=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${b64({alg:'HS256',typ:'JWT'})}.${b64({aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,sub:'00000000-0000-4000-8000-000000000001',email:'preprod-owner-gate@example.invalid',role:'authenticated'})}.test-signature`;
}

test('opening an owner decision link never submits a decision', async ({ page }) => {
  const gatewayRequests: Array<{ method: string; url: string }> = [];
  page.on('request', (request) => {
    if (request.url().includes('/functions/v1/cerebro-owner-decision-gateway-v0')) {
      gatewayRequests.push({ method: request.method(), url: request.url() });
    }
  });

  await page.goto(route);
  await expect(page.locator('[data-owner-decision-harness="ready"]')).toBeVisible();
  await page.waitForTimeout(1200);

  expect(gatewayRequests).toEqual([]);
});

test('even with a browser session the decision is sent only after explicit confirmation click', async ({ page }) => {
  const accessToken=fakeJwt();
  await page.addInitScript(({accessToken})=>{
    localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify({
      access_token:accessToken,
      refresh_token:'preprod-test-refresh-token',
      expires_in:3600,
      expires_at:Math.floor(Date.now()/1000)+3600,
      token_type:'bearer',
      user:{
        id:'00000000-0000-4000-8000-000000000001',
        aud:'authenticated',
        role:'authenticated',
        email:'preprod-owner-gate@example.invalid',
        app_metadata:{},
        user_metadata:{},
        created_at:new Date().toISOString(),
      },
    }));
  },{accessToken});

  const posts: Array<{method:string;postData:string|null}>=[];
  await page.route('**/functions/v1/cerebro-owner-decision-gateway-v0',async routeHandler=>{
    const request=routeHandler.request();
    posts.push({method:request.method(),postData:request.postData()});
    await routeHandler.fulfill({status:202,contentType:'application/json',body:JSON.stringify({ok:true,status:'ACCEPTED_FOR_RECONCILIATION',executed:false})});
  });

  await page.goto(route);
  await expect(page.locator('[data-cerebro-owner-decision="v0"]')).toBeVisible();
  await page.waitForTimeout(600);
  expect(posts).toEqual([]);

  await page.getByRole('button',{name:'Confirmar AUTORIZAR'}).click();
  await expect(page.getByRole('heading',{name:'Decisión recibida'})).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0].method).toBe('POST');
  expect(JSON.parse(posts[0].postData||'{}')).toEqual({approval_id:approvalId,decision:'AUTORIZO'});
});
