import unittest

from cerebro.runtime.wordpress_universal_rest_adapter import (
    READ_ENDPOINTS,
    WRITE_ENDPOINTS_PRESENT_BUT_UNBOUND,
    UniversalRestAdapterError,
    build_read_request,
    execute_read,
    writes_are_bound,
)


class UniversalRestAdapterTests(unittest.TestCase):
    def test_wraps_existing_staging_namespace(self):
        request = build_read_request("capabilities")
        self.assertEqual(request.method, "GET")
        self.assertEqual(
            request.url,
            "https://staging.fenixcapital.es/wp-json/cerebro-universal/v1/capabilities",
        )

    def test_protected_401_becomes_system_permission_blocker(self):
        with self.assertRaisesRegex(UniversalRestAdapterError, "PERMISSION_REQUIRED"):
            execute_read(
                "status",
                transport=lambda _: {"status_code": 401},
            )

    def test_write_routes_exist_but_are_intentionally_unbound(self):
        self.assertIn("operation", WRITE_ENDPOINTS_PRESENT_BUT_UNBOUND)
        self.assertIn("queue_submit", WRITE_ENDPOINTS_PRESENT_BUT_UNBOUND)
        self.assertFalse(writes_are_bound())

    def test_unknown_endpoint_fails_closed(self):
        with self.assertRaises(UniversalRestAdapterError):
            build_read_request("invented")


if __name__ == "__main__":
    unittest.main()
