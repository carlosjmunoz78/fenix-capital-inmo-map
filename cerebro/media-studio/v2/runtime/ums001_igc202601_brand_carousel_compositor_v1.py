#!/usr/bin/env python3
"""CEREBRO UMS-001 deterministic postproduction for a six-slide IGC202601 carousel.
No model API calls, internet, posting, cost, or generated brand image.
Fénix colored logo comes from immutable original Mr Bogart PNG with SHA-256.
"""
import base64,hashlib,io,json,sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps

BASE=Path("cerebro/media-studio/v2")
LOGO=BASE/"brand_assets/fenix/official_20251020/FENIX_OFFICIAL_01_PNG_BASE64.json"
OUTSIZE=(1080,1350)
SLIDES=[
("S00","¿Lo tienes todo?",[]),
("S01","1. Identidad",["Documento vigente","Situación personal"]),
("S02","2. Ingresos",["Según tu actividad","Estabilidad y continuidad"]),
("S03","3. Ahorros",["Aportación y gastos","Compromisos actuales"]),
("S04","4. Vivienda",["Datos del inmueble","Documentación disponible"]),
("S05","5. Revisión",["Revisa los datos","Requisitos variables"])
]
def digest(data):return hashlib.sha256(data).hexdigest()
def load_logo():
 j=json.loads(LOGO.read_text())
 if j.get("logo_id")!="FENIX_OFFICIAL_01" or j.get("source_brand")!="OFFICIAL_MR_BOGART_2025":raise RuntimeError("BRAND_REGISTRY_INVALID")
 raw=base64.b64decode(j["file_content_base64"],validate=True)
 if digest(raw)!="ec066819ee12c48fa148d6ca70f1434724ff780cc9ccabcfeefc07318c796cc7":raise RuntimeError("OFFICIAL_LOGO_SHA_INVALID")
 im=Image.open(io.BytesIO(raw)).convert("RGBA")
 bbox=im.getbbox()
 if not bbox:raise RuntimeError("ORIGINAL_LOGO_EMPTY")
 return im.crop(bbox),digest(raw)
def get_font(size,bold=True):
 choices=(
 ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf","/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"] if bold else
 ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf","/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"])
 for p in choices:
  try:return ImageFont.truetype(p,size)
  except OSError:pass
 raise RuntimeError("NO_APPROVED_SYSTEM_FONT")
def fit_title(draw,text,maxw):
 for size in range(96,55,-2):
  font=get_font(size)
  if draw.textbbox((0,0),text,font=font,stroke_width=0)[2]<=maxw:return font
 return get_font(54)
def draw_one(source,final,header,bullets,logo):
 # Source must be a real JPEG from validated Replicate run, no model generated logo.
 if not source.is_file() or source.stat().st_size<100_000:raise RuntimeError("RAW_SOURCE_MISSING")
 im=ImageOps.fit(Image.open(source).convert("RGB"),OUTSIZE,method=Image.Resampling.LANCZOS,centering=(0.5,0.36))
 layer=Image.new("RGBA",OUTSIZE,(0,0,0,0));d=ImageDraw.Draw(layer)
 # Orange gradient: lower band supports a large, legible short headline.
 for y in range(780,1350):
  a=int(42+205*(min(1.0,max(0,(y-780)/285))))
  d.line([(0,y),(1079,y)],fill=(255,95,0,min(a,244)),width=1)
 # Elegant soft gold line accent.
 d.rounded_rectangle((32,814,49,957),radius=8,fill=(255,183,27,255))
 title_font=fit_title(d,header,735)
 d.text((78,844),header,font=title_font,fill=(255,255,255,255),
        stroke_width=3,stroke_fill=(112,36,6,245))
 if bullets:
  yy=1020
  f=get_font(42)
  for x in bullets:
   d.ellipse((82,yy+14,102,yy+34),fill=(255,183,27,255))
   # Hard stop against overlay/logo overlap. The entire text must fit left of x=780.
   body_font=f
   while d.textbbox((0,0),x,font=body_font)[2]>620 and body_font.size>24:
    body_font=get_font(body_font.size-1)
   if d.textbbox((0,0),x,font=body_font)[2]>620:raise RuntimeError("BODY_COPY_OVERFLOW_"+x)
   d.text((122,yy),x,font=body_font,fill=(255,255,255,255),stroke_width=1,stroke_fill=(103,29,0,190))
   yy+=76
 # Plain cream support patch under exact transparent official full-color logo.
 d.rounded_rectangle((795,1105,1062,1320),radius=28,fill=(255,252,248,248))
 original_logo=logo.copy()
 original_logo.thumbnail((218,176),Image.Resampling.LANCZOS)
 layer.alpha_composite(original_logo,(816+(218-original_logo.width)//2,1121+(176-original_logo.height)//2))
 final.parent.mkdir(parents=True,exist_ok=True)
 Image.alpha_composite(im.convert("RGBA"),layer).convert("RGB").save(final,"JPEG",quality=92,optimize=True,subsampling=0)
 return {"source_sha256":digest(source.read_bytes()),"finished_sha256":digest(final.read_bytes()),"width":1080,"height":1350,"original_logo_id":"FENIX_OFFICIAL_01","logo_source_sha256":"ec066819ee12c48fa148d6ca70f1434724ff780cc9ccabcfeefc07318c796cc7"}
def compose(input_dir,output_dir,expected_sha):
 input_dir=Path(input_dir);output_dir=Path(output_dir)
 logo,logo_sha=load_logo()
 if logo_sha!="ec066819ee12c48fa148d6ca70f1434724ff780cc9ccabcfeefc07318c796cc7":raise RuntimeError("MISMATCH")
 results=[]
 for id,title,bullets in SLIDES:
  path=input_dir/(id+"_RAW.jpg")
  if not path.exists():raise RuntimeError("MISSING_SLIDE_"+id)
  if id=="S00" and digest(path.read_bytes())!=expected_sha:raise RuntimeError("OWNER_QA_COVER_SHA_MISMATCH")
  final=output_dir/(id+"_FINISHED_LAB.jpg")
  info=draw_one(path,final,title,bullets,logo)
  results.append({"slide_id":id,"title":title,"bullet_text":bullets,"raw_file":path.name,"final_file":final.name,**info})
 # 3×2 contact sheet, 300px wide thumbnails.
 sheet=Image.new("RGB",(930,950),"#242424")
 draw=ImageDraw.Draw(sheet)
 for i,r in enumerate(results):
  t=Image.open(output_dir/r["final_file"]).convert("RGB")
  t=ImageOps.fit(t,(300,375),Image.Resampling.LANCZOS)
  x=5+(i%3)*310;y=45+(i//3)*450
  sheet.paste(t,(x,y));draw.text((x,y-28),r["slide_id"],fill="#ffb71b",font=get_font(18))
 sheet.save(output_dir/"CONTACT_6_CAROUSEL_LAB.jpg",quality=86)
 (output_dir/"qa_manifest.json").write_text(json.dumps({
  "company_id":"fenix","engine_id":"UMS-001","environment":"LAB","content_id":"IGC-2026-01",
  "version":"CEREBRO_REPLICATE_6_REAL_IMAGES__POSTCOMPOSED_OFFICIAL_BRAND_V1",
  "slide_count":6,"brand_logo_id":"FENIX_OFFICIAL_01","brand_logo_verified_sha256":logo_sha,
  "source":"six real Replicate model outputs, with owner-approved R05 cover",
  "editorial_qa":"PENDING","automatic_publication":False,
  "copyright_qa":"PENDING","seo_usage":"NOT_APPLICABLE_SOCIAL_CAROUSEL",
  "disclaimer":"Guía orientativa. Cada entidad determina la documentación requerida.",
  "slides":results
 },ensure_ascii=False,indent=2)+"\n")
 return results
if __name__=="__main__":
 if len(sys.argv)!=4:raise SystemExit("USAGE: composer input_dir output_dir cover_sha")
 items=compose(sys.argv[1],sys.argv[2],sys.argv[3])
 print(f"UMS001_CAROUSEL_FINISHED_LAB_SLIDES={len(items)}")
 print("UMS001_OFFICIAL_BRAND_SHA256_CHECK=GREEN")
 print("UMS001_POSTING_ENABLED=FALSE")
