---
description: Project-specific development rules for AI-powered server management system
---

# Project-Specific Development Rules

## Architecture Guidelines

- **Microservices**: Maintain clear separation between frontend, backend, and AI services
- **API Gateway**: Use consistent API patterns across all services
- **Database Design**: Follow normalized design with proper indexing for performance
- **Real-time Updates**: Use WebSocket connections for live server monitoring

## Technology Stack Adherence

- **Frontend**: React 18+ with TypeScript, modern hooks patterns
- **Backend**: FastAPI with Python 3.11+, async/await patterns
- **Database**: PostgreSQL with proper migrations and connection pooling
- **AI Integration**: OpenAI GPT-4, MCP protocol for tool calling

## Development Workflow

- **Git Strategy**: Use feature branches with descriptive commit messages
- **Code Reviews**: All changes require review and passing CI/CD
- **Testing**: Minimum 80% test coverage for critical paths
- **Documentation**: Update docs with every feature change

## Deployment Standards

- **Docker**: All services must be containerized
- **Environment Config**: Use environment variables for all configuration
- **Health Checks**: Implement proper health check endpoints
- **Monitoring**: Include logging, metrics, and alerting for all services

## Server Management Features

- **Dashboard Components**: Modular, reusable components for server metrics
- **Real-time Monitoring**: Live updates for CPU, memory, disk, network stats
- **AI Chat Interface**: Context-aware conversation with server management capabilities
- **Autonomous Workflows**: Self-healing and diagnostic automation

## Security Requirements

- **Authentication**: Secure user authentication and session management
- **Authorization**: Role-based access control for server operations
- **Input Validation**: Strict validation for all user inputs and AI responses
- **Audit Logging**: Log all system operations and user actions

## Performance Targets

- **Response Time**: API responses under 200ms for standard operations
- **UI Responsiveness**: Frontend interactions under 100ms
- **Real-time Updates**: WebSocket latency under 50ms
- **Scalability**: Support for 100+ concurrent users and 1000+ servers
