# 🚀 AI-Powered Server Management System

<div align="center">

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/scarecr0w12/windsurf-project/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/yourusername/windsurf-project/ci.yml?branch=main)](https://github.com/yourusername/windsurf-project/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)

*A comprehensive AI-powered platform for intelligent server management with autonomous diagnostics and real-time monitoring*

[📖 Documentation](#documentation) • [🚀 Quick Start](#quick-start) • [✨ Features](#features) • [🛠️ API](#api-reference)

</div>

---

## 🌟 Overview

This project combines cutting-edge artificial intelligence with robust server management capabilities to create an autonomous, self-healing server infrastructure platform. Built with React, TypeScript, Node.js, and OpenAI's GPT-4, it provides intelligent automation that learns from successful resolutions and continuously improves.

### 🎯 Key Capabilities

- **🤖 Autonomous Diagnostics**: Self-diagnosing workflows that automatically identify and resolve common server issues
- **💬 AI-Powered Management**: Natural language interface for complex server administration tasks
- **📊 Real-Time Monitoring**: Professional dashboard with comprehensive metrics and alerts
- **🔧 Self-Healing**: Automated problem resolution with learning capabilities
- **🔌 MCP Protocol**: Industry-standard Model Context Protocol integration
- **⚡ WebSocket Real-Time**: Live updates and instant notifications

## ✨ Features

### 🎛️ AI-Powered Management

- **Advanced Chat Interface** with multi-turn conversation support
- **Context-Aware Responses** using adaptive prompt engineering
- **Domain-Specific Expertise** for server administration tasks
- **Multi-Step Reasoning** for complex diagnostic scenarios
- **Conversation History** with intelligent context preservation

### 📊 Real-Time Server Dashboard

- **Live Metrics Visualization** (CPU, Memory, Disk, Network)
- **Health Monitoring** with intelligent alert systems
- **Server Management** with professional addition/removal workflows
- **Search & Filter** capabilities for large server fleets
- **Visual Indicators** for quick status assessment

### 🤖 Autonomous Workflows

- **Performance Issues Workflow**: 6-step automated performance diagnosis
- **Service Recovery Workflow**: Automated service failure detection and recovery
- **Security Incident Response**: Comprehensive security event handling
- **Learning System**: Improves resolution accuracy over time
- **Workflow Management**: Pause, resume, and monitor autonomous processes

### 🔌 MCP Protocol Integration

- **Standardized Server Management** via Model Context Protocol
- **Resource Handlers** for server operations and diagnostics
- **Protocol Compliance** for interoperability with other AI systems
- **Real-Time Synchronization** of server resources and status

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- Git

### 1. Clone and Setup

```bash
git clone https://github.com/yourusername/ai-server-management.git
cd ai-server-management
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your OpenAI API key
npm run build
npm start
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
npm start
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **WebSocket**: ws://localhost:5000

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js + Express + TypeScript
- **AI Integration**: OpenAI GPT-4 API
- **Real-time**: Socket.io WebSockets
- **SSH**: node-ssh for secure connections
- **Protocol**: MCP (Model Context Protocol)

### Frontend

- **Framework**: React + TypeScript
- **UI Library**: Material-UI (MUI)
- **State Management**: React Hooks + Context
- **Real-time**: Socket.io Client
- **Build Tool**: Create React App

### Infrastructure

- **CI/CD**: GitHub Actions (cost-optimized)
- **Package Management**: npm
- **Version Control**: Git + GitHub
- **Documentation**: Markdown + JSDoc

## 📁 Project Structure

```
ai-server-management/
├── 📁 backend/                 # Node.js backend
│   ├── 📁 src/
│   │   ├── 📁 services/        # Core business logic
│   │   ├── 📁 models/          # Data models
│   │   └── 📄 server.ts        # Express server
│   ├── 📄 package.json
│   └── 📄 tsconfig.json
├── 📁 frontend/                # React frontend
│   ├── 📁 src/
│   │   ├── 📁 components/      # React components
│   │   ├── 📁 hooks/           # Custom hooks
│   │   └── 📄 App.tsx          # Main app
│   ├── 📄 package.json
│   └── 📄 tsconfig.json
├── 📁 .github/workflows/       # CI/CD pipelines
├── 📁 docs/                    # Documentation
├── 📄 CHANGELOG.md             # Version history
└── 📄 README.md               # This file
```

## 🔧 Configuration

### Environment Variables

Create `.env` files in both backend and frontend directories:

#### Backend (.env)

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database (Optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/serverdb

# SSH Configuration (Optional)
SSH_PRIVATE_KEY_PATH=/path/to/ssh/key
SSH_PASSPHRASE=your_ssh_passphrase
```

#### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000
```

## 🎮 Usage

### 1. Server Management

- **Add Servers**: Use the "Add Server" button in the dashboard
- **Monitor Status**: View real-time metrics and health indicators
- **Manage Services**: Start, stop, and restart services remotely

### 2. AI Assistant

- **Natural Language Queries**: Ask questions about server management
- **Command Execution**: Request AI to execute specific server commands
- **Problem Diagnosis**: Describe issues for AI-powered troubleshooting

### 3. Autonomous Workflows

- **Start Workflows**: Choose from predefined diagnostic workflows
- **Monitor Progress**: Watch step-by-step execution in real-time
- **Review Results**: Examine recommendations and applied fixes

## 🛠️ API Reference

### Core Endpoints

```bash
# Server Management
GET    /api/servers              # List all servers
POST   /api/servers              # Add new server
GET    /api/servers/:id/status   # Get server status
POST   /api/servers/:id/command  # Execute command

# AI Chat
POST   /api/ai/chat              # Send chat message
GET    /api/ai/conversations     # List conversations
GET    /api/ai/conversations/:id # Get conversation

# Workflows
GET    /api/workflows            # List active workflows
POST   /api/workflows/start      # Start new workflow
GET    /api/workflows/:id/status # Get workflow status
POST   /api/workflows/:id/pause  # Pause workflow
POST   /api/workflows/:id/resume # Resume workflow

# Diagnostics
POST   /api/diagnostics/analyze  # Analyze server issue
GET    /api/diagnostics/logs     # Fetch server logs
POST   /api/diagnostics/command  # Execute diagnostic command
```

### WebSocket Events

```javascript
// Server status updates
socket.on('server:status', (data) => {
  // Handle server status change
});

// Workflow progress
socket.on('workflow:progress', (data) => {
  // Handle workflow step completion
});

// AI chat responses
socket.on('ai:response', (data) => {
  // Handle AI chat response
});
```

## 🧪 Development

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build
```

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Formatting
npm run format
```

## 📊 Monitoring & Observability

### Built-in Metrics

- **Server Performance**: CPU, Memory, Disk, Network usage
- **Application Health**: Service status, uptime, response times
- **AI Insights**: Query processing, success rates, learning progress
- **Workflow Analytics**: Execution times, success rates, failure patterns

### Logging

- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: DEBUG, INFO, WARN, ERROR, FATAL
- **Log Aggregation**: Compatible with ELK stack, Fluentd
- **Real-time Monitoring**: WebSocket-based log streaming

## 🔒 Security

### Authentication & Authorization

- **API Key Management**: Secure OpenAI API key handling
- **SSH Key Security**: Encrypted storage of SSH credentials
- **CORS Configuration**: Restrictive cross-origin policies
- **Input Validation**: Comprehensive request sanitization

### Best Practices

- **Environment Variables**: Sensitive data in .env files
- **Dependency Scanning**: Automated vulnerability checks
- **Code Analysis**: Static security analysis in CI/CD
- **Regular Updates**: Automated dependency updates

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

- **🐛 Bug Reports**: Structured templates with environment details and reproduction steps
- **✨ Feature Requests**: Comprehensive templates with problem statements and priority levels
- **📚 Documentation**: Templates for documentation improvements and corrections
- **❓ Questions**: Guided templates for community support

### 🔄 Pull Request Process

- **📝 PR Templates**: Comprehensive templates with testing checklists and deployment notes
- **🏷️ Automatic Labeling**: Smart labeling system for issue tracking and organization
- **🔍 Review Guidelines**: Structured review process for maintainers

### 🏷️ Label System

We use a comprehensive labeling system:
- **Priority**: `critical`, `high`, `medium`, `low`
- **Type**: `bug`, `enhancement`, `documentation`, `security`
- **Status**: `needs-triage`, `in-progress`, `needs-review`
- **Component**: `frontend`, `backend`, `api`, `database`

### 📖 Detailed Guidelines

For comprehensive contributing guidelines, see our [CONTRIBUTING.md](.github/CONTRIBUTING.md) file which includes:
- Development environment setup
- Coding standards and conventions
- Testing guidelines and coverage requirements
- Review process documentation

### 🛠️ Development Standards

- **TypeScript**: Strict mode with comprehensive typing
- **ESLint**: Standard configuration with custom rules
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Structured commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing the GPT-4 API
- **Material-UI** for the excellent React component library
- **Node.js Community** for the robust ecosystem
- **TypeScript Team** for enhanced JavaScript development

## 🔗 Links

- **Documentation**: [Full Documentation](docs/)
- **API Reference**: [API Docs](docs/api.md)
- **Architecture**: [System Architecture](docs/architecture.md)
- **Deployment**: [Deployment Guide](docs/deployment.md)
- **Troubleshooting**: [Common Issues](docs/troubleshooting.md)

---

<div align="center">

**Built with ❤️ by the AI Server Management Team**

[⭐ Star us on GitHub](https://github.com/yourusername/ai-server-management) | [🐛 Report Bug](https://github.com/yourusername/ai-server-management/issues) | [💡 Request Feature](https://github.com/yourusername/ai-server-management/issues)

</div>
