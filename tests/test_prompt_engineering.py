"""Unit tests for prompt_engineering.build_prompt utilities."""
from __future__ import annotations

import re
import unittest
import pathlib
import sys

# Ensure project root is in the Python path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from prompt_engineering import build_prompt


class TestPromptEngineering(unittest.TestCase):
    """Validate dynamic prompt template behaviour."""

    def test_basic_prompt_structure(self):
        """Basic prompt should include system, user message and reasoning sections."""
        user_msg = "Hello"
        prompt = build_prompt(user_msg)

        # System persona
        self.assertIn("Cascade-Assistant", prompt)

        # User message block
        self.assertIn(f"User message:\n{user_msg}", prompt)

        # Multi-step reasoning scaffold
        for marker in ("## Plan:", "## Think:", "## Answer:"):
            self.assertIn(marker, prompt)

        # Chain-of-thought suffix line exists (should appear only once)
        suffix_count = len(re.findall(r"Please reason internally step-by-step", prompt))
        self.assertEqual(suffix_count, 1)

    def test_history_and_memory_injection(self):
        """History and memory lists should be inserted when provided."""
        history = ["Assistant: Hi", "User: Hello again"]
        memory = ["Preferred region: us-east-1"]

        prompt = build_prompt("Check status", history=history, memory=memory)

        # History section present
        self.assertIn("Conversation history:", prompt)
        for h in history:
            self.assertIn(h, prompt)

        # Memory section present
        self.assertIn("Relevant memory:", prompt)
        for m in memory:
            self.assertIn(m, prompt)


if __name__ == "__main__":
    unittest.main()
