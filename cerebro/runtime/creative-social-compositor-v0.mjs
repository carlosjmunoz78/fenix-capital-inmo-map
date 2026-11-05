/**
 * Visual composition adapter for FACT-001:
 * independently generated image as BACKGROUND only + official transparent
 * first-party logo and editorial text. No hallucinated logos in the model.
 */
import {chromium} from '@playwright/test';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';

const LOGO='https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png';
const PNG=Buffer.from([137,80,78,71,13,10,26,10]);
const enc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validPng(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length<500||buffer.length>12000000||!buffer.subarray(0,8).equals(PNG))throw Error('NOT_A_VALID_SCENE_OR_LOGO_PNG');
}
export async function fetchFenixOfficialLogo({fetch_impl=fetch}={}){
 const r=await fetch_impl(LOGO,{redirect:'error',headers:{accept:'image/png','user-agent':'CEREBRO-AUDIOVISUAL/0.1'},signal:AbortSignal.timeout(25000)});
 if(!r.ok||!String(r.headers.get('content-type')??'').startsWith('image/png'))throw Error('OFFICIAL_LOGO_UNAVAILABLE');
 const data=Buffer.from(await r.arrayBuffer());validPng(data);
 return data;
}
export function renderImageHtml({order,photo_png,logo_png}){
 if(!order||order.company_id!=='fenix'||order.engine_id!=='SOC-001'||order.environment!=='PREPROD')
   throw Error('VISUAL_RENDER_SCOPE_DENIED');
 validPng(photo_png);validPng(logo_png);
 const t=order.copy??{};
 if(!t.headline||!t.subtitle||!t.cta)throw Error('VISUAL_COPY_NOT_COMPLETE');
 const dataPhoto=photo_png.toString('base64'),dataLogo=logo_png.toString('base64');
 return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><style>
 *{box-sizing:border-box}html,body{margin:0;padding:0;width:1080px;height:1080px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;background:#222222}
 .creative{position:relative;width:1080px;height:1080px;overflow:hidden;background:#222}
 .hero{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top}
 .photo-tone{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.02) 33%,rgba(0,0,0,.34) 57%,rgba(0,0,0,.22) 70%);}
 .orange-panel{position:absolute;left:-30px;right:-30px;bottom:-22px;height:492px;background:linear-gradient(125deg,#f45000 7%,#FF5F00 45%,#fd7907 100%);border-radius:52% 50% 0 0/10% 13% 0 0;box-shadow:0 -15px 50px rgba(15,16,15,.12)}
 .yellow-line{position:absolute;bottom:481px;left:0;width:640px;height:10px;background:#FFB71B;transform:rotate(-1deg)}
 .logo-card{position:absolute;top:49px;right:54px;width:220px;height:164px;background:#fff;border-radius:25px;display:flex;align-items:center;justify-content:center;padding:8px 13px;box-shadow:0 12px 30px rgba(0,0,0,.13)}
 #official-logo{display:block;width:100%;height:100%;object-fit:contain}
 .eyebrow{position:absolute;left:70px;bottom:406px;color:white;letter-spacing:.18em;font-size:22px;font-weight:700}
 h1{position:absolute;left:70px;right:70px;bottom:226px;color:white;font-size:65px;line-height:1.05;letter-spacing:-.024em;font-weight:900;margin:0;text-shadow:0 2px 6px rgba(0,0,0,.08)}
 .subtitle{position:absolute;left:70px;right:60px;bottom:154px;color:#fff;font-size:29px;font-weight:600;line-height:1.2}
 .cta{position:absolute;left:68px;bottom:45px;min-width:500px;max-width:910px;border-radius:80px;background:#fff;color:#222;padding:21px 32px 23px;font-size:29px;font-weight:800;letter-spacing:-.015em;box-shadow:0 7px 24px rgba(0,0,0,.13)}
 .cta:after{content:'›';color:#FF5F00;font-size:40px;font-weight:900;position:absolute;right:24px;top:13px}
 .micro{position:absolute;right:45px;bottom:0;height:3px;width:54px;background:#870064}
 </style></head><body>
 <main class="creative" aria-label="Creatividad Fénix Capital de vivienda">
 <img class="hero" id="photo" src="data:image/png;base64,${dataPhoto}"/>
 <div class="photo-tone"></div><div class="orange-panel"></div><div class="yellow-line"></div>
 <div class="logo-card"><img id="official-logo" src="data:image/png;base64,${dataLogo}" /></div>
 <div class="eyebrow">FÉNIX CAPITAL · VIVIENDA</div>
 <h1>${enc(t.headline)}</h1>
 <div class="subtitle">${enc(t.subtitle)}</div>
 <div class="cta">${enc(t.cta)}</div><div class="micro"></div>
 </main></body></html>`;
}
export async function renderSocialImage({order,photo_png,logo_png,output_path=null,browserFactory=null}){
 const markup=renderImageHtml({order,photo_png,logo_png});
 const browser=await (browserFactory?browserFactory():chromium.launch({headless:true}));
 try{
  const page=await browser.newPage({viewport:{width:1080,height:1080},deviceScaleFactor:1});
  try{
   await page.setContent(markup,{waitUntil:'load'});
   const checks=await page.evaluate(async()=>{
      const a=document.getElementById('official-logo'),b=document.getElementById('photo');
      await Promise.all([a.decode(),b.decode()]);
      const canvas=document.createElement('canvas');canvas.width=a.naturalWidth;canvas.height=a.naturalHeight;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(a,0,0);let clear=0,n=0;const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      for(let i=3;i<pixels.length;i+=4){n++;if(pixels[i]<=16)clear++}
      return {logo_transparent_fraction:clear/n,logo_original_width:a.naturalWidth,
        photo_width:b.naturalWidth,photo_height:b.naturalHeight,
        logo_on_white_card:getComputedStyle(a.parentElement).backgroundColor==='rgb(255, 255, 255)',
        graphic_width:document.querySelector('.creative').getBoundingClientRect().width,
        graphic_height:document.querySelector('.creative').getBoundingClientRect().height};
   });
   if(checks.logo_transparent_fraction<0.1||!checks.logo_on_white_card||checks.graphic_width!==1080||checks.graphic_height!==1080)
     throw Error('BRAND_ALPHA_OR_WHITE_SURFACE_QA_FAILED');
   if(checks.photo_width<512||checks.photo_height<512)throw Error('BACKGROUND_NOT_HIGH_RESOLUTION');
   const png=await page.screenshot({type:'png',fullPage:false});
   if(output_path)await fs.writeFile(output_path,png);
   return {status:'CREATIVE_RENDERED_QA_PENDING',png,sha256:createHash('sha256').update(png).digest('hex'),
     width:1080,height:1080,checks,brand_qa:false,visual_quality_qa:false,publish_authorized:false};
  } finally {await page.close();}
 } finally{await browser.close();}
}
export const BRAND_SOURCE_URL=LOGO;
