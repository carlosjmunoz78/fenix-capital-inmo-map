import pathlib
import tempfile
import unittest

from cerebro.runtime.action_gateway import ActionExecutionGateway, HumanRequired
from cerebro.runtime.chat_gateway import ConversationalGateway
from cerebro.runtime.command_router import CommandRouter
from cerebro.runtime.company_registry import CompanyRegistry
from cerebro.runtime.context_loader import ContextLoader
from cerebro.runtime.tenant_isolation import TenantIsolationGuard


class ActionGatewayTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.registry = CompanyRegistry(pathlib.Path(self.tempdir.name) / "companies.json", environment="PREPROD")
        for cid, name in (("fenix-capital", "Fénix Capital"), ("acme-holdings", "Acme Holdings")):
            self.registry.register({
                "company_id": cid, "legal_name": name, "display_name": name,
                "owner": "CEREBRO Platform", "brands": [name], "domains": [f"{cid}.example"],
                "geographies": ["ES"], "access_refs": ["runtime:shared"],
                "lifecycle_state": "REGISTERED", "metadata": {"source": "test"},
            })
        self.guard = TenantIsolationGuard(self.registry, environment="PREPROD")
        self.loader = ContextLoader(self.registry, self.guard)
        self.chat = ConversationalGateway(environment="PREPROD")
        self.router = CommandRouter()
        self.gateway = ActionExecutionGateway(environment="PREPROD")

    def tearDown(self):
        self.tempdir.cleanup()

    def context(self, cid="fenix-capital"):
        return self.loader.load(authenticated_company_id=cid, target_company_id=cid)

    def plan(self, text, cid="fenix-capital"):
        envelope = self.chat.prepare(company_id=cid, text=text)
        return self.router.route(envelope, self.context(cid))

    def test_registered_read_only_handler_executes(self):
        self.gateway.register_handler(engine_id="SEO-001", operation="status", effect="READ_ONLY", handler=lambda ctx, args: {"company_id": ctx.tenant.company_id, "state": "ok", "args": args})
        result = self.gateway.execute(self.plan("/run SEO-001 status now"), self.context())
        self.assertEqual(result.status, "SUCCESS")
        self.assertEqual(result.output["company_id"], "fenix-capital")
        self.assertEqual(result.audit["decision"], "ALLOW_READ_ONLY")

    def test_unknown_handler_is_policy_conflict(self):
        with self.assertRaises(HumanRequired) as caught:
            self.gateway.execute(self.plan("/run SEO-001 status"), self.context())
        self.assertEqual(caught.exception.human_required_code, "POLICY_CONFLICT")

    def test_mutation_requires_idempotency_then_remains_high_risk(self):
        self.gateway.register_handler(engine_id="CRM-001", operation="update", effect="MUTATION", handler=lambda ctx, args: {"unexpected": True})
        plan = self.plan("/run CRM-001 update record-1")
        with self.assertRaises(HumanRequired) as missing:
            self.gateway.execute(plan, self.context())
        self.assertEqual(missing.exception.human_required_code, "POLICY_CONFLICT")
        with self.assertRaises(HumanRequired) as high_risk:
            self.gateway.execute(plan, self.context(), idempotency_key="req-1")
        self.assertEqual(high_risk.exception.human_required_code, "HIGH_RISK")

    def test_query_plan_cannot_execute(self):
        with self.assertRaises(HumanRequired) as caught:
            self.gateway.execute(self.plan("estado"), self.context())
        self.assertEqual(caught.exception.human_required_code, "POLICY_CONFLICT")

    def test_cross_company_context_is_denied(self):
        self.gateway.register_handler(engine_id="SEO-001", operation="status", effect="READ_ONLY", handler=lambda ctx, args: "ok")
        plan = self.plan("/run SEO-001 status", "fenix-capital")
        with self.assertRaises(HumanRequired) as caught:
            self.gateway.execute(plan, self.context("acme-holdings"))
        self.assertEqual(caught.exception.human_required_code, "POLICY_CONFLICT")

    def test_health_is_zero_cost_credentialless_and_prod_off(self):
        health = self.gateway.health()
        self.assertEqual(health["mutation_execution"], "DENY_HIGH_RISK")
        self.assertEqual(health["model_binding"], "NONE")
        self.assertEqual(health["credential_storage"], "NONE")
        self.assertEqual(health["external_cost_eur"], 0)
        self.assertFalse(health["prod_enabled"])


if __name__ == "__main__":
    unittest.main()
