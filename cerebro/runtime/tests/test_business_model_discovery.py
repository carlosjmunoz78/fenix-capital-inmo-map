import pathlib
import tempfile
import unittest

from cerebro.runtime.business_model_discovery import (
    BusinessModelDiscovery, BusinessModelPolicyError, BusinessModelSecurityError,
)
from cerebro.runtime.company_registry import CompanyRegistry


def scan(company='acme'):
    return {
        'company_id': company, 'engine_id': 'SCAN-001', 'environment': 'PREPROD', 'version': '0.2.0',
        'domain': 'acme.example', 'social_profiles': {'instagram':['https://instagram.com/acme'], 'linkedin':['https://linkedin.com/company/acme']},
        'technologies': ['wordpress'], 'evidence_sha256': 'a'*64, 'read_only': True,
    }


class BMDTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.registry = CompanyRegistry(pathlib.Path(self.tmp.name)/'companies.json')
        self.registry.register({
            'company_id':'acme', 'legal_name':'Acme SL', 'display_name':'Acme', 'owner':'owner',
            'brands':['Acme'], 'domains':['acme.example'], 'geographies':['Madrid'],
        })
        self.bmd = BusinessModelDiscovery(self.registry)

    def tearDown(self):
        self.tmp.cleanup()

    def test_complete_profile_uses_declared_registry_and_scan_without_inference(self):
        facts = {
            'services':['Advisory'], 'products':['Report'], 'customer_segments':['SME'],
            'value_propositions':['Fast evidence-backed decisions'], 'geographies':['Barcelona'],
            'channels':['referral'], 'objectives':['grow qualified demand'], 'restrictions':['no regulated advice'],
        }
        out = self.bmd.discover(company_id='acme', scan_evidence=scan(), declared_facts=facts, evidence_at='2026-09-08T12:00:00Z')
        self.assertEqual(out['status'], 'SUFFICIENT_PREPROD_PROFILE')
        self.assertIsNone(out['human_required_code'])
        self.assertEqual(out['completeness'], 1.0)
        self.assertEqual(out['business_model']['geographies'], ['Madrid','Barcelona'])
        self.assertIn('web:acme.example', out['business_model']['channels'])
        self.assertIn('social:instagram', out['business_model']['channels'])
        self.assertEqual(out['inferred_claims'], [])
        self.assertEqual(out['additional_cost_eur'], 0)

    def test_missing_business_claims_are_low_confidence_not_invented(self):
        out = self.bmd.discover(company_id='acme', scan_evidence=scan(), declared_facts={}, evidence_at='now')
        self.assertEqual(out['status'], 'PARTIAL_LOW_CONFIDENCE')
        self.assertEqual(out['human_required_code'], 'LOW_CONFIDENCE')
        self.assertIn('services', out['missing_dimensions'])
        self.assertEqual(out['business_model']['services'], [])
        self.assertEqual(out['inferred_claims'], [])

    def test_cross_company_evidence_is_denied(self):
        with self.assertRaises(BusinessModelPolicyError):
            self.bmd.discover(company_id='acme', scan_evidence=scan('other'), declared_facts={}, evidence_at='now')

    def test_secret_like_declared_fact_is_rejected(self):
        with self.assertRaises(BusinessModelSecurityError):
            self.bmd.discover(company_id='acme', scan_evidence=scan(), declared_facts={'api_token':['x']}, evidence_at='now')

    def test_prod_is_denied(self):
        with self.assertRaises(BusinessModelPolicyError):
            BusinessModelDiscovery(self.registry, environment='PROD')


if __name__ == '__main__':
    unittest.main()
