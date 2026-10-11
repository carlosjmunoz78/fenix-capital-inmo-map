import {expect,test} from '@playwright/test';

const targets=[
 {kind:'WEB',name:'Fénix Capital Web',url:process.env.QA_WEB_URL||'https://fenixcapital.es',exploreLinks:true},
 {kind:'APP',name:'App Fénix public shell',url:process.env.QA_APP_URL||'https://app.fenixcapital.es',exploreLinks:false}
] as const;

for(const target of targets){
 test(`[${target.kind}] ${target.name} · human read-only observation`,async({page},testInfo)=>{
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  const response=await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:45000});
  expect(response,`${target.name} navigation response`).not.toBeNull();
  if(response) expect(response.status(),`${target.name} HTTP status`).toBeLessThan(500);
  await expect(page.locator('body')).toBeVisible();
  expect((await page.title()).trim().length,`${target.name} title`).toBeGreaterThan(0);

  const observation=await page.evaluate(({kind,project})=>{
   const visible=(node:Element)=>{
    const el=node as HTMLElement;
    const style=getComputedStyle(el);
    const rect=el.getBoundingClientRect();
    return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity||1)>0&&rect.width>0&&rect.height>0;
   };
   const safeText=(value:string|null|undefined,max=80)=>{
    const text=(value||'').replace(/\s+/g,' ').trim().slice(0,max);
    if(!text) return '';
    if(/@|(?:\+?\d[\d\s().-]{6,})/.test(text)) return '[REDACTED]';
    return text.replace(/\b\d{6,}\b/g,'[REDACTED]');
   };
   const safeClass=(el:Element)=>Array.from(el.classList).filter(x=>/^[A-Za-z_-][A-Za-z0-9_-]{0,48}$/.test(x)).slice(0,4);
   const selector=(el:Element)=>{
    const parts:string[]=[];
    let node:Element|null=el;
    for(let depth=0;node&&node!==document.body&&depth<5;depth++){
     const tag=node.tagName.toLowerCase();
     const siblings=node.parentElement?Array.from(node.parentElement.children).filter(x=>x.tagName===node!.tagName):[];
     const nth=siblings.length>1?`:nth-of-type(${siblings.indexOf(node)+1})`:'';
     const classes=safeClass(node).slice(0,2).map(x=>`.${x}`).join('');
     parts.unshift(`${tag}${classes}${nth}`);
     node=node.parentElement;
    }
    return parts.join(' > ').slice(0,320);
   };
   const safeHref=(el:Element)=>{
    const raw=(el as HTMLAnchorElement).href;
    if(!raw) return '';
    try{const url=new URL(raw,location.href);return `${url.origin}${url.pathname}`.slice(0,240);}catch{return '';}
   };
   const interactive=Array.from(document.querySelectorAll('a[href],button,input,select,textarea,[role="button"],[role="link"]')).filter(visible).slice(0,300) as HTMLElement[];
   const accessibleName=(el:HTMLElement)=>{
    const htmlInput=el as HTMLInputElement;
    return [el.getAttribute('aria-label'),el.getAttribute('aria-labelledby'),el.textContent,htmlInput.value,el.getAttribute('alt'),el.getAttribute('title')]
     .map(value=>(value||'').trim()).find(Boolean)||'';
   };
   const descriptor=(el:HTMLElement)=>{
    const rect=el.getBoundingClientRect();
    return {
     tag:el.tagName.toLowerCase(),role:el.getAttribute('role')||'',type:(el as HTMLInputElement).type||'',
     classes:safeClass(el),selector:selector(el),href:safeHref(el),text:safeText(el.textContent),
     ariaLabel:safeText(el.getAttribute('aria-label')),title:safeText(el.getAttribute('title')),
     width:Math.round(rect.width),height:Math.round(rect.height)
    };
   };
   const inputs=Array.from(document.querySelectorAll('input,select,textarea')).filter(visible) as Array<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>;
   const unlabeled=inputs.filter(el=>{
    const aria=(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||'').trim();
    const labels='labels' in el&&el.labels ? el.labels.length : 0;
    return !aria&&labels===0;
   });
   const images=Array.from(document.querySelectorAll('img')).filter(visible) as HTMLImageElement[];
   const missingAlt=images.filter(img=>!img.hasAttribute('alt'));
   const ctaPattern=/(contact|contacto|hipoteca|calcular|calculadora|solicitar|hablar|whatsapp|cita|empezar|consulta|asesor)/i;
   const viewportWidth=window.innerWidth;
   const unnamed=interactive.filter(el=>!accessibleName(el));
   const smallTouch=interactive.filter(el=>{const rect=el.getBoundingClientRect();return viewportWidth<=600&&(rect.width<44||rect.height<44);});
   const bodyChildren=Array.from(document.body.children).filter(visible).slice(0,8).map(el=>{
    const rect=(el as HTMLElement).getBoundingClientRect();
    return {tag:el.tagName.toLowerCase(),classes:safeClass(el),selector:selector(el),width:Math.round(rect.width),height:Math.round(rect.height)};
   });
   const root=document.documentElement;
   return {
    kind,project,url:location.href,viewportWidth,viewportHeight:window.innerHeight,
    scrollWidth:root.scrollWidth,clientWidth:root.clientWidth,horizontalOverflow:root.scrollWidth>root.clientWidth+4,
    mainCount:document.querySelectorAll('main,[role="main"]').length,
    h1Count:document.querySelectorAll('h1').length,
    navCount:document.querySelectorAll('nav,[role="navigation"]').length,
    interactiveCount:interactive.length,
    unnamedInteractiveCount:unnamed.length,
    unnamedInteractiveSamples:unnamed.slice(0,10).map(descriptor),
    inputsCount:inputs.length,unlabeledInputs:unlabeled.length,unlabeledInputSamples:unlabeled.slice(0,10).map(el=>descriptor(el as HTMLElement)),
    imagesCount:images.length,imagesMissingAlt:missingAlt.length,imagesMissingAltSamples:missingAlt.slice(0,10).map(img=>({selector:selector(img),classes:safeClass(img),srcPath:(()=>{try{return new URL(img.src,location.href).pathname.slice(0,180)}catch{return ''}})()})),
    smallTouchTargets:smallTouch.length,smallTouchTargetSamples:smallTouch.slice(0,15).map(descriptor),
    mainCandidateSamples:bodyChildren,
    ctaCount:interactive.filter(el=>ctaPattern.test(accessibleName(el))).length,
    internalLinkCount:Array.from(document.querySelectorAll('a[href]')).filter(node=>{const href=(node as HTMLAnchorElement).href;try{return new URL(href).origin===location.origin;}catch{return false;}}).length,
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
    if(nav) expect(nav.status(),`same-origin GET ${link.href}`).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
   }
  }
 });
}
