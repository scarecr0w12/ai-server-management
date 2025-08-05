import OpenAI from 'openai';
import dotenv from 'dotenv';
import { ConversationStorage, Conversation, Message } from '../models/conversation.model';
import { ServerToolsManager, ToolExecutionResult } from '../tools/server-tools';
import { PromptEngineeringService, PromptContext } from './prompt-engineering.service';
import { MemoryService, MemoryContext, ProblemPattern } from './memory.service';

dotenv.config();

export interface ChatOptions {
  conversationId?: string;
  userId?: string;
  context?: any;
  includeHistory?: boolean;
  maxHistoryMessages?: number;
}

export class AiService {
  private openai: OpenAI;
  private conversationStorage: ConversationStorage;
  private serverTools: ServerToolsManager;
  private promptService: PromptEngineeringService;
  private memoryService: MemoryService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.conversationStorage = new ConversationStorage();
    this.serverTools = new ServerToolsManager();
    this.promptService = new PromptEngineeringService();
    this.memoryService = new MemoryService();
  }

  async processQuery(query: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful server management assistant. Provide clear and concise responses about server configurations and management tasks."
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return completion.choices[0].message?.content || "I'm sorry, I couldn't process your request.";
  }

  async processQueryWithContext(query: string, options: ChatOptions = {}): Promise<{ response: string; conversationId: string; messageId: string; toolCalls?: any[]; tokenCalls?: any[]; tokenCount?: number }> {
    console.log('AiService: Processing query with context');
    console.log('Query:', query);
    console.log('Options:', JSON.stringify(options, null, 2));
    console.log('OpenAI API Key configured:', !!process.env.OPENAI_API_KEY);
    
    const {
      conversationId,
      userId,
      context,
      includeHistory = true,
      maxHistoryMessages = 10
    } = options;

    try {
      // Get or create conversation
      console.log('Creating/getting conversation...');
      let conversation: Conversation;
      if (conversationId) {
        conversation = this.conversationStorage.getConversation(conversationId) || 
                     this.conversationStorage.createConversation(userId, 'Chat Session');
      } else {
        conversation = this.conversationStorage.createConversation(userId, 'Chat Session');
      }
      console.log('Conversation ID:', conversation.id);

      // Update context if provided
      if (context) {
        console.log('Updating conversation context:', context);
        this.conversationStorage.updateConversationContext(conversation.id, context);
      }

      // Add user message to conversation
      console.log('Adding user message to conversation...');
      const userMessage = this.conversationStorage.addMessage(conversation.id, 'user', query);
      console.log('User message added with ID:', userMessage?.id || 'null');

      // Build messages for OpenAI API with enhanced prompting
      console.log('Building messages for OpenAI API...');
      const systemMessage = {
        role: "system" as const,
        content: await this.buildSystemPrompt(conversation, query)
      };

      const historyMessages = includeHistory ? 
        this.conversationStorage.getMessagesForOpenAI(conversation.id, false).slice(-maxHistoryMessages) : 
        [{ role: "user" as const, content: query }];

      const messages = [systemMessage, ...historyMessages];
      console.log('Messages prepared, calling OpenAI API...');

      // Call OpenAI API
      // Adjust model parameters based on context and complexity
      const promptContext = this.promptService.buildContextFromConversation(conversation);
      const modelParams = this.getOptimalModelParameters(query, promptContext);
      
      const completion = await this.openai.chat.completions.create({
        model: modelParams.model,
        messages,
        tools: this.serverTools.getToolDefinitions(),
        tool_choice: "auto",
        temperature: modelParams.temperature,
        max_tokens: modelParams.maxTokens
      });

      const message = completion.choices[0].message;
      
      // Handle tool calls
      if (message?.tool_calls && message.tool_calls.length > 0) {
        return await this.handleToolCalls(conversation.id, message.tool_calls, messages);
      }

      const response = message?.content || "I'm sorry, I couldn't process your request.";

      // Add assistant response to conversation
      const assistantMessage = this.conversationStorage.addMessage(conversation.id, 'assistant', response);

      return {
        response,
        conversationId: conversation.id,
        messageId: assistantMessage?.id || '',
        toolCalls: [],
        tokenCount: completion.usage?.total_tokens || 0
      };
    } catch (error) {
      console.log('AiService error:', error);
      const errorResponse = `Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`;
      // Note: conversation variable may be out of scope here, need to handle errors differently
      throw new Error(errorResponse);
    }
  }

  private async buildSystemPrompt(conversation: Conversation, query?: string): Promise<string> {
    const promptContext = this.promptService.buildContextFromConversation(conversation);
    const safeQuery = query || 'General server management assistance';
    
    // Get memory-enhanced context
    const memoryContext: MemoryContext = {
      userId: conversation.userId,
      conversationId: conversation.id,
      serverId: conversation.context?.serverIds?.[0],
      timeframe: 'recent',
      category: [this.categorizeQuery(safeQuery)]
    };
    
    const relevantMemory = await this.memoryService.getRelevantMemory(memoryContext);
    
    // Enhance prompt context with memory insights
    const enhancedContext = {
      ...promptContext,
      userPreferences: relevantMemory.userPreferences || [],
      serverProfile: relevantMemory.serverProfile,
      similarPatterns: relevantMemory.patterns || [],
      conversationInsights: relevantMemory.conversationInsights || []
    };
    
    // Use advanced adaptive prompting for enhanced contextual responses
    let systemPrompt = this.promptService.buildAdaptivePrompt(safeQuery, enhancedContext);
    
    // Add sophisticated reasoning chain for complex queries
    if (query) {
      const complexity = this.assessQueryComplexity(query, promptContext);
      if (complexity === 'medium' || complexity === 'high' || 
          query.toLowerCase().includes('troubleshoot') || 
          query.toLowerCase().includes('diagnose') ||
          query.toLowerCase().includes('optimize')) {
        
        const reasoningSteps = this.promptService.buildReasoningChain(query, promptContext);
        systemPrompt += `\n\n🔧 SYSTEMATIC APPROACH:\nFollow this enhanced reasoning methodology:\n${reasoningSteps.join('\n')}`;
        
        // Add contextual examples for better guidance
        const domain = this.identifyQueryDomain(query);
        const examples = this.promptService.generateContextualExamples(promptContext, domain);
        if (examples.length > 0) {
          systemPrompt += `\n\n📚 CONTEXTUAL EXAMPLES:\n${examples.join('\n')}`;
        }
      }
    }
    
    return systemPrompt;
  }

  private categorizeQuery(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('performance') || queryLower.includes('slow') || queryLower.includes('optimization')) {
      return 'performance';
    }
    if (queryLower.includes('security') || queryLower.includes('firewall') || queryLower.includes('ssl')) {
      return 'security';
    }
    if (queryLower.includes('deploy') || queryLower.includes('release') || queryLower.includes('update')) {
      return 'deployment';
    }
    if (queryLower.includes('monitor') || queryLower.includes('alert') || queryLower.includes('log')) {
      return 'monitoring';
    }
    if (queryLower.includes('database') || queryLower.includes('sql') || queryLower.includes('query')) {
      return 'database';
    }
    if (queryLower.includes('troubleshoot') || queryLower.includes('error') || queryLower.includes('issue')) {
      return 'troubleshooting';
    }
    
    return 'general';
  }

  private assessQueryComplexity(query: string, context: any): 'low' | 'medium' | 'high' {
    let complexity = 0;
    
    // Query length indicators
    if (query.length > 100) complexity += 1;
    if (query.length > 200) complexity += 1;
    
    // Technical complexity indicators
    const complexTerms = ['troubleshoot', 'diagnose', 'optimize', 'configure', 'integrate', 'migrate', 'cluster', 'distributed', 'performance', 'scaling', 'security', 'deployment'];
    const foundTerms = complexTerms.filter(term => query.toLowerCase().includes(term));
    complexity += Math.min(foundTerms.length, 3);
    
    // Context complexity
    if (context.serverIds && context.serverIds.length > 2) complexity += 1;
    if (context.urgencyLevel === 'high' || context.urgencyLevel === 'critical') complexity += 1;
    
    if (complexity <= 2) return 'low';
    if (complexity <= 4) return 'medium';
    return 'high';
  }

  private identifyQueryDomain(query: string): string {
    const domains = {
      performance: ['slow', 'performance', 'cpu', 'memory', 'disk', 'network'],
      security: ['security', 'access', 'firewall', 'ssl', 'certificate'],
      configuration: ['config', 'setup', 'install', 'configure'],
      monitoring: ['monitor', 'alert', 'log', 'metric'],
      deployment: ['deploy', 'release', 'rollback', 'update'],
      diagnostic: ['troubleshoot', 'diagnose', 'debug', 'error', 'issue']
    };
    
    const queryLower = query.toLowerCase();
    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        return domain;
      }
    }
    
    return 'general';
  }

  // Conversation management methods
  createConversation(userId?: string, title?: string): Conversation {
    return this.conversationStorage.createConversation(userId, title);
  }

  getConversation(conversationId: string): Conversation | undefined {
    return this.conversationStorage.getConversation(conversationId);
  }

  getConversationHistory(conversationId: string, limit?: number): Message[] {
    return this.conversationStorage.getConversationHistory(conversationId, limit);
  }

  getUserConversations(userId: string): Conversation[] {
    return this.conversationStorage.getUserConversations(userId);
  }

  updateConversationContext(conversationId: string, context: any): boolean {
    return this.conversationStorage.updateConversationContext(conversationId, context);
  }

  deleteConversation(conversationId: string): boolean {
    return this.conversationStorage.deleteConversation(conversationId);
  }

  getAllConversations(): Conversation[] {
    return this.conversationStorage.getAllConversations();
  }

  // Tool execution methods
  private async handleToolCalls(conversationId: string, toolCalls: any[], messages: any[]): Promise<{ response: string; conversationId: string; messageId: string; toolCalls: any[]; tokenCount?: number }> {
    const toolResults = [];
    const executedTools = [];

    // Execute each tool call
    for (const toolCall of toolCalls) {
      const { function: func, id: toolCallId } = toolCall;
      const { name: toolName, arguments: toolArgs } = func;

      try {
        const parsedArgs = JSON.parse(toolArgs);
        const result = await this.serverTools.executeTool(toolName, parsedArgs);
        
        toolResults.push({
          tool_call_id: toolCallId,
          role: "tool",
          content: JSON.stringify(result)
        });

        executedTools.push({
          name: toolName,
          arguments: parsedArgs,
          result: result.success ? result.result : { error: result.error },
          success: result.success
        });

        // Add tool execution to conversation
        this.conversationStorage.addMessage(conversationId, 'assistant', `Executed tool: ${toolName}`, {
          toolCall: {
            name: toolName,
            arguments: parsedArgs,
            result,
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        const errorResult = {
          success: false,
          result: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        };

        toolResults.push({
          tool_call_id: toolCallId,
          role: "tool",
          content: JSON.stringify(errorResult)
        });

        executedTools.push({
          name: toolName,
          arguments: JSON.parse(toolArgs),
          result: errorResult,
          success: false
        });
      }
    }

    // Get final response from OpenAI with tool results
    const finalMessages = [
      ...messages,
      {
        role: "assistant",
        content: null,
        tool_calls: toolCalls
      },
      ...toolResults
    ];

    try {
      const finalCompletion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: finalMessages,
        temperature: 0.7,
        max_tokens: 1000
      });

      const finalResponse = finalCompletion.choices[0].message?.content || "Tool execution completed.";
      
      // Add final assistant response to conversation
      const assistantMessage = this.conversationStorage.addMessage(conversationId, 'assistant', finalResponse, {
        toolExecutions: executedTools
      });

      return {
        response: finalResponse,
        conversationId,
        messageId: assistantMessage?.id || '',
        toolCalls: executedTools
      };

    } catch (error) {
      const errorResponse = `Error processing tool results: ${error instanceof Error ? error.message : 'Unknown error'}`;
      const assistantMessage = this.conversationStorage.addMessage(conversationId, 'assistant', errorResponse);
      
      return {
        response: errorResponse,
        conversationId,
        messageId: assistantMessage?.id || '',
        toolCalls: executedTools
      };
    }
  }

  // Get available tools for frontend display
  getAvailableTools() {
    return this.serverTools.getToolDefinitions();
  }

  // Get optimal model parameters based on query complexity and context
  private getOptimalModelParameters(query: string, context: PromptContext): { model: string; temperature: number; maxTokens: number } {
    // Default parameters
    let model = "gpt-4";
    let temperature = 0.7;
    let maxTokens = 1000;

    // Adjust based on urgency
    if (context.urgencyLevel === 'critical' || context.urgencyLevel === 'high') {
      temperature = 0.3; // More focused responses for urgent issues
      maxTokens = 1500; // Allow more detailed emergency responses
    }

    // Adjust based on task complexity
    if (query.length > 200 || context.currentTask?.toLowerCase().includes('diagnostic')) {
      maxTokens = 2000; // Allow more detailed responses for complex queries
      temperature = 0.5; // Balance creativity with precision
    }

    // Adjust based on user expertise
    if (context.userExpertiseLevel === 'expert') {
      temperature = 0.4; // More precise, technical responses
    } else if (context.userExpertiseLevel === 'beginner') {
      maxTokens = 1500; // Allow more explanatory content
      temperature = 0.6; // Slightly more creative explanations
    }

    return { model, temperature, maxTokens };
  }

  // Analyze conversation for learning and improvement
  analyzeConversationPatterns(conversationId: string): any {
    const conversation = this.conversationStorage.getConversation(conversationId);
    if (!conversation) return null;

    const analysis = {
      messageCount: conversation.messages.length,
      toolUsageCount: 0,
      avgResponseTime: 0,
      commonTopics: [] as string[],
      errorPatterns: [] as string[],
      successPatterns: [] as string[]
    };

    // Analyze tool usage patterns
    conversation.messages.forEach(msg => {
      if (msg.metadata?.toolCalls) {
        analysis.toolUsageCount += msg.metadata.toolCalls.length;
      }
      
      // Identify error patterns
      if (msg.content.toLowerCase().includes('error') || msg.content.toLowerCase().includes('failed')) {
        analysis.errorPatterns.push(msg.content.substring(0, 100));
      }
      
      // Identify success patterns
      if (msg.content.toLowerCase().includes('success') || msg.content.toLowerCase().includes('completed')) {
        analysis.successPatterns.push(msg.content.substring(0, 100));
      }
    });

    return analysis;
  }

  // Get prompt templates for frontend display
  getPromptTemplates(): string[] {
    return this.promptService.listTemplates();
  }

  // Add custom prompt template
  addCustomPromptTemplate(name: string, basePrompt: string, enhancements: string[], constraints?: string[]): void {
    this.promptService.addTemplate(name, {
      name,
      basePrompt,
      contextEnhancements: enhancements,
      constraints
    });
  }



  async analyzeServerLogs(logs: string, conversationId?: string): Promise<string> {
    const options: ChatOptions = {
      conversationId,
      context: { currentTask: 'log analysis', diagnosticSession: true },
      includeHistory: true,
      maxHistoryMessages: 5
    };

    // Enhanced log analysis with specialized prompting
    const enhancedOptions = {
      ...options,
      context: {
        ...options.context,
        currentTask: 'log analysis',
        diagnosticSession: true,
        urgencyLevel: 'medium'
      }
    };
    
    const result = await this.processQueryWithContext(
      `Please analyze these server logs and provide insights about potential issues and recommendations:\n\n${logs}`,
      enhancedOptions
    );

    return result.response;
  }

  async generateServerConfig(prompt: string, conversationId?: string): Promise<string> {
    const options: ChatOptions = {
      conversationId,
      context: { currentTask: 'configuration generation' },
      includeHistory: true,
      maxHistoryMessages: 5
    };

    const systemPrompt = "You are an expert in server configuration. Generate valid configuration files based on user requirements. Provide complete, working configurations with explanations.";
    
    // Enhanced configuration generation with specialized prompting
    const enhancedOptions = {
      ...options,
      context: {
        ...options.context,
        currentTask: 'configuration generation',
        urgencyLevel: 'low'
      }
    };
    
    const result = await this.processQueryWithContext(
      `Generate server configuration based on these requirements:\n\n${prompt}`,
      enhancedOptions
    );

    return result.response;
  }
}
