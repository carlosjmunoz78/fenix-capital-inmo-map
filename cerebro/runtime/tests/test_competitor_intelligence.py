from __future__ import annotations

import unittest

from cerebro.runtime.competitor_intelligence import CompetitorIntelligence


class CompetitorIntelligenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = CompetitorIntelligence(environment='PREPROD')
        self.kw = {'company_id': 'co-1', 'opportunities': [{'keyword': 'mortgage madrid'}]}
        self.scan = {'company_id': 'co-1'}
        self.waud = {'company_id': 'co-1'}
        self.local = {
            'company_id': 'co-1',
            'geographies': ['Madrid'],
            'services': ['mortgage brokerage', 'financial advice'],
        }
        self.social = {
            'company_id': 'co-1',
            'profiles': [{'platform': 'Instagram'}],
        }

    def run_engine(self, evidence):
        return self.engine.analyze(
            company_id='co-1',
            keyword_discovery=self.kw,
            digital_footprint=self.scan,
            website_audit=self.waud,
            local_presence=self.local,
            social_audit=self.social,
            public_competitor_evidence=evidence,
            evidence_at='2026-09-08T16:00:00Z',
        )

    def test_no_evidence_never_invents_competitors(self) -> None:
        result = self.run_engine([])
        self.assertEqual(result['profiles'], [])
        self.assertEqual(result['human_required_code'], 'LOW_CONFIDENCE')
        self.assertEqual(result['missing_evidence'], ['explicit_public_competitor_evidence'])

    def test_explicit_competitor_builds_evidence_backed_overlap(self) -> None:
        result = self.run_engine([{
            'name': 'Example Rival',
            'domain': 'rival.example',
            'services': ['mortgage brokerage'],
            'geographies': ['Madrid'],
            'channels': ['instagram'],
            'keywords': ['mortgage madrid'],
        }])
        profile = result['profiles'][0]
        self.assertEqual(profile['domain'], 'rival.example')
        self.assertEqual(profile['evidence_state'], 'EVIDENCE_SUPPORTED')
        self.assertEqual(profile['overlap']['services'], ['mortgage brokerage'])
        self.assertEqual(profile['overlap']['geographies'], ['madrid'])
        self.assertEqual(profile['overlap']['channels'], ['instagram'])
        self.assertEqual(profile['overlap']['keywords'], ['mortgage madrid'])
        self.assertIsNone(result['human_required_code'])

    def test_market_metrics_are_never_fabricated(self) -> None:
        result = self.run_engine([{'name': 'Rival'}])
        p = result['profiles'][0]
        for key in ('market_share', 'revenue', 'headcount', 'traffic', 'ad_spend', 'search_rank', 'followers', 'review_metrics'):
            self.assertEqual(p[key], 'unknown_without_public_evidence')

    def test_deduplicates_and_sorts(self) -> None:
        result = self.run_engine([
            {'name': 'Zulu', 'domain': 'z.example', 'services': ['mortgage brokerage']},
            {'name': 'Alpha', 'domain': 'a.example'},
            {'name': 'Zulu duplicate', 'domain': 'Z.EXAMPLE', 'channels': ['instagram']},
        ])
        self.assertEqual([p['domain'] for p in result['profiles']], ['a.example', 'z.example'])
        zulu = result['profiles'][1]
        self.assertEqual(len(zulu['source_refs']), 2)
        self.assertEqual(zulu['evidence_state'], 'EVIDENCE_SUPPORTED')

    def test_output_is_deterministic(self) -> None:
        evidence = [{'name': 'Rival', 'domain': 'r.example', 'services': ['mortgage brokerage']}]
        a = self.run_engine(evidence)
        b = self.run_engine(evidence)
        self.assertEqual(a, b)
        self.assertEqual(a['evidence_sha256'], b['evidence_sha256'])

    def test_cross_company_denied(self) -> None:
        bad = dict(self.kw)
        bad['company_id'] = 'co-2'
        with self.assertRaisesRegex(PermissionError, 'POLICY_CONFLICT'):
            self.engine.analyze(
                company_id='co-1', keyword_discovery=bad,
                digital_footprint=self.scan, website_audit=self.waud, local_presence=self.local,
                social_audit=self.social, public_competitor_evidence=[], evidence_at='2026-09-08T16:00:00Z')

    def test_secret_material_denied(self) -> None:
        with self.assertRaisesRegex(PermissionError, 'SECURITY_INCIDENT'):
            self.run_engine([{'name': 'Rival', 'api_token': 'forbidden'}])

    def test_prod_denied_and_health_is_read_only_zero_cost(self) -> None:
        with self.assertRaises(PermissionError):
            CompetitorIntelligence(environment='PROD')
        health = self.engine.health()
        self.assertFalse(health['remote_write'])
        self.assertFalse(health['prod_enabled'])
        self.assertEqual(health['external_cost_eur'], 0)


if __name__ == '__main__':
    unittest.main()
