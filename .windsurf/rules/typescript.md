---
description: TypeScript and React development rules for AI-powered server management system
---

# TypeScript Development Rules

## Code Quality Standards

- **Strict TypeScript**: Use strict mode and enable all strict type-checking options
- **Type Safety**: Always define explicit types, avoid `any` type unless absolutely necessary
- **Interface Usage**: Prefer interfaces over types for object shapes
- **Component Types**: Use proper React component typing with React.FC or explicit return types

## React Best Practices

- **Functional Components**: Use functional components with hooks over class components
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Props Interface**: Define clear interfaces for all component props
- **State Management**: Use appropriate state management (useState, useReducer, context)

## Server Management Specific Rules

- **API Integration**: Use proper TypeScript types for API responses and requests
- **Error Handling**: Implement comprehensive error boundaries and error types
- **Real-time Data**: Type WebSocket connections and real-time data streams properly
- **Monitoring Types**: Define strict types for server metrics and monitoring data

## Code Organization

- **File Naming**: Use PascalCase for components, camelCase for utilities
- **Directory Structure**: Group related components and maintain clean architecture
- **Import Organization**: Sort imports (React, third-party, local)
- **Export Patterns**: Use named exports, default exports only for main components

## AI Integration Guidelines

- **LLM Response Types**: Define interfaces for AI service responses
- **Chat Interface**: Implement proper typing for conversation state
- **Context Management**: Type AI context and conversation history properly
- **Tool Integration**: Ensure proper typing for MCP tool responses
