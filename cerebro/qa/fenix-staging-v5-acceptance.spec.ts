import {expect,test} from '@playwright/test';

const base='https://staging.fenixcapital.es';
const targets=[
  ['HOME','/'],
  ['LOCAL_B2C_CORE','/asesor-hipotecario-cordoba/'],
  ['LOCAL_B2C_DUP_CLUSTER','/asesor-hipotecario-utrera/'],
  ['LOCAL_B2B','/financiacion-compradores-inmobiliarias-montilla/'],
  ['PROFILE','/hipotecas/hipoteca-100/funcionarios/'],
  ['PRODUCT','/hipotecas/hipoteca-100/'],
  ['PROCESS','/hipotecas/documentacion-hipoteca/'],
  ['RESOURCE','/calculadora-hipotecaria/'],
  ['ARTICLE','/blog/'],
  ['CONTACT','/contacto/'],
  ['LEGAL','/declaracion-de-privacidad/']
] as const;

const safeName=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

for(const [kind,path] of targets){
  test(`${kind} ${path} · responsive read-only gate`,async({page},testInfo)=>{
    const pageErrors:string[]=[];
    page.on('pageerror',e=>pageErrors.push(e.message));
    const response=await page.goto(`${base}${path}`,{waitUntil:'networkidle',timeout:60_000});
    expect(response,`${path} response`).not.toBeNull();
    if(response) expect(response.status(),`${path} HTTP status`).toBe(200);
    await expect(page.locator('body')).toBeVisible();
    const obs=await page.evaluate(()=>{
      const root=document.documentElement;
      const imgs=[...document.querySelectorAll('img')] as HTMLImageElement[];
      const visible=(el:Element)=>{const r=(el as HTMLElement).getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
      const interactive=[...document.querySelectorAll('a[href],button,input,select,textarea,[role="button"]')].filter(visible) as HTMLElement[];
      return {
        url:location.href,
        title:document.title,
        width:innerWidth,
        scrollWidth:root.scrollWidth,
        clientWidth:root.clientWidth,
        horizontalOverflow:root.scrollWidth>root.clientWidth+4,
        mainCount:document.querySelectorAll('main,[role="main"]').length,
        h1Count:document.querySelectorAll('h1').length,
        h2Count:document.querySelectorAll('h2').length,
        images:imgs.length,
        imagesMissingAlt:imgs.filter(i=>!i.hasAttribute('alt')).length,
        imagesMissingDimensions:imgs.filter(i=>!i.hasAttribute('width')||!i.hasAttribute('height')).length,
        forms:document.querySelectorAll('form').length,
        interactive:interactive.length,
        tinyTouchTargets:innerWidth<=600?interactive.filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<44||r.height<44);}).length:0
      };
    });
    console.log(`FENIX_V5_OBS:${JSON.stringify({kind,...obs})}`);
    await page.screenshot({path:`artifacts/staging-v5/screens/${testInfo.project.name}-${safeName(kind)}.png`,fullPage:true});
    expect(pageErrors,`${path} JS page errors`).toEqual([]);
    expect(obs.horizontalOverflow,`${path} horizontal overflow`).toBe(false);
    expect(obs.h1Count,`${path} H1 count`).toBe(1);
    expect(obs.mainCount,`${path} main landmark`).toBeGreaterThanOrEqual(1);
  });
}

test('removed SYSTEM_TEST is not publicly reachable',async({page})=>{
  const response=await page.goto(`${base}/cerebro-core-guard-final-test-20260903/`,{waitUntil:'domcontentloaded',timeout:45_000});
  expect(response).not.toBeNull();
  if(response) expect(response.status()).toBe(404);
  await expect(page.getByText('Validación técnica final controlada de Core Guard en PRE-PROD.')).toHaveCount(0);
});

test('Montilla LOCAL_B2B has non-empty meta description',async({page})=>{
  await page.goto(`${base}/financiacion-compradores-inmobiliarias-montilla/`,{waitUntil:'domcontentloaded',timeout:45_000});
  const meta=await page.locator('meta[name="description"]').getAttribute('content');
  expect((meta||'').trim().length).toBeGreaterThan(80);
});

test('consent blocks analytics before opt-in and enables after accept',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  const tracker=(url:string)=>/google-analytics\.com|googletagmanager\.com\/gtag|facebook\.com\/tr|connect\.facebook\.net/i.test(url);
  const requests:string[]=[];
  page.on('request',r=>{if(tracker(r.url())) requests.push(r.url());});
  await page.goto(base,{waitUntil:'networkidle',timeout:60_000});
  const before=[...requests];
  console.log(`FENIX_V5_CONSENT_BEFORE:${JSON.stringify(before)}`);
  expect(before,'analytics/pixel must not transmit before consent').toEqual([]);

  const accept=page.locator('#cmplz-accept, .cmplz-accept, button:has-text("Aceptar"), button:has-text("Accept")').first();
  await expect(accept,'Complianz accept control').toBeVisible({timeout:10_000});
  await accept.click();
  await page.waitForTimeout(2500);
  const after=requests.slice(before.length);
  console.log(`FENIX_V5_CONSENT_AFTER:${JSON.stringify(after)}`);
  expect(after.length,'analytics/pixel should be eligible after opt-in').toBeGreaterThan(0);
  await context.close();
});
