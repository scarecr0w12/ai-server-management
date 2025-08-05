---
description: Python backend development rules for AI-powered server management system
---

# Python Development Rules

## Code Quality Standards

- **Type Hints**: Always use type hints for function parameters and return values
- **Docstrings**: Use Google-style docstrings for all functions and classes
- **PEP 8**: Follow PEP 8 style guidelines strictly
- **Error Handling**: Implement proper exception handling with specific exception types

## FastAPI/Backend Best Practices

- **API Design**: Use RESTful principles and proper HTTP status codes
- **Pydantic Models**: Define clear Pydantic models for request/response validation
- **Dependency Injection**: Use FastAPI's dependency injection for shared resources
- **Async/Await**: Use async patterns for I/O operations and database calls

## Server Management Specific Rules

- **System Commands**: Use secure subprocess execution with proper sanitization
- **Resource Monitoring**: Implement proper resource monitoring and cleanup
- **Connection Management**: Handle database and external service connections properly
- **Security**: Validate all inputs, use proper authentication and authorization

## AI Service Integration

- **LLM Client**: Use proper async clients for OpenAI and other AI services
- **Context Management**: Implement efficient context window management
- **Tool Calling**: Structure tool calls with proper error handling and retries
- **Response Processing**: Parse and validate AI responses before using them

## Testing Requirements

- **Unit Tests**: Write comprehensive unit tests using pytest
- **Integration Tests**: Test API endpoints and database operations
- **Mock Services**: Mock external AI services for testing
- **Coverage**: Maintain high test coverage for critical paths

## Performance Guidelines

- **Database**: Use connection pooling and efficient queries
- **Caching**: Implement proper caching strategies for frequently accessed data
- **Background Tasks**: Use Celery or similar for long-running operations
- **Resource Limits**: Set appropriate limits for AI service calls and system resources
