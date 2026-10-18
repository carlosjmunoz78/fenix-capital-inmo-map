import {expect,test} from '@playwright/test';

const base='https://staging.fenixcapital.es';
const path='/asesor-hipotecario-jaen/';

test('H1 Jaen · three fresh loads keep native form and remove accidental Elementor dependency',async({browser},testInfo)=>{
  test.skip(testInfo.project.name!=='v5-390','single canonical viewport is sufficient for causal H1 verification');

  for(let i=1;i<=3;i++){
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage();
    const pageErrors:string[]=[];
    page.on('pageerror',e=>pageErrors.push(e.stack||e.message));

    const response=await page.goto(`${base}${path}?cerebro_h1_fresh_load=${Date.now()}_${i}`,{waitUntil:'networkidle',timeout:60_000});
    expect(response,`Jaen load ${i} response`).not.toBeNull();
    if(response) expect(response.status(),`Jaen load ${i} HTTP status`).toBe(200);
    await expect(page.locator('body')).toBeVisible();

    const before=await page.evaluate(()=>({
      bodyClass:document.body.className,
      frontendScript:!!document.getElementById('elementor-frontend-js'),
      nativeFormRuntime:!!document.getElementById('cerebro-universal-landing-native-form-js-after'),
      nativeFormConfig:!!document.getElementById('cerebro-universal-landing-native-form-js-extra'),
      shellExists:!!document.getElementById('cerebro-native-form-shell')
    }));

    console.log(`FENIX_H1_JAEN_BEFORE:${JSON.stringify({load:i,pageErrors,before})}`);
    expect(pageErrors,`Jaen load ${i} JS page errors`).toEqual([]);
    expect(pageErrors.some(e=>e.includes('elementorFrontendConfig is not defined')),`Jaen load ${i} must not raise elementorFrontendConfig error`).toBe(false);
    expect(before.frontendScript,`Jaen load ${i} must not load Elementor frontend on this non-Elementor page`).toBe(false);
    expect(before.nativeFormRuntime,`Jaen load ${i} must keep CEREBRO native-form runtime`).toBe(true);
    expect(before.nativeFormConfig,`Jaen load ${i} must keep native-form runtime config`).toBe(true);

    const diag=await page.evaluate(()=>({
      runtime:(document.getElementById('cerebro-universal-landing-native-form-js-after')?.textContent||'').slice(0,12000),
      candidates:Array.from(document.querySelectorAll('button,a')).filter((el)=>/Estudiar mi operaci[oó]n/i.test(el.textContent||'')).map((el)=>({tag:el.tagName,html:(el as HTMLElement).outerHTML.slice(0,2000)}))
    }));
    if(i===1) console.log(`FENIX_H1_JAEN_TRIGGER_DIAG:${JSON.stringify(diag)}`);

    const cta=page.getByRole('button',{name:'Estudiar mi operación'}).first();
    await expect(cta,`Jaen load ${i} native-form CTA`).toBeVisible();
    await cta.click();
    const shell=page.locator('#cerebro-native-form-shell');
    await expect(shell,`Jaen load ${i} native-form shell`).toBeVisible();
    const form=shell.locator('form').first();
    await expect(form,`Jaen load ${i} native form`).toBeVisible();
    const controls=await form.locator('input,select,textarea,button').count();
    expect(controls,`Jaen load ${i} native form controls`).toBeGreaterThan(0);

    console.log(`FENIX_H1_JAEN_LOAD:${JSON.stringify({load:i,pageErrors,before,controls})}`);
    await context.close();
  }
});
