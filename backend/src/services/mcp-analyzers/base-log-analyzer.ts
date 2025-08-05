/**
 * Base interface for MCP Log Analyzers
 * Provides a pluggable architecture for specialized log parsing and analysis
 */

export interface LogAnalysisResult {
  logType: string;
  summary: string;
  errors: LogEntry[];
  warnings: LogEntry[];
  insights: string[];
  patterns: LogPattern[];
  recommendations: string[];
  metrics?: LogMetrics;
}

export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  source?: string;
  details?: Record<string, any>;
}

export interface LogPattern {
  pattern: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  examples: string[];
}

export interface LogMetrics {
  totalEntries: number;
  errorCount: number;
  warningCount: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  topErrorSources: Array<{ source: string; count: number }>;
}

export abstract class BaseLogAnalyzer {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly supportedLogTypes: string[];

  /**
   * Determines if this analyzer can handle the given log content
   */
  abstract canAnalyze(logContent: string, logPath?: string): boolean;

  /**
   * Parses raw log content into structured entries
   */
  abstract parseLog(logContent: string): LogEntry[];

  /**
   * Analyzes parsed log entries and generates insights
   */
  abstract analyzeLog(logContent: string): Promise<LogAnalysisResult>;

  /**
   * Provides LLM-friendly context for the analyzed logs
   */
  abstract generateLLMContext(analysisResult: LogAnalysisResult): string;

  /**
   * Returns specific patterns this analyzer looks for
   */
  abstract getKnownPatterns(): LogPattern[];
}

/**
 * Registry for managing MCP log analyzers
 */
export class LogAnalyzerRegistry {
  private static instance: LogAnalyzerRegistry;
  private analyzers: Map<string, BaseLogAnalyzer> = new Map();

  static getInstance(): LogAnalyzerRegistry {
    if (!LogAnalyzerRegistry.instance) {
      LogAnalyzerRegistry.instance = new LogAnalyzerRegistry();
    }
    return LogAnalyzerRegistry.instance;
  }

  registerAnalyzer(analyzer: BaseLogAnalyzer): void {
    this.analyzers.set(analyzer.name, analyzer);
    console.log(`📊 Registered MCP log analyzer: ${analyzer.name}`);
  }

  getAnalyzer(name: string): BaseLogAnalyzer | undefined {
    return this.analyzers.get(name);
  }

  getAnalyzerForLog(logContent: string, logPath?: string): BaseLogAnalyzer | null {
    for (const analyzer of this.analyzers.values()) {
      if (analyzer.canAnalyze(logContent, logPath)) {
        return analyzer;
      }
    }
    return null;
  }

  getAllAnalyzers(): BaseLogAnalyzer[] {
    return Array.from(this.analyzers.values());
  }

  listSupportedTypes(): string[] {
    const types = new Set<string>();
    for (const analyzer of this.analyzers.values()) {
      analyzer.supportedLogTypes.forEach(type => types.add(type));
    }
    return Array.from(types);
  }
}
