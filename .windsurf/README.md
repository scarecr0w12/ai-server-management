# Windsurf IDE Configuration

This directory contains the Windsurf IDE configuration for the AI-Powered Server Management System project.

## Directory Structure

```
.windsurf/
├── README.md           # This file - overview of Windsurf configuration
├── rules/              # Development rules and guidelines
│   ├── typescript.md   # TypeScript/React development rules
│   ├── python.md       # Python backend development rules
│   ├── ai-development.md # AI/LLM integration best practices
│   └── project-specific.md # Project-specific development rules
└── workflows/          # Automated workflows and processes
    ├── deploy.md       # Deployment workflow
    ├── testing.md      # Testing workflow
    ├── debugging.md    # Debugging workflow
    ├── feature-development.md # Feature development workflow
    └── ai-integration.md # AI service integration workflow
```

## MCP Servers Configuration

The project uses several Model Context Protocol (MCP) servers to enhance AI development capabilities:

- **GitHub**: Repository management and PR workflows
- **PostgreSQL**: Database operations and schema management  
- **Memory**: Persistent context and knowledge management
- **Browser**: Web UI testing and automation
- **Sequential Thinking**: Complex problem-solving workflows
- **Time**: Time zone management for global deployments
- **Vibe Check**: Code quality and pattern recognition

## Getting Started

1. Ensure Windsurf IDE is installed and configured
2. MCP servers are configured in `~/.codeium/mcp_config.json`
3. Rules are automatically discovered from the `rules/` directory
4. Workflows can be invoked using `/[workflow-name]` in Cascade
5. Memories are automatically managed by the memory MCP server

## Best Practices

- Use workflows for complex, multi-step processes
- Leverage rules for consistent development patterns
- Utilize MCP servers for external integrations
- Keep configuration files updated as the project evolves
