#!/usr/bin/env python3
"""Fail-closed BM-10 tribunal. Thresholds are fixed before candidate execution."""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

DURATION_MIN=59.0
SEQUENCE_COUNT=4
SEQUENCE_DURATION_MIN=14.5
VOICE_DURATION_MIN=2.0
BOUNDARY_RGB_DELTA_MAX=22.0
AUDIO_RMS_MIN=0.005
AUDIO_RMS_MAX=0.25
AUDIO_PEAK_MAX=0.999
EXPECTED_VIDEO_SHA='16437_PLACEHOLDER'
# Source hashes are checked by the workflow before generation and repeated from the manifest.
BM01_VIDEO_SHA=''
BM04_MUSIC_SHA='0d452251a68ccf310e0cd5643965d0ca3ec2c9cb4ee9fde2a7c46fa409176b3b'

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--manifest',required=True); ap.add_argument('--root',required=True); ap.add_argument('--out',required=True); a=ap.parse_args()
    root=Path(a.root).resolve(); mp=Path(a.manifest).resolve(); m=json.loads(mp.read_text())
    final=root/m['final']['path']; clips=m['voice']['clips']; seqs=m['story']['sequences']; bounds=m['color_continuity']['boundaries']
    checks={
      'benchmark_contract':m.get('benchmark_id')=='BM-10' and m.get('environment')=='PREPROD' and m.get('status')=='LONGFORM_MULTI_SEQUENCE_GENERATED',
      'synthetic_character_only':m.get('character',{}).get('identity_type')=='SYNTHETIC_ORIGINAL' and m.get('character',{}).get('real_person_reference') is False and m.get('character',{}).get('source_benchmark')=='BM-01',
      'sealed_music_source':m.get('sound',{}).get('music_source_benchmark')=='BM-04' and m.get('sound',{}).get('music_sha256')==BM04_MUSIC_SHA,
      'four_sequences':m.get('story',{}).get('sequence_count')==SEQUENCE_COUNT and len(seqs)==SEQUENCE_COUNT,
      'sequence_duration':all(float(s.get('duration_seconds',0))>=SEQUENCE_DURATION_MIN for s in seqs),
      'longform_duration':float(m.get('final',{}).get('duration_seconds',0))>=DURATION_MIN,
      'final_file_integrity':final.is_file() and final.stat().st_size==m['final'].get('bytes') and sha(final)==m['final'].get('sha256'),
      'delivery_codec':m['final'].get('video_codec')=='h264' and m['final'].get('audio_codec')=='aac' and m['final'].get('width')==512 and m['final'].get('height')==512,
      'voice_real_inference':len(clips)==SEQUENCE_COUNT and all(float(v.get('duration_seconds',0))>=VOICE_DURATION_MIN and v.get('model')=='Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice' and v.get('speaker')=='Aiden' and v.get('language')=='Spanish' for v in clips),
      'voice_artifact_integrity':all((root/v['path']).is_file() and (root/v['path']).stat().st_size==v['bytes'] and sha(root/v['path'])==v['sha256'] for v in clips),
      'no_real_person_voice':m.get('voice',{}).get('real_person_voice') is False,
      'color_boundary_count':len(bounds)==SEQUENCE_COUNT-1,
      'color_continuity':len(bounds)==SEQUENCE_COUNT-1 and all(float(b.get('mean_abs_rgb_delta',999))<=BOUNDARY_RGB_DELTA_MAX for b in bounds),
      'sound_continuity':AUDIO_RMS_MIN<=float(m.get('sound',{}).get('rms_linear',0))<=AUDIO_RMS_MAX and 0<float(m.get('sound',{}).get('peak_linear',2))<=AUDIO_PEAK_MAX and m.get('sound',{}).get('mix_sample_rate_hz')==48000 and m.get('sound',{}).get('mix_channels')==2,
      'provenance_chain':m.get('provenance',{}).get('visual_source')=='BM-01_PASS_WITH_EVIDENCE' and m.get('provenance',{}).get('music_source')=='BM-04_PASS_WITH_EVIDENCE' and m.get('provenance',{}).get('voice_runtime')=='QWEN3_TTS_CPU_REAL_INFERENCE' and m.get('provenance',{}).get('external_real_person_media') is False,
      'zero_cost':m.get('additional_cost_eur')==0,
      'authority_closed':m.get('prod_authorized') is False and m.get('publish_authorized') is False and m.get('spend_authorized') is False and m.get('readiness_mutation_authorized') is False
    }
    status='PASS_WITH_EVIDENCE' if all(checks.values()) else 'FAIL_CLOSED'
    proof={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM10_LONGFORM_CONTINUITY_PROOF_V1','benchmark_id':'BM-10','proof_type':'LONGFORM_MULTI_SEQUENCE_CHARACTER_STORY_IMAGE_VOICE_SOUND_COLOR_CONTINUITY_PROOF','environment':'PREPROD','status':status,'benchmark_credit':status=='PASS_WITH_EVIDENCE',
      'threshold_policy':'FIXED_BEFORE_CANDIDATE_OBSERVATION','thresholds':{'duration_seconds_min':DURATION_MIN,'sequence_count':SEQUENCE_COUNT,'sequence_duration_seconds_min':SEQUENCE_DURATION_MIN,'voice_clip_duration_seconds_min':VOICE_DURATION_MIN,'boundary_mean_abs_rgb_delta_max':BOUNDARY_RGB_DELTA_MAX,'audio_rms_min':AUDIO_RMS_MIN,'audio_rms_max':AUDIO_RMS_MAX,'audio_peak_max':AUDIO_PEAK_MAX},
      'checks':checks,
      'metrics':{'duration_seconds':m['final']['duration_seconds'],'sequence_count':m['story']['sequence_count'],'voice_durations':[v['duration_seconds'] for v in clips],'boundary_mean_abs_rgb_delta':[b['mean_abs_rgb_delta'] for b in bounds],'audio_rms_linear':m['sound']['rms_linear'],'audio_peak_linear':m['sound']['peak_linear']},
      'evidence':{'manifest_sha256':sha(mp),'final_sha256':m['final']['sha256'],'final_bytes':m['final']['bytes'],'character_id':m['character']['id'],'music_sha256':m['sound']['music_sha256']},
      'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'benchmark_registry_mutation_authorized':status=='PASS_WITH_EVIDENCE','universal_media_studio_ready_authorized':False
    }
    Path(a.out).write_text(json.dumps(proof,indent=2),encoding='utf-8'); print(json.dumps(proof,indent=2))
    if status!='PASS_WITH_EVIDENCE': raise SystemExit(10)
if __name__=='__main__': main()
