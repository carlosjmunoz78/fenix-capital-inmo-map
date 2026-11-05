import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import hashlib
import math
import shutil
import subprocess
import tempfile
import unittest
import wave

import jarvis_local_voice as j

class JarvisLocalVoiceTests(unittest.TestCase):
    def test_master_sha256_matches_approved(self):
        self.assertTrue(j.REFERENCE.exists())
        self.assertEqual(j.sha256(j.REFERENCE), j.MASTER_HASH)

    def test_probe_has_no_paid_api_and_reference_verified(self):
        result = j.probe()
        self.assertTrue(result['reference_sha256_valid'])
        self.assertFalse(result['paid_tts_provider_enabled'])
        self.assertEqual(result['cost_per_tts_api_call_eur'], 0)
        self.assertFalse(result['cloud_provider_used'])
        self.assertEqual(result['model_variant'], 'v3')
        self.assertFalse(result['model_is_dedicated_es_es'])

    def test_tone_and_speed_are_exactly_approved(self):
        self.assertEqual(j.V2_RATE, 1.10)
        self.assertEqual(j.V2_PITCH_SEMITONES, 0.60)

    def test_conversion_is_non_destructive(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)/'reference.wav'
            original = j.sha256(j.REFERENCE)
            j.prepare_wav_reference(j.REFERENCE, output)
            self.assertGreater(output.stat().st_size, 10000)
            self.assertEqual(j.sha256(j.REFERENCE), original)

    @unittest.skipUnless(shutil.which('ffmpeg') and j.ffmpeg_available(), 'rubberband ffmpeg unavailable')
    def test_pitch_shift_preserves_master_and_changes_new_audio_duration(self):
        with tempfile.TemporaryDirectory() as tmp:
            input = Path(tmp)/'novel_phrase_synthetic.wav'
            output = Path(tmp)/'novel_phrase_v2.mp3'
            with wave.open(str(input),'w') as w:
                w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000)
                import struct
                audio = b''.join(struct.pack('<h', int(5000*math.sin(2*math.pi*250*n/24000))) for n in range(24000))
                w.writeframes(audio)
            j.final_preset(input, output)
            self.assertGreater(output.stat().st_size, 1000)
            ffprobe=shutil.which('ffprobe')
            if ffprobe:
                r = subprocess.run([ffprobe,'-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(output)],capture_output=True,text=True,check=True)
                self.assertTrue(0.84 < float(r.stdout) < 1.1)

    def test_damaged_reference_fails_gate(self):
        with tempfile.TemporaryDirectory() as t:
            broken=Path(t)/'not-approved.mp3'
            broken.write_bytes(b'FAKE MP3')
            report=j.probe(broken)
            self.assertFalse(report['reference_sha256_valid'])
            self.assertIn('APPROVED_REFERENCE_MISSING_OR_MODIFIED', report['blockers'])

if __name__ == '__main__':
    unittest.main()