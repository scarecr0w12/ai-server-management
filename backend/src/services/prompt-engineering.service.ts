import { Conversation } from '../models/conversation.model';

export interface PromptContext {
  conversationHistory?: any[];
  serverIds?: string[];
  currentTask?: string;
  diagnosticSession?: boolean;
  userExpertiseLevel?: 'beginner' | 'intermediate' | 'expert';
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  previousErrors?: string[];
  availableTools?: string[];
  serverStates?: any[];
}

export interface PromptTemplate {
  name: string;
  basePrompt: string;
  contextEnhancements: string[];
  constraints?: string[];
  examples?: string[];
}

export class PromptEngineeringService {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // General server management template
    this.templates.set('general', {
      name: 'General Server Management',
      basePrompt: `You are an expert server management AI assistant with extensive knowledge of Linux systems, DevOps practices, and infrastructure management. You have access to various tools to help manage servers and diagnose issues.`,
      contextEnhancements: [
        'Provide clear, actionable solutions',
        'Use tools when appropriate to gather information or perform actions',
        'Explain your reasoning and the steps you\'re taking',
        'Consider security implications in all recommendations'
      ]
    });

    // Diagnostic session template
    this.templates.set('diagnostic', {
      name: 'Server Diagnostics',
      basePrompt: `You are a specialized server diagnostics AI with deep expertise in troubleshooting system issues, analyzing logs, and identifying performance bottlenecks. Your goal is to systematically diagnose problems and provide actionable solutions.`,
      contextEnhancements: [
        'Follow a systematic diagnostic approach',
        'Use available tools to gather comprehensive system information',
        'Analyze patterns and correlations in system data',
        'Provide both immediate fixes and long-term preventive measures',
        'Document your diagnostic process for future reference'
      ],
      constraints: [
        'Always verify system state before making changes',
        'Recommend testing in non-production environments when possible',
        'Prioritize data safety and system stability'
      ]
    });

    // Emergency response template
    this.templates.set('emergency', {
      name: 'Emergency Response',
      basePrompt: `You are an emergency response AI for critical server issues. Your priority is to quickly stabilize systems, minimize downtime, and restore normal operations while maintaining data integrity.`,
      contextEnhancements: [
        'Prioritize immediate system stability',
        'Use rapid diagnostic tools to identify critical issues',
        'Implement quick fixes while planning comprehensive solutions',
        'Monitor system metrics continuously during recovery',
        'Document all actions for post-incident analysis'
      ],
      constraints: [
        'Safety first - never risk data loss',
        'Get explicit approval before making system-level changes',
        'Escalate to human operators for irreversible actions'
      ]
    });

    // Configuration management template
    this.templates.set('configuration', {
      name: 'Configuration Management',
      basePrompt: `You are a configuration management expert specializing in server setup, optimization, and automation. You help create, modify, and maintain server configurations following best practices.`,
      contextEnhancements: [
        'Follow infrastructure as code principles',
        'Ensure configurations are reproducible and version-controlled',
        'Apply security hardening best practices',
        'Optimize for performance and resource efficiency',
        'Document configuration changes and rationale'
      ]
    });

