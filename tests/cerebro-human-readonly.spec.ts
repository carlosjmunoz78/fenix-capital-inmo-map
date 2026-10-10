import {expect, test} from '@playwright/test';

const targets=[
 {kind:'WEB',name:'Fénix Capital Web',url:process.env.QA_WEB_URL||'https://fenixcapital.es',exploreLinks:true},
 {kind:'APP',name:'App Fénix public shell',url:process.env.QA_APP_URL||'https://app.fenixcapital.es',exploreLinks:false}
] as const;

for(const target of targets){
 test(`[${target.kind}] ${target.name} · human read-only journey`,async({page},testInfo)=>{
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  const response=await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:45000});
  expect(response,`${target.name} navigation response`).not.toBeNull();
  if(response)expect(response.status(),`${target.name} HTTP status`).toBeLessThan(500);
  await expect(page.locator('body')).toBeVisible();
  expect((await page.title()).trim().length,`${target.name} title`).toBeGreaterThan(0);

  const observation=await page.evaluate(({kind,project})=>{
   const visible=(node:Element)=>{
    const el=node as HTMLElement;
    const style=getComputedStyle(el);
    const rect=el.getBoundingClientRect();
    return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity||1)>0&&rect.width>0&&rect.height>0;
   };
   const root=document.documentElement;
   const interactive=Array.from(document.querySelectorAll('a[href],button,input,select,textarea,[role="button"],[role="link"]')).filter(visible).slice(0,300) as HTMLElement[];
   const accessibleName=(el:HTMLElement)=>{
    const htmlInput=el as HTMLInputElement;
    return [el.getAttribute('aria-label'),el.getAttribute('aria-labelledby'),el.textContent,htmlInput.value,el.getAttribute('alt'),el.getAttribute('title')]
     .map(value=>(value||'').trim()).find(Boolean)||'';
   };
   const inputs=Array.from(document.querySelectorAll('input,select,textarea')).filter(visible) as Array<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>;
   const unlabeledInputs=inputs.filter(el=>{
    const aria=(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||'').trim();
    const labels='labels' in el&&el.labels ? el.labels.length : 0;
    return !aria&&labels===0;
   }).length;
   const images=Array.from(document.querySelectorAll('img')).filter(visible) as HTMLImageElement[];
   const ctaPattern=/(contact|contacto|hipoteca|calcular|calculadora|solicitar|hablar|whatsapp|cita|empezar|consulta|asesor)/i;
   const viewportWidth=window.innerWidth;
   const viewportHeight=window.innerHeight;
   return {
    kind,
    project,
    url:location.href,
    viewportWidth,
    viewportHeight,
    scrollWidth:root.scrollWidth,
    clientWidth:root.clientWidth,
    horizontalOverflow:root.scrollWidth>root.clientWidth+4,
    mainCount:document.querySelectorAll('main,[role="main"]').length,
    h1Count:document.querySelectorAll('h1').length,
    navCount:document.querySelectorAll('nav,[role="navigation"]').length,
    interactiveCount:interactive.length,
    unnamedInteractiveCount:interactive.filter(el=>!accessibleName(el)).length,
    inputsCount:inputs.length,
    unlabeledInputs,
    imagesCount:images.length,
    imagesMissingAlt:images.filter(img=>!img.hasAttribute('alt')).length,
    smallTouchTargets:interactive.filter(el=>{
     const rect=el.getBoundingClientRect();
     return viewportWidth<=600&&(rect.width<44||rect.height<44);
    }).length,
    ctaCount:interactive.filter(el=>ctaPattern.test(accessibleName(el))).length,
    internalLinkCount:Array.from(document.querySelectorAll('a[href]')).filter(node=>{
     const href=(node as HTMLAnchorElement).href;
     try{return new URL(href).origin===location.origin;}catch{return false;}
    }).length,
    visibleTextChars:(document.body.innerText||'').trim().length
   };
  },{kind:target.kind,project:testInfo.project.name});

  console.log(`CEREBRO_OBS:${JSON.stringify(observation)}`);
  expect(observation.scrollWidth,`${target.name} horizontal overflow`).toBeLessThanOrEqual(observation.clientWidth+4);
  expect(pageErrors,`${target.name} uncaught page errors`).toEqual([]);

  if(target.exploreLinks){
   const links=await page.locator('a[href]').evaluateAll((nodes,origin)=>nodes
    .map(node=>({href:(node as HTMLAnchorElement).href,text:(node.textContent||'').trim()}))
    .filter(x=>x.href.startsWith(origin as string))
    .filter(x=>!/(logout|delete|remove|unsubscribe|wp-admin|cart|checkout)/i.test(x.href))
    .filter((x,index,array)=>array.findIndex(y=>y.href===x.href)===index)
    .slice(0,2),new URL(target.url).origin);
   for(const link of links){
    const nav=await page.goto(link.href,{waitUntil:'domcontentloaded',timeout:45000});
    if(nav)expect(nav.status(),`same-origin GET ${link.href}`).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
   }
  }
 });
}
