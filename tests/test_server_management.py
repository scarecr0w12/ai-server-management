import unittest
import requests
import json
from mcp_client import MCPClient
from agent_service import initialize_agent_service
from llm_service import process_chat_message

class TestServerManagement(unittest.TestCase):
    def setUp(self):
        self.mcp_client = MCPClient()
        self.agent_service = initialize_agent_service()
        self.base_url = 'http://localhost:5000'

    def test_health_check(self):
        """Test health check endpoint"""
        response = requests.get(f'{self.base_url}/api/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'healthy')

    def test_mcp_connection(self):
        """Test MCP client connection"""
        self.assertTrue(self.mcp_client.connect())
        self.assertTrue(self.mcp_client.connected)
        
        # Test getting server status
        status = self.mcp_client.get_server_status('test-server')
        self.assertIsNotNone(status)
        
        # Test executing command
        result = self.mcp_client.execute_command('test-server', 'echo hello')
        self.assertIsNotNone(result)

    def test_llm_integration(self):
        """Test LLM chat integration"""
        response = process_chat_message("What is the status of my servers?")
        self.assertIsNotNone(response)
        self.assertIn("Server management functionality", response)

    def test_agent_service(self):
        """Test agent service functionality"""
        # Test server status request
        response = self.agent_service.process_request(json.dumps({
            'action': 'get_server_status',
            'data': {}
        }))
        self.assertIsNotNone(response)
        
        # Test command execution
        response = self.agent_service.process_request(json.dumps({
            'action': 'execute_command',
            'data': {
                'command': 'echo hello'
            }
        }))
        self.assertIsNotNone(response)

if __name__ == '__main__':
    unittest.main()
