from typing import Optional, List
import json
from typing import Sequence

from prompt_engineering import build_prompt
from mcp_client import MCPClient
from memory_client import store as mem_store

# Attempt to import LangChain. If unavailable, fall back to lightweight stubs so the
# rest of the application and test-suite can operate without the heavy dependency.
try:
    from langchain.agents import AgentExecutor  # type: ignore
    from langchain.tools import BaseTool  # type: ignore
except ModuleNotFoundError:  # pragma: no cover – optional dependency
    class AgentExecutor:  # minimal stub
        def run(self, prompt: str) -> str:  # noqa: D401
            """Return a canned response when LangChain is not installed."""
            return "LangChain not installed – dummy response"

    class BaseTool:  # pylint: disable=too-few-public-methods
        """Stub of LangChain BaseTool to avoid optional dependency."""
        name: str = "stub_tool"
        description: str = "Stub tool – LangChain missing"

        def _run(self, query: str):  # type: ignore
            return self.description

        async def _arun(self, query: str):  # type: ignore
            return self._run(query)


# Global MCP client singleton
_MCP_CLIENT = MCPClient()
_MCP_CLIENT.connect()

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
                prompt = build_prompt(request, history=None)  # TODO: pass real history
                return self.agent.run(prompt)
                
        except Exception as e:
            return f"Error processing request: {str(e)}"
            
    def get_server_status(self) -> str:
        """Return status fetched via MCP connection."""
        if not _MCP_CLIENT.connected:
            _MCP_CLIENT.connect()
        resp = _MCP_CLIENT.get_server_status("all")
        if resp:
            mem_store(json.dumps(resp), server_id="all", tags=["status"])
        return json.dumps(resp or {"status": "error", "message": "MCP unavailable"})
        
    def execute_command(self, command: Optional[str]) -> str:
        """
        Execute a command on managed servers
        """
        if not command:
            return "No command provided"
            
        if not _MCP_CLIENT.connected:
            _MCP_CLIENT.connect()
        resp = _MCP_CLIENT.execute_command("all", command)
        if resp:
            mem_store(json.dumps(resp), server_id="all", tags=["command"])
        return json.dumps(resp or {"status": "error", "message": "MCP unavailable"})
        
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
def initialize_agent_service(agent: Optional[AgentExecutor] = None):
    """
    Initialize the agent service with all available tools
    """
    tools: List[BaseTool] = [ServerStatusTool()]
    
    # If an external AgentExecutor is not supplied, create a minimal stub so that
    # tests depending on `initialize_agent_service()` do not fail.
    if agent is None:
        agent = AgentExecutor()  # type: ignore[arg-type]

    return ServerManagementAgent(agent, tools)
