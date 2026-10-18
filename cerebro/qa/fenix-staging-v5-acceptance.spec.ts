import {expect,test} from '@playwright/test';

const base='https://staging.fenixcapital.es';
const targets=[
  ['HOME','/'],
  ['LOCAL_B2C_CORE','/asesor-hipotecario-cordoba/'],
  ['LOCAL_B2C_DUP_CLUSTER','/asesor-hipotecario-utrera/'],
  ['LOCAL_B2B','/financiacion-compradores-inmobiliarias-montilla/'],
  ['PROFILE','/hipotecas/hipoteca-100/funcionarios/'],
  ['PRODUCT','/hipotecas/hipoteca-100/'],
  ['PROCESS','/hipotecas/documentacion-para-pedir-una-hipoteca/'],
  ['RESOURCE','/calculadora-hipotecaria/'],
  ['ARTICLE','/blog/'],
  ['CONTACT','/contacto/'],
  ['LEGAL','/declaracion-de-privacidad/']
] as const;

const safeName=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

for(const [kind,path] of targets){
  test(`${kind} ${path} · responsive read-only gate`,async({page},testInfo)=>{
    const pageErrors:string[]=[];
    page.on('pageerror',e=>pageErrors.push(e.stack||e.message));
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
    console.log(`FENIX_V5_OBS:${JSON.stringify({kind,...obs,pageErrors})}`);
    await page.screenshot({path:`artifacts/staging-v5/screens/${testInfo.project.name}-${safeName(kind)}.png`,fullPage:true});
    expect(pageErrors,`${path} JS page errors`).toEqual([]);
    expect(obs.horizontalOverflow,`${path} horizontal overflow`).toBe(false);
    expect(obs.h1Count,`${path} H1 count`).toBe(1);
    expect(obs.mainCount,`${path} main landmark`).toBeGreaterThanOrEqual(1);
  });
}

test('Elementor bootstrap lifecycle diagnostic',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='v5-390','single viewport diagnostic');
  const paths=[
    ['FAILING_LOCAL','/asesor-hipotecario-cordoba/'],
    ['PASSING_PROFILE','/hipotecas/hipoteca-100/funcionarios/'],
    ['FAILING_HOME','/'],
    ['FAILING_BLOG','/blog/']
  ] as const;
  for(const [kind,path] of paths){
    const errors:string[]=[];
    page.removeAllListeners('pageerror');
    page.on('pageerror',e=>errors.push(e.stack||e.message));
    await page.goto(`${base}${path}`,{waitUntil:'networkidle',timeout:60_000});
    const diag=await page.evaluate(()=>{
      const scripts=[...document.scripts].map((s,index)=>({
        index,
        id:s.id,
        src:s.src,
        type:s.type,
        async:s.async,
        defer:s.defer,
        hasConfigText:(s.textContent||'').includes('elementorFrontendConfig'),
        textPrefix:(s.textContent||'').trim().slice(0,180)
      }));
      const relevant=scripts.filter(s=>/elementor|frontend/i.test(`${s.id} ${s.src} ${s.textPrefix}`)||s.hasConfigText);
      const frontendIndex=scripts.findIndex(s=>s.id==='elementor-frontend-js'||/\/elementor\/assets\/js\/frontend(?:\.min)?\.js/i.test(s.src));
      const neighborhood=frontendIndex>=0?scripts.slice(Math.max(0,frontendIndex-6),Math.min(scripts.length,frontendIndex+7)):[];
      return {
        bodyClass:document.body.className,
        configExists:typeof (window as any).elementorFrontendConfig!=='undefined',
        configScriptCount:scripts.filter(s=>s.hasConfigText).length,
        beforeNode:document.getElementById('elementor-frontend-js-before')?.tagName||null,
        frontendNode:document.getElementById('elementor-frontend-js')?.tagName||null,
        frontendIndex,
        scriptCount:scripts.length,
        neighborhood,
        relevant
      };
    });
    console.log(`FENIX_V5_ELEMENTOR_DIAG:${JSON.stringify({kind,path,errors,diag})}`);
  }
});

test('removed SYSTEM_TEST is not publicly reachable',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='v5-390','single canonical viewport is sufficient for this non-visual gate');
  const response=await page.goto(`${base}/cerebro-core-guard-final-test-20260903/`,{waitUntil:'domcontentloaded',timeout:45_000});
  expect(response).not.toBeNull();
  if(response) expect(response.status()).toBe(404);
  await expect(page.getByText('Validación técnica final controlada de Core Guard en PRE-PROD.')).toHaveCount(0);
});

