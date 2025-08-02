import { NodeSSH } from 'node-ssh';
// Removed AiService import to break circular dependency

export interface ServerConnectionInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

export interface DiagnosticRequest {
  serverId: string;
  symptoms: string;
  logPaths: string[];
}

export interface DiagnosticResult {
  serverId: string;
  symptoms: string;
  logs: string;
  analysis: string;
  recommendations: string[];
}

export class DiagnosticsService {
  private sshConnections: Map<string, NodeSSH> = new Map();

  constructor() {
    // Removed AiService instantiation to break circular dependency
  }

  async connectToServer(connectionInfo: ServerConnectionInfo): Promise<boolean> {
    try {
      const ssh = new NodeSSH();
      
      const config: any = {
        host: connectionInfo.host,
        port: connectionInfo.port,
        username: connectionInfo.username,
      };
      
      if (connectionInfo.password) {
        config.password = connectionInfo.password;
      } else if (connectionInfo.privateKey) {
        config.privateKey = connectionInfo.privateKey;
        if (connectionInfo.passphrase) {
          config.passphrase = connectionInfo.passphrase;
        }
      }
      
      await ssh.connect(config);
      this.sshConnections.set(connectionInfo.id, ssh);
      return true;
    } catch (error) {
      console.error('SSH connection failed:', error);
      return false;
    }
  }

  async disconnectFromServer(serverId: string): Promise<void> {
    const ssh = this.sshConnections.get(serverId);
    if (ssh) {
      ssh.dispose();
      this.sshConnections.delete(serverId);
    }
  }

  async fetchLogs(serverId: string, logPaths: string[]): Promise<string> {
    const ssh = this.sshConnections.get(serverId);
    if (!ssh) {
      throw new Error('Server not connected');
    }

    let allLogs = '';
    
    for (const path of logPaths) {
      try {
        // Fetch last 100 lines of each log file
        const result = await ssh.execCommand(`tail -n 100 ${path}`);
        if (result.stdout) {
          allLogs += `\n=== ${path} ===\n${result.stdout}\n`;
        }
        if (result.stderr) {
          allLogs += `\n=== ${path} (stderr) ===\n${result.stderr}\n`;
        }
      } catch (error) {
        allLogs += `\n=== ${path} (error) ===\nFailed to read log: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
      }
    }
    
    return allLogs;
  }

  async diagnoseIssue(request: DiagnosticRequest): Promise<DiagnosticResult> {
    // Connect to server if not already connected
    // In a real implementation, you would retrieve connection info from a database
    // For now, we'll assume the connection is already established
    
    // Fetch relevant logs
    const logs = await this.fetchLogs(request.serverId, request.logPaths);
    
    // Analyze logs with AI
    const analysisPrompt = `
      Server Issue Diagnosis Request:
      Symptoms: ${request.symptoms}
      
      Relevant Logs:
      ${logs}
      
      Please analyze these logs in the context of the reported symptoms and provide:
      1. A technical analysis of what might be causing the issue
      2. Specific recommendations for resolving the issue
      3. Any commands that might help diagnose or fix the issue further
      
      Format your response clearly with sections for analysis and recommendations.
    `;
    
    // Simple diagnostic analysis without AI dependency to prevent circular reference
    const analysis = this.performBasicAnalysis(logs, request.symptoms);
    
    // Extract recommendations (in a real implementation, you might want more sophisticated parsing)
    const recommendations = this.extractRecommendations(analysis);
    
    return {
      serverId: request.serverId,
      symptoms: request.symptoms,
      logs: logs,
      analysis: analysis,
      recommendations: recommendations
    };
  }

  private performBasicAnalysis(logs: string, symptoms: string): string {
    // Simple pattern-based analysis without AI dependency
    const analysis = [];
    
    analysis.push('=== DIAGNOSTIC ANALYSIS ===');
    analysis.push(`Reported Symptoms: ${symptoms}`);
    
    // Basic log analysis patterns
    if (logs.toLowerCase().includes('error')) {
      analysis.push('• Found ERROR entries in logs - investigate error messages');
    }
    if (logs.toLowerCase().includes('failed')) {
      analysis.push('• Found FAILED operations in logs - check service dependencies');
    }
    if (logs.toLowerCase().includes('timeout')) {
      analysis.push('• Found TIMEOUT issues - check network connectivity and resource availability');
    }
    if (logs.toLowerCase().includes('memory')) {
      analysis.push('• Found MEMORY-related entries - check system resources');
    }
    if (logs.toLowerCase().includes('permission')) {
      analysis.push('• Found PERMISSION issues - verify file/service permissions');
    }
    
    analysis.push('\n=== RECOMMENDATIONS ===');
    analysis.push('1. Review detailed error messages in the logs');
    analysis.push('2. Check system resource usage (CPU, memory, disk)');
    analysis.push('3. Verify service configurations and dependencies');
    analysis.push('4. Consider restarting affected services if safe to do so');
    
    return analysis.join('\n');
  }

  private extractRecommendations(analysis: string): string[] {
    // Extract recommendations from analysis
    const lines = analysis.split('\n');
    const recommendations: string[] = [];
    
    let inRecommendationsSection = false;
    for (const line of lines) {
      if (line.toLowerCase().includes('recommendations') || line.toLowerCase().includes('suggested')) {
        inRecommendationsSection = true;
        continue;
      }
      
      if (inRecommendationsSection && line.trim()) {
        if (line.match(/^\d+\.|^[-*]\s/)) {
          recommendations.push(line.trim());
        }
      }
    }
    
    return recommendations.length > 0 ? recommendations : ['Review system logs for error patterns', 'Check service status and restart if necessary'];
  }

  async executeCommand(serverId: string, command: string): Promise<string> {
    const ssh = this.sshConnections.get(serverId);
    if (!ssh) {
      throw new Error('Server not connected');
    }
    
    try {
      const result = await ssh.execCommand(command);
      return result.stdout || result.stderr || 'Command executed successfully with no output';
    } catch (error) {
      throw new Error(`Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
