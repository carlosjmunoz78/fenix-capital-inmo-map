/**
 * SEO-001 / FACT-001 premium compositor V1. PREPROD and preview ONLY.
 * Additive: never writes to WP, Supabase, CRM or the legacy creative worker.
 * Uses the verified 1st-party logo and Montserrat cached by Fenix WordPress.
 */
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const LOGO='https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png';
const FONT='https://fenixcapital.es/wp-content/uploads/elementor/google-fonts/fonts/montserrat-49e242af.woff2';
const SIGNATURES={png:Buffer.from([137,80,78,71,13,10,26,10]),woff2:Buffer.from('wOF2')};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const COLORS=Object.freeze({charcoal:'#222222',orange:'#FF5F00',yellow:'#FFB71B',purple:'#870064',white:'#FFFFFF'});
export const PREMIUM_SEO_IMAGE_CONTRACT_V1=Object.freeze({
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'v1',
  source_post_id:960,output_type:'SEO_IMAGE',width:1200,height:630,
  source_url:'https://fenixcapital.es/hipoteca-autonomos-cordoba-requisitos-documentacion/',
  audience:'PARTICULARES',headline:'Hipoteca para autónomos',
  subtitle:'Documentación y viabilidad en Córdoba',
  publish_authorized:false,paid_provider_requested:false,
  brand_palette:COLORS,official_logo_url:LOGO,montserrat_url:FONT
});
export function validateOrder(order){
  for(const k of ['company_id','engine_id','environment','version','source_post_id','output_type','source_url','audience','headline','subtitle','publish_authorized','paid_provider_requested'])
    if(order?.[k]!==PREMIUM_SEO_IMAGE_CONTRACT_V1[k])throw Error('SEO_PREMIUM_SCOPE_DENIED_'+k);
  return true;
}
async function getBrandResource(url,{fetch_impl=fetch,limit,mime,magic}){
  if(url!==LOGO&&url!==FONT)throw Error('NOT_FIRST_PARTY_BRAND_ASSET');
  const r=await fetch_impl(url,{redirect:'error',headers:{'accept':mime,'user-agent':'CEREBRO-SEO-001-PREPROD'},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error('ASSET_HTTP_'+r.status);
  const got=String(r.headers.get('content-type')||'').split(';')[0].trim();
  if(got!==mime)throw Error('ASSET_MIME_MISMATCH');
  if(Number(r.headers.get('content-length')||0)>limit)throw Error('ASSET_TOO_LARGE');
  const b=Buffer.from(await r.arrayBuffer());
  if(b.length<1500||b.length>limit||!b.subarray(0,magic.length).equals(magic))throw Error('ASSET_SIGNATURE_FAILED');
  return b;
}
export async function loadBrand({fetch_impl=fetch}={}){
  const [logo,font]=await Promise.all([
    getBrandResource(LOGO,{fetch_impl,limit:2e6,mime:'image/png',magic:SIGNATURES.png}),
    getBrandResource(FONT,{fetch_impl,limit:3e5,mime:'font/woff2',magic:SIGNATURES.woff2})
  ]);
  return {logo,font,logo_sha256:sha(logo),font_sha256:sha(font)};
}
export function premiumMarkup(order,assets){
  validateOrder(order);
  if(!Buffer.isBuffer(assets?.logo)||!Buffer.isBuffer(assets?.font))throw Error('ASSETS_REQUIRED');
  if(!assets.logo.subarray(0,8).equals(SIGNATURES.png)||!assets.font.subarray(0,4).equals(SIGNATURES.woff2))
    throw Error('BRAND_SOURCE_SIGNATURE_DENIED');
  const css=[
    "@font-face{font-family:FenixMontserrat;src:url(data:font/woff2;base64,{{FONT}}) format('woff2');font-style:normal;font-weight:100 900;font-display:block}",
    "*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#222}",
    "body{font-family:FenixMontserrat,sans-serif;color:white}",
    "main{position:relative;width:1200px;height:630px;overflow:hidden;background:linear-gradient(120deg,#202020 0%,#2b2927 60%,#1c1b1b 100%)}",
    ".leftline{position:absolute;inset:0 auto 0 0;width:18px;background:#FF5F00;border-right:4px solid #FFB71B}",
    ".orb{position:absolute;right:-140px;top:-145px;width:700px;height:700px;border-radius:50%;background:linear-gradient(155deg,#ffb12d,#FF5F00 42%,#d34b00);box-shadow:inset 0 0 0 24px #ffffff16}",
    ".orbinner{position:absolute;right:-80px;top:80px;width:525px;height:525px;border:2px solid #ffffff4d;border-radius:50%}",
    ".panel{position:absolute;z-index:3;right:60px;top:45px;width:230px;height:142px;display:flex;align-items:center;justify-content:center;padding:14px 18px;border-radius:17px;background:#fff;box-shadow:0 15px 32px #1113}",
    ".panel img{width:100%;height:100%;object-fit:contain}",
    ".eyebrow{position:absolute;z-index:4;top:77px;left:85px;font-size:17px;font-weight:700;letter-spacing:2px;color:#FFB71B}",
    ".eyebrow:before{content:'';display:inline-block;width:20px;height:6px;margin:0 12px 3px 0;border-radius:5px;background:#FF5F00}",
    "h1{position:absolute;z-index:4;top:143px;left:82px;width:695px;margin:0;font-size:75px;line-height:1.07;font-weight:800;letter-spacing:-3px}",
    "h1 em{font-style:normal;color:#FFA24A}",
    ".subtitle{position:absolute;z-index:4;top:363px;left:85px;width:650px;font-size:26px;line-height:1.3;font-weight:500}",
    ".rule{position:absolute;left:85px;top:458px;width:325px;height:6px;border-radius:4px;background:linear-gradient(to right,#FF5F00 72%,#FFB71B 72%)}",
    ".footer{position:absolute;left:85px;bottom:54px;font-size:15px;font-weight:700;letter-spacing:1px}",
    ".footer span{color:#FFB71B}",
    ".document{position:absolute;z-index:2;right:72px;bottom:42px;width:306px;height:314px;padding:28px 24px;transform:rotate(-7deg);border-radius:18px;background:#fffaf5;box-shadow:0 20px 65px #160d0550;color:#222}",
    ".dochead{display:flex;align-items:center;gap:12px;font-size:18px;line-height:1.2;font-weight:800}",
    ".icon{width:46px;height:46px;display:grid;place-items:center;border-radius:12px;background:#fff0e4;color:#eb5b10;font-size:25px}",
    ".docline{height:3px;width:190px;margin:19px 0 16px 0;border-radius:4px;background:#e9dacc}",
    ".item{display:flex;gap:13px;align-items:center;margin:17px 0;font-size:13px;font-weight:700}",
    ".tick{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;background:#eaf5e9;color:#43813a;font-weight:900}",
    ".micro{position:absolute;right:69px;bottom:23px;width:48px;height:5px;background:#870064;border-radius:4px}"
  ].join('\n').replace('{{FONT}}',assets.font.toString('base64'));
  return [
    '<!doctype html><html lang="es"><head><meta charset="utf-8"><style>',css,'</style></head><body>',
    '<main><div class="leftline"></div><div class="orb"></div><div class="orbinner"></div>',
    '<div class="panel"><img id="official-logo" alt="Logo oficial Fénix Capital" src="data:image/png;base64,',
    assets.logo.toString('base64'),'"></div>',
    '<div class="eyebrow">GUÍA HIPOTECARIA · CÓRDOBA</div>',
    '<h1>Hipoteca para<br><em>autónomos</em></h1>',
    '<div class="subtitle">Documentación y viabilidad en Córdoba</div>',
    '<div class="rule"></div><div class="footer">FÉNIX CAPITAL <span>·</span> FINANCIACIÓN CON CRITERIO</div>',
    '<div class="document" aria-hidden="true"><div class="dochead"><div class="icon">✓</div><div>Tu operación,<br>bien preparada</div></div>',
    '<div class="docline"></div><div class="item"><span class="tick">✓</span>Ingresos y actividad</div>',
    '<div class="item"><span class="tick">✓</span>Documentación</div><div class="item"><span class="tick">✓</span>Estudio de viabilidad</div></div>',
    '<div class="micro"></div></main></body></html>'
  ].join('');
}
export async function renderPremiumSeoCanary({order=PREMIUM_SEO_IMAGE_CONTRACT_V1,assets=null,outFile=null,browserFactory=null}={}){
  validateOrder(order);
  const brand=assets||await loadBrand();
  const markup=premiumMarkup(order,brand);
  const launch=browserFactory||(async()=>{const {chromium}=await import('@playwright/test');return chromium.launch({headless:true});});
  const browser=await launch();
  try{
    const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
    try{
      await page.setContent(markup,{waitUntil:'load'});
      const qa=await page.evaluate(async()=>{
        const faces=await document.fonts.load('800 75px FenixMontserrat','Hipoteca para autónomos');
        await document.fonts.ready;
        const el=document.getElementById('official-logo');await el.decode();
        const canvas=document.createElement('canvas');canvas.width=el.naturalWidth;canvas.height=el.naturalHeight;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(el,0,0);
        const img=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let clear=0;for(let i=3;i<img.length;i+=4)if(img[i]<=20)clear++;
        const bounds=(selector)=>{const r=document.querySelector(selector).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
        return {font_loaded:faces.length>0&&document.fonts.check('800 75px FenixMontserrat','autónomos'),
          font_family:getComputedStyle(document.querySelector('h1')).fontFamily,
          logo_transparent_fraction:Math.round(clear/(img.length/4)*10000)/10000,
          logo_width:el.naturalWidth,logo_height:el.naturalHeight,
          dimensions:{width:document.querySelector('main').offsetWidth,height:document.querySelector('main').offsetHeight},
          title_bounds:bounds('h1'),subtitle_bounds:bounds('.subtitle'),
          image_count:document.images.length};
      });
      if(!qa.font_loaded||qa.font_family!=='FenixMontserrat, sans-serif')throw Error('MONTSERRAT_NOT_VERIFIED');
      if(qa.logo_width<300||qa.logo_transparent_fraction<0.05)throw Error('OFFICIAL_LOGO_ALPHA_FAILED');
      if(qa.dimensions.width!==1200||qa.dimensions.height!==630)throw Error('DIMENSION_MISMATCH');
      if(qa.title_bounds.left<70||qa.title_bounds.bottom>390||qa.subtitle_bounds.right>745||qa.subtitle_bounds.bottom>448)
        throw Error('SAFE_AREA_MISMATCH');
      if(qa.image_count!==1)throw Error('THIRD_PARTY_IMAGE_DENIED');
      const png=await page.screenshot({type:'png',fullPage:false});
      if(!png.subarray(0,8).equals(SIGNATURES.png))throw Error('PNG_OUTPUT_INVALID');
      if(outFile)await fs.writeFile(outFile,png);
      return {status:'PREPROD_PHYSICAL_RENDER_QA_PENDING',company_id:'fenix',engine_id:'SEO-001',
        environment:'PREPROD',source_post_id:960,output_type:'SEO_IMAGE',width:1200,height:630,
        sha256:sha(png),bytes:png.length,logo_sha256:sha(brand.logo),font_sha256:sha(brand.font),
        checks:qa,rights:'FIRST_PARTY_ASSETS_AND_ORIGINAL_VECTOR',additional_cost_eur:0,
        provider_calls:0,publish_authorized:false,uploaded_to_wordpress:false,
        visual_quality_approved:false,tribunal_approved:false};
    }finally{await page.close();}
  }finally{await browser.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv.length!==3)throw Error('OUTPUT_FILE_REQUIRED');
  console.log(JSON.stringify(await renderPremiumSeoCanary({outFile:process.argv[2]})));
}
