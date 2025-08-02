import os
from openai import OpenAI
from langchain.agents import initialize_agent, Tool
from langchain.agents import AgentType
from langchain.chat_models import ChatOpenAI
from langchain.tools import BaseTool
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Define tools for the agent
# These will be expanded as we add more functionality
class ServerManagementTool(BaseTool):
    name = "server_management"
    description = "Tool for managing servers and services"
    
    def _run(self, query: str):
        # This will be implemented with MCP connections
        return "Server management functionality will be implemented via MCP connections"
    
    async def _arun(self, query: str):
        return self._run(query)

# Initialize the language model
llm = ChatOpenAI(temperature=0.7)

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
