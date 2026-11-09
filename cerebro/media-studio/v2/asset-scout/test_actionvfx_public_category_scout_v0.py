#!/usr/bin/env python3
"""Offline stdlib tests; mock fixture never contains private API keys."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location(
    "actionvfx_scout", HERE / "actionvfx_public_category_scout_v0.py")
scout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scout)

FIXTURE = {
    "page": 1, "total_pages": 1, "total_count": 3, "data": [
        {"name": "Free VFX", "slug": "free-vfx",
         "description": "Zero cost source", "keywords": ["free"],
         "subcategories": [{"name": "Dust & Dirt", "slug": "dust-and-dirt",
                            "description": "dust explosions",
                            "keywords": ["dirt"]}]},
        {"name": "Explosions", "slug": "explosions",
         "description": "Pyrotechnic blast", "keywords": ["fire", "dust"]},
        {"name": "Invalid", "slug": "malicious/path", "keywords": ["fire"]}
    ]
}

class PublicScoutTests(unittest.TestCase):
    def test_only_valid_entries(self):
        x = scout.collect([FIXTURE])
        self.assertEqual(len(x), 3)
        self.assertTrue(all("/" not in c["slug"] for c in x))
    def test_rights_fail_closed(self):
        for item in scout.collect([FIXTURE]):
            self.assertEqual(item["rights_status"], "NOT_REVIEWED")
            self.assertFalse(item["commercial_use_approved"])
            self.assertFalse(item["media_downloaded"])
    def test_useful_sorting(self):
        x = scout.collect([FIXTURE])
        self.assertGreaterEqual(x[0]["relevance_score"], x[-1]["relevance_score"])
    def test_bad_api_response_rejected(self):
        with self.assertRaises(ValueError):
            scout.collect([{"data": "malformed"}])
    def test_no_credentials_needed(self):
        self.assertNotIn("key", scout.BASE.lower())
        self.assertIn("/api/v1/categories", scout.BASE)
    def test_cli_fixture(self):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "in.json"; out = Path(d) / "out.json"
            f.write_text(json.dumps(FIXTURE))
            with patch("sys.argv", ["scout", "--fixture", str(f), "--output", str(out)]):
                self.assertEqual(scout.main(), 0)
            manifest = json.loads(out.read_text())
            self.assertEqual(manifest["environment"], "LAB")
            self.assertEqual(manifest["downloads_count"], 0)
            self.assertEqual(manifest["billable_calls"], 0)
            self.assertFalse(manifest["private_api_called"])
            self.assertEqual(len(manifest["categories"]), 3)

if __name__ == "__main__":
    unittest.main()
