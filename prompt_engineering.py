"""Dynamic prompt template utilities for the server-management assistant.

This module centralises all logic related to building prompts for the
underlying language-model agent. Having a single place for templates makes it
simple to iterate on prompt-engineering techniques (system instructions,
co-t reasoning, memory insertion, etc.) without touching the
higher-level service wrappers.

The public API purposefully remains minimal so that *only* `build_prompt` needs
importing elsewhere.
"""
from __future__ import annotations

import textwrap
from datetime import datetime, timezone

# Lazy import to avoid circular deps if memory service missing
try:
    from memory_client import search as memory_search  # type: ignore
except ModuleNotFoundError:
    def memory_search(_query: str, *, limit: int = 3):  # type: ignore
        return []
from typing import List, Sequence

# System-level template – we prepend this to **every** generated prompt so that
# the LLM maintains the correct persona and behavioural constraints.
SYSTEM_TEMPLATE = textwrap.dedent(
    """
    You are **Cascade-Assistant**, an AI agent that helps users manage and
    diagnose servers via an MCP-powered backend.  Always be concise and
    technical, and when relevant, think step-by-step before producing the final
    answer.

    Current UTC time: {time}
    """
).strip()

# Instruction reminding the model to do chain-of-thought *internally* but only
# output the *concise* final answer (to keep user responses short).
CHAIN_OF_THOUGHT_SUFFIX = (
    "Please reason internally step-by-step and then provide the **final** concise "
    "answer or action recommendation."
)


def build_prompt(user_message: str, *, history: Sequence[str] | None = None, memory: Sequence[str] | None = None, auto_mem: bool = True, server_id: str | None = None) -> str:  # noqa: D401
    """Return a full prompt for the LLM agent.

    Args:
        user_message: The latest user utterance.
        history: Optional sequence of previous user/assistant messages already
            exchanged *prior* to this user_message. They are concatenated and
            inserted into the prompt so the model preserves conversational
            context without relying solely on the agent memory.

    Returns:
        A string ready to be passed to the `agent.run()` call.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    system_block = SYSTEM_TEMPLATE.format(time=now_iso)

    history_block = ""  # default blank if no history
    memory_block = ""
    if history:
        # We join history messages separated by a blank line for clarity.
        history_block = "\n\n".join(history)

    if memory is None and auto_mem:
        # Auto-fetch relevant memories via vector search
        memory = memory_search(user_message, limit=3, server_id=server_id)

    if memory:
        memory_block = "\n\n".join(memory)

    # Compose final prompt
    prompt_parts: List[str] = [system_block]
    if history_block:
        prompt_parts.append("Conversation history:\n" + history_block)

    if memory_block:
        prompt_parts.append("Relevant memory:\n" + memory_block)

    prompt_parts.append("User message:\n" + user_message)

    # Multi-step reasoning scaffold
    prompt_parts.append("## Plan:\n-")
    prompt_parts.append("## Think:")
    prompt_parts.append("## Answer:")

    prompt_parts.append(CHAIN_OF_THOUGHT_SUFFIX)

    return "\n\n".join(prompt_parts)
