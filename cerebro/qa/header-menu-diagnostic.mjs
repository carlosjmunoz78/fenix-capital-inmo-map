import { chromium } from 'playwright';

const base = 'https://staging.fenixcapital.es/?cerebro_header_menu_diag=1';
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage();
await page.goto(base,{waitUntil:'networkidle',timeout:60_000});
const diag = await page.evaluate(() => {
  const header = document.querySelector('#masthead, header.site-header, header[role="banner"], header');
  const links = [...document.querySelectorAll('header a, #masthead a')].map((a) => {
    const el = a;
    const li = el.closest('li');
    return {
      text:(el.textContent||'').trim().replace(/\s+/g,' '),
      href:el.getAttribute('href'),
      id:el.id||null,
      className:String(el.className||''),
      ariaLabel:el.getAttribute('aria-label'),
      liId:li?.id||null,
      liClass:li?.className ? String(li.className) : null,
      parentId:el.parentElement?.id||null,
      parentClass:el.parentElement?.className ? String(el.parentElement.className) : null,
    };
  });
  const menus=[...document.querySelectorAll('header ul, #masthead ul')].map((ul)=>({
    id:ul.id||null,
    className:String(ul.className||''),
    text:(ul.textContent||'').trim().replace(/\s+/g,' '),
    html:ul.outerHTML.slice(0,20000)
  }));
  return {
    title:document.title,
    bodyClass:document.body.className,
    headerHtml:header?.outerHTML.slice(0,50000)||null,
    links,
    menus
  };
});
console.log('FENIX_HEADER_MENU_DIAG:'+JSON.stringify(diag));
await browser.close();
