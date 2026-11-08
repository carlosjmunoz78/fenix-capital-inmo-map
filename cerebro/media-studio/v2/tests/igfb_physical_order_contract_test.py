import json, pathlib, unittest
p=pathlib.Path(__file__).resolve().parents[1]/"orders/igfb-first-physical-batch-20261108.json"
o=json.loads(p.read_text())
class TestOneShot(unittest.TestCase):
 def test_contract(self):
  self.assertEqual(o['engine_id'],'UMS-001')
  self.assertEqual(o['environment'],'LAB')
  self.assertEqual(o['publication'],'DISABLED')
  self.assertEqual(o['budget']['max_total_usd'],0.65)
  self.assertFalse(o['budget']['autorenew'])
  self.assertFalse(o['budget']['automatic_retry'])
  self.assertEqual([x['type'] for x in o['creative_briefs']],['IMAGE','IMAGE','VIDEO'])
  self.assertAlmostEqual(sum(x['estimated_cost_usd'] for x in o['creative_briefs']),0.555)
 def test_vendor(self):
  self.assertEqual({x['model'] for x in o['creative_briefs']},{'black-forest-labs/flux-1.1-pro','prunaai/p-video-2-pro'})
  self.assertEqual(o['creative_briefs'][2]['mode'],'quality')
  self.assertEqual(o['creative_briefs'][2]['duration'],5)
 def test_channels(self):
  self.assertEqual({x['network'] for x in o['channel_requests']},{'INSTAGRAM','FACEBOOK'})
  self.assertTrue(all(x['approval']=='QA_REQUIRED' for x in o['channel_requests']))
if __name__=='__main__':unittest.main()
