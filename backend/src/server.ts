import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import { AiService } from './services/ai.service';
import { ServerManager } from './services/server-manager.service';
import { DiagnosticsService, ServerConnectionInfo, DiagnosticRequest } from './services/diagnostics.service';
import { MCPServerService } from './services/mcp-server.service';
import { WorkflowService, WorkflowContext } from './services/workflow.service';
import { initializeMCPAnalyzers } from './services/mcp-analyzers/index';

dotenv.config();

// Initialize MCP analyzers on startup
initializeMCPAnalyzers();

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4000',
    methods: ['GET', 'POST']
  },
  transports: ['websocket'],
  allowEIO3: true,
  pingInterval: 25000,
  pingTimeout: 20000,
  allowRequest: (req, callback) => {
    console.log('WebSocket connection request:', req.url, req.headers);
    callback(null, true);
  }
});

// Initialize services
const aiService = new AiService();
const serverManager = new ServerManager();
const diagnosticsService = new DiagnosticsService();
const mcpServer = new MCPServerService();
const workflowService = new WorkflowService(aiService, diagnosticsService, serverManager);

// Periodically emit server updates (every 5 seconds)
setInterval(async () => {
  try {
    console.log('Fetching servers for update...');
    const servers = await serverManager.getServers();
    console.log('Emitting server updates:', servers.length, 'servers');
    io.emit('servers:update', servers);
    console.log('Server updates emitted successfully');
  } catch (error) {
    console.error('Error emitting server updates:', error);
  }
}, 5000);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected, socket id:', socket.id);
  console.log('Total connected clients:', io.engine.clientsCount);
  console.log('Client handshake:', socket.handshake);
  console.log('Client request headers:', socket.request.headers);

  // Send initial server data to newly connected client
  serverManager.getServers()
    .then(servers => {
      console.log('Sending initial server data to client:', socket.id, 'Servers count:', servers.length);
      socket.emit('servers:update', servers);
    })
    .catch(error => {
      console.error('Error sending initial server data:', error);
    });

  // Log when client disconnects
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected, socket id:', socket.id, 'reason:', reason);
    console.log('Total connected clients after disconnect:', io.engine.clientsCount);
    console.log('Client disconnected, socket id:', socket.id, 'reason:', reason);
    console.log('Total connected clients:', io.engine.clientsCount);
  });
  
  // Log any errors
  socket.on('error', (error) => {
    console.log('Socket error, socket id:', socket.id, 'error:', error);
    console.log('Socket error, socket id:', socket.id, 'error:', error);
  });

  socket.on('ai:query', async (data) => {
    try {
      const { query, conversationId, userId, context } = data;
      const result = await aiService.processQueryWithContext(query, {
        conversationId,
        userId,
        context,
        includeHistory: true,
        maxHistoryMessages: 10
      });
      const enhancedResponse = {
        response: result.response,
        conversationId: result.conversationId,
        message: {
          id: result.messageId,
          role: 'assistant' as const,
          content: result.response,
          timestamp: new Date(),
          metadata: {
            toolCalls: result.toolCalls || [],
            tokenCount: result.tokenCount || 0,
            promptTemplate: data.context?.promptTemplate,
            contextInfo: {
              urgencyLevel: data.context?.urgencyLevel,
              expertiseLevel: data.context?.expertiseLevel,
              serverIds: data.context?.serverIds,
              currentTask: data.context?.currentTask
            }
          }
        }
      };
      socket.emit('ai:response', enhancedResponse);
    } catch (error) {
      socket.emit('ai:error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  socket.on('ai:get-conversations', async (userId) => {
    try {
      const conversations = await aiService.getUserConversations(userId);
      socket.emit('ai:conversations', conversations);
    } catch (error) {
      socket.emit('ai:error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  socket.on('ai:get-conversation', async (conversationId) => {
    try {
      const conversation = await aiService.getConversation(conversationId);
      if (conversation) {
        socket.emit('ai:conversation', conversation);
      } else {
        socket.emit('ai:error', { error: 'Conversation not found' });
      }
    } catch (error) {
      socket.emit('ai:error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  socket.on('ai:create-conversation', async (data) => {
    try {
      const { userId, title } = data;
      const conversation = await aiService.createConversation(userId, title);
      socket.emit('ai:conversation-created', conversation);
    } catch (error) {
      socket.emit('ai:error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  socket.on('ai:delete-conversation', async (conversationId: string) => {
    try {
      await aiService.deleteConversation(conversationId);
      socket.emit('ai:conversation-deleted', { conversationId, success: true });
      const conversations = aiService.getAllConversations();
      socket.emit('ai:conversations', conversations);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      socket.emit('ai:conversation-deleted', { conversationId, success: false, error: 'Failed to delete conversation' });
    }
  });

  socket.on('ai:get-prompt-templates', async () => {
    try {
      const templates = aiService.getPromptTemplates();
      socket.emit('ai:prompt-templates', templates);
    } catch (error) {
      console.error('Error getting prompt templates:', error);
      socket.emit('ai:error', { error: 'Failed to get prompt templates' });
    }
  });

  socket.on('ai:analyze-conversation', async (data: { conversationId: string }) => {
    try {
      const analysis = aiService.analyzeConversationPatterns(data.conversationId);
      socket.emit('ai:conversation-analysis', analysis);
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      socket.emit('ai:error', { error: 'Failed to analyze conversation' });
    }
  });

  socket.on('ai:add-custom-template', async (data: { name: string; basePrompt: string; enhancements: string[]; constraints?: string[] }) => {
    try {
      aiService.addCustomPromptTemplate(data.name, data.basePrompt, data.enhancements, data.constraints);
      const templates = aiService.getPromptTemplates();
      socket.emit('ai:prompt-templates', templates);
      socket.emit('ai:template-added', { success: true, templateName: data.name });
    } catch (error) {
      console.error('Error adding custom template:', error);
      socket.emit('ai:error', { error: 'Failed to add custom template' });
    }
  });

  socket.on('server:action', async (action) => {
    try {
      const result = await serverManager.handleAction(action);
      socket.emit('server:status', result);
    } catch (error) {
      socket.emit('server:error', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  socket.on('diagnostics:connect', async (connectionInfo: ServerConnectionInfo) => {
    try {
      const success = await diagnosticsService.connectToServer(connectionInfo);
      socket.emit('diagnostics:connection-status', { serverId: connectionInfo.id, success });
    } catch (error) {
      socket.emit('diagnostics:error', { serverId: connectionInfo.id, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  socket.on('diagnostics:disconnect', async (serverId: string) => {
    try {
      await diagnosticsService.disconnectFromServer(serverId);
      socket.emit('diagnostics:disconnected', { serverId });
    } catch (error) {
      socket.emit('diagnostics:error', { serverId, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  socket.on('diagnostics:analyze', async (request: DiagnosticRequest) => {
    try {
      const result = await diagnosticsService.diagnoseIssue(request);
      socket.emit('diagnostics:result', result);
    } catch (error) {
      socket.emit('diagnostics:error', { serverId: request.serverId, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected, socket id:', socket.id, 'reason:', reason);
    console.log('Total connected clients:', io.engine.clientsCount);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      server: 'running',
      websocket: 'connected',
      database: 'available'
    }
  });
});

// API Routes
app.get('/api/servers', async (req, res) => {
  try {
    const servers = await serverManager.getServers();
    res.json(servers);
  } catch (error) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

app.post('/api/servers', async (req, res) => {
  try {
    const serverData = req.body;
    const newServer = await serverManager.addServer(serverData);
    res.status(201).json(newServer);
    
    // Emit server update to all connected clients
    io.emit('serverUpdate', {
      type: 'added',
      server: newServer
    });
  } catch (error) {
    console.error('Error adding server:', error);
    res.status(500).json({ error: 'Failed to add server' });
  }
});

// Workflow API Routes
app.post('/api/workflows/start', async (req, res) => {
  try {
    const { workflowName, context }: { workflowName: string; context: WorkflowContext } = req.body;
    const workflowId = await workflowService.startWorkflow(workflowName, context);
    res.json({ workflowId, message: 'Workflow started successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(400).json({ error: errorMessage });
  }
});

app.get('/api/workflows/:id/status', async (req, res) => {
  try {
    const workflowStatus = await workflowService.getWorkflowStatus(req.params.id);
    if (!workflowStatus) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflowStatus);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
});

app.get('/api/workflows', async (req, res) => {
  try {
    const activeWorkflows = await workflowService.listActiveWorkflows();
    res.json(activeWorkflows);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
});

app.get('/api/workflows/templates', async (req, res) => {
  try {
    const templates = await workflowService.getAvailableWorkflows();
    res.json(templates);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/workflows/:id/pause', async (req, res) => {
  try {
    const success = await workflowService.pauseWorkflow(req.params.id);
    if (success) {
      res.json({ message: 'Workflow paused successfully' });
    } else {
      res.status(400).json({ error: 'Failed to pause workflow' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
});

// MCP API Routes
app.get('/api/mcp/resources', async (req, res) => {
  try {
    const resources = await mcpServer.listResources();
    res.json({ resources });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
});

app.get('/api/mcp/resources/:uri', async (req, res) => {
  try {
    const resource = await mcpServer.readResource(decodeURIComponent(req.params.uri));
    res.json({ resource });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
});

app.get('/api/mcp/tools', async (req, res) => {
  try {
    const tools = await mcpServer.listTools();
    res.json({ tools });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/mcp/tools/:name/call', async (req, res) => {
  try {
    const { name } = req.params;
    const { arguments: args } = req.body;
    const result = await mcpServer.callTool(name, args);
    res.json({ result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
});

app.get('/api/mcp/status', async (req, res) => {
  try {
    const status = await mcpServer.getServerInfo();
    res.json({ 
      connected: true, 
      ...status,
      capabilities: {
        resources: true,
        tools: true,
        prompts: false
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage, connected: false });
  }
});

app.post('/api/workflows/:id/resume', async (req, res) => {
  try {
    const success = await workflowService.resumeWorkflow(req.params.id);
    if (success) {
      res.json({ message: 'Workflow resumed successfully' });
    } else {
      res.status(400).json({ error: 'Failed to resume workflow' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
});

// REST API endpoints
app.get('/api/servers', async (req, res) => {
  try {
    const servers = await serverManager.getServers();
    res.json(servers);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Server connection endpoints
app.post('/api/servers/connection', async (req, res) => {
  try {
    const connectionInfo: ServerConnectionInfo = req.body;
    const success = await diagnosticsService.connectToServer(connectionInfo);
    res.json({ serverId: connectionInfo.id, success });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Diagnostics endpoint
app.post('/api/diagnostics/analyze', async (req, res) => {
  try {
    const diagnosticRequest: DiagnosticRequest = req.body;
    const result = await diagnosticsService.diagnoseIssue(diagnosticRequest);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Add server endpoint
app.post('/api/servers', async (req, res) => {
  try {
    const serverData = req.body;
    const newServer = await serverManager.addServer(serverData);
    res.status(201).json(newServer);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

const PORT = parseInt(process.env.PORT || '5000', 10);
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
