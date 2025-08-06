"""LLM service wrapper.

Depending on the runtime environment (CI, development container), optional
libraries like `openai` and `langchain` may not be installed.  To ensure the
rest of the codebase and unit-tests import without crashing, we provide
lightweight fallbacks when those imports fail.
"""
from __future__ import annotations

import os
import json
from typing import Any, Sequence

try:
    from openai import OpenAI  # type: ignore
    from langchain.agents import initialize_agent, Tool  # type: ignore
    from langchain.agents import AgentType  # type: ignore
    from langchain.chat_models import ChatOpenAI  # type: ignore
    from langchain.tools import BaseTool  # type: ignore
    from dotenv import load_dotenv  # type: ignore
    from prompt_engineering import build_prompt
    from multi_model_service import get_multi_model_service
    IMPORTS_AVAILABLE = True
except ModuleNotFoundError:
    # Provide minimal stubs so `process_chat_message` still works.
    OpenAI = Any  # type: ignore
    BaseTool = object  # type: ignore

    class _StubAgent:  # pylint: disable=too-few-public-methods
        def run(self, _msg: str) -> str:  # noqa: D401
            return "[StubLLM] OpenAI/LangChain not installed – response unavailable."

    def initialize_agent(*_args, **_kwargs):  # type: ignore
        return _StubAgent()

    class AgentType:  # type: ignore
        CHAT_CONVERSATIONAL_REACT_DESCRIPTION = "stub"

    def load_dotenv():  # type: ignore
        pass

    class Tool:  # type: ignore
        pass

    def ChatOpenAI(*_a, **_kw):  # type: ignore
        return None  # pragma: no cover

# Regular flow when dependencies are available
try:
    load_dotenv()  # type: ignore
except Exception:  # pragma: no cover
    # `load_dotenv` may be stubbed – ignore.
    pass

load_dotenv()

try:
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))  # type: ignore
except Exception:  # pragma: no cover
    client = None

# Define tools for the agent
# These will be expanded as we add more functionality
from mcp_client import MCPClient

_MCP_CLIENT_TOOL = MCPClient()
# Do not connect immediately; defer until first use to avoid errors during import.

class ServerManagementTool(BaseTool):  # type: ignore
    name = "server_management"
    description = "Tool for managing servers and services via MCP"

    def _run(self, query: str):
        """Very naive implementation: if query contains 'status' -> GET_SERVER_STATUS."""
        if not _MCP_CLIENT_TOOL.connected:
            _MCP_CLIENT_TOOL.connect()
        if "status" in query.lower():
            resp = _MCP_CLIENT_TOOL.get_server_status("all")
        else:
            resp = _MCP_CLIENT_TOOL.execute_command("all", query)
        return json.dumps(resp or {"status": "error", "message": "MCP unavailable"})

    async def _arun(self, query: str):
        return self._run(query)

# Initialize the language model
try:
    llm = ChatOpenAI(temperature=0.7)  # type: ignore
except Exception:
    llm = None  # type: ignore

tools = [
    ServerManagementTool(),
    # More tools will be added as we implement more functionality
]

# Initialize the agent
agent = initialize_agent(
    tools,
    llm,
    agent=AgentType.CHAT_CONVERSATIONAL_REACT_DESCRIPTION,
    verbose=True
)

def process_chat_message(message: str, history: Sequence[str] | None = None, model_id: str | None = None, server_id: str | None = None):
    """Process a chat message using the LLM agent"""
    try:
        # Try multi-model service first, fallback to LangChain agent
        multi_model = get_multi_model_service()
        if multi_model and multi_model.default_model:
            prompt = build_prompt(message, history=history, server_id=server_id)
            response = multi_model.generate_response(prompt, model_id=model_id)
            return response
        else:
            # Fallback to original LangChain agent
            prompt = build_prompt(message, history=history, server_id=server_id)
            response = agent.run(prompt)
            return response
    except Exception as e:
        return f"Error processing message: {str(e)}"
