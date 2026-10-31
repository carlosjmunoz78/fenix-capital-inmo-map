import {expect,test} from '@playwright/test';

test.use({viewport:{width:412,height:839}});

test('APP-001 PREPROD login mobile touch targets are physically usable',async({page})=>{
  const url=process.env.QA_APP_URL||'http://127.0.0.1:4173/';
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  expect(response,'PREPROD navigation response').not.toBeNull();
  if(response)expect(response.status(),'PREPROD HTTP status').toBeLessThan(500);

  await expect(page.locator('.auth-shell')).toBeVisible();
  await expect(page.locator('#fenix-user')).toBeVisible();
  await expect(page.locator('#fenix-password')).toBeVisible();

  const targets=[
    {name:'theme-toggle',selector:'.auth-shell > .auth-theme'},
    {name:'username',selector:'#fenix-user'},
    {name:'password',selector:'#fenix-password'},
    {name:'show-password',selector:'.auth-card .auth-field > div > button'},
    {name:'remember',selector:'.auth-card .remember-row > input[type="checkbox"]'},
    {name:'forgot-password',selector:'.auth-card .forgot-link'}
  ] as const;

  const evidence:Record<string,{width:number;height:number}>={};
  for(const target of targets){
    const locator=page.locator(target.selector).first();
    await expect(locator,`${target.name} exists`).toHaveCount(1);
    const box=await locator.boundingBox();
    expect(box,`${target.name} has a rendered hit area`).not.toBeNull();
    const width=Math.round(box?.width||0),height=Math.round(box?.height||0);
    evidence[target.name]={width,height};
    expect(width,`${target.name} width`).toBeGreaterThanOrEqual(44);
    expect(height,`${target.name} height`).toBeGreaterThanOrEqual(44);
  }

  const layout=await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth
  }));
  expect(layout.scrollWidth,'mobile horizontal overflow').toBeLessThanOrEqual(layout.clientWidth+4);
  console.log(`APP001_PREPROD_TOUCH_EVIDENCE:${JSON.stringify({url,viewport:{width:412,height:839},targets:evidence,layout})}`);
});
