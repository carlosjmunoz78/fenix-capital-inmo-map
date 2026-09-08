from __future__ import annotations

import unittest

from cerebro.runtime.social_media_audit import SocialMediaAudit


class SocialMediaAuditTests(unittest.TestCase):
    def setUp(self) -> None:
        self.audit = SocialMediaAudit(environment='PREPROD')
        self.bmd = {
            'company_id': 'co-1',
            'business_model': {'channels': ['Instagram', 'LinkedIn', 'referral']},
        }
        self.scan = {
            'company_id': 'co-1',
            'social_profiles': [
                {'platform': 'Instagram', 'url': 'https://instagram.com/example'},
            ],
        }

    def test_public_evidence_builds_deterministic_profiles(self) -> None:
        evidence = [
            {
                'company_id': 'co-1',
                'platform': 'Instagram',
                'url': 'https://instagram.com/example',
                'followers': 120,
                'posts': [
                    {'published_at_epoch': 100000, 'format': 'reel', 'topics': ['mortgage']},
                    {'published_at_epoch': 186400, 'format': 'carousel', 'topics': ['mortgage', 'tips']},
                ],
            }
        ]
        result = self.audit.audit(
            company_id='co-1',
            business_model_profile=self.bmd,
            digital_footprint=self.scan,
            public_social_evidence=evidence,
            evidence_at='2026-09-08T15:00:00Z',
        )
        self.assertEqual(result['engine_id'], 'SOCAUD-001')
        self.assertEqual(result['version'], '0.2.0')
        self.assertEqual(result['profiles'][0]['platform'], 'instagram')
        self.assertEqual(result['profiles'][0]['median_cadence_days'], 1.0)
        self.assertEqual(result['profiles'][0]['followers'], 120)
        self.assertFalse(result['publishing'])
        self.assertFalse(result['remote_write'])
        self.assertEqual(result['additional_cost_eur'], 0)
        self.assertIsNone(result['human_required_code'])
        self.assertTrue(any(f['category'] == 'coverage' for f in result['findings']))

    def test_missing_profiles_is_low_confidence_not_fabrication(self) -> None:
        result = self.audit.audit(
            company_id='co-1',
            business_model_profile={'company_id': 'co-1', 'business_model': {'channels': []}},
            digital_footprint={'company_id': 'co-1', 'social_profiles': []},
            public_social_evidence=[],
            evidence_at='2026-09-08T15:00:00Z',
        )
        self.assertEqual(result['profiles'], [])
        self.assertEqual(result['human_required_code'], 'LOW_CONFIDENCE')
        self.assertEqual(result['audience_metrics_policy'], 'public_evidence_only_no_estimation')

    def test_cross_company_evidence_denied(self) -> None:
        with self.assertRaisesRegex(PermissionError, 'POLICY_CONFLICT'):
            self.audit.audit(
                company_id='co-1',
                business_model_profile={'company_id': 'co-2'},
                digital_footprint=self.scan,
                public_social_evidence=[],
                evidence_at='2026-09-08T15:00:00Z',
            )

    def test_secret_material_denied(self) -> None:
        with self.assertRaisesRegex(PermissionError, 'SECURITY_INCIDENT'):
            self.audit.audit(
                company_id='co-1',
                business_model_profile=self.bmd,
                digital_footprint=self.scan,
                public_social_evidence=[{'platform': 'instagram', 'api_token': 'should-not-be-here'}],
                evidence_at='2026-09-08T15:00:00Z',
            )

    def test_prod_denied(self) -> None:
        with self.assertRaises(PermissionError):
            SocialMediaAudit(environment='PROD')

    def test_cadence_unknown_without_two_dated_posts(self) -> None:
        result = self.audit.audit(
            company_id='co-1',
            business_model_profile=self.bmd,
            digital_footprint=self.scan,
            public_social_evidence=[{'platform': 'Instagram', 'posts': [{'format': 'image'}]}],
            evidence_at='2026-09-08T15:00:00Z',
        )
        self.assertIsNone(result['profiles'][0]['median_cadence_days'])
        self.assertTrue(any(f['category'] == 'cadence' for f in result['findings']))


if __name__ == '__main__':
    unittest.main()
