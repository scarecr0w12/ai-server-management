from langchain.agents import AgentExecutor
from langchain.tools import BaseTool
from typing import Optional, List
import json

# Define base agent class
class ServerManagementAgent:
    def __init__(self, agent: AgentExecutor, tools: List[BaseTool]):
        self.agent = agent
        self.tools = tools
        self.context = {}
        
    def process_request(self, request: str) -> str:
        """
        Process a user request using the agent
        """
        try:
            # Parse request if it's JSON
            try:
                parsed_request = json.loads(request)
                action = parsed_request.get('action')
                data = parsed_request.get('data', {})
                
                # Update context with new data
                self.context.update(data)
                
                # Handle specific actions
                if action == 'get_server_status':
                    return self.get_server_status()
                elif action == 'execute_command':
                    return self.execute_command(data.get('command'))
                
            except json.JSONDecodeError:
                # Handle plain text requests
                return self.agent.run(request)
                
        except Exception as e:
            return f"Error processing request: {str(e)}"
            
    def get_server_status(self) -> str:
        """
        Get status of managed servers
        """
        # This will be implemented with MCP connections
        return json.dumps({
            'status': 'ok',
            'servers': []
        })
        
    def execute_command(self, command: Optional[str]) -> str:
        """
        Execute a command on managed servers
        """
        if not command:
            return "No command provided"
            
        # This will be implemented with MCP connections
        return json.dumps({
            'status': 'ok',
            'output': f"Command '{command}' executed successfully"
        })
        
# Define custom tools for server management
class ServerStatusTool(BaseTool):
    name = "server_status"
    description = "Get status of managed servers"
    
    def _run(self, query: str):
        # This will be implemented with MCP connections
        return "Server status functionality will be implemented via MCP connections"
    
    async def _arun(self, query: str):
        return self._run(query)

# Initialize the agent service
def initialize_agent_service():
    """
    Initialize the agent service with all available tools
    """
    tools = [
        ServerStatusTool(),
        # Add more tools as needed
    ]
    
    return ServerManagementAgent(agent, tools)
