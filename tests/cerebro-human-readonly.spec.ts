import {expect, test} from '@playwright/test';

const targets=[
 {kind:'WEB',name:'Fénix Capital Web',url:process.env.QA_WEB_URL||'https://fenixcapital.es',exploreLinks:true},
 {kind:'APP',name:'App Fénix public shell',url:process.env.QA_APP_URL||'https://app.fenixcapital.es',exploreLinks:false}
] as const;

for(const target of targets){
 test(`[${target.kind}] ${target.name} · human read-only journey`,async({page})=>{
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  const response=await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:45000});
  expect(response,`${target.name} navigation response`).not.toBeNull();
  if(response)expect(response.status(),`${target.name} HTTP status`).toBeLessThan(500);
  await expect(page.locator('body')).toBeVisible();
  expect((await page.title()).trim().length,`${target.name} title`).toBeGreaterThan(0);
  const layout=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(layout.scrollWidth,`${target.name} horizontal overflow`).toBeLessThanOrEqual(layout.clientWidth+4);
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
