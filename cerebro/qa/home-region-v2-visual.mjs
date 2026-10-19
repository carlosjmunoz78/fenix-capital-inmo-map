import { chromium } from 'playwright';
import fs from 'node:fs';

const widths = [320, 390, 768, 1024, 1440];
const expected = [
  ['/asesor-hipotecario-almeria/', 'Almería'],
  ['/asesor-hipotecario-cadiz/', 'Cádiz'],
  ['/asesor-hipotecario-cordoba/', 'Córdoba'],
  ['/asesor-hipotecario-granada/', 'Granada'],
  ['/asesor-hipotecario-huelva/', 'Huelva'],
  ['/asesor-hipotecario-jaen/', 'Jaén'],
  ['/asesor-hipotecario-malaga/', 'Málaga'],
  ['/asesor-hipotecario-sevilla/', 'Sevilla'],
];

fs.mkdirSync('artifacts/home-region-v2', {recursive:true});
const browser = await chromium.launch({headless:true});
const results = [];

for (const width of widths) {
  const context = await browser.newContext({viewport:{width,height:1100}, deviceScaleFactor:1});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  const url = `https://staging.fenixcapital.es/?cerebro_region_v2=${Date.now()}_${width}`;
  const response = await page.goto(url,{waitUntil:'networkidle',timeout:60_000});
  const section = page.locator('#andalucia');
  await section.waitFor({state:'visible',timeout:20_000});
  const diag = await page.evaluate(({expected,width}) => {
    const sec = document.querySelector('#andalucia');
    const heading = sec?.querySelector('h2')?.textContent?.trim() || '';
    const allRegionCards = [...(sec?.querySelectorAll('.region-card') || [])];
    const cards = [...(sec?.querySelectorAll('.region-v2-grid > a.region-card') || [])];
    const links = cards.map(c => ({text:(c.textContent||'').replace(/\s+/g,' ').trim(), href:c.getAttribute('href'), html:c.outerHTML}));
    const expectedOk = expected.every(([href,name]) => links.some(l => l.href === href && l.text.includes(name)));
    const rects = cards.map(c => c.getBoundingClientRect());
    let overlap = false;
    for (let i=0;i<rects.length;i++) for (let j=i+1;j<rects.length;j++) {
      const a=rects[i], b=rects[j];
      const ix = Math.max(0, Math.min(a.right,b.right)-Math.max(a.left,b.left));
      const iy = Math.max(0, Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
      if (ix > 1 && iy > 1) overlap = true;
    }
    const secRect = sec?.getBoundingClientRect();
    const button = sec?.querySelector('button[popovertarget="home-study-form"]');
    const target = document.getElementById('home-study-form');
    return {
      heading,
      directCardCount: cards.length,
      allRegionCardCount: allRegionCards.length,
      links,
      expectedOk,
      overlap,
      buttonPresent: !!button,
      popoverTargetPresent: !!target,
      bodyScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      sectionWidth: secRect?.width || 0,
      sectionVisible: !!sec && secRect.width > 0 && secRect.height > 0,
      renderedHtml: width === 1440 ? (sec?.outerHTML || '').slice(0,30000) : null,
    };
  }, {expected,width});
  const ok = response?.status() === 200 && diag.heading === 'Tu hipoteca, a unos clics de ti.' && diag.directCardCount === 8 && diag.expectedOk && !diag.overlap && !diag.horizontalOverflow && diag.buttonPresent && diag.popoverTargetPresent && errors.length === 0;
  await section.screenshot({path:`artifacts/home-region-v2/home-region-v2-${width}.png`});
  results.push({width,httpStatus:response?.status()||0,errors,diag,ok});
  await context.close();
}

await browser.close();
fs.writeFileSync('artifacts/home-region-v2/result.json', JSON.stringify({ok:results.every(r=>r.ok),results},null,2));
console.log('FENIX_HOME_REGION_V2:'+JSON.stringify({ok:results.every(r=>r.ok),results}));
if (!results.every(r=>r.ok)) process.exit(1);
