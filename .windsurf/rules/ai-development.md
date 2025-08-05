---
description: AI/LLM integration best practices for server management system
---

# AI Development Rules

## LLM Integration Standards

- **Model Selection**: Use appropriate models for different tasks (GPT-4 for complex reasoning, smaller models for simple tasks)
- **Context Management**: Implement efficient context window management and token counting
- **Prompt Engineering**: Use clear, structured prompts with examples and constraints
- **Response Validation**: Always validate and sanitize AI-generated responses

## Tool Calling Patterns

- **MCP Protocol**: Follow Model Context Protocol standards for tool integrations
- **Error Handling**: Implement robust error handling for tool call failures
- **Timeout Management**: Set appropriate timeouts for AI service calls
- **Retry Logic**: Implement exponential backoff for transient failures

## Conversation Management

- **State Persistence**: Maintain conversation state across sessions
- **Context Pruning**: Implement intelligent context pruning to stay within limits
- **Memory Integration**: Use MCP memory server for persistent knowledge
- **User Intent**: Clearly identify and validate user intentions before actions

## Security Considerations

- **Input Sanitization**: Sanitize all user inputs before processing
- **Command Validation**: Validate AI-generated commands before execution
- **Privilege Escalation**: Prevent AI from executing privileged operations without confirmation
- **Data Privacy**: Ensure sensitive data is not sent to external AI services

## Performance Optimization

- **Streaming Responses**: Use streaming for real-time AI interactions
- **Caching**: Cache frequent AI responses and tool call results
- **Parallel Processing**: Use async patterns for multiple AI service calls
- **Resource Monitoring**: Monitor AI service usage and costs

## Server Management Integration

- **System Commands**: Use AI to generate but validate system commands
- **Monitoring Interpretation**: Let AI interpret monitoring data and suggest actions
- **Automated Diagnostics**: Implement AI-powered diagnostic workflows
- **Learning from Actions**: Store successful resolutions for future reference
