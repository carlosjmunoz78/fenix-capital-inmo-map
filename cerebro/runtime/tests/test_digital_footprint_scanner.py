import unittest

from cerebro.runtime.digital_footprint_scanner import (
    DigitalFootprintScanner, FetchResponse, ScannerPolicyError, ScannerValidationError,
)


class FakeFetcher:
    def __init__(self):
        self.calls = []

    def __call__(self, url):
        self.calls.append(url)
        if url.endswith('/robots.txt'):
            return FetchResponse(url, 200, {'content-type':'text/plain'}, 'User-agent: *\nSitemap: https://acme.example/sitemap.xml')
        if url.endswith('/sitemap.xml'):
            return FetchResponse(url, 200, {'content-type':'application/xml'}, '<urlset><url><loc>https://acme.example/a</loc></url></urlset>')
        return FetchResponse(url, 200, {'server':'cloudflare','cf-ray':'abc'}, '''<html><head><title>Acme</title><meta name="generator" content="WordPress"><meta property="og:url" content="https://acme.example/"></head><body><a href="/about">About</a><a href="https://instagram.com/acme">IG</a><script src="/wp-content/x.js"></script></body></html>''')


class ScannerTests(unittest.TestCase):
    def test_scan_extracts_dated_public_signals_read_only(self):
        f = FakeFetcher()
        scanner = DigitalFootprintScanner(f)
        out = scanner.scan(company_id='acme', domain='acme.example', evidence_at='2026-09-08T12:00:00Z')
        self.assertEqual(out['company_id'], 'acme')
        self.assertEqual(out['root']['status'], 200)
        self.assertEqual(out['root']['title'], 'Acme')
        self.assertIn('wordpress', out['technologies'])
        self.assertIn('cloudflare', out['technologies'])
        self.assertEqual(out['social_profiles']['instagram'], ['https://instagram.com/acme'])
        self.assertTrue(out['indexation']['robots']['available'])
        self.assertTrue(out['indexation']['sitemap']['available'])
        self.assertTrue(out['read_only'])
        self.assertEqual(out['external_cost_eur'], 0)
        self.assertEqual(len(out['evidence_sha256']), 64)
        self.assertEqual(len(f.calls), 3)

    def test_optional_assets_fail_closed_without_breaking_root_scan(self):
        def fetch(url):
            if url.endswith('robots.txt') or url.endswith('sitemap.xml'):
                raise TimeoutError('offline')
            return FetchResponse(url, 200, {}, '<title>X</title>')
        out = DigitalFootprintScanner(fetch).scan(company_id='acme', domain='acme.example', evidence_at='now')
        self.assertFalse(out['indexation']['robots']['available'])
        self.assertFalse(out['indexation']['sitemap']['available'])

    def test_prod_is_denied(self):
        with self.assertRaises(ScannerPolicyError):
            DigitalFootprintScanner(FakeFetcher(), environment='PROD')

    def test_requires_domain_company_and_timestamp(self):
        scanner = DigitalFootprintScanner(FakeFetcher())
        for kwargs in [
            {'company_id':'','domain':'acme.example','evidence_at':'x'},
            {'company_id':'acme','domain':'bad domain','evidence_at':'x'},
            {'company_id':'acme','domain':'acme.example','evidence_at':''},
        ]:
            with self.assertRaises(ScannerValidationError):
                scanner.scan(**kwargs)


if __name__ == '__main__':
    unittest.main()
