#!/usr/bin/env python3
"""Generate an original deterministic 30-second cinematic cue as five MIDI stems.

No pretrained generative model or copyrighted composition is used. The score is built
from explicitly declared harmony, melody and rhythm data so provenance is inspectable.
"""
from __future__ import annotations
import hashlib, json, os, struct
from pathlib import Path

OUT=Path(os.environ.get('BM04_OUT','ums-bm04-original-song')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
TPB=480; BPM=96; US_PER_QN=round(60_000_000/BPM); BARS=12; BEATS_PER_BAR=4
SEED='CEREBRO-BM04-NOVA-ORIGINAL-CUE-V1'

def vlq(n:int)->bytes:
    b=[n&0x7F]; n>>=7
    while n: b.append((n&0x7F)|0x80); n>>=7
    return bytes(reversed(b))

def midi_file(path:Path, events:list[tuple[int,int,bytes]], channel:int, program:int|None):
    base=[(0,0,b'\xff\x51\x03'+US_PER_QN.to_bytes(3,'big')),(0,0,b'\xff\x58\x04\x04\x02\x18\x08')]
    if program is not None: base.append((0,1,bytes([0xC0|channel,program])))
    ev=sorted(base+events,key=lambda x:(x[0],x[1]))
    track=bytearray(); prev=0
    for tick,_,data in ev:
        track+=vlq(tick-prev)+data; prev=tick
    track+=vlq(0)+b'\xff\x2f\x00'
    header=b'MThd'+struct.pack('>IHHH',6,0,1,TPB)
    chunk=b'MTrk'+struct.pack('>I',len(track))+track
    path.write_bytes(header+chunk)

def note(events,channel,n,start_beats,dur_beats,vel=80):
    st=round(start_beats*TPB); en=round((start_beats+dur_beats)*TPB)
    events.append((st,2,bytes([0x90|channel,n,vel]))); events.append((en,0,bytes([0x80|channel,n,0])))

# Explicit original harmony. MIDI pitches are chosen for orchestral register and voice-leading.
CHORDS=[
 ('Dm',[50,57,62,65]),('Bb',[46,53,58,62]),('F',[41,48,53,57]),('C',[48,55,60,64]),
 ('Dm',[50,57,62,65]),('Bb',[46,53,58,62]),('Gm',[43,50,55,58]),('A',[45,52,57,61]),
 ('Dm',[50,57,62,65]),('C',[48,55,60,64]),('Bb',[46,53,58,62]),('Dm',[50,57,62,65])
]
ROOTS={'Dm':38,'Bb':34,'F':29,'C':36,'Gm':31,'A':33}
MELODY=[
 [],[], [62,65,69,67], [64,67,72,67], [69,67,65,62], [65,62,58,62],
 [67,70,67,62], [69,73,76,73], [74,72,69,65], [67,64,67,72], [70,69,65,62], [62,65,62,57]
]
STEMS={
 'strings':{'channel':0,'program':48,'events':[],'role':'sustained_harmony'},
 'piano':{'channel':1,'program':0,'events':[],'role':'arpeggiated_pulse'},
 'bass':{'channel':2,'program':32,'events':[],'role':'low_foundation'},
 'horn':{'channel':3,'program':60,'events':[],'role':'lead_theme'},
 'drums':{'channel':9,'program':None,'events':[],'role':'rhythmic_foundation'},
}

for bar,(name,chord) in enumerate(CHORDS):
    base=bar*BEATS_PER_BAR
    # Strings: whole-bar voicing, shaped velocity by section.
    vel=54 if bar<2 else (68 if bar<8 else 76 if bar<10 else 62)
    for n in chord: note(STEMS['strings']['events'],0,n,base,3.92,vel)
    # Piano: eighth-note arpeggio with deterministic inversion pattern.
    arp=[chord[1],chord[2],chord[3],chord[2],chord[0]+12,chord[2],chord[3],chord[2]]
    for i,n in enumerate(arp): note(STEMS['piano']['events'],1,n+12,base+i*0.5,0.42,45+(i%4)*3)
    # Bass: root / octave / fifth / octave.
    root=ROOTS[name]; bass_notes=[root,root+12,root+7,root+12]
    for i,n in enumerate(bass_notes): note(STEMS['bass']['events'],2,n,base+i,0.82,64 if i in (0,2) else 56)
    # Horn original theme; later bars become more present.
    if MELODY[bar]:
        for i,n in enumerate(MELODY[bar]): note(STEMS['horn']['events'],3,n,base+i,0.82,68+(bar>=8)*8)
    # Drums (GM ch 10 / zero-based 9): kick, snare, hats, section crashes and fills.
    for i in range(8): note(STEMS['drums']['events'],9,42,base+i*0.5,0.08,34+(i%2)*4)
    for beat in (0,2): note(STEMS['drums']['events'],9,36,base+beat,0.10,82)
    for beat in (1,3): note(STEMS['drums']['events'],9,38,base+beat,0.10,70)
    if bar in (0,4,8): note(STEMS['drums']['events'],9,49,base,0.18,88)
    if bar in (7,11):
        for j,p in enumerate((45,47,48,50)): note(STEMS['drums']['events'],9,p,base+3+j*0.25,0.12,62+j*5)

manifest_stems={}
for name,s in STEMS.items():
    path=OUT/f'{name}.mid'; midi_file(path,s['events'],s['channel'],s['program'])
    manifest_stems[name]={'path':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'event_count':len(s['events']),'program':s['program'],'channel':s['channel'],'role':s['role']}

manifest={
 'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM04_ORIGINAL_COMPOSITION_V1','company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','version':'1.0.0',
 'benchmark_id':'BM-04','title':'Nova-01: First Light','composition_type':'ORIGINAL_DETERMINISTIC_CINEMATIC_CUE','composition_seed':SEED,
 'copyright_source':'ORIGINAL_GENERATED_FROM_DECLARED_NOTE_EVENTS','pretrained_music_model_used':False,'external_composition_used':False,
 'tempo_bpm':BPM,'time_signature':'4/4','ticks_per_beat':TPB,'bars':BARS,'expected_duration_seconds':BARS*BEATS_PER_BAR*60/BPM,
 'structure':[{'name':'INTRO','bars':[1,2]},{'name':'A','bars':[3,6]},{'name':'BUILD','bars':[7,8]},{'name':'CLIMAX','bars':[9,10]},{'name':'OUTRO','bars':[11,12]}],
 'harmony':[x[0] for x in CHORDS],'melody_midi':MELODY,'stems':manifest_stems,
 'render_contract':{'sample_rate_hz':48000,'stereo':True,'premaster_required':True,'master_wav_required':True,'master_flac_required':True,'target_lufs_i':-16.0,'true_peak_dbfs_max':-1.0},
 'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
}
(OUT/'bm04-composition.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8'); print(json.dumps(manifest,indent=2))