test('Montilla LOCAL_B2B has non-empty meta description',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='v5-390','single canonical viewport is sufficient for this metadata gate');
  await page.goto(`${base}/financiacion-compradores-inmobiliarias-montilla/`,{waitUntil:'domcontentloaded',timeout:45_000});
  const meta=await page.locator('meta[name="description"]').getAttribute('content');
  expect((meta||'').trim().length).toBeGreaterThan(80);
});

test('main site header and menu do not consume excessive vertical space',async({browser},testInfo)=>{
  test.skip(testInfo.project.name!=='v5-390','dedicated two-viewport header gate runs once');
  for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:1000}]){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
    const page=await context.newPage();
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:45_000});
    await expect(page.locator('body')).toBeVisible();
    const obs=await page.evaluate(()=>{
      const main=(document.querySelector('main')||document.querySelector('#content')||document.querySelector('.site-content')||document.querySelector('[role="main"]')) as HTMLElement|null;
      const mainTop=main?.getBoundingClientRect().top??null;
      const visibleTopControls=[...document.querySelectorAll('a[href],button')].map(el=>{const r=(el as HTMLElement).getBoundingClientRect();const s=getComputedStyle(el);return {text:(el.textContent||'').trim().slice(0,80),top:r.top,bottom:r.bottom,width:r.width,height:r.height,visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};}).filter(x=>x.visible&&x.top<220&&x.bottom>-1).slice(0,40);
      return {mainTop,visibleTopControls};
    });
    expect(obs.mainTop,`${viewport.name} main content top`).not.toBeNull();
    const maxMainTop=220;
    console.log(`FENIX_V5_HEADER_MENU:${JSON.stringify({viewport:viewport.name,maxMainTop,...obs})}`);
    expect(obs.mainTop??9999,`${viewport.name} header/menu must not dominate the page`).toBeLessThanOrEqual(maxMainTop);
    await page.screenshot({path:`artifacts/staging-v5/screens/header-${viewport.name}.png`,fullPage:false});
    await context.close();
  }
});

test('consent is privacy-safe in CI and EEA path remains testable when offered',async({browser},testInfo)=>{
  test.skip(testInfo.project.name!=='v5-390','consent state is viewport-independent; run once');
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  const tracker=(url:string)=>/google-analytics\.com|googletagmanager\.com\/gtag|facebook\.com\/tr|connect\.facebook\.net/i.test(url);
  const requests:string[]=[];
  page.on('request',r=>{if(tracker(r.url())) requests.push(r.url());});
  await page.goto(`${base}/?cerebro_consent_gate=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:45_000});
  await expect(page.locator('body')).toBeVisible();
  await page.waitForTimeout(1500);

  const before=[...requests];
  console.log(`FENIX_V5_CONSENT_BEFORE:${JSON.stringify(before)}`);
  expect(before,'analytics/pixel must not transmit before consent').toEqual([]);

  const accept=page.locator('#cmplz-cookiebanner-container .cmplz-accept, .cmplz-cookiebanner .cmplz-accept, button.cmplz-accept, button:has-text("Aceptar"), button:has-text("Accept")').first();
  const offered=await accept.isVisible().catch(()=>false);
  console.log(`FENIX_V5_CONSENT_OFFERED:${JSON.stringify({offered})}`);
  if(!offered){
    testInfo.annotations.push({type:'geo-consent',description:'Banner not offered to GitHub Actions region. Privacy-safe pre-consent state passed; EEA accept/reject path was human-verified from Spain in this acceptance session.'});
    await context.close();
    return;
  }

  await accept.click();
  await page.waitForTimeout(800);
  const consentState=await page.evaluate(()=>({
    cmplzCookies:document.cookie.split(';').map(v=>v.trim()).filter(v=>/^cmplz_/i.test(v)),
    bannerVisible:[...document.querySelectorAll('#cmplz-cookiebanner-container,.cmplz-cookiebanner')].some(el=>{
      const r=(el as HTMLElement).getBoundingClientRect(); const s=getComputedStyle(el); return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0;
    })
  }));
  console.log(`FENIX_V5_CONSENT_ACCEPTED:${JSON.stringify(consentState)}`);
  expect(consentState.cmplzCookies.length,'Complianz must persist a consent decision').toBeGreaterThan(0);
  expect(consentState.bannerVisible,'banner should close after accepting').toBe(false);

  const page2=await context.newPage();
  await page2.goto(`${base}/?cerebro_consent_persist=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:45_000});
  const acceptVisibleAfterReload=await page2.locator('#cmplz-cookiebanner-container .cmplz-accept, .cmplz-cookiebanner .cmplz-accept, button.cmplz-accept').first().isVisible().catch(()=>false);
  expect(acceptVisibleAfterReload,'accepted consent should persist on a fresh page').toBe(false);
  await context.close();
});
