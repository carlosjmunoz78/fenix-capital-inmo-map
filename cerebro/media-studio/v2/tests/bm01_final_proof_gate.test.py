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
        stage0=self.write(root,'stage0.json',{'bm01_stage0':{
            'status':'BM01_STAGE0_REFERENCE_GREEN','character_id':CHAR,'identity_type':'SYNTHETIC_ORIGINAL','real_person_reference':False,
            'reference_assets':[
                {'view':'FRONT','sha256':FRONT},
                {'view':'PROFILE_LEFT','sha256':'1'*64},
                {'view':'THREE_QUARTER_RIGHT','sha256':'2'*64},
            ]}})
        video=self.write(root,'video.json',{'status':'PASS_WITH_EVIDENCE','proof_type':'VIDEO_IDENTITY_PROOF','character_id':CHAR,'environment':'PREPROD','additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'checks':{'all_cross_modal_pass':True,'a':True}})
        three_d=self.write(root,'3d.json',{'status':'PASS_WITH_EVIDENCE','proof_type':'THREE_D_REFERENCE_PROOF','character_id':CHAR,'environment':'PREPROD','additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'checks':{'cross_modal_pass':True,'a':True}})
        image=self.write(root,'image.json',{'status':'PASS_WITH_EVIDENCE','proof_type':'IMAGE_IDENTITY_PROOF','character_id':CHAR,'environment':'PREPROD','additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'checks':{'a':True}})
        return stage0,video,three_d,image

    def run_gate(self,root,paths,image=False):
        out=root/'out.json'
        cmd=[sys.executable,str(GATE),'--stage0',str(paths[0]),'--video-proof',str(paths[1]),'--three-d-proof',str(paths[2]),'--out',str(out)]
        if image: cmd.extend(['--image-proof',str(paths[3])])
        cp=subprocess.run(cmd,capture_output=True,text=True)
        doc=json.loads(out.read_text()) if out.exists() else None
        return cp,doc

    def test_passes_existing_contract_without_optional_generated_image_extension(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); cp,doc=self.run_gate(root,self.fixtures(root))
            self.assertEqual(cp.returncode,0,cp.stderr+cp.stdout)
            self.assertEqual(doc['status'],'PASS_WITH_EVIDENCE')
            self.assertTrue(doc['benchmark_registry_mutation_authorized'])
            self.assertFalse(doc['universal_media_studio_ready_authorized'])
            self.assertTrue(all(doc['checks'].values()))
            self.assertEqual(doc['quality_extensions'][0]['status'],'NOT_SUPPLIED')

    def test_fails_closed_if_required_video_modality_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); paths=list(self.fixtures(root))
            video=json.loads(paths[1].read_text()); video['status']='FAIL_CLOSED'; paths[1].write_text(json.dumps(video))
            cp,doc=self.run_gate(root,paths)
            self.assertNotEqual(cp.returncode,0)
            self.assertEqual(doc['status'],'FAIL_CLOSED')
            self.assertFalse(doc['benchmark_registry_mutation_authorized'])
            self.assertFalse(doc['checks']['video_pass'])

    def test_optional_ip_adapter_quality_failure_is_reported_but_does_not_redefine_bm01(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); paths=list(self.fixtures(root))
            image=json.loads(paths[3].read_text()); image['status']='FAIL_CLOSED'; paths[3].write_text(json.dumps(image))
            cp,doc=self.run_gate(root,paths,image=True)
            self.assertEqual(cp.returncode,0,cp.stderr+cp.stdout)
            self.assertEqual(doc['status'],'PASS_WITH_EVIDENCE')
            self.assertEqual(doc['quality_extensions'][0]['status'],'QUALITY_EXTENSION_NOT_GREEN')

if __name__=='__main__': unittest.main()