    // Performance optimization template
    this.templates.set('performance', {
      name: 'Performance Optimization',
      basePrompt: `You are a performance optimization specialist focused on analyzing system metrics, identifying bottlenecks, and implementing performance improvements for server infrastructure.`,
      contextEnhancements: [
        'Analyze system metrics holistically',
        'Identify performance bottlenecks using data-driven approaches',
        'Recommend optimizations based on workload patterns',
        'Consider cost-performance trade-offs',
        'Establish monitoring and alerting for key metrics'
      ]
    });
  }

  buildDynamicPrompt(templateName: string, context: PromptContext): string {
    const template = this.templates.get(templateName) || this.templates.get('general')!;
    let prompt = template.basePrompt;

    // Add context-specific enhancements
    if (context.currentTask) {
      prompt += `\n\nCurrent task: ${context.currentTask}`;
    }

    if (context.serverIds && context.serverIds.length > 0) {
      prompt += `\n\nYou are currently working with the following servers: ${context.serverIds.join(', ')}`;
    }

    if (context.urgencyLevel) {
      const urgencyInstructions = {
        low: 'Take time to provide comprehensive analysis and detailed explanations.',
        medium: 'Balance thoroughness with efficiency in your responses.',
        high: 'Prioritize quick, actionable solutions while maintaining safety.',
        critical: 'Focus on immediate stabilization and rapid problem resolution.'
      };
      prompt += `\n\nUrgency level: ${context.urgencyLevel}. ${urgencyInstructions[context.urgencyLevel]}`;
    }

    if (context.userExpertiseLevel) {
      const expertiseInstructions = {
        beginner: 'Provide detailed explanations and step-by-step guidance. Explain technical terms and concepts.',
        intermediate: 'Provide clear instructions with moderate technical detail. Include relevant context.',
        expert: 'Use technical language appropriately. Focus on efficiency and advanced techniques.'
      };
      prompt += `\n\nUser expertise level: ${context.userExpertiseLevel}. ${expertiseInstructions[context.userExpertiseLevel]}`;
    }

    if (context.previousErrors && context.previousErrors.length > 0) {
      prompt += `\n\nPrevious errors encountered in this session: ${context.previousErrors.join(', ')}. Learn from these to avoid similar issues.`;
    }

    if (context.availableTools && context.availableTools.length > 0) {
      prompt += `\n\nAvailable tools: ${context.availableTools.join(', ')}. Use these tools when appropriate to gather information or perform actions.`;
    }

    // Add template enhancements
    if (template.contextEnhancements.length > 0) {
      prompt += `\n\nGuidelines:\n${template.contextEnhancements.map(e => `- ${e}`).join('\n')}`;
    }

    if (template.constraints && template.constraints.length > 0) {
      prompt += `\n\nConstraints:\n${template.constraints.map(c => `- ${c}`).join('\n')}`;
    }

    return prompt;
  }

  selectOptimalTemplate(context: PromptContext): string {
    // Template selection logic based on context
    if (context.urgencyLevel === 'critical' || context.urgencyLevel === 'high') {
      return 'emergency';
    }

    if (context.diagnosticSession) {
      return 'diagnostic';
    }

    if (context.currentTask?.toLowerCase().includes('config')) {
      return 'configuration';
    }

    if (context.currentTask?.toLowerCase().includes('performance') || 
        context.currentTask?.toLowerCase().includes('optimization')) {
      return 'performance';
    }

    return 'general';
  }

  buildContextFromConversation(conversation: Conversation): PromptContext {
    const context: PromptContext = {
      conversationHistory: conversation.messages.slice(-10), // Last 10 messages for context
      serverIds: conversation.context?.serverIds || [],
      currentTask: conversation.context?.currentTask || 'general server management',
      diagnosticSession: conversation.context?.diagnosticSession || false
    };

    // Analyze conversation for additional context
    const recentMessages = conversation.messages.slice(-5);
    const messageContent = recentMessages.map(m => m.content.toLowerCase()).join(' ');

    // Detect urgency level from message content
    if (messageContent.includes('urgent') || messageContent.includes('critical') || 
        messageContent.includes('down') || messageContent.includes('emergency')) {
      context.urgencyLevel = 'high';
    } else if (messageContent.includes('soon') || messageContent.includes('important')) {
      context.urgencyLevel = 'medium';
    } else {
      context.urgencyLevel = 'low';
    }

    // Detect user expertise level from language complexity and technical terms
    const technicalTerms = ['systemctl', 'docker', 'kubernetes', 'nginx', 'apache', 'mysql', 'postgresql', 'redis'];
    const technicalTermCount = technicalTerms.filter(term => messageContent.includes(term)).length;
    
    if (technicalTermCount > 3) {
      context.userExpertiseLevel = 'expert';
    } else if (technicalTermCount > 1) {
      context.userExpertiseLevel = 'intermediate';
    } else {
      context.userExpertiseLevel = 'beginner';
    }

    // Extract previous errors from conversation
    context.previousErrors = recentMessages
      .filter(m => m.content.toLowerCase().includes('error') || m.content.toLowerCase().includes('failed'))
      .map(m => m.content.substring(0, 100))
      .slice(-3); // Last 3 errors

    return context;
  }

  buildReasoningChain(query: string, context: PromptContext): string[] {
    const steps: string[] = [];
    const complexity = this.assessQueryComplexity(query, context);
    const domainType = this.identifyDomain(query);

    // Step 1: Enhanced Problem Analysis
    steps.push(`🔍 ANALYSIS: Examine "${query}" with complexity level: ${complexity}`);
    steps.push('• Break down the request into specific, actionable components');
    steps.push('• Identify dependencies, prerequisites, and potential blockers');
    steps.push('• Assess urgency level and impact scope');
    
    if (context.previousErrors?.length) {
      steps.push('• Review previous error patterns to avoid recurring issues');
    }

    // Step 2: Context-Aware Information Gathering
    steps.push('🔎 DISCOVERY: Systematically gather relevant information');
    
    if (context.serverIds?.length) {
      steps.push('• Collect comprehensive server status: health, resources, services');
      steps.push('• Check recent logs for patterns, errors, or anomalies');
      steps.push('• Verify network connectivity and external dependencies');
    }
    
    if (domainType === 'performance') {
      steps.push('• Gather performance metrics: CPU, memory, disk I/O, network');
      steps.push('• Analyze historical trends and baseline comparisons');
    } else if (domainType === 'security') {
      steps.push('• Review security logs and access patterns');
      steps.push('• Check for unauthorized access attempts or policy violations');
    } else if (domainType === 'configuration') {
      steps.push('• Examine current configuration files and settings');
      steps.push('• Validate configuration against best practices and security standards');
    }

    // Step 3: Adaptive Solution Planning
    steps.push('⚡ STRATEGY: Develop contextually appropriate solution approach');
    
    if (complexity === 'high' || context.urgencyLevel === 'critical') {
      steps.push('• Prioritize immediate stabilization and risk mitigation');
      steps.push('• Plan rollback strategies for each intervention');
      steps.push('• Identify monitoring points to track solution effectiveness');
    }
    
    steps.push('• Map available tools to required actions with backup alternatives');
    steps.push('• Sequence operations to minimize service disruption');
    steps.push('• Establish success criteria and validation checkpoints');

    // Step 4: Intelligent Implementation
    steps.push('🛠️ EXECUTION: Implement solution with continuous monitoring');
    steps.push('• Execute actions incrementally with validation at each step');
    steps.push('• Monitor system state and performance impact continuously');
    steps.push('• Adapt approach based on real-time feedback and results');
    
    if (context.urgencyLevel === 'critical') {
      steps.push('• Maintain immediate rollback readiness throughout execution');
    }

    // Step 5: Comprehensive Validation & Learning
    steps.push('✅ VALIDATION: Verify solution effectiveness and capture insights');
    steps.push('• Confirm original problem is fully resolved');
    steps.push('• Validate system stability and performance post-implementation');
    steps.push('• Document solution for knowledge base and future reference');
    
    if (context.previousErrors?.length) {
      steps.push('• Update error resolution patterns based on this experience');
    }
    
    steps.push('• Identify preventive measures to avoid similar issues');

    return steps;
  }

  private assessQueryComplexity(query: string, context: PromptContext): 'low' | 'medium' | 'high' {
    let complexity = 0;
    
    // Query length and technical terms
    if (query.length > 100) complexity += 1;
    if (query.length > 200) complexity += 1;
    
    // Technical complexity indicators
    const complexTerms = ['troubleshoot', 'diagnose', 'optimize', 'configure', 'integrate', 'migrate', 'cluster', 'distributed', 'performance', 'scaling'];
    const foundTerms = complexTerms.filter(term => query.toLowerCase().includes(term));
    complexity += Math.min(foundTerms.length, 3);
    
    // Context complexity
    if (context.serverIds && context.serverIds.length > 3) complexity += 1;
    if (context.previousErrors && context.previousErrors.length > 0) complexity += 1;
    if (context.urgencyLevel === 'high' || context.urgencyLevel === 'critical') complexity += 1;
    
    if (complexity <= 2) return 'low';
    if (complexity <= 5) return 'medium';
    return 'high';
  }

  private identifyDomain(query: string): string {
    const domains = {
      performance: ['slow', 'performance', 'optimization', 'cpu', 'memory', 'disk', 'network', 'latency', 'throughput'],
      security: ['security', 'access', 'authentication', 'authorization', 'firewall', 'ssl', 'tls', 'certificate', 'vulnerability'],
      configuration: ['config', 'setup', 'install', 'configure', 'settings', 'parameters'],
      monitoring: ['monitor', 'alert', 'log', 'metric', 'dashboard', 'notification'],
      deployment: ['deploy', 'release', 'rollback', 'update', 'upgrade', 'migration'],
      database: ['database', 'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'query']
    };
    
    const queryLower = query.toLowerCase();
    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        return domain;
      }
    }
    
    return 'general';
  }

  addTemplate(name: string, template: PromptTemplate): void {
    this.templates.set(name, template);
  }

  getTemplate(name: string): PromptTemplate | undefined {
    return this.templates.get(name);
  }

  // Advanced adaptive prompting capabilities
  buildAdaptivePrompt(query: string, context: PromptContext): string {
    const optimalTemplate = this.selectOptimalTemplate(context);
    const basePrompt = this.buildDynamicPrompt(optimalTemplate, context);
    const complexity = this.assessQueryComplexity(query, context);
    const domain = this.identifyDomain(query);

    let adaptivePrompt = basePrompt;

    // Add complexity-specific instructions
    if (complexity === 'high') {
      adaptivePrompt += `\n\n🧠 COMPLEXITY NOTICE: This is a high-complexity request requiring careful analysis.\n`;
      adaptivePrompt += `• Break down complex problems into manageable components\n`;
      adaptivePrompt += `• Use systematic troubleshooting methodologies\n`;
      adaptivePrompt += `• Consider interdependencies and cascading effects\n`;
      adaptivePrompt += `• Validate each step before proceeding to the next\n`;
    }

    // Add domain-specific expertise
    const domainExpertise = this.getDomainSpecificGuidance(domain);
    if (domainExpertise) {
      adaptivePrompt += `\n\n🎯 DOMAIN EXPERTISE (${domain.toUpperCase()}):\n${domainExpertise}`;
    }

    // Add context-aware safety instructions
    if (context.urgencyLevel === 'critical') {
      adaptivePrompt += `\n\n⚠️ CRITICAL SITUATION PROTOCOL:\n`;
      adaptivePrompt += `• Prioritize system stability and data integrity\n`;
      adaptivePrompt += `• Have rollback plans ready before making changes\n`;
      adaptivePrompt += `• Document all actions taken for incident review\n`;
      adaptivePrompt += `• Escalate if uncertain about potential impacts\n`;
    }

    // Add learning from previous errors
    if (context.previousErrors && context.previousErrors.length > 0) {
      adaptivePrompt += `\n\n🔄 LEARNING FROM HISTORY:\n`;
      adaptivePrompt += `Previous issues encountered: ${context.previousErrors.join(', ')}\n`;
      adaptivePrompt += `• Review these patterns to avoid repeating mistakes\n`;
      adaptivePrompt += `• Apply lessons learned from similar situations\n`;
    }

    return adaptivePrompt;
  }

  private getDomainSpecificGuidance(domain: string): string | null {
    const guidance: Record<string, string> = {
      performance: `• Focus on metrics: CPU, memory, disk I/O, network throughput\n• Identify bottlenecks through systematic profiling\n• Consider both resource utilization and application-level optimization\n• Baseline measurements before and after changes`,
      
      security: `• Follow principle of least privilege\n• Verify all access controls and authentication mechanisms\n• Check for security vulnerabilities and compliance requirements\n• Document all security-related changes for audit trails`,
      
      configuration: `• Backup current configurations before making changes\n• Follow infrastructure-as-code principles\n• Validate configurations against security and performance standards\n• Test changes in non-production environments first`,
      
      monitoring: `• Establish comprehensive observability coverage\n• Set up proactive alerting for critical metrics\n• Implement log aggregation and analysis\n• Create dashboards for key performance indicators`,
      
      deployment: `• Use blue-green or canary deployment strategies\n• Implement automated rollback mechanisms\n• Verify service health at each deployment stage\n• Coordinate with dependent services and teams`,
      
      database: `• Always backup data before making structural changes\n• Optimize queries and indexing strategies\n• Monitor connection pools and query performance\n• Plan for data migration and consistency requirements`
    };
    
    return guidance[domain] || null;
  }

  // Enhanced template selection with machine learning-like scoring
  selectOptimalTemplateAdvanced(context: PromptContext, query?: string): string {
    const templates = Array.from(this.templates.keys());
    const scores: Record<string, number> = {};
    
    // Initialize all templates with base score
    templates.forEach(template => scores[template] = 0);
    
    // Score based on urgency
    if (context.urgencyLevel === 'critical' || context.urgencyLevel === 'high') {
      scores['emergency'] = (scores['emergency'] || 0) + 10;
      scores['diagnostic'] = (scores['diagnostic'] || 0) + 5;
    }
    
    // Score based on diagnostic context
    if (context.diagnosticSession) {
      scores['diagnostic'] = (scores['diagnostic'] || 0) + 8;
    }
    
    // Score based on query content analysis
    if (query) {
      const domain = this.identifyDomain(query);
      if (domain !== 'general') {
        scores[domain] = (scores[domain] || 0) + 7;
      }
      
      const complexity = this.assessQueryComplexity(query, context);
      if (complexity === 'high') {
        scores['diagnostic'] = (scores['diagnostic'] || 0) + 3;
        scores['emergency'] = (scores['emergency'] || 0) + 2;
      }
    }
    
    // Score based on context characteristics
    if (context.serverIds && context.serverIds.length > 3) {
      scores['performance'] = (scores['performance'] || 0) + 2;
      scores['diagnostic'] = (scores['diagnostic'] || 0) + 2;
    }
    
    if (context.previousErrors && context.previousErrors.length > 0) {
      scores['diagnostic'] = (scores['diagnostic'] || 0) + 4;
    }
    
    // Find template with highest score
    const bestTemplate = Object.entries(scores).reduce((best, [template, score]) => 
      score > best.score ? { template, score } : best, 
      { template: 'general', score: -1 }
    );
    
    return bestTemplate.template;
  }

  // Generate context-aware examples based on current situation
  generateContextualExamples(context: PromptContext, domain: string): string[] {
    const examples: string[] = [];
    
    if (domain === 'performance' && context.serverIds?.length) {
      examples.push('Example: "Check CPU usage on server-01 and identify the top 5 processes consuming resources"');
      examples.push('Example: "Analyze disk I/O patterns and recommend optimization strategies"');
    }
    
    if (domain === 'security') {
      examples.push('Example: "Review firewall rules and identify potential security gaps"');
      examples.push('Example: "Check for failed authentication attempts in the last 24 hours"');
    }
    
    if (domain === 'diagnostic' && context.previousErrors?.length) {
      examples.push('Example: "Systematically trace the root cause of recurring service failures"');
      examples.push('Example: "Correlate error patterns across multiple log sources"');
    }
    
    return examples;
  }

  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}
