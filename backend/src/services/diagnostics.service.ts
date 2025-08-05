import { NodeSSH } from 'node-ssh';
import { MemoryService, ProblemPattern, Solution } from './memory.service';
import { MCPServerService } from './mcp-server.service';
import { LogAnalyzerRegistry } from './mcp-analyzers/base-log-analyzer';
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
  private memoryService: MemoryService;
  private mcpService: MCPServerService;

  constructor() {
    // Removed AiService instantiation to break circular dependency
    this.memoryService = new MemoryService();
    // Initialize MCP service for specialized analysis, passing this instance to avoid circular dependency
    this.mcpService = new MCPServerService(this);
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
    // Validate server connection exists
    const ssh = this.sshConnections.get(request.serverId);
    if (!ssh) {
      throw new Error(`Server ${request.serverId} is not connected. Please establish connection first.`);
    }
    
    console.log(`Starting diagnostics for server ${request.serverId}`);
    console.log(`Symptoms: ${request.symptoms}`);
    
    // Use default log paths if none provided
    let logPaths = request.logPaths;
    if (!logPaths || logPaths.length === 0 || (logPaths.length === 1 && !logPaths[0].trim())) {
      logPaths = ['/var/log/syslog', '/var/log/auth.log', '/var/log/dmesg', '/var/log/messages'];
      console.log('Using default log paths:', logPaths);
    }
    
    // Fetch relevant logs
    const logs = await this.fetchLogs(request.serverId, logPaths);
    
    console.log('Fetched logs successfully, length:', logs.length);
    console.log('Starting analysis of logs...');
    
    // Check if we should use specialized analysis
    // For now, we'll try specialized analysis first, then fall back to basic analysis
    let analysisResult = await this.performSpecializedAnalysis(request.serverId, logs, logPaths);
    
    let analysis: string;
    let recommendations: string[];
    
    if (analysisResult) {
      console.log('🔍 Using specialized analysis from MCP analyzers');
      analysis = analysisResult.analysis;
      recommendations = analysisResult.recommendations;
    } else {
      console.log('⚠️ Falling back to basic analysis');
      // Perform basic diagnostic analysis 
      analysis = this.performBasicAnalysis(logs, request.symptoms);
      // Extract recommendations
      recommendations = this.extractRecommendations(analysis);
    }
    
    console.log('Analysis completed, length:', analysis.length);
    console.log('Analysis result:', analysis.substring(0, 200) + '...');
    console.log('Recommendations extracted:', recommendations.length, 'items');
    console.log('Recommendations:', recommendations);
    
    return {
      serverId: request.serverId,
      symptoms: request.symptoms,
      logs: logs,
      analysis: analysis,
      recommendations: recommendations
    };
  }

  private performBasicAnalysis(logs: string, symptoms: string): string {
    // Enhanced pattern-based analysis without AI dependency
    const analysis = [];
    
    analysis.push('=== DIAGNOSTIC ANALYSIS ===');
    analysis.push(`Reported Symptoms: ${symptoms}`);
    analysis.push(`Log Data Length: ${logs.length} characters\n`);
    
    // Count different types of issues
    const errorCount = (logs.match(/error|ERROR/gi) || []).length;
    const warningCount = (logs.match(/warning|WARNING|warn|WARN/gi) || []).length;
    const failedCount = (logs.match(/failed|FAILED|failure|FAILURE/gi) || []).length;
    
    analysis.push('=== LOG SUMMARY ===');
    analysis.push(`• Errors found: ${errorCount}`);
    analysis.push(`• Warnings found: ${warningCount}`);
    analysis.push(`• Failed operations: ${failedCount}\n`);
    
    analysis.push('=== PATTERN ANALYSIS ===');
    // Basic log analysis patterns
    if (errorCount > 0) {
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
    
    // Add symptom-specific analysis
    const symptomsLower = symptoms.toLowerCase();
    if (symptomsLower.includes('slow') || symptomsLower.includes('performance')) {
      analysis.push('• Performance issue detected - check CPU and memory usage');
    }
    if (symptomsLower.includes('crash') || symptomsLower.includes('restart')) {
      analysis.push('• Service stability issue detected - check for crash patterns');
    }
    if (symptomsLower.includes('connection') || symptomsLower.includes('network')) {
      analysis.push('• Network connectivity issue detected - check network logs');
    }
    
    analysis.push('\n=== RECOMMENDATIONS ===');
    
    // Dynamic recommendations based on findings
    const recommendations = [];
    if (errorCount > 10) {
      recommendations.push('1. High error count detected - immediate investigation recommended');
    } else {
      recommendations.push('1. Review detailed error messages in the logs');
    }
    
    if (failedCount > 5) {
      recommendations.push('2. Multiple failed operations - check service health and dependencies');
    } else {
      recommendations.push('2. Check system resource usage (CPU, memory, disk)');
    }
    
    recommendations.push('3. Verify service configurations and dependencies');
    recommendations.push('4. Monitor system for recurring patterns');
    
    if (symptomsLower.includes('crash') || errorCount > 20) {
      recommendations.push('5. URGENT: Consider service restart after backup');
    } else {
      recommendations.push('5. Consider restarting affected services if safe to do so');
    }
    
    analysis.push(...recommendations);
    
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

  /**
   * Perform specialized log analysis using MCP analyzers
   * This method uses the registered MCP log analyzers to provide structured context for LLM analysis
   */
  async performSpecializedAnalysis(serverId: string, logs: string, logPaths: string[]): Promise<{ analysis: string; recommendations: string[] } | null> {
    try {
      console.log('🔍 Starting specialized log analysis using MCP analyzers');
      
      // Use LogAnalyzerRegistry directly to get the appropriate analyzer
      const registry = LogAnalyzerRegistry.getInstance();
      const availableAnalyzers = registry.getAllAnalyzers();
      console.log('🔍 Available analyzers:', availableAnalyzers.map(a => a.name));
      
      // Try to find a suitable analyzer for the log paths
      let analyzer = null;
      let logType = null;
      
      for (const path of logPaths) {
        for (const analyzerInstance of availableAnalyzers) {
          if (analyzerInstance.canAnalyze(logs, path)) {
            analyzer = analyzerInstance;
            logType = analyzerInstance.name;
            console.log(`🔍 Found suitable analyzer: ${analyzerInstance.name} for path: ${path}`);
            break;
          }
        }
        if (analyzer) break;
      }
      
      if (!analyzer) {
        console.log('🔍 No specialized analyzer found for the provided log paths');
        return null;
      }
      
      // Analyze the logs using the specialized analyzer
      console.log(`🔍 Using ${logType} analyzer to analyze logs`);
      const analysisResult = await analyzer.analyzeLog(logs);
      console.log('🔍 Analysis completed successfully');
      
      // Generate LLM-friendly context
      const analysis = analyzer.generateLLMContext(analysisResult);
      console.log('🔍 LLM context generated:', analysis.substring(0, 100) + '...');
      
      // Extract recommendations from the analysis
      const recommendations: string[] = [];
      const lines = analysis.split('\n');
      let inRecommendations = false;
      
      for (const line of lines) {
        if (line.includes('Recommendations') || line.includes('RECOMMENDATIONS')) {
          inRecommendations = true;
          continue;
        }
        
        if (inRecommendations && line.trim().match(/^\d+\.|^-|^\*|^•/)) {
          recommendations.push(line.trim());
        }
        
        // Stop if we hit another section
        if (inRecommendations && line.trim() === '' && recommendations.length > 0) {
          break;
        }
      }
      
      console.log('🔍 Extracted recommendations:', recommendations.length);
      
      return {
        analysis,
        recommendations
      };
    } catch (error) {
      console.error('🔍 Error in specialized analysis:', error);
      return null;
    }
  }

  /**
   * Get available MCP analyzers
   */
  getAvailableAnalyzers(): string[] {
    try {
      const registry = LogAnalyzerRegistry.getInstance();
      return registry.getAllAnalyzers().map(analyzer => analyzer.name);
    } catch (error) {
      console.error('Error getting available analyzers:', error);
      return [];
    }
  }
}
