import {expect,test} from '@playwright/test';

const productUrl=process.env.QA_PRODUCT_URL||'https://aionoperator.com/aion-prueba-cliente-0-preprod/';
const catalogUrl=process.env.QA_PRODUCT_CATALOG_URL||'https://aionoperator.com/aion-productos-v1-preprod/';

test('[PRODUCT] AION Product Factory PREPROD · human read-only observation',async({page},testInfo)=>{
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  const response=await page.goto(productUrl,{waitUntil:'domcontentloaded',timeout:45000});
  expect(response,'AION product PREPROD response').not.toBeNull();
  if(response) expect(response.status()).toBeLessThan(500);
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('#aion-zero-test')).toBeVisible();
  await expect(page.locator('[data-product]')).toHaveCount(5);
  expect((await page.title()).trim().length).toBeGreaterThan(0);
  const layout=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,mainCount:document.querySelectorAll('main,[role="main"]').length,h1Count:document.querySelectorAll('h1').length}));
  console.log(`CEREBRO_OBS:${JSON.stringify({kind:'PRODUCT',project:testInfo.project.name,url:page.url(),...layout,mode:'READ_ONLY_PREPROD_PUBLIC_SURFACE'})}`);
  expect(layout.scrollWidth,'AION product horizontal overflow').toBeLessThanOrEqual(layout.clientWidth+4);
  expect(layout.mainCount).toBeGreaterThanOrEqual(1);
  expect(layout.h1Count).toBeGreaterThanOrEqual(1);
  expect(pageErrors,'AION product uncaught page errors').toEqual([]);

  const catalog=await page.goto(catalogUrl,{waitUntil:'domcontentloaded',timeout:45000});
  if(catalog) expect(catalog.status(),'AION catalog response').toBeLessThan(500);
  await expect(page.locator('body')).toBeVisible();
  expect((await page.title()).trim().length).toBeGreaterThan(0);
});
