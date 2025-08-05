---
description: Systematic debugging workflow for AI-powered server management system
---

# Debugging Workflow

Follow this workflow for efficient debugging of the AI-powered server management system.

## Initial Problem Assessment

1. **Identify the Issue**
   - Gather error messages and stack traces
   - Note reproduction steps
   - Identify affected components (frontend, backend, AI services)
   - Check system logs and monitoring data

2. **Environment Check**
   - Verify environment variables
   - Check service health status
   - Confirm database connectivity
   - Validate MCP server connections

## Frontend Debugging

3. **Browser Developer Tools**
   - Check console for JavaScript errors
   - Inspect network requests and responses
   - Verify WebSocket connections
   - Debug React component state and props

4. **Component-Level Debugging**
   - Add debug logging to components
   - Verify prop drilling and state management
   - Check for memory leaks in useEffect hooks
   - Test component isolation

## Backend Debugging

5. **API Debugging**
   - Check FastAPI automatic documentation
   - Verify request/response formats
   - Test endpoints with curl or Postman
   - Review database query performance

6. **AI Service Debugging**
   - Check LLM API response times
   - Verify prompt engineering effectiveness
   - Debug MCP tool calling issues
   - Review conversation context management

## System-Level Debugging

7. **Infrastructure Issues**
   - Check Docker container health
   - Review resource usage (CPU, memory)
   - Verify network connectivity
   - Check file system permissions

8. **Database Debugging**
   - Review slow query logs
   - Check connection pool status
   - Verify migration status
   - Test data integrity

## AI-Specific Debugging

9. **LLM Integration Issues**
   - Test with simplified prompts
   - Check token usage and limits
   - Verify API key configuration
   - Debug streaming response handling

10. **MCP Server Issues**
    - Check server registration
    - Verify tool availability
    - Test individual tool calls
    - Review server logs

## Automated Debugging Tools

// turbo
11. **Collect System Logs**
    ```bash
    docker-compose logs --tail=100 > debug_logs.txt
    ```

// turbo
12. **Check Service Health**
    ```bash
    curl -f http://localhost:8000/health
    ```

## Resolution and Documentation

13. **Fix Implementation**
    - Apply targeted fixes
    - Test the solution thoroughly
    - Update relevant documentation
    - Add regression tests

14. **Post-Resolution**
    - Document the issue and solution
    - Update monitoring to catch similar issues
    - Share knowledge with the team
    - Update debugging procedures if needed
