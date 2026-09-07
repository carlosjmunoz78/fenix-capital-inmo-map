import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SQL = ROOT / "preprod" / "rls-001-enable-only.sql"

EXPECTED = {
    "alter table fenix_prod.special_cases enable row level security;",
    "alter table fenix_prod.special_case_people enable row level security;",
    "alter table fenix_prod.expediente_stage_history enable row level security;",
}


class RlsCandidateTests(unittest.TestCase):
    def test_candidate_is_enable_only_and_scoped(self):
        raw = SQL.read_text(encoding="utf-8")
        statements = {
            line.strip().lower()
            for line in raw.splitlines()
            if line.strip() and not line.strip().startswith("--")
        }
        self.assertEqual(statements, EXPECTED)

    def test_candidate_does_not_modify_grants_policies_or_force_rls(self):
        raw = SQL.read_text(encoding="utf-8").lower()
        forbidden = [
            "grant ", "revoke ", "create policy", "drop policy",
            "force row level security", "disable row level security",
            "drop table", "delete from", "truncate ", "update ", "insert into"
        ]
        for token in forbidden:
            self.assertNotIn(token, raw)


if __name__ == "__main__":
    unittest.main()
