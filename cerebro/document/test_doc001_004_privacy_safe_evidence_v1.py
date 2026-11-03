import hashlib
import json
import unittest
from doc001_004_privacy_safe_evidence_v1 import privacy_safe_evidence, serialized_safe_evidence

class PrivacyEvidenceTests(unittest.TestCase):
 def fixture(self):
  text="DNI 12345678Z IBAN ES9121000418450200051332 carlos@example.invalid Calle de Prueba 123"
  return {
    "company_id":"fenix","engine_id":"DOC-001","environment":"PREPROD","version":"v1",
    "document_sha256":hashlib.sha256(text.encode()).hexdigest(),
    "text":text,"filename":"customer-carlos-12345678Z.pdf","original_path":"/private/customer-carlos.pdf",
    "quality":{"readable":False,"page_count":1,"needs_recovery":True,"reasons":["POSSIBLE_BLUR","CUSTOM_FREE_TEXT_SECRET"]},
    "classification":{"family":"IDENTITY","confidence":0.7,"matches":["DNI"],"model_free_text":"carlos@example.invalid"},
    "prod_write_authorized":False,"source_modified":False,
  }
 def test_no_pii_or_text_or_paths_in_serialized_evidence(self):
  payload=self.fixture()
  data=serialized_safe_evidence(payload)
  for forbidden in ["12345678Z","ES9121000418450200051332","carlos@example.invalid","customer-carlos","Calle de Prueba","CUSTOM_FREE_TEXT_SECRET","DNI 1234","original_path","filename","model_free_text","matches"]:
   self.assertNotIn(forbidden,data)
  parsed=json.loads(data)
  self.assertFalse(parsed["raw_text_included"])
  self.assertFalse(parsed["source_file_path_included"])
  self.assertEqual(parsed["classification"]["family"],"IDENTITY")
  self.assertEqual(parsed["anomaly"]["risk_level"],"LOW")
 def test_duplicate_with_quality_and_heuristic_triggers_high_risk_without_accusation(self):
  payload=self.fixture()
  payload["text"]+=" editado"
  item=privacy_safe_evidence(payload,{payload["document_sha256"]})
  self.assertEqual(item["anomaly"]["risk_level"],"HIGH")
  self.assertEqual(item["anomaly"]["human_exception"],"HIGH_RISK")
  self.assertFalse(item["anomaly"]["automatic_accusation"])
  self.assertNotIn("text",item)
 def test_environment_and_tenant_are_fail_closed(self):
  payload=self.fixture()
  for change in [{"environment":"PROD"},{"engine_id":"LAB-TRD"},{"company_id":""},{"document_sha256":"bad"}]:
   with self.assertRaises(ValueError):
    privacy_safe_evidence({**payload,**change})
 def test_schema_drops_untrusted_freeform_fields(self):
  payload=self.fixture()
  payload["secret_token"]="should-not-be-rendered"
  result=serialized_safe_evidence(payload)
  self.assertNotIn("secret_token",result)
  self.assertNotIn("should-not-be-rendered",result)
  self.assertTrue(json.loads(result)["external_write_authorized"] is False)
if __name__=="__main__":unittest.main()
