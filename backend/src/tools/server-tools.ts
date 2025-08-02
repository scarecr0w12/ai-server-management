import { ServerManager } from '../services/server-manager.service';
import { DiagnosticsService, ServerConnectionInfo } from '../services/diagnostics.service';

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface ToolExecutionResult {
  success: boolean;
  result: any;
  error?: string;
}

export class ServerToolsManager {
  private serverManager: ServerManager;
  private diagnosticsService: DiagnosticsService;

  constructor() {
    this.serverManager = new ServerManager();
    this.diagnosticsService = new DiagnosticsService();
  }

  // Define available tools for OpenAI function calling
  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        type: 'function',
        function: {
          name: 'list_servers',
          description: 'List all available servers and their current status',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_server_status',
          description: 'Get detailed status information for a specific server',
          parameters: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'The ID of the server to check status for',
              },
            },
            required: ['serverId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'connect_to_server',
          description: 'Establish SSH connection to a server for diagnostics',
          parameters: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID to connect to',
              },
              host: {
                type: 'string',
                description: 'Server hostname or IP address',
              },
              port: {
                type: 'number',
                description: 'SSH port (default: 22)',
              },
              username: {
                type: 'string',
                description: 'SSH username',
              },
              password: {
                type: 'string',
                description: 'SSH password (optional if using key)',
              },
            },
            required: ['serverId', 'host', 'username'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'run_server_command',
          description: 'Execute a command on a connected server',
          parameters: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID where to run the command',
              },
              command: {
                type: 'string',
                description: 'Command to execute',
              },
            },
            required: ['serverId', 'command'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'analyze_server_logs',
          description: 'Retrieve and analyze server logs from specific paths',
          parameters: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID to analyze logs for',
              },
              logPaths: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Array of log file paths to analyze',
              },
              symptoms: {
                type: 'string',
                description: 'Description of the problem symptoms',
              },
            },
            required: ['serverId', 'logPaths'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'check_system_resources',
          description: 'Check CPU, memory, disk usage on a server',
          parameters: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID to check resources for',
              },
            },
            required: ['serverId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'restart_service',
          description: 'Restart a specific service on a server',
          parameters: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID where to restart the service',
              },
              serviceName: {
                type: 'string',
                description: 'Name of the service to restart',
              },
            },
            required: ['serverId', 'serviceName'],
          },
        },
      },
    ];
  }

  // Execute tool function calls
  async executeTool(toolName: string, parameters: any): Promise<ToolExecutionResult> {
    try {
      switch (toolName) {
        case 'list_servers':
          return await this.listServers();

        case 'get_server_status':
          return await this.getServerStatus(parameters.serverId);

        case 'connect_to_server':
          return await this.connectToServer(parameters);

        case 'run_server_command':
          return await this.runServerCommand(parameters.serverId, parameters.command);

        case 'analyze_server_logs':
          return await this.analyzeServerLogs(parameters);

        case 'check_system_resources':
          return await this.checkSystemResources(parameters.serverId);

        case 'restart_service':
          return await this.restartService(parameters.serverId, parameters.serviceName);

        default:
          return {
            success: false,
            result: null,
            error: `Unknown tool: ${toolName}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private async listServers(): Promise<ToolExecutionResult> {
    const servers = await this.serverManager.getServers();
    return {
      success: true,
      result: servers,
    };
  }

  private async getServerStatus(serverId: string): Promise<ToolExecutionResult> {
    const status = await this.serverManager.getServerStatus(serverId);
    return {
      success: true,
      result: status,
    };
  }

  private async connectToServer(connectionInfo: any): Promise<ToolExecutionResult> {
    const serverConnection: ServerConnectionInfo = {
      id: connectionInfo.serverId,
      name: connectionInfo.serverId,
      host: connectionInfo.host,
      port: connectionInfo.port || 22,
      username: connectionInfo.username,
      password: connectionInfo.password,
    };

    const success = await this.diagnosticsService.connectToServer(serverConnection);
    return {
      success,
      result: { connected: success, serverId: connectionInfo.serverId },
    };
  }

  private async runServerCommand(serverId: string, command: string): Promise<ToolExecutionResult> {
    // This would integrate with the diagnostics service to run commands
    // For now, return a simulated result
    const result = await this.diagnosticsService.executeCommand(serverId, command);
    return {
      success: true,
      result: {
        serverId,
        command,
        output: result,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async analyzeServerLogs(parameters: any): Promise<ToolExecutionResult> {
    const diagnosticRequest = {
      serverId: parameters.serverId,
      symptoms: parameters.symptoms || '',
      logPaths: parameters.logPaths,
    };

    const result = await this.diagnosticsService.diagnoseIssue(diagnosticRequest);
    return {
      success: true,
      result,
    };
  }

  private async checkSystemResources(serverId: string): Promise<ToolExecutionResult> {
    // Execute system resource check commands
    const commands = [
      'top -bn1 | head -5',
      'df -h',
      'free -m',
      'uptime',
    ];

    const results = [];
    for (const command of commands) {
      try {
        const output = await this.diagnosticsService.executeCommand(serverId, command);
        results.push({ command, output });
      } catch (error) {
        results.push({ 
          command, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return {
      success: true,
      result: {
        serverId,
        resourceCheck: results,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async restartService(serverId: string, serviceName: string): Promise<ToolExecutionResult> {
    const command = `sudo systemctl restart ${serviceName}`;
    
    try {
      const output = await this.diagnosticsService.executeCommand(serverId, command);
      const statusCommand = `sudo systemctl status ${serviceName}`;
      const statusOutput = await this.diagnosticsService.executeCommand(serverId, statusCommand);

      return {
        success: true,
        result: {
          serverId,
          serviceName,
          restartOutput: output,
          status: statusOutput,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        error: `Failed to restart service ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
