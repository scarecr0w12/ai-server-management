/**
 * MCP Analyzer Integration - Central registry and initialization
 */

import { LogAnalyzerRegistry } from './base-log-analyzer';
import { Apache2LogAnalyzer } from './apache2-log-analyzer';

/**
 * Initialize and register all available MCP log analyzers
 */
export function initializeMCPAnalyzers(): void {
  const registry = LogAnalyzerRegistry.getInstance();
  
  // Register Apache2 log analyzer
  const apache2Analyzer = new Apache2LogAnalyzer();
  registry.registerAnalyzer(apache2Analyzer);
  
  console.log('🔌 MCP log analyzers initialized successfully');
  console.log(`📊 Registered analyzers: ${registry.getAllAnalyzers().length}`);
  console.log(`📋 Supported log types: ${registry.listSupportedTypes().join(', ')}`);
}

/**
 * Get the analyzer registry instance
 */
export function getAnalyzerRegistry(): LogAnalyzerRegistry {
  return LogAnalyzerRegistry.getInstance();
}

// Export all analyzer types for external use
export * from './base-log-analyzer';
export * from './apache2-log-analyzer';
