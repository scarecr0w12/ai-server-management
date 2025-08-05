import { BaseLogAnalyzer, LogAnalysisResult, LogEntry, LogPattern, LogMetrics } from './base-log-analyzer';

/**
 * Specialized MCP log analyzer for Apache2 logs
 * Parses access logs, error logs, and provides context for LLM analysis
 */
export class Apache2LogAnalyzer extends BaseLogAnalyzer {
  readonly name = 'apache2-analyzer';
  readonly description = 'Apache2 HTTP server log analyzer with access and error log parsing';
  readonly supportedLogTypes = ['apache2-access', 'apache2-error', 'httpd-access', 'httpd-error'];

  private accessLogPattern = /^(\S+) \S+ \S+ \[([^\]]+)\] "([^"]*)" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"/;
  private errorLogPattern = /^\[([^\]]+)\] \[([^\]]+)\] (?:\[pid (\d+)\])? (.+)$/;

  canAnalyze(logContent: string, logPath?: string): boolean {
    // Check by file path
    if (logPath) {
      const pathLower = logPath.toLowerCase();
      if (pathLower.includes('apache') || pathLower.includes('httpd')) {
        return true;
      }
    }

    // Check by content patterns
    const lines = logContent.split('\n').slice(0, 10); // Check first 10 lines
    let accessMatches = 0;
    let errorMatches = 0;

    for (const line of lines) {
      if (this.accessLogPattern.test(line.trim())) {
        accessMatches++;
      }
      if (this.errorLogPattern.test(line.trim())) {
        errorMatches++;
      }
    }

    return accessMatches > 0 || errorMatches > 0;
  }

  parseLog(logContent: string): LogEntry[] {
    const lines = logContent.split('\n').filter(line => line.trim());
    const entries: LogEntry[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Try parsing as access log
      const accessMatch = trimmedLine.match(this.accessLogPattern);
      if (accessMatch) {
        const [, ip, timestamp, request, status, size, referer, userAgent] = accessMatch;
        
        entries.push({
          timestamp: this.parseTimestamp(timestamp),
          level: this.getLogLevelFromStatus(parseInt(status)),
          message: `${request} - Status: ${status}`,
          source: 'access',
          details: {
            type: 'access',
            ip,
            request,
            status: parseInt(status),
            size: size === '-' ? 0 : parseInt(size),
            referer,
            userAgent,
            method: request.split(' ')[0],
            path: request.split(' ')[1],
            protocol: request.split(' ')[2]
          }
        });
        continue;
      }

      // Try parsing as error log
      const errorMatch = trimmedLine.match(this.errorLogPattern);
      if (errorMatch) {
        const [, timestamp, level, pid, message] = errorMatch;
        
        entries.push({
          timestamp: this.parseTimestamp(timestamp),
          level: level.toLowerCase(),
          message: message.trim(),
          source: 'error',
          details: {
            type: 'error',
            pid: pid ? parseInt(pid) : undefined,
            rawLevel: level
          }
        });
        continue;
      }

      // Fallback for unmatched lines
      entries.push({
        timestamp: new Date(),
        level: 'info',
        message: trimmedLine,
        source: 'unknown',
        details: { type: 'unparsed', raw: trimmedLine }
      });
    }

    return entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async analyzeLog(logContent: string): Promise<LogAnalysisResult> {
    const entries = this.parseLog(logContent);
    const errors = entries.filter(e => e.level === 'error' || e.level === 'crit' || e.level === 'alert');
    const warnings = entries.filter(e => e.level === 'warn' || e.level === 'warning');
    
    // Generate insights
    const insights = this.generateInsights(entries);
    const patterns = this.identifyPatterns(entries);
    const recommendations = this.generateRecommendations(entries, patterns);
    
    // Calculate metrics
    const metrics = this.calculateMetrics(entries);

    return {
      logType: 'apache2',
      summary: this.generateSummary(entries),
      errors,
      warnings,
      insights,
      patterns,
      recommendations,
      metrics
    };
  }

  generateLLMContext(analysisResult: LogAnalysisResult): string {
    const { summary, errors, warnings, insights, patterns, metrics } = analysisResult;
    
    let context = `=== APACHE2 LOG ANALYSIS CONTEXT ===\n\n`;
    
    context += `**Summary**: ${summary}\n\n`;
    
    if (metrics) {
      context += `**Log Metrics**:\n`;
      context += `- Total entries: ${metrics.totalEntries}\n`;
      context += `- Errors: ${metrics.errorCount}\n`;
      context += `- Warnings: ${metrics.warningCount}\n`;
      context += `- Time range: ${metrics.timeRange.start.toISOString()} to ${metrics.timeRange.end.toISOString()}\n\n`;
    }

    if (errors.length > 0) {
      context += `**Critical Issues Found (${errors.length})**:\n`;
      errors.slice(0, 5).forEach((error, idx) => {
        context += `${idx + 1}. [${error.timestamp.toISOString()}] ${error.message}\n`;
        if (error.details?.type === 'access') {
          context += `   - HTTP ${error.details.status} error for ${error.details.path}\n`;
          context += `   - Client IP: ${error.details.ip}\n`;
        }
      });
      context += `\n`;
    }

    if (patterns.length > 0) {
      context += `**Key Patterns Identified**:\n`;
      patterns.forEach((pattern, idx) => {
        context += `${idx + 1}. ${pattern.description} (${pattern.frequency} occurrences, severity: ${pattern.severity})\n`;
        if (pattern.examples.length > 0) {
          context += `   Example: ${pattern.examples[0]}\n`;
        }
      });
      context += `\n`;
    }

    if (insights.length > 0) {
      context += `**Apache-Specific Insights**:\n`;
      insights.forEach((insight, idx) => {
        context += `${idx + 1}. ${insight}\n`;
      });
      context += `\n`;
    }

    context += `**Recommendations for Apache2**:\n`;
    analysisResult.recommendations.forEach((rec, idx) => {
      context += `${idx + 1}. ${rec}\n`;
    });

    return context;
  }

  getKnownPatterns(): LogPattern[] {
    return [
      {
        pattern: '404_not_found',
        frequency: 0,
        severity: 'medium',
        description: 'HTTP 404 Not Found errors - missing resources',
        examples: ['GET /missing-page.html - Status: 404']
      },
      {
        pattern: '500_internal_error',
        frequency: 0,
        severity: 'high',
        description: 'HTTP 500 Internal Server errors - application issues',
        examples: ['POST /api/endpoint - Status: 500']
      },
      {
        pattern: 'connection_refused',
        frequency: 0,
        severity: 'critical',
        description: 'Connection refused errors - service unavailable',
        examples: ['[error] server reached MaxRequestWorkers setting']
      },
      {
        pattern: 'memory_exhausted',
        frequency: 0,
        severity: 'critical',
        description: 'Memory exhaustion issues',
        examples: ['[error] server memory usage exceeded limits']
      }
    ];
  }

  private parseTimestamp(timestampStr: string): Date {
    // Handle Apache timestamp format: [25/Dec/2023:10:15:30 +0000]
    try {
      // Remove brackets if present
      const cleaned = timestampStr.replace(/^\[|\]$/g, '');
      
      // Apache access log format: 25/Dec/2023:10:15:30 +0000
      if (cleaned.includes('/')) {
        const parts = cleaned.split(' ');
        if (parts.length >= 2) {
          const datePart = parts[0];
          const timePart = parts[1] || '00:00:00';
          const [day, month, yearTime] = datePart.split('/');
          const [year, time] = yearTime.split(':');
          
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthIndex = monthNames.indexOf(month);
          
          if (monthIndex !== -1) {
            const [hour, minute, second] = time.split(':');
            return new Date(parseInt(year), monthIndex, parseInt(day), 
                           parseInt(hour), parseInt(minute), parseInt(second));
          }
        }
      }
      
      // Fallback to standard date parsing
      return new Date(cleaned);
    } catch (error) {
      console.warn('Failed to parse Apache timestamp:', timestampStr);
      return new Date();
    }
  }

  private getLogLevelFromStatus(status: number): string {
    if (status >= 500) return 'error';
    if (status >= 400) return 'warning';
    if (status >= 300) return 'info';
    return 'info';
  }

  private generateSummary(entries: LogEntry[]): string {
    const accessLogs = entries.filter(e => e.details?.type === 'access');
    const errorLogs = entries.filter(e => e.details?.type === 'error');
    const statusCounts = this.countStatusCodes(accessLogs);
    
    let summary = `Analyzed ${entries.length} Apache2 log entries `;
    summary += `(${accessLogs.length} access, ${errorLogs.length} error logs). `;
    
    if (statusCounts['4xx'] > 0) {
      summary += `Found ${statusCounts['4xx']} client errors (4xx). `;
    }
    if (statusCounts['5xx'] > 0) {
      summary += `Found ${statusCounts['5xx']} server errors (5xx). `;
    }
    
    return summary.trim();
  }

  private generateInsights(entries: LogEntry[]): string[] {
    const insights: string[] = [];
    const accessLogs = entries.filter(e => e.details?.type === 'access');
    
    // Analyze traffic patterns
    const ipCounts = this.countByField(accessLogs, 'ip');
    const pathCounts = this.countByField(accessLogs, 'path');
    const userAgents = this.countByField(accessLogs, 'userAgent');
    
    // High traffic IPs
    const topIPs = Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    if (topIPs.length > 0 && topIPs[0][1] > 10) {
      insights.push(`High traffic from IP ${topIPs[0][0]} (${topIPs[0][1]} requests)`);
    }

    // Popular endpoints
    const topPaths = Object.entries(pathCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    if (topPaths.length > 0) {
      insights.push(`Most requested endpoint: ${topPaths[0][0]} (${topPaths[0][1]} requests)`);
    }

    // Bot detection
    const botPatterns = ['bot', 'crawler', 'spider', 'scraper'];
    const botRequests = accessLogs.filter(entry => 
      botPatterns.some(pattern => 
        entry.details?.userAgent?.toLowerCase().includes(pattern)
      )
    );
    
    if (botRequests.length > 0) {
      insights.push(`Detected ${botRequests.length} bot/crawler requests`);
    }

    return insights;
  }

  private identifyPatterns(entries: LogEntry[]): LogPattern[] {
    const patterns: LogPattern[] = [];
    const knownPatterns = this.getKnownPatterns();
    
    // Check for 404 patterns
    const notFoundEntries = entries.filter(e => e.details?.status === 404);
    if (notFoundEntries.length > 0) {
      patterns.push({
        ...knownPatterns.find(p => p.pattern === '404_not_found')!,
        frequency: notFoundEntries.length,
        examples: notFoundEntries.slice(0, 3).map(e => e.message)
      });
    }

    // Check for 500 patterns
    const serverErrorEntries = entries.filter(e => e.details?.status >= 500);
    if (serverErrorEntries.length > 0) {
      patterns.push({
        ...knownPatterns.find(p => p.pattern === '500_internal_error')!,
        frequency: serverErrorEntries.length,
        examples: serverErrorEntries.slice(0, 3).map(e => e.message)
      });
    }

    return patterns;
  }

  private generateRecommendations(entries: LogEntry[], patterns: LogPattern[]): string[] {
    const recommendations: string[] = [];
    
    // Based on patterns found
    patterns.forEach(pattern => {
      switch (pattern.pattern) {
        case '404_not_found':
          if (pattern.frequency > 10) {
            recommendations.push('High number of 404 errors detected. Review URL structure and implement proper redirects.');
          }
          break;
        case '500_internal_error':
          if (pattern.frequency > 0) {
            recommendations.push('Server errors detected. Check application logs and error handling.');
          }
          break;
      }
    });

    // General Apache recommendations
    const errorCount = entries.filter(e => e.level === 'error').length;
    if (errorCount > 5) {
      recommendations.push('Consider increasing Apache error logging detail for better debugging.');
    }

    // Traffic-based recommendations
    const accessLogs = entries.filter(e => e.details?.type === 'access');
    if (accessLogs.length > 1000) {
      recommendations.push('High traffic volume detected. Consider implementing caching or load balancing.');
    }

    // If no specific recommendations were generated, provide a generic monitoring suggestion
    if (recommendations.length === 0) {
      recommendations.push('No critical issues detected in the parsed logs. Continue monitoring the server and review configurations periodically.');
    }

    return recommendations;
  }

  private calculateMetrics(entries: LogEntry[]): LogMetrics {
    const timestamps = entries.map(e => e.timestamp).filter(t => t);
    const errors = entries.filter(e => e.level === 'error' || e.level === 'crit');
    const warnings = entries.filter(e => e.level === 'warn' || e.level === 'warning');
    
    const sourceCounts = this.countByField(entries, 'source');
    const topSources = Object.entries(sourceCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));

    return {
      totalEntries: entries.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      timeRange: {
        start: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : new Date(),
        end: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : new Date()
      },
      topErrorSources: topSources
    };
  }

  private countStatusCodes(accessLogs: LogEntry[]): Record<string, number> {
    const counts = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    
    accessLogs.forEach(entry => {
      const status = entry.details?.status;
      if (status >= 200 && status < 300) counts['2xx']++;
      else if (status >= 300 && status < 400) counts['3xx']++;
      else if (status >= 400 && status < 500) counts['4xx']++;
      else if (status >= 500) counts['5xx']++;
    });
    
    return counts;
  }

  private countByField(entries: LogEntry[], field: string): Record<string, number> {
    const counts: Record<string, number> = {};
    
    entries.forEach(entry => {
      const value = entry.details?.[field];
      if (value && typeof value === 'string') {
        counts[value] = (counts[value] || 0) + 1;
      }
    });
    
    return counts;
  }
}
