import json, subprocess, sys, tempfile, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[4]
GATE=ROOT/'cerebro/media-studio/v2/probes/bm01_final_proof_gate.py'
FRONT='e0f5968b9919f87c420f3c7ba4127bc1d48c01ddab2505f93f93d858958d04ec'
CHAR='UMS-SYNTH-CHAR-001'

class BM01FinalProofGateTest(unittest.TestCase):
    def write(self,root,name,obj):
        p=root/name; p.write_text(json.dumps(obj),encoding='utf-8'); return p

    def fixtures(self,root):
        stage0=self.write(root,'stage0.json',{'bm01_stage0':{'status':'BM01_STAGE0_REFERENCE_GREEN','character_id':CHAR,'identity_type':'SYNTHETIC_ORIGINAL','real_person_reference':False,'reference_assets':[{'view':'FRONT','sha256':FRONT}]}})
        def proof(name,ptype):
            return self.write(root,name,{'status':'PASS_WITH_EVIDENCE','proof_type':ptype,'character_id':CHAR,'environment':'PREPROD','additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'checks':{'a':True,'b':True}})
        return stage0,proof('image.json','IMAGE_IDENTITY_PROOF'),proof('video.json','VIDEO_IDENTITY_PROOF'),proof('3d.json','THREE_D_REFERENCE_PROOF')

    def run_gate(self,root,paths):
        out=root/'out.json'
        cp=subprocess.run([sys.executable,str(GATE),'--stage0',str(paths[0]),'--image-proof',str(paths[1]),'--video-proof',str(paths[2]),'--three-d-proof',str(paths[3]),'--out',str(out)],capture_output=True,text=True)
        doc=json.loads(out.read_text()) if out.exists() else None
        return cp,doc

    def test_passes_only_with_all_independent_proofs(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); cp,doc=self.run_gate(root,self.fixtures(root))
            self.assertEqual(cp.returncode,0,cp.stderr+cp.stdout)
            self.assertEqual(doc['status'],'PASS_WITH_EVIDENCE')
            self.assertTrue(doc['benchmark_registry_mutation_authorized'])
            self.assertFalse(doc['universal_media_studio_ready_authorized'])
            self.assertTrue(all(doc['checks'].values()))

    def test_fails_closed_if_one_modality_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); paths=list(self.fixtures(root))
            image=json.loads(paths[1].read_text()); image['status']='FAIL_CLOSED'; paths[1].write_text(json.dumps(image))
            cp,doc=self.run_gate(root,paths)
            self.assertNotEqual(cp.returncode,0)
            self.assertEqual(doc['status'],'FAIL_CLOSED')
            self.assertFalse(doc['benchmark_registry_mutation_authorized'])
            self.assertFalse(doc['checks']['image_pass'])

if __name__=='__main__': unittest.main()
