import tempfile, unittest
from pathlib import Path
from PIL import Image, ImageDraw
from doc001_004_pipeline_v1 import Doc001Pipeline,Doc002PendingLifecycle,Doc003QualityGate,Doc004AnomalyEngine,CONTRACT

META={"company_id":"fenix","engine_id":"DOC-001","environment":"PREPROD","version":"1.0.0"}

class DocsTest(unittest.TestCase):
  def fixture(self,root:Path):
    img=Image.new('RGB',(1400,900),'white');d=ImageDraw.Draw(img);d.text((100,300),'PAYROLL SALARY DOCUMENT TEST 123',fill='black')
    png=root/'fixture.png';pdf=root/'fixture.pdf';img.save(png);img.save(pdf,'PDF',resolution=150.0);return png,pdf
  def test_quality_and_ocr_pipeline(self):
    with tempfile.TemporaryDirectory() as td:
      root=Path(td);png,pdf=self.fixture(root)
      q=Doc003QualityGate().inspect_image(png);self.assertTrue(q.readable);self.assertGreater(q.blur_variance,20)
      out=Doc001Pipeline().process(pdf,META)
      self.assertFalse(out['source_modified']);self.assertTrue(out['safe_fallback']);self.assertEqual(out['classification']['family'],'INCOME');self.assertIn('PAYROLL',out['text'].upper());self.assertTrue(out['fallback']['ok'])
  def test_pending_document_full_lifecycle(self):
    x=Doc002PendingLifecycle('fenix','payroll');
    for state in ['REQUESTED','RECEIVED','CLASSIFIED','VALIDATED','CLOSED']: x.move(state,'fixture evidence')
    self.assertEqual(x.state,'CLOSED');self.assertEqual(len(x.events),5)
  def test_antifraud_is_evidence_not_accusation(self):
    current={'document_sha256':'abc','quality':{'needs_recovery':True},'classification':{'family':'UNKNOWN'},'text':'modified document'}
    result=Doc004AnomalyEngine().score(current,{'abc'})
    self.assertEqual(result['risk_level'],'HIGH');self.assertEqual(result['human_exception'],'HIGH_RISK');self.assertFalse(result['accusation']);self.assertTrue(result['evidence_only'])
  def test_prod_remains_closed(self):
    self.assertFalse(CONTRACT['prod_write_authorized']);self.assertFalse(CONTRACT['trading_access']);self.assertEqual(CONTRACT['additional_cost_eur'],0)
    with tempfile.TemporaryDirectory() as td:
      _,pdf=self.fixture(Path(td))
      with self.assertRaisesRegex(ValueError,'PROD_WRITE_DENIED'): Doc001Pipeline().process(pdf,{**META,'environment':'PROD'})

if __name__=='__main__': unittest.main()
