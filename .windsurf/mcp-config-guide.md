# MCP Configuration Guide

This guide explains how to configure Model Context Protocol (MCP) servers for your AI-powered server management system.

## Recommended MCP Servers for This Project

### 1. Essential Development MCPs
- **GitHub MCP**: Repository management, PR reviews, issue tracking
- **PostgreSQL MCP**: Database operations and schema management
- **Memory MCP**: Persistent AI context and learning
- **Sequential Thinking MCP**: Complex problem-solving workflows

### 2. Server Management MCPs
- **Time MCP**: Time zone management for global deployments
- **Browser MCP**: Web UI testing and automation
- **Puppeteer MCP**: Advanced browser automation
- **Vibe Check MCP**: Code quality and pattern recognition

### 3. Advanced Integration MCPs
- **AWS MCP**: Cloud infrastructure management
- **Docker MCP**: Container management
- **Monitoring MCP**: System metrics and alerting

## Installation Instructions

### Method 1: Through Windsurf IDE
1. Go to `Settings` > `Tools` > `Windsurf Settings` > `Add Server`
2. Browse available MCP servers
3. Click `+ Add Server` for desired servers
4. Press the refresh button after adding

### Method 2: Manual Configuration
Create or edit `~/.codeium/mcp_config.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://user:password@localhost:5432/dbname"
      }
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "time": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-time"]
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

## Environment Variables Setup

Create a `.env` file in your project root with:

```bash
# GitHub Integration
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token

# Database Connection
POSTGRES_CONNECTION_STRING=postgresql://user:password@localhost:5432/server_management

# OpenAI API (for AI features)
OPENAI_API_KEY=your_openai_key

# Additional MCP Configuration
MCP_LOG_LEVEL=info
```

## Usage Examples

### GitHub MCP Commands
- "Create a pull request for the current branch"
- "List open issues in the repository"
- "Review the latest commits"

### PostgreSQL MCP Commands
- "Show database schema"
- "Query server metrics from the database"
- "Check database connection status"

### Memory MCP Commands
- "Remember that server A had issues with high CPU usage"
- "What did we learn about the deployment process?"
- "Store this debugging solution for future reference"

## Troubleshooting

### Common Issues
1. **MCP Server Not Found**: Ensure npm packages are installed globally
2. **Permission Errors**: Check environment variable access
3. **Connection Timeouts**: Verify network connectivity and API keys

### Debug Commands
```bash
# Check MCP server status
npx @modelcontextprotocol/server-github --version

# Test database connection
psql $POSTGRES_CONNECTION_STRING -c "SELECT 1"

# Verify GitHub token
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" https://api.github.com/user
```

## Security Considerations

- Store sensitive tokens in environment variables, not in configuration files
- Use minimal required permissions for API tokens
- Regularly rotate API keys and tokens
- Monitor MCP server access logs

## Additional Resources

- [Official MCP Documentation](https://modelcontextprotocol.io/)
- [Awesome MCP Servers](https://github.com/wong2/awesome-mcp-servers)
- [Windsurf MCP Integration](https://docs.windsurf.com/windsurf/cascade/mcp)
