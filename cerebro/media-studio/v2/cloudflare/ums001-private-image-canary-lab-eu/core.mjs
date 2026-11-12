/**
 * UMS001 original procedural PNG canary, no paid model, no external assets.
 * Only a technical LAB proof, NOT an approved marketing creative.
 */
const MAGIC=Uint8Array.from([137,80,78,71,13,10,26,10]);
const GLYPHS=Object.freeze({
 C:['01110','10001','10000','10000','10000','10001','01110'],
 E:['11111','10000','10000','11110','10000','10000','11111'],
 R:['11110','10001','10001','11110','10100','10010','10001'],
 B:['11110','10001','10001','11110','10001','10001','11110'],
 O:['01110','10001','10001','10001','10001','10001','01110'],
 U:['10001','10001','10001','10001','10001','10001','01110'],
 M:['10001','11011','10101','10101','10001','10001','10001'],
 S:['01111','10000','10000','01110','00001','00001','11110'],
 '0':['01110','10011','10101','10101','11001','10001','01110'],
 '1':['00100','01100','00100','00100','00100','00100','01110'],
 ' ':['00000','00000','00000','00000','00000','00000','00000']
});
function bad(x){throw Error('UMS001_RENDER_'+x);}
function exact(v,keys){return !!v&&typeof v==='object'&&!Array.isArray(v)&&
 JSON.stringify(Object.keys(v).sort())===JSON.stringify([...keys].sort());}
const FIELDS=['schema_version','company_id','engine_id','environment','request_id','item_id','asset_kind','mode','width_px','height_px'];
export function validateCanary(r){
 if(!exact(r,FIELDS)||r.schema_version!==1||r.company_id!=='fenix'||r.engine_id!=='UMS-001'||
 r.environment!=='LAB'||r.asset_kind!=='IMAGE'||r.mode!=='DETERMINISTIC_TECHNICAL_CANARY_ONLY')bad('POLICY');
 if(!/^UMS001-LAB-CANARY-[A-Z0-9-]{8,66}$/.test(r.request_id||'')||
 !/^[A-Z0-9][A-Z0-9_-]{2,79}$/.test(r.item_id||''))bad('IDENTITY');
 if(r.width_px!==512||r.height_px!==512)bad('DIMENSIONS');
 return r;
}
function pixels(w,h){
 const u=new Uint8Array(w*h*4);
 function set(x,y,r,g,b){if(x<0||y<0||x>=w||y>=h)return;const k=(y*w+x)*4;
 u[k]=r;u[k+1]=g;u[k+2]=b;u[k+3]=255;}
 function rect(x0,y0,x1,y1,c){for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)set(x,y,...c);}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const z=Math.floor((x+y)*0.06);set(x,y,18+z,32+Math.floor(y*.05),57+Math.floor(x*.09));
 }
 // Original geometric composition: arcs, diagonal architectural shape, ribbon.
 for(let y=70;y<395;y++)for(let x=75;x<425;x++){
  const dx=x-254,dy=y-236,d=dx*dx+dy*dy;
  if(d<147*147&&d>128*128)set(x,y,78,202,183);
  else if(d<=101*101&&x+y>340&&x+y<640)set(x,y,50,115,148);
 }
 rect(52,55,62,455,[234,193,122]);
 rect(70,413,446,417,[234,193,122]);
 const display=(str,x0,y0,scale,color)=>{
  for(const char of str){const bmp=GLYPHS[char];if(!bmp)bad('UNSUPPORTED_GLYPH');
   for(let yy=0;yy<7;yy++)for(let xx=0;xx<5;xx++)if(bmp[yy][xx]==='1')
    rect(x0+xx*scale,y0+yy*scale,x0+(xx+1)*scale,y0+(yy+1)*scale,color);
   x0+=6*scale;
  }
 };
 display('CEREBRO',82,435,5,[250,246,228]);
 display('UMS 001',87,30,3,[247,205,137]);
 return u;
}
function uint(n){return Uint8Array.of((n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255);}
function join(...arr){const len=arr.reduce((a,b)=>a+b.length,0);let o=new Uint8Array(len),p=0;
 for(const b of arr){o.set(b,p);p+=b.length;}return o;}
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)
 c=c&1?(c>>>1)^0xedb88320:c>>>1;}return (c^0xffffffff)>>>0;}
function chunk(name,payload){const n=new TextEncoder().encode(name),bytes=join(n,payload);
 return join(uint(payload.length),bytes,uint(crc32(bytes)));}
export async function generatePng(r){
 validateCanary(r);if(typeof CompressionStream!=='function')bad('DEFLATE_UNAVAILABLE');
 const {width_px:w,height_px:h}=r,pix=pixels(w,h);
 const raw=new Uint8Array((w*4+1)*h);
 for(let y=0;y<h;y++)raw.set(pix.subarray(y*w*4,(y+1)*w*4),y*(w*4+1)+1);
 const comp=await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer();
 const ihdr=join(uint(w),uint(h),Uint8Array.of(8,6,0,0,0));
 const png=join(MAGIC,chunk('IHDR',ihdr),chunk('IDAT',new Uint8Array(comp)),chunk('IEND',new Uint8Array(0)));
 if(png.length>500000||png.length<1000)bad('PNG_SIZE_INVALID');
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',png)),
 x=>x.toString(16).padStart(2,'0')).join('');
 return {bytes:png,sha256:sha,width_px:w,height_px:h,mime:'image/png',kind:'ORIGINAL_PROCEDURAL_LAB',
  visual_qa:'NOT_RUN',rights:'ORIGINAL_SYNTHETIC_TECHNICAL_TEST_ONLY',brand_qa:'NOT_RUN',
  publish_authorized:false,commercial_delivery_authorized:false,model_calls:0,additional_cost_eur:0};
}
