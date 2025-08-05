"""LLM service wrapper.

Depending on the runtime environment (CI, development container), optional
libraries like `openai` and `langchain` may not be installed.  To ensure the
rest of the codebase and unit-tests import without crashing, we provide
lightweight fallbacks when those imports fail.
"""
from __future__ import annotations

import os
from typing import Any

try:
    from openai import OpenAI  # type: ignore
    from langchain.agents import initialize_agent, Tool  # type: ignore
    from langchain.agents import AgentType  # type: ignore
    from langchain.chat_models import ChatOpenAI  # type: ignore
    from langchain.tools import BaseTool  # type: ignore
    from dotenv import load_dotenv  # type: ignore
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
class ServerManagementTool(BaseTool):  # type: ignore
    name = "server_management"
    description = "Tool for managing servers and services"
    
    def _run(self, query: str):
        # This will be implemented with MCP connections
        return "Server management functionality will be implemented via MCP connections"
    
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

def process_chat_message(message: str):
    """Process a chat message using the LLM agent"""
    try:
        response = agent.run(message)
        return response
    except Exception as e:
        return f"Error processing message: {str(e)}"
