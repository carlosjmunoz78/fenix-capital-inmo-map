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
  const diag=await page.evaluate(()=>{
    const text=(document.body.innerText||'').replace(/\s+/g,' ').trim();
    const sections=[...document.querySelectorAll('main>section')].map(s=>({id:s.id||null,cls:s.className,heading:s.querySelector('h1,h2')?.textContent?.trim()||'',height:Math.round(s.getBoundingClientRect().height)}));
    const numberish=[...document.querySelectorAll('main *')].filter(el=>el.children.length===0).map(el=>({tag:el.tagName,cls:el.className||'',text:(el.textContent||'').trim()})).filter(x=>/^(0\d|\d{2,3}%|\d+\s*(?:h|horas|provincias))\b/i.test(x.text));
    const h1=[...document.querySelectorAll('h1')].map(x=>x.textContent.trim());
    const h2=[...document.querySelectorAll('h2')].map(x=>x.textContent.trim());
    const visibleLinks=[...document.querySelectorAll('main a')].filter(a=>{const r=a.getBoundingClientRect();return r.width>0&&r.height>0}).map(a=>({text:(a.textContent||'').replace(/\s+/g,' ').trim(),href:a.getAttribute('href')}));
    return {title:document.title,scrollWidth:document.documentElement.scrollWidth,innerWidth,scrollHeight:document.documentElement.scrollHeight,h1,h2,sections,numberish,visibleLinks,bodyTextLength:text.length};
  });
  await page.screenshot({path:`artifacts/home-final-review/home-${width}.png`,fullPage:true});
  results.push({width,status:resp?.status()||0,errors,diag});
  await context.close();
}
await browser.close();
fs.writeFileSync('artifacts/home-final-review/result.json',JSON.stringify(results,null,2));
console.log('FENIX_HOME_FINAL_REVIEW:'+JSON.stringify(results));