import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { AiService } from './services/ai.service';
import { ServerManager } from './services/server-manager.service';
import { DiagnosticsService, ServerConnectionInfo, DiagnosticRequest } from './services/diagnostics.service';
import { MCPServerService } from './services/mcp-server.service';
import { WorkflowService, WorkflowContext } from './services/workflow.service';

dotenv.config();

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Initialize services
const aiService = new AiService();
const serverManager = new ServerManager();
const diagnosticsService = new DiagnosticsService();
const mcpServer = new MCPServerService();
const workflowService = new WorkflowService(aiService, diagnosticsService, serverManager);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected');

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

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
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

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
