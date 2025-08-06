"""Integration tests for MCP stub, client, agent service, and Flask API."""
from __future__ import annotations

import json
import pathlib
import sys
import unittest
import os
from contextlib import suppress

# Ensure project root on path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from mcp_stub_server import MCPStubServer
from mcp_client import MCPClient
from agent_service import initialize_agent_service
flask_available = True
try:
    from app import app as flask_app  # noqa: E402
except ModuleNotFoundError:
    flask_available = False


@unittest.skipUnless(os.getenv("RUN_INTEGRATION_TESTS") == "1" and flask_available,
                     "Integration tests require Flask and RUN_INTEGRATION_TESTS=1")
class TestMCPIntegration(unittest.TestCase):
    """Full round-trip checks against the stub server running locally."""

    @classmethod
    def setUpClass(cls):  # noqa: D401
        # Start stub server once for all tests in this class
        cls._stub_server = MCPStubServer()
        cls._stub_server.start()

    @classmethod
    def tearDownClass(cls):  # noqa: D401
        cls._stub_server.stop()

    def setUp(self):  # noqa: D401
        # Fresh client and agent for each test for isolation
        self.client = MCPClient()
        self.client.connect()
        self.agent = initialize_agent_service()
        self.flask_client = flask_app.test_client()

    def tearDown(self):  # noqa: D401
        with suppress(Exception):
            self.client.disconnect()

    def test_client_roundtrip(self):
        resp = self.client.get_server_status("all")
        self.assertIsNotNone(resp)
        self.assertEqual(resp.get("status"), "ok")

    def test_agent_service_status(self):
        resp_json = json.loads(self.agent.get_server_status())
        self.assertEqual(resp_json.get("status"), "ok")

    def test_flask_api_servers(self):
        response = self.flask_client.get("/api/servers")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("status"), "ok")


if __name__ == "__main__":
    unittest.main()
