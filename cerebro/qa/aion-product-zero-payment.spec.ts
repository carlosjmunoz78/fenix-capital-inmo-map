import {expect,test} from '@playwright/test';

const allowed=['AION-P001','AION-P002','AION-P003','AION-B005','AION-B008'] as const;
const product=(process.env.QA_PRODUCT_ID||'AION-P001').toUpperCase();
if(!allowed.includes(product as (typeof allowed)[number])) throw new Error(`QA_PRODUCT_ID not allowed: ${product}`);
const pageUrl=process.env.QA_PRODUCT_URL||'https://aionoperator.com/aion-prueba-cliente-0-preprod/';

test(`[PRODUCT] [AION_DEEP_ZERO_PAYMENT] ${product} · purchase → generate → deliver → private result`,async({page})=>{
  test.setTimeout(120_000);
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(pageUrl,{waitUntil:'domcontentloaded',timeout:45_000});
  expect(response).not.toBeNull();
  if(response) expect(response.status()).toBeLessThan(500);
  await expect(page.locator('#aion-zero-test')).toBeVisible();

  const button=page.locator(`[data-product="${product}"]`);
  await expect(button).toBeVisible();
  // The PREPROD zero-payment endpoint deliberately rejects tokens younger than
  // one second. Human users naturally satisfy that anti-replay guard, while an
  // automated browser can click in the same second in which the page token was
  // issued. Respect the production-like security contract instead of weakening it.
  await page.waitForTimeout(1_100);
  await button.click();

  const status=page.locator('#zt-status');
  await expect(status).toContainText('Prueba completada',{timeout:60_000});
  await expect(status).toContainText('Importe real: 0 €');
  await expect(status).toContainText('Email: enviado');
  const access=status.locator('a[href]').first();
  await expect(access).toBeVisible();
  const accessUrl=await access.getAttribute('href');
  expect(accessUrl).toBeTruthy();

  const result=await page.goto(accessUrl!,{waitUntil:'domcontentloaded',timeout:45_000});
  expect(result).not.toBeNull();
  if(result) expect(result.status()).toBe(200);
  await expect(page.locator('body')).toContainText('PRUEBA CLIENTE · 0 €');
  const safetyCopy=(await page.locator('body').innerText()).normalize('NFKC').replace(/\s+/g,' ').toLowerCase();
  expect(safetyCopy).toContain('preprod');
  expect(safetyCopy).toContain('0 €');
  expect(safetyCopy).toContain('no es una venta real');

  const artifactLinks=page.locator('a[href*="aion_test_view"],a[href*="aion_test_download"]');
  expect(await artifactLinks.count(),'generated delivery artifacts').toBeGreaterThan(0);
  const artifactUrl=await artifactLinks.first().getAttribute('href');
  expect(artifactUrl).toBeTruthy();
  const artifact=await page.request.get(artifactUrl!);
  expect(artifact.status(),'private artifact HTTP status').toBe(200);
  expect((await artifact.body()).byteLength,'private artifact non-empty').toBeGreaterThan(20);
  expect(errors,'uncaught browser errors').toEqual([]);
});
