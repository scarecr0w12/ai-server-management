import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ServerManager } from './server-manager.service';
import { DiagnosticsService } from './diagnostics.service';

export class MCPServerService {
  private server: Server;
  private serverManager: ServerManager;
  private diagnosticsService: DiagnosticsService;

  constructor() {
    this.server = new Server(
      {
        name: 'server-management-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.serverManager = new ServerManager();
    this.diagnosticsService = new DiagnosticsService();

    this.setupResourceHandlers();
    this.setupToolHandlers();
  }

  private setupResourceHandlers(): void {
    // List available resources (servers, logs, configurations)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const servers = await this.serverManager.getServers();
      
      const resources = servers.map(server => ({
        uri: `server://${server.id}`,
        name: `Server: ${server.name}`,
        description: `Server configuration and status for ${server.name}`,
        mimeType: 'application/json',
      }));

      // Add log resources
      servers.forEach(server => {
        resources.push({
          uri: `logs://${server.id}`,
          name: `Logs: ${server.name}`,
          description: `System logs for ${server.name}`,
          mimeType: 'text/plain',
        });
      });

      return { resources };
    });

    // Read specific resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      if (uri.startsWith('server://')) {
        const serverId = uri.replace('server://', '');
        const servers = await this.serverManager.getServers();
        const server = servers.find(s => s.id === serverId);
        
        if (!server) {
          throw new Error(`Server ${serverId} not found`);
        }

        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              id: server.id,
              name: server.name,
              status: server.status,
              configuration: (server as any).config || {},
              metrics: {
                cpu: (server as any).cpu || 0,
                memory: server.memory || { used: 0, total: 0 },
                disk: (server as any).disk || { used: 0, total: 0 },
                uptime: (server as any).uptime || 0,
              },
              services: (server as any).services || [],
              lastUpdate: new Date().toISOString(),
            }, null, 2)
          }]
        };
      }

      if (uri.startsWith('logs://')) {
        const serverId = uri.replace('logs://', '');
        try {
          const logs = await this.diagnosticsService.fetchLogs(serverId, [
            '/var/log/syslog',
            '/var/log/messages',
            '/var/log/apache2/error.log',
            '/var/log/nginx/error.log'
          ]);

          return {
            contents: [{
              uri,
              mimeType: 'text/plain',
              text: logs || 'No logs available'
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri,
              mimeType: 'text/plain',
              text: `Error fetching logs: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }
      }

      throw new Error(`Unknown resource URI: ${uri}`);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_servers',
            description: 'List all managed servers with their current status',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_server_status',
            description: 'Get detailed status information for a specific server',
            inputSchema: {
              type: 'object',
              properties: {
                serverId: {
                  type: 'string',
                  description: 'The ID of the server to check',
                },
              },
              required: ['serverId'],
            },
          },
          {
            name: 'restart_service',
            description: 'Restart a specific service on a server',
            inputSchema: {
              type: 'object',
              properties: {
                serverId: {
                  type: 'string',
                  description: 'The ID of the server',
                },
                serviceName: {
                  type: 'string',
                  description: 'The name of the service to restart',
                },
              },
              required: ['serverId', 'serviceName'],
            },
          },
          {
            name: 'execute_command',
            description: 'Execute a shell command on a server',
            inputSchema: {
              type: 'object',
              properties: {
                serverId: {
                  type: 'string',
                  description: 'The ID of the server',
                },
                command: {
                  type: 'string',
                  description: 'The command to execute',
                },
              },
              required: ['serverId', 'command'],
            },
          },
          {
            name: 'analyze_logs',
            description: 'Analyze server logs for issues and patterns',
            inputSchema: {
              type: 'object',
              properties: {
                serverId: {
                  type: 'string',
                  description: 'The ID of the server',
                },
                logPaths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of log file paths to analyze',
                },
              },
              required: ['serverId'],
            },
          },
        ],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        return {
          content: [{
            type: 'text',
            text: `Error: No arguments provided for tool ${name}`
          }],
          isError: true,
        };
      }

      try {
        switch (name) {
          case 'list_servers':
            const servers = await this.serverManager.getServers();
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(servers.map(s => ({
                  id: s.id,
                  name: s.name,
                  status: s.status,
                  load: (s as any).cpu || 0,
                  memory: s.memory || { used: 0, total: 0 },
                  uptime: (s as any).uptime || 0
                })), null, 2)
              }],
            };

          case 'get_server_status':
            const serverId = args.serverId as string;
            if (!serverId) {
              throw new Error('serverId is required');
            }
            const serverStatus = await this.serverManager.getServerStatus(serverId);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(serverStatus, null, 2)
              }],
            };

          case 'restart_service':
            const restartServerId = args.serverId as string;
            const serviceName = args.serviceName as string;
            if (!restartServerId || !serviceName) {
              throw new Error('serverId and serviceName are required');
            }
            // Note: restartService method needs to be implemented in ServerManager
            return {
              content: [{
                type: 'text',
                text: `Service restart functionality not yet implemented. Would restart ${serviceName} on server ${restartServerId}`
              }],
            };

          case 'execute_command':
            const execServerId = args.serverId as string;
            const command = args.command as string;
            if (!execServerId || !command) {
              throw new Error('serverId and command are required');
            }
            const result = await this.diagnosticsService.executeCommand(execServerId, command);
            return {
              content: [{
                type: 'text',
                text: `Command output:\n${result}`
              }],
            };

          case 'analyze_logs':
            const logServerId = args.serverId as string;
            if (!logServerId) {
              throw new Error('serverId is required');
            }
            const logPaths = (args.logPaths as string[]) || ['/var/log/syslog', '/var/log/messages'];
            const logs = await this.diagnosticsService.fetchLogs(logServerId, logPaths);
            const analysis = await this.diagnosticsService.diagnoseIssue({
              serverId: logServerId,
              symptoms: 'General log analysis requested',
              logPaths: logPaths
            });
            
            return {
              content: [{
                type: 'text',
                text: `Log Analysis Results:\n\n${analysis.analysis}\n\nRecommendations:\n${analysis.recommendations.join('\n')}`
              }],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true,
        };
      }
    });
  }

  async start(transport: any): Promise<void> {
    await this.server.connect(transport);
    console.log('🔗 MCP Server started successfully');
  }

  async stop(): Promise<void> {
    await this.server.close();
    console.log('🔗 MCP Server stopped');
  }

  getServer(): Server {
    return this.server;
  }
}
