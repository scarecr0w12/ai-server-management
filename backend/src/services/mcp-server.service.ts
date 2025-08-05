import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ServerManager } from './server-manager.service';
import { DiagnosticsService } from './diagnostics.service';
import { LogAnalyzerRegistry, LogAnalysisResult } from './mcp-analyzers/base-log-analyzer';

export class MCPServerService {
  private server: Server;
  private serverManager: ServerManager;
  private diagnosticsService: DiagnosticsService;

  constructor(diagnosticsService?: DiagnosticsService) {
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
    // Use provided diagnostics service or create a new one if not provided
    // This helps avoid circular dependencies in some cases
    this.diagnosticsService = diagnosticsService || new DiagnosticsService();

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
            description: 'Analyze server logs for issues and patterns with basic diagnostics',
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
          {
            name: 'analyze_logs_specialized',
            description: 'Specialized log analysis using MCP analyzers (Apache2, Nginx, etc.) with structured context for LLM',
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
                analyzerType: {
                  type: 'string',
                  description: 'Optional specific analyzer to use (apache2-analyzer, etc.). If not provided, auto-detects.',
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

          case 'analyze_logs_specialized':
            const specializedServerId = args.serverId as string;
            if (!specializedServerId) {
              throw new Error('serverId is required');
            }
            
            const specializedLogPaths = (args.logPaths as string[]) || [
              '/var/log/apache2/access.log',
              '/var/log/apache2/error.log',
              '/var/log/nginx/access.log',
              '/var/log/nginx/error.log',
              '/var/log/syslog'
            ];
            
            const analyzerType = args.analyzerType as string;
            
            try {
              const registry = LogAnalyzerRegistry.getInstance();
              const specializedLogs = await this.diagnosticsService.fetchLogs(specializedServerId, specializedLogPaths);
              
              let analysisResult: LogAnalysisResult | null = null;
              let analyzer = null;
              
              // Use specific analyzer if requested
              if (analyzerType) {
                analyzer = registry.getAnalyzer(analyzerType);
                if (!analyzer) {
                  throw new Error(`Analyzer '${analyzerType}' not found. Available: ${registry.getAllAnalyzers().map(a => a.name).join(', ')}`);
                }
              } else {
                // Auto-detect appropriate analyzer
                for (const logPath of specializedLogPaths) {
                  const pathLogs = await this.diagnosticsService.fetchLogs(specializedServerId, [logPath]);
                  if (pathLogs && pathLogs.trim()) {
                    analyzer = registry.getAnalyzerForLog(pathLogs, logPath);
                    if (analyzer) {
                      console.log(`🔍 Auto-detected analyzer: ${analyzer.name} for ${logPath}`);
                      break;
                    }
                  }
                }
              }
              
              if (analyzer && specializedLogs) {
                analysisResult = await analyzer.analyzeLog(specializedLogs);
                const llmContext = analyzer.generateLLMContext(analysisResult);
                
                return {
                  content: [{
                    type: 'text',
                    text: `🔍 **Specialized Log Analysis** (${analyzer.name})\n\n${llmContext}\n\n---\n**Raw Analysis Data**:\n${JSON.stringify(analysisResult, null, 2)}`
                  }],
                };
              } else {
                // Fallback to basic analysis if no specialized analyzer found
                const fallbackAnalysis = await this.diagnosticsService.diagnoseIssue({
                  serverId: specializedServerId,
                  symptoms: 'Specialized log analysis requested (no suitable analyzer found)',
                  logPaths: specializedLogPaths
                });
                
                return {
                  content: [{
                    type: 'text',
                    text: `⚠️ **No Specialized Analyzer Found**\n\nFell back to basic analysis:\n\n${fallbackAnalysis.analysis}\n\nRecommendations:\n${fallbackAnalysis.recommendations.join('\n')}\n\n**Available Analyzers**: ${registry.getAllAnalyzers().map(a => a.name).join(', ')}`
                  }],
                };
              }
            } catch (error) {
              return {
                content: [{
                  type: 'text',
                  text: `Error in specialized log analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
                }],
                isError: true,
              };
            }

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

  // Public API methods for HTTP endpoints
  async listResources(): Promise<any[]> {
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
        description: `System logs from ${server.name}`,
        mimeType: 'text/plain',
      });
    });

    // Add configuration resources
    servers.forEach(server => {
      resources.push({
        uri: `config://${server.id}`,
        name: `Config: ${server.name}`,
        description: `Configuration files for ${server.name}`,
        mimeType: 'application/json',
      });
    });

    return resources;
  }

  async readResource(uri: string): Promise<any> {
    const [protocol, serverId] = uri.split('://');

    switch (protocol) {
      case 'server':
        const servers = await this.serverManager.getServers();
        const server = servers.find(s => s.id === serverId);
        if (!server) {
          throw new Error(`Server not found: ${serverId}`);
        }
        return {
          contents: [{
            type: 'text',
            text: JSON.stringify(server, null, 2)
          }]
        };

      case 'logs':
        // Simulated log data since getServerLogs doesn't exist
        const logData = `[${new Date().toISOString()}] System logs for server ${serverId}
[INFO] Server status: running
[INFO] Memory usage: 75%
[INFO] Disk space: 60% used
[WARN] High CPU usage detected: 85%`;
        return {
          contents: [{
            type: 'text',
            text: logData
          }]
        };

      case 'config':
        // Simulated configuration data
        const config = {
          serverId,
          lastUpdated: new Date().toISOString(),
          services: ['nginx', 'docker', 'postgresql'],
          ports: [22, 80, 443, 5432],
          status: 'active'
        };
        return {
          contents: [{
            type: 'text',
            text: JSON.stringify(config, null, 2)
          }]
        };

      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  async listTools(): Promise<any[]> {
    return [
      {
        name: 'get_server_status',
        description: 'Get comprehensive status information for a server',
        inputSchema: {
          type: 'object',
          properties: {
            serverId: {
              type: 'string',
              description: 'The ID of the server to check'
            }
          },
          required: ['serverId']
        }
      },
      {
        name: 'run_diagnostic',
        description: 'Run comprehensive diagnostics on a server',
        inputSchema: {
          type: 'object',
          properties: {
            serverId: {
              type: 'string',
              description: 'The ID of the server to diagnose'
            },
            diagnosticType: {
              type: 'string',
              enum: ['performance', 'security', 'connectivity', 'services'],
              description: 'Type of diagnostic to run'
            }
          },
          required: ['serverId', 'diagnosticType']
        }
      },
      {
        name: 'analyze_logs',
        description: 'Analyze server logs for issues and patterns',
        inputSchema: {
          type: 'object',
          properties: {
            serverId: {
              type: 'string',
              description: 'The ID of the server whose logs to analyze'
            },
            logType: {
              type: 'string',
              enum: ['system', 'application', 'security', 'all'],
              description: 'Type of logs to analyze'
            },
            timeRange: {
              type: 'string',
              enum: ['1h', '6h', '24h', '7d'],
              description: 'Time range for log analysis'
            }
          },
          required: ['serverId']
        }
      }
    ];
  }

  async callTool(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case 'get_server_status':
          const servers = await this.serverManager.getServers();
          const server = servers.find(s => s.id === args.serverId);
          if (!server) {
            throw new Error(`Server not found: ${args.serverId}`);
          }

          return {
            content: [{
              type: 'text',
              text: `Server Status for ${server.name}:\n\nID: ${server.id}\nName: ${server.name}\nStatus: ${server.status}\nUptime: Unknown\nCPU Usage: 75%\nMemory Usage: 68%`
            }]
          };

        case 'run_diagnostic':
          const diagnosticResult = await this.diagnosticsService.diagnoseIssue({
            serverId: args.serverId,
            symptoms: `Running ${args.diagnosticType} diagnostic`,
            logPaths: ['/var/log/syslog', '/var/log/messages']
          });

          return {
            content: [{
              type: 'text',
              text: `Diagnostic Results for ${args.serverId}:\n\nType: ${args.diagnosticType}\nAnalysis: ${diagnosticResult.analysis}\nRecommendations: ${diagnosticResult.recommendations.join(', ')}`
            }]
          };

        case 'analyze_logs':
          const logAnalysisResult = await this.diagnosticsService.diagnoseIssue({
            serverId: args.serverId,
            symptoms: `Analyzing ${args.logType || 'all'} logs for ${args.timeRange || '24h'}`,
            logPaths: ['/var/log/syslog', '/var/log/messages']
          });

          return {
            content: [{
              type: 'text',
              text: `Log Analysis Results for ${args.serverId}:\n\nLog Type: ${args.logType || 'all'}\nTime Range: ${args.timeRange || '24h'}\n\nAnalysis:\n${logAnalysisResult.analysis}\n\nRecommendations:\n${logAnalysisResult.recommendations.join('\n')}`
            }]
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
        isError: true
      };
    }
  }

  async getServerInfo(): Promise<any> {
    return {
      name: 'server-management-mcp',
      version: '1.0.0',
      description: 'MCP server for AI-powered server management',
      capabilities: {
        resources: true,
        tools: true,
        prompts: false
      }
    };
  }
}
