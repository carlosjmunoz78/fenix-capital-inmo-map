import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('artifacts/home-final-review',{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
for (const width of [390,768,1440]) {
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(String(e.message||e)));
  const resp=await page.goto(`https://staging.fenixcapital.es/?cerebro_home_final=${Date.now()}_${width}`,{waitUntil:'networkidle',timeout:60000});
  const visual=page.locator('.home-polish-visuals');
  if (await visual.count()) {
    await visual.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1800);
    await page.waitForFunction(() => [...document.querySelectorAll('.home-polish-visuals img')].every(img => img.complete), null, {timeout:10000}).catch(()=>{});
  }
  const diag=await page.evaluate(()=>{
    const text=(document.body.innerText||'').replace(/\s+/g,' ').trim();
    const sections=[...document.querySelectorAll('main>section')].map(s=>({id:s.id||null,cls:s.className,heading:s.querySelector('h1,h2')?.textContent?.trim()||'',height:Math.round(s.getBoundingClientRect().height)}));
    const leaves=[...document.querySelectorAll('main *')].filter(el=>el.children.length===0).map(el=>({tag:el.tagName,cls:el.className||'',text:(el.textContent||'').replace(/\s+/g,' ').trim()})).filter(x=>x.text);
    const numberish=leaves.filter(x=>/^(0\d|\d{2,3}%|\d+\s*(?:h|horas|provincias))\b/i.test(x.text));
    const digitLeaves=leaves.filter(x=>/\d/.test(x.text)).slice(0,150);
    const h1=[...document.querySelectorAll('h1')].map(x=>x.textContent.trim());
    const h2=[...document.querySelectorAll('h2')].map(x=>x.textContent.trim());
    const visibleLinks=[...document.querySelectorAll('main a')].filter(a=>{const r=a.getBoundingClientRect();return r.width>0&&r.height>0}).map(a=>({text:(a.textContent||'').replace(/\s+/g,' ').trim(),href:a.getAttribute('href')}));
    const headerLinks=[...document.querySelectorAll('header a, #masthead a')].filter(a=>{const r=a.getBoundingClientRect();return r.width>0&&r.height>0}).map(a=>({text:(a.textContent||'').replace(/\s+/g,' ').trim(),href:a.getAttribute('href')}));
    const inicio=[...document.querySelectorAll('header a, #masthead a')].find(a=>(a.textContent||'').replace(/\s+/g,' ').trim()==='Inicio');
    const inicioContext=inicio?{link:inicio.outerHTML,parent:inicio.parentElement?.outerHTML||null,nav:inicio.closest('nav')?.outerHTML||null,headerClass:inicio.closest('header')?.className||null,headerId:inicio.closest('header')?.id||null}:null;
    const images=[...document.querySelectorAll('img')].map(img=>({src:img.currentSrc||img.src,alt:img.getAttribute('alt'),complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}));
    const missingAlt=images.filter(img=>img.alt===null || img.alt.trim()==='');
    const visualImages=[...document.querySelectorAll('.home-polish-visuals img')].map(img=>({src:img.currentSrc||img.src,alt:img.getAttribute('alt'),complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}));
    return {title:document.title,scrollWidth:document.documentElement.scrollWidth,innerWidth,scrollHeight:document.documentElement.scrollHeight,h1,h2,sections,numberish,digitLeaves,visibleLinks,headerLinks,inicioContext,missingAlt,visualImages,bodyTextLength:text.length};
  });
  if (await visual.count()) await visual.screenshot({path:`artifacts/home-final-review/visuals-${width}.png`});
  await page.screenshot({path:`artifacts/home-final-review/home-${width}.png`,fullPage:true});
  results.push({width,status:resp?.status()||0,errors,diag});
  await context.close();
}
await browser.close();
fs.writeFileSync('artifacts/home-final-review/result.json',JSON.stringify(results,null,2));
console.log('FENIX_HOME_FINAL_REVIEW:'+JSON.stringify(results));