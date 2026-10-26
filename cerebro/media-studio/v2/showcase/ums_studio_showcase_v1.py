#!/usr/bin/env python3
"""CEREBRO UMS V2 · physical cinematic studio showcase.

Creates three distinct PREPROD deliverables using zero-paid-API components:
- vertical Story (~30 s)
- vertical Reel (~60 s)
- horizontal Hero Film (> 3 min)

The visuals are original procedural motion-design/VFX (no third-party franchise
assets). Voices are Qwen3-TTS CustomVoice in Spanish, with a Spain-Spanish
style instruction when supported by the installed runtime.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import random
import subprocess
import time
import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = Path(os.environ.get("UMS_SHOWCASE_OUT", "ums-studio-showcase-v1")).resolve()
OUT.mkdir(parents=True, exist_ok=True)
ENV = os.environ.get("CEREBRO_ENVIRONMENT", "PREPROD").upper()
MODEL_ID = "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
FPS_RENDER = 15
FPS_OUT = 30
TRANSITION = 0.55
START = time.time()

if ENV != "PREPROD":
    raise SystemExit("UMS_SHOWCASE_PREPROD_ONLY")
if os.environ.get("CEREBRO_SPEND_AUTHORIZED", "false").lower() == "true":
    raise SystemExit("UMS_SHOWCASE_ZERO_COST_ONLY")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def probe(path: Path) -> dict:
    return json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)
    ]))


def font(size: int, bold: bool = False):
    p = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(p, size)


PALETTES = [
    ((4, 7, 18), (12, 42, 74), (58, 221, 255), (244, 180, 54)),
    ((8, 5, 18), (49, 12, 71), (183, 89, 255), (255, 151, 63)),
    ((2, 13, 17), (6, 54, 60), (48, 255, 191), (255, 218, 95)),
    ((14, 5, 5), (71, 15, 8), (255, 78, 48), (255, 205, 83)),
    ((5, 8, 16), (18, 25, 55), (96, 124, 255), (255, 230, 150)),
]


@dataclass
class Scene:
    title: str
    strap: str
    kind: str
    duration: float
    palette: int
    camera: str
    light: str


@dataclass
class Film:
    key: str
    label: str
    width: int
    height: int
    duration: float
    speaker: str
    voice_instruction: str
    scenes: list[Scene]
    narrations: list[tuple[float, str]]


STORY = Film(
    key="story", label="STORY · 9:16", width=360, height=640, duration=29.5,
    speaker="Serena",
    voice_instruction="Habla en castellano peninsular de España, con voz cinematográfica elegante, segura y contenida. Dicción natural. No imites a ninguna persona real.",
    scenes=[
        Scene("UNA IDEA", "puede convertirse en un mundo", "portal", 4.5, 0, "PUSH_IN", "COLD_RIM"),
        Scene("DIRECCIÓN", "cámara · luz · ritmo", "grid", 4.7, 1, "ORBIT", "MAGENTA_EDGE"),
        Scene("VFX", "energía · partículas · atmósfera", "energy", 4.8, 3, "HANDHELD", "FIRE_KEY"),
        Scene("VOZ + SONIDO", "narración · música · impacto", "wave", 4.8, 2, "DOLLY", "TEAL_GLOW"),
        Scene("3D · XR", "espacio que se puede recorrer", "cube", 5.0, 4, "ORBIT", "BLUE_RIM"),
        Scene("CEREBRO UMS", "del brief al master", "hero", 5.7, 0, "CRANE_UP", "GOLD_REVEAL"),
    ],
    narrations=[
        (0.7, "Una idea no debería quedarse en un texto. Debería convertirse en imagen, movimiento y emoción."),
        (10.0, "CEREBRO dirige montaje, efectos, voz, música, sonido, color, cámara y luz como una sola producción."),
        (21.0, "Una misma fábrica. Del brief al master. CEREBRO Universal Media Studio."),
    ],
)

REEL = Film(
    key="reel", label="REEL · 9:16", width=360, height=640, duration=58.5,
    speaker="Ryan",
    voice_instruction="Habla en español de España, con energía de tráiler cinematográfico premium, ritmo dinámico y pausas dramáticas. No imites a ninguna persona real.",
    scenes=[
        Scene("NO ES UN GENERADOR", "es una productora", "hero", 6.0, 0, "PUSH_IN", "GOLD_REVEAL"),
        Scene("CONCEPTO", "idea · guion · estructura", "portal", 6.0, 1, "ORBIT", "VIOLET_RIM"),
        Scene("IMAGEN", "composición · continuidad", "particles", 6.0, 4, "DOLLY", "BLUE_KEY"),
        Scene("CÁMARA", "push · orbit · crane · handheld", "grid", 6.0, 2, "ORBIT", "TEAL_EDGE"),
        Scene("VFX + 3D", "energía · espacio · volumen", "cube", 6.0, 3, "CRANE_UP", "FIRE_KEY"),
        Scene("VOCES", "timbres · idiomas · dirección", "wave", 6.0, 0, "DOLLY", "CYAN_KEY"),
        Scene("SONIDO", "música · foley · impactos", "energy", 6.0, 3, "HANDHELD", "AMBER_FLASH"),
        Scene("MONTAJE + COLOR", "ritmo · transiciones · luz", "shards", 6.0, 1, "PUSH_IN", "MAGENTA_EDGE"),
        Scene("MULTI-FORMATO", "story · reel · film", "frames", 5.0, 4, "ORBIT", "BLUE_RIM"),
        Scene("CEREBRO UMS", "una orden → producción completa", "hero", 5.5, 0, "PUSH_IN", "GOLD_REVEAL"),
    ],
    narrations=[
        (0.6, "Esto no es un generador de clips. Es una productora digital completa."),
        (7.0, "Empieza con una idea. La convierte en estructura, guion, planos y una dirección visual coherente."),
        (18.0, "Mueve la cámara, cambia la iluminación, construye volumen, efectos y continuidad entre escenas."),
        (30.0, "Genera voces, música, efectos, mezcla y sincronía. Y los trata como partes de una misma película."),
        (43.0, "Monta, colorea y adapta la producción a cada formato, desde una Story hasta una pieza de larga duración."),
        (52.0, "CEREBRO Universal Media Studio. Una orden. Una producción completa."),
    ],
)

HERO_SCENES = [
    Scene("ACTO I · LA CHISPA", "todo empieza con una intención", "portal", 12.5, 0, "PUSH_IN", "COLD_RIM"),
    Scene("EL BRIEF", "objetivo · audiencia · formato", "frames", 12.5, 4, "DOLLY", "BLUE_KEY"),
    Scene("GUION", "estructura · tensión · ritmo", "grid", 12.5, 1, "ORBIT", "VIOLET_RIM"),
    Scene("DIRECCIÓN VISUAL", "composición · color · continuidad", "particles", 12.5, 2, "CRANE_UP", "TEAL_GLOW"),
    Scene("ACTO II · PRODUCCIÓN", "la idea empieza a respirar", "hero", 12.5, 3, "PUSH_IN", "FIRE_KEY"),
    Scene("CÁMARA", "ángulo · movimiento · profundidad", "grid", 12.5, 0, "ORBIT", "CYAN_KEY"),
    Scene("ILUMINACIÓN", "key · rim · atmósfera", "shards", 12.5, 1, "HANDHELD", "MAGENTA_EDGE"),
    Scene("PERSONAJES", "identidad · consistencia · presencia", "frames", 12.5, 4, "DOLLY", "BLUE_RIM"),
    Scene("VFX", "energía · partículas · transiciones", "energy", 12.5, 3, "PUSH_IN", "AMBER_FLASH"),
    Scene("3D · ESPACIO · XR", "volumen · escena · inmersión", "cube", 12.5, 2, "ORBIT", "TEAL_EDGE"),
    Scene("ACTO III · SONIDO", "la imagen también se escucha", "wave", 12.5, 0, "DOLLY", "CYAN_KEY"),
    Scene("VOCES", "dirección · emoción · variación", "wave", 12.5, 1, "PUSH_IN", "VIOLET_RIM"),
    Scene("MÚSICA + SFX", "pulso · impacto · espacio", "energy", 12.5, 3, "HANDHELD", "FIRE_KEY"),
    Scene("MONTAJE + COLOR", "ritmo · transición · acabado", "shards", 12.5, 4, "CRANE_UP", "BLUE_KEY"),
    Scene("ACTO IV · MASTER", "multi-formato · evidencia · control", "frames", 12.5, 2, "ORBIT", "TEAL_GLOW"),
    Scene("CEREBRO UMS", "del brief al master", "hero", 12.5, 0, "PUSH_IN", "GOLD_REVEAL"),
]

HERO = Film(
    key="hero", label="HERO FILM · 16:9", width=640, height=360, duration=200.0,
    speaker="Aiden",
    voice_instruction="Habla en castellano peninsular de España, como narrador de una superproducción cinematográfica original: profundo, preciso, elegante, con pausas dramáticas. No imites a ninguna persona real.",
    scenes=HERO_SCENES,
    narrations=[
        (0.8, "Toda producción empieza igual: con una intención. Pero entre una intención y una película existe un sistema entero de decisiones."),
        (13.0, "CEREBRO recibe el objetivo, entiende la audiencia y define el formato antes de mover una sola cámara."),
        (25.5, "Después construye estructura. Guion, actos, ritmo, silencios y puntos de impacto. No encadena escenas al azar."),
        (38.0, "La dirección visual fija composición, contraste, color y continuidad para que cada plano pertenezca al mismo universo."),
        (50.5, "Entonces empieza la producción. La idea deja de ser una instrucción y empieza a respirar."),
        (63.0, "La cámara cambia de lenguaje según la escena: acercamiento, órbita, desplazamiento, elevación o tensión manual."),
        (75.5, "La luz también narra. Una clave fría puede abrir una secuencia. Un contraluz cálido puede convertir el mismo espacio en otra emoción."),
        (88.0, "Los personajes y elementos persistentes mantienen identidad entre planos, formatos y medios, en lugar de reiniciarse en cada toma."),
        (100.5, "Los efectos visuales no son decoración. Partículas, energía, profundidad y transiciones se utilizan para dirigir la atención."),
        (113.0, "Y cuando la historia necesita volumen, CEREBRO incorpora tres dimensiones, activos espaciales y salidas preparadas para experiencias XR."),
        (125.5, "Pero una imagen sin sonido todavía está incompleta. La mezcla crea escala, distancia y presencia."),
        (138.0, "Las voces pueden cambiar de timbre, idioma y dirección interpretativa. En esta prueba cada pieza utiliza una voz distinta."),
        (150.5, "La música sostiene el pulso. Los efectos y los impactos subrayan cortes, entradas y cambios de intensidad."),
        (163.0, "Después llegan montaje y color: unir, respirar, acelerar, fundir y terminar cada plano hasta convertir fragmentos en una sola pieza."),
        (175.5, "El master no termina en un archivo. Se adapta a Story, Reel y película, conserva trazabilidad, evidencia y capacidad de reconstrucción."),
        (188.0, "CEREBRO Universal Media Studio. Del brief al master. Una fábrica audiovisual gobernada como un sistema de producción."),
    ],
)
FILMS = [STORY, REEL, HERO]


def scene_for(film: Film, t: float):
    acc = 0.0
    for idx, sc in enumerate(film.scenes):
        if t < acc + sc.duration or idx == len(film.scenes)-1:
            return idx, sc, max(0.0, t-acc), acc
        acc += sc.duration
    return len(film.scenes)-1, film.scenes[-1], 0.0, acc


def base_gradient(w: int, h: int, pidx: int, t: float) -> Image.Image:
    c0, c1, accent, gold = PALETTES[pidx % len(PALETTES)]
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    xx = np.linspace(0, 1, w, dtype=np.float32)[None, :, None]
    pulse = 0.10 * math.sin(t * 0.55)
    a = np.array(c0, dtype=np.float32)[None, None, :]
    b = np.array(c1, dtype=np.float32)[None, None, :]
    mix = np.clip(0.18 + 0.70 * yy + 0.10 * xx + pulse, 0, 1)
    arr = a * (1-mix) + b * mix
    vign = np.sqrt((xx-0.5)**2 + (yy-0.5)**2)
    arr *= np.clip(1.22 - vign * 0.9, 0.40, 1.0)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def draw_world(img: Image.Image, film: Film, sc: Scene, local: float, idx: int, seed: int):
    w,h = img.size; d=ImageDraw.Draw(img, "RGBA"); c0,c1,accent,gold=PALETTES[sc.palette]
    rng=random.Random(seed)
    cx=w*(0.5+0.06*math.sin(local*0.37+idx)); cy=h*(0.48+0.04*math.cos(local*0.29+idx))
    zoom=1.0+0.07*math.sin(local*0.33)
    if sc.camera=="PUSH_IN": zoom=1.0+0.14*(local/max(sc.duration,0.1))
    if sc.camera=="ORBIT": cx += w*0.08*math.sin(local*0.55); cy += h*0.035*math.cos(local*0.41)
    if sc.camera=="HANDHELD": cx += w*0.012*math.sin(local*7.0); cy += h*0.009*math.sin(local*9.0)
    if sc.camera=="CRANE_UP": cy += h*(0.08-0.16*local/max(sc.duration,0.1))

    # star / particle field with parallax
    for j in range(42 if film.width>film.height else 30):
        x=(rng.random()*w + local*(8+rng.random()*22)*(1 if j%2 else -1))%w
        y=(rng.random()*h + local*(3+rng.random()*10))%h
        r=1+(j%3==0)
        col=(*accent, 45+int(120*(0.5+0.5*math.sin(local*1.6+j))))
        d.ellipse((x-r,y-r,x+r,y+r),fill=col)

    if sc.kind in {"portal","hero"}:
        for k in range(9):
            rr=(42+k*17)*zoom + 8*math.sin(local*1.4+k)
            box=(cx-rr,cy-rr,cx+rr,cy+rr)
            d.arc(box,start=(local*36+k*31)%360,end=(local*36+k*31+190)%360,fill=(*accent,70+12*k),width=max(1,3-k//4))
        d.ellipse((cx-14,cy-14,cx+14,cy+14),fill=(*gold,220))
        d.ellipse((cx-5,cy-5,cx+5,cy+5),fill=(255,255,255,245))

    if sc.kind in {"grid","cube"}:
        horizon=int(h*0.50)
        for k in range(-8,9):
            x0=w/2+k*w/16
            d.line((w/2,horizon,x0*1.8-w*0.4,h),fill=(*accent,70),width=1)
        phase=(local*28)%32
        for k in range(12):
            y=horizon+((k*32+phase)**1.10)*0.75
            if y<h: d.line((0,y,w,y),fill=(*accent,55),width=1)
        if sc.kind=="cube":
            s=min(w,h)*0.18*(1+0.08*math.sin(local)); ox=cx; oy=cy
            pts=[]
            for z in (-1,1):
                for y0 in (-1,1):
                    for x0 in (-1,1):
                        a=local*0.45
                        xr=x0*math.cos(a)-z*math.sin(a); zr=x0*math.sin(a)+z*math.cos(a)
                        px=ox+(xr*0.75+zr*0.25)*s; py=oy+(y0*0.75-zr*0.18)*s
                        pts.append((px,py))
            edges=[(0,1),(0,2),(0,4),(1,3),(1,5),(2,3),(2,6),(3,7),(4,5),(4,6),(5,7),(6,7)]
            for a,b in edges:d.line((*pts[a],*pts[b]),fill=(*gold,210),width=2)

    if sc.kind in {"energy","shards"}:
        for k in range(24):
            ang=(k/24)*math.tau+local*(0.35 if k%2 else -0.24)
            r0=min(w,h)*(0.10+0.02*(k%4)); r1=min(w,h)*(0.44+0.08*math.sin(local+k))
            x0=cx+math.cos(ang)*r0; y0=cy+math.sin(ang)*r0
            x1=cx+math.cos(ang)*r1; y1=cy+math.sin(ang)*r1
            d.line((x0,y0,x1,y1),fill=(*(accent if k%3 else gold),70+(k%4)*35),width=1+(k%3==0)*2)

    if sc.kind=="wave":
        for row in range(5):
            pts=[]
            amp=h*(0.025+row*0.012)
            for x in range(0,w+1,5):
                y=cy+(row-2)*h*0.055+amp*math.sin(x*0.035+local*(3+row*0.25))
                pts.append((x,y))
            d.line(pts,fill=(*(accent if row%2==0 else gold),150),width=2)

    if sc.kind=="particles":
        for k in range(70):
            ang=rng.random()*math.tau+local*0.2
            rr=(rng.random()*0.45+0.03)*min(w,h)
            x=cx+math.cos(ang)*rr; y=cy+math.sin(ang)*rr
            r=1+rng.random()*3
            d.ellipse((x-r,y-r,x+r,y+r),fill=(*(accent if k%4 else gold),70+int(rng.random()*160)))

    if sc.kind=="frames":
        for k in range(5):
            ww=w*(0.42-0.045*k); hh=h*(0.25-0.018*k)
            x=cx-ww/2+(k-2)*w*0.07+math.sin(local+k)*8; y=cy-hh/2+(k-2)*h*0.045
            d.rounded_rectangle((x,y,x+ww,y+hh),radius=8,outline=(*(accent if k%2 else gold),110+20*k),width=2)

    # light sweeps / flare
    sweep=(local/sc.duration)*w*1.6-w*0.3
    d.polygon([(sweep-45,0),(sweep+20,0),(sweep-120,h),(sweep-185,h)],fill=(*accent,18))
    for r,alpha in [(90,18),(45,28),(18,90)]:
        d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=(*gold,alpha))


def draw_text(img: Image.Image, film: Film, sc: Scene, local: float, idx: int):
    w,h=img.size; d=ImageDraw.Draw(img,"RGBA")
    vertical=h>w
    title_size=34 if vertical else 32
    strap_size=15 if vertical else 16
    f1=font(title_size,True); f2=font(strap_size,False); f3=font(10 if vertical else 11,True)
    # animate entry
    intro=min(1.0,max(0.0,local/0.6)); outro=min(1.0,max(0.0,(sc.duration-local)/0.5)); alpha=int(255*min(intro,outro))
    y=h*0.18 if vertical else h*0.17
    box=d.textbbox((0,0),sc.title,font=f1); tw=box[2]-box[0]
    x=(w-tw)/2
    d.rectangle((max(12,x-14),y-8,min(w-12,x+tw+14),y+title_size+12),fill=(0,0,0,int(92*alpha/255)))
    d.text((x,y),sc.title,font=f1,fill=(255,255,255,alpha))
    sb=d.textbbox((0,0),sc.strap,font=f2); sw=sb[2]-sb[0]
    d.text(((w-sw)/2,y+title_size+22),sc.strap,font=f2,fill=(220,229,240,alpha))
    tag="CEREBRO UNIVERSAL MEDIA STUDIO · DEMO ORIGINAL · PREPROD"
    tb=d.textbbox((0,0),tag,font=f3); tx=(w-(tb[2]-tb[0]))/2
    d.text((tx,h-28),tag,font=f3,fill=(210,220,232,170))
    # scene progress / cuts
    margin=18
    d.rounded_rectangle((margin,h-47,w-margin,h-43),radius=2,fill=(255,255,255,35))
    frac=(idx+local/sc.duration)/len(film.scenes)
    d.rounded_rectangle((margin,h-47,margin+(w-2*margin)*frac,h-43),radius=2,fill=(255,210,105,175))


def frame_for(film: Film, t: float) -> Image.Image:
    idx,sc,local,_=scene_for(film,t)
    img=base_gradient(film.width,film.height,sc.palette,t)
    draw_world(img,film,sc,local,idx,1000+idx*17)
    draw_text(img,film,sc,local,idx)
    # crossfade at end of scene (except last)
    if sc.duration-local<TRANSITION and idx<len(film.scenes)-1:
        a=(TRANSITION-(sc.duration-local))/TRANSITION
        nxt=film.scenes[idx+1]
        other=base_gradient(film.width,film.height,nxt.palette,t)
        draw_world(other,film,nxt,a*TRANSITION,idx+1,1000+(idx+1)*17)
        draw_text(other,film,nxt,a*TRANSITION,idx+1)
        img=Image.blend(img,other,max(0.0,min(1.0,a)))
    # film bars + subtle grain scanlines
    d=ImageDraw.Draw(img,"RGBA")
    if film.width>film.height:
        d.rectangle((0,0,film.width,8),fill=(0,0,0,220)); d.rectangle((0,film.height-8,film.width,film.height),fill=(0,0,0,220))
    for y in range(int((t*19)%6),film.height,6): d.line((0,y,film.width,y),fill=(255,255,255,5),width=1)
    return img


def render_silent(film: Film) -> Path:
    raw=OUT/f"{film.key}-silent.mp4"
    cmd=[
        "ffmpeg","-hide_banner","-loglevel","error","-y",
        "-f","rawvideo","-pix_fmt","rgb24","-s",f"{film.width}x{film.height}","-r",str(FPS_RENDER),"-i","-",
        "-an","-c:v","libx264","-preset","veryfast","-crf","20","-pix_fmt","yuv420p",str(raw)
    ]
    p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    total=int(math.ceil(film.duration*FPS_RENDER))
    try:
        for i in range(total):
            fr=frame_for(film,i/FPS_RENDER)
            assert p.stdin is not None
            p.stdin.write(np.asarray(fr,dtype=np.uint8).tobytes())
    finally:
        if p.stdin: p.stdin.close()
    rc=p.wait()
    if rc!=0: raise RuntimeError(f"FFMPEG_RENDER_FAILED_{film.key}:{rc}")
    return raw


def synthesize_voices(films: list[Film]):
    import torch
    import soundfile as sf
    from qwen_tts import Qwen3TTSModel
    if torch.cuda.is_available():
        raise SystemExit("UMS_SHOWCASE_CPU_ROUTE_EXPECTED")
    model=Qwen3TTSModel.from_pretrained(MODEL_ID,device_map="cpu",dtype=torch.float32,low_cpu_mem_usage=True)
    supported={str(x).lower() for x in model.model.get_supported_speakers()}
    manifests={}
    for film in films:
        if film.speaker.lower() not in supported: raise RuntimeError(f"UNSUPPORTED_SPEAKER:{film.speaker}")
        clips=[]
        for i,(cue,text) in enumerate(film.narrations,1):
            t0=time.time()
            kwargs=dict(text=text,language="Spanish",speaker=film.speaker,max_new_tokens=384)
            try:
                wavs,sr=model.generate_custom_voice(**kwargs,instruct=film.voice_instruction)
                used_instruction=True
            except TypeError:
                wavs,sr=model.generate_custom_voice(**kwargs)
                used_instruction=False
            if not wavs: raise RuntimeError(f"VOICE_EMPTY:{film.key}:{i}")
            p=OUT/f"{film.key}-voice-{i:02d}.wav"; sf.write(str(p),wavs[0],sr)
            info=sf.info(str(p))
            if info.duration<1.0: raise RuntimeError(f"VOICE_TOO_SHORT:{film.key}:{i}")
            clips.append({
                "cue_seconds":cue,"text":text,"path":p.name,"sha256":sha(p),"duration_seconds":round(float(info.duration),3),
                "sample_rate_hz":int(info.samplerate),"speaker":film.speaker,"language":"Spanish","style_instruction_requested":film.voice_instruction,
                "style_instruction_applied":used_instruction,"generation_seconds":round(time.time()-t0,3)
            })
        manifests[film.key]=clips
    return manifests


def make_mix(film: Film, clips: list[dict]) -> Path:
    # Inputs: silence video later + narration WAVs here. Music/SFX is entirely generated locally with ffmpeg sources.
    out=OUT/f"{film.key}-mix.m4a"
    cmd=["ffmpeg","-hide_banner","-loglevel","error","-y"]
    for c in clips: cmd += ["-i",str(OUT/c["path"])]
    n=len(clips)
    fc=[]
    # cinematic harmonic bed + sub pulse + pink air
    fc += [
        f"sine=frequency=55:sample_rate=48000:duration={film.duration},volume=0.040[b0]",
        f"sine=frequency=82.41:sample_rate=48000:duration={film.duration},volume=0.025[b1]",
        f"sine=frequency=110:sample_rate=48000:duration={film.duration},volume=0.018[b2]",
        f"anoisesrc=color=pink:sample_rate=48000:duration={film.duration},highpass=f=6000,volume=0.010[air]",
        "[b0][b1][b2][air]amix=inputs=4:normalize=0,lowpass=f=9500,afade=t=in:st=0:d=1.2,afade=t=out:st=%0.3f:d=1.5[bed]"%(film.duration-1.5),
    ]
    labels=["[bed]"]
    for i,c in enumerate(clips):
        delay=int(c["cue_seconds"]*1000)
        fc.append(f"[{i}:a]aresample=48000,volume=1.35,adelay={delay}|{delay},apad=pad_dur={film.duration},atrim=duration={film.duration}[v{i}]")
        labels.append(f"[v{i}]")
    fc.append("".join(labels)+f"amix=inputs={len(labels)}:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.93,atrim=duration={film.duration}[mix]")
    cmd += ["-filter_complex",";".join(fc),"-map","[mix]","-c:a","aac","-b:a","128k","-ar","48000","-ac","2",str(out)]
    run(cmd)
    return out


def master(film: Film, silent: Path, mix: Path) -> Path:
    out=OUT/f"cerebro-ums-{film.key}-showcase.mp4"
    vf=("scale=720:1280:flags=lanczos" if film.height>film.width else "scale=1280:720:flags=lanczos")
    # Keep the 3+ minute film email-friendly without sacrificing 720p delivery.
    bitrate="850k" if film.key=="hero" else "1100k"
    maxrate="1050k" if film.key=="hero" else "1400k"
    run([
        "ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(silent),"-i",str(mix),
        "-map","0:v:0","-map","1:a:0","-t",str(film.duration),"-vf",vf,"-r",str(FPS_OUT),
        "-c:v","libx264","-preset","medium","-b:v",bitrate,"-maxrate",maxrate,"-bufsize","1800k","-pix_fmt","yuv420p",
        "-c:a","aac","-b:a","128k","-ar","48000","-ac","2","-movflags","+faststart",str(out)
    ])
    return out


def validate(film: Film, path: Path, clips: list[dict]) -> dict:
    p=probe(path); vs=next(x for x in p["streams"] if x.get("codec_type")=="video"); a=next(x for x in p["streams"] if x.get("codec_type")=="audio")
    dur=float(p["format"]["duration"]); size=path.stat().st_size
    expected=(720,1280) if film.height>film.width else (1280,720)
    checks={
        "duration_matches": abs(dur-film.duration)<0.8,
        "hero_at_least_180_seconds": film.key!="hero" or dur>=180.0,
        "resolution": (int(vs["width"]),int(vs["height"]))==expected,
        "h264": vs.get("codec_name")=="h264",
        "aac": a.get("codec_name")=="aac",
        "narration_present": len(clips)==len(film.narrations),
        "voice_is_distinct_per_film": True,
        "email_target_under_24mb": size < 24*1024*1024,
    }
    if not all(checks.values()): raise RuntimeError(f"VALIDATION_FAILED:{film.key}:{checks}:bytes={size}")
    return {
        "film":film.key,"label":film.label,"path":path.name,"sha256":sha(path),"bytes":size,"duration_seconds":dur,
        "width":int(vs["width"]),"height":int(vs["height"]),"fps":vs.get("r_frame_rate"),"video_codec":vs.get("codec_name"),
        "audio_codec":a.get("codec_name"),"speaker":film.speaker,"language":"Spanish","requested_variant":"Spain-Spanish",
        "scene_count":len(film.scenes),"camera_modes":sorted(set(s.camera for s in film.scenes)),"lighting_modes":sorted(set(s.light for s in film.scenes)),
        "visual_modes":sorted(set(s.kind for s in film.scenes)),"checks":checks,
    }


voice_manifest=synthesize_voices(FILMS)
results=[]
for film in FILMS:
    silent=render_silent(film)
    mix=make_mix(film,voice_manifest[film.key])
    final=master(film,silent,mix)
    results.append(validate(film,final,voice_manifest[film.key]))
    # remove intermediates after validation; keep voice evidence + final masters
    silent.unlink(missing_ok=True); mix.unlink(missing_ok=True)

speakers=[r["speaker"] for r in results]
if len(set(speakers)) != len(speakers): raise RuntimeError("SHOWCASE_VOICES_NOT_DISTINCT")
manifest={
    "schema_version":"1.0.0","state_type":"CEREBRO_UMS_STUDIO_SHOWCASE_V1","environment":"PREPROD",
    "status":"PASS_WITH_PHYSICAL_DELIVERABLES","purpose":"UMS_PRODUCTION_CAPABILITY_SHOWCASE",
    "creative_direction":"ORIGINAL_PREMIUM_SUPERHERO_BLOCKBUSTER_AESTHETIC_NO_FRANCHISE_ASSETS",
    "deliverables":results,"voices":voice_manifest,
    "capabilities_demonstrated":["SHORT_FORM","STORY","REEL","LONG_FORM","MULTI_VOICE_SPANISH","CAMERA_LANGUAGE","LIGHTING_VARIATION","MOTION_DESIGN","VFX","3D_XR_VISUAL_LANGUAGE","EDITING","COLOR_LANGUAGE","MUSIC_BED","SFX_STYLE_AUDIO","MULTIFORMAT_MASTERING"],
    "governance":{"prod_mutation":False,"publish":False,"paid_api_calls":0,"additional_cost_eur":0,"rights":"ORIGINAL_PROCEDURAL_VISUALS_AND_BUILTIN_SYNTHETIC_TTS_TIMBRES","real_person_clone":False},
    "elapsed_seconds":round(time.time()-START,3)
}
(OUT/"ums-studio-showcase-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(manifest,ensure_ascii=False,indent=2))
