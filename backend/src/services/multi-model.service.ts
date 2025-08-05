import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export interface ModelProvider {
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'local';
  models: string[];
  capabilities: ModelCapability[];
  costPerToken: number;
  maxTokens: number;
  reliability: number; // 0-1 score
}

export interface ModelCapability {
  type: 'reasoning' | 'coding' | 'analysis' | 'creative' | 'multimodal' | 'function-calling';
  strength: number; // 0-1 score
}

export interface ModelSelection {
  provider: string;
  model: string;
  reasoning: string;
  estimatedCost: number;
  confidence: number;
}

export interface MultiModelRequest {
  query: string;
  context?: any;
  taskType?: 'diagnostic' | 'analysis' | 'creative' | 'technical' | 'general';
  priorityFactors?: {
    cost?: number;      // 0-1, higher = more cost-conscious
    speed?: number;     // 0-1, higher = need faster response
    quality?: number;   // 0-1, higher = need better quality
    reliability?: number; // 0-1, higher = need more reliable
  };
  userPreferences?: {
    preferredProviders?: string[];
    maxCostPerQuery?: number;
    qualityThreshold?: number;
  };
}

export interface MultiModelResponse {
  response: string;
  provider: string;
  model: string;
  tokenCount: number;
  cost: number;
  processingTime: number;
  confidence: number;
  alternatives?: {
    provider: string;
    model: string;
    estimatedQuality: number;
    estimatedCost: number;
  }[];
}

export class MultiModelService {
  private providers = new Map<string, ModelProvider>();
  private clients = new Map<string, any>();
  private usageStats = new Map<string, any>();

  constructor() {
    this.initializeProviders();
    this.initializeClients();
  }

  private initializeProviders(): void {
    // OpenAI Provider
    this.providers.set('openai', {
      name: 'OpenAI',
      type: 'openai',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      capabilities: [
        { type: 'reasoning', strength: 0.9 },
        { type: 'coding', strength: 0.85 },
        { type: 'analysis', strength: 0.9 },
        { type: 'function-calling', strength: 0.95 }
      ],
      costPerToken: 0.00003, // Approximate cost per token
      maxTokens: 4096,
      reliability: 0.95
    });

    // Anthropic Provider (Claude) - Simulated for demonstration
    this.providers.set('anthropic', {
      name: 'Anthropic',
      type: 'anthropic',
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      capabilities: [
        { type: 'reasoning', strength: 0.95 },
        { type: 'analysis', strength: 0.9 },
        { type: 'creative', strength: 0.85 },
        { type: 'coding', strength: 0.8 }
      ],
      costPerToken: 0.000025,
      maxTokens: 4096,
      reliability: 0.92
    });

    // Google Provider - Simulated for demonstration
    this.providers.set('google', {
      name: 'Google',
      type: 'google',
      models: ['gemini-pro', 'gemini-pro-vision'],
      capabilities: [
        { type: 'reasoning', strength: 0.85 },
        { type: 'multimodal', strength: 0.9 },
        { type: 'analysis', strength: 0.8 },
        { type: 'coding', strength: 0.75 }
      ],
      costPerToken: 0.00002,
      maxTokens: 2048,
      reliability: 0.88
    });

    console.log('🤖 Multi-Model Service initialized with', this.providers.size, 'providers');
  }

  private initializeClients(): void {
    // Initialize OpenAI client
    if (process.env.OPENAI_API_KEY) {
      this.clients.set('openai', new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      }));
    }

    // For demo purposes, other providers would be initialized here
    // this.clients.set('anthropic', new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));
    // this.clients.set('google', new GoogleGenerativeAI(process.env.GOOGLE_API_KEY));
  }

  async processRequest(request: MultiModelRequest): Promise<MultiModelResponse> {
    const startTime = Date.now();
    
    // Select optimal model for this request
    const selection = await this.selectOptimalModel(request);
    
    console.log(`🎯 Selected ${selection.provider}/${selection.model} - ${selection.reasoning}`);
    
    // Process request with selected model
    const response = await this.executeWithModel(selection, request);
    
    // Update usage statistics
    await this.updateUsageStats(selection.provider, selection.model, response);
    
    const processingTime = Date.now() - startTime;
    
    return {
      ...response,
      processingTime,
      alternatives: await this.getAlternatives(request, selection)
    };
  }

  private async selectOptimalModel(request: MultiModelRequest): Promise<ModelSelection> {
    const candidates: ModelSelection[] = [];
    
    for (const [providerId, provider] of this.providers.entries()) {
      for (const model of provider.models) {
        const score = this.calculateModelScore(provider, model, request);
        const estimatedCost = this.estimateCost(provider, request.query);
        
        candidates.push({
          provider: providerId,
          model,
          reasoning: this.generateSelectionReasoning(provider, model, score, request),
          estimatedCost,
          confidence: score
        });
      }
    }
    
    // Sort by confidence score (higher is better)
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    // Apply user preferences and constraints
    const filtered = this.applyUserPreferences(candidates, request.userPreferences);
    
    return filtered[0] || candidates[0];
  }

  private calculateModelScore(provider: ModelProvider, model: string, request: MultiModelRequest): number {
    let score = 0;
    const weights = {
      cost: request.priorityFactors?.cost || 0.2,
      speed: request.priorityFactors?.speed || 0.2,
      quality: request.priorityFactors?.quality || 0.4,
      reliability: request.priorityFactors?.reliability || 0.2
    };
    
    // Task-specific capability scoring
    const taskCapabilityMap = {
      'diagnostic': ['reasoning', 'analysis'],
      'analysis': ['analysis', 'reasoning'],
      'creative': ['creative', 'reasoning'],
      'technical': ['coding', 'function-calling'],
      'general': ['reasoning', 'analysis']
    };
    
    const relevantCapabilities = taskCapabilityMap[request.taskType || 'general'];
    
    // Calculate capability score
    let capabilityScore = 0;
    for (const cap of relevantCapabilities) {
      const capability = provider.capabilities.find(c => c.type === cap);
      if (capability) {
        capabilityScore += capability.strength;
      }
    }
    capabilityScore = capabilityScore / relevantCapabilities.length;
    
    // Quality score (based on capability)
    score += weights.quality * capabilityScore;
    
    // Reliability score
    score += weights.reliability * provider.reliability;
    
    // Cost score (inverted - lower cost = higher score)
    const costScore = Math.max(0, 1 - (provider.costPerToken * 1000000)); // Normalize cost
    score += weights.cost * costScore;
    
    // Speed score (simplified - assume smaller models are faster)
    const speedScore = model.includes('turbo') || model.includes('haiku') ? 0.9 : 
                      model.includes('3.5') || model.includes('sonnet') ? 0.7 : 0.5;
    score += weights.speed * speedScore;
    
    // Apply model-specific bonuses
    if (model === 'gpt-4' && request.taskType === 'diagnostic') score += 0.1;
    if (model.includes('claude') && request.taskType === 'analysis') score += 0.1;
    
    return Math.min(1, score); // Cap at 1.0
  }

  private generateSelectionReasoning(provider: ModelProvider, model: string, score: number, request: MultiModelRequest): string {
    const reasons = [];
    
    if (score > 0.8) reasons.push('high overall capability match');
    if (provider.reliability > 0.9) reasons.push('excellent reliability');
    if (provider.costPerToken < 0.000025) reasons.push('cost-effective');
    
    const taskReasons = {
      'diagnostic': 'strong reasoning and analysis capabilities',
      'analysis': 'excellent analytical capabilities',
      'creative': 'creative and reasoning strengths',
      'technical': 'coding and function-calling expertise',
      'general': 'well-rounded capabilities'
    };
    
    reasons.push(taskReasons[request.taskType || 'general']);
    
    return reasons.join(', ');
  }

  private estimateCost(provider: ModelProvider, query: string): number {
    // Simple token estimation (actual implementation would be more sophisticated)
    const estimatedTokens = query.length / 4; // Rough approximation
    return estimatedTokens * provider.costPerToken;
  }

  private applyUserPreferences(candidates: ModelSelection[], preferences?: MultiModelRequest['userPreferences']): ModelSelection[] {
    if (!preferences) return candidates;
    
    let filtered = candidates;
    
    // Filter by preferred providers
    if (preferences.preferredProviders?.length) {
      filtered = filtered.filter(c => preferences.preferredProviders!.includes(c.provider));
    }
    
    // Filter by max cost
    if (preferences.maxCostPerQuery) {
      filtered = filtered.filter(c => c.estimatedCost <= preferences.maxCostPerQuery!);
    }
    
    // Filter by quality threshold
    if (preferences.qualityThreshold) {
      filtered = filtered.filter(c => c.confidence >= preferences.qualityThreshold!);
    }
    
    return filtered.length > 0 ? filtered : candidates; // Fallback to original if filters too restrictive
  }

  private async executeWithModel(selection: ModelSelection, request: MultiModelRequest): Promise<Omit<MultiModelResponse, 'processingTime' | 'alternatives'>> {
    const client = this.clients.get(selection.provider);
    
    if (!client) {
      console.warn(`⚠️ No client available for ${selection.provider}, falling back to OpenAI`);
      return this.executeWithOpenAI(request, selection);
    }
    
    switch (selection.provider) {
      case 'openai':
        return this.executeWithOpenAI(request, selection);
      
      case 'anthropic':
        // For demo - would implement actual Anthropic client
        return this.simulateProviderResponse(selection, request, 'anthropic');
      
      case 'google':
        // For demo - would implement actual Google client
        return this.simulateProviderResponse(selection, request, 'google');
      
      default:
        throw new Error(`Unsupported provider: ${selection.provider}`);
    }
  }

  private async executeWithOpenAI(request: MultiModelRequest, selection: ModelSelection): Promise<Omit<MultiModelResponse, 'processingTime' | 'alternatives'>> {
    const client = this.clients.get('openai');
    
    const completion = await client.chat.completions.create({
      model: selection.model,
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt(request)
        },
        {
          role: 'user',
          content: request.query
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0].message?.content || 'No response generated';
    const tokenCount = completion.usage?.total_tokens || 0;
    const cost = tokenCount * (this.providers.get('openai')?.costPerToken || 0);

    return {
      response,
      provider: selection.provider,
      model: selection.model,
      tokenCount,
      cost,
      confidence: selection.confidence
    };
  }

  private async simulateProviderResponse(selection: ModelSelection, request: MultiModelRequest, providerName: string): Promise<Omit<MultiModelResponse, 'processingTime' | 'alternatives'>> {
    // Simulate response for demo purposes
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    const simulatedResponses = {
      anthropic: `[Simulated ${providerName} Response] Based on my analysis of your server management query: "${request.query}", I recommend a systematic approach focusing on diagnostic protocols and preventive measures.`,
      google: `[Simulated ${providerName} Response] Analyzing your server infrastructure query: "${request.query}". My multimodal analysis suggests implementing monitoring solutions and automated response protocols.`
    };

    return {
      response: simulatedResponses[providerName as keyof typeof simulatedResponses] || 'Simulated response',
      provider: selection.provider,
      model: selection.model,
      tokenCount: 150,
      cost: selection.estimatedCost,
      confidence: selection.confidence
    };
  }

  private buildSystemPrompt(request: MultiModelRequest): string {
    const taskPrompts = {
      'diagnostic': 'You are an expert server diagnostics specialist. Provide systematic, technical analysis with actionable recommendations.',
      'analysis': 'You are a senior systems analyst. Provide comprehensive analysis with data-driven insights and strategic recommendations.',
      'creative': 'You are a creative problem solver. Think outside the box while maintaining technical accuracy.',
      'technical': 'You are a senior software engineer and DevOps expert. Provide precise technical solutions with implementation details.',
      'general': 'You are an expert server management AI assistant. Provide clear, actionable guidance.'
    };

    let prompt = taskPrompts[request.taskType || 'general'];
    
    if (request.context) {
      prompt += `\n\nContext: ${JSON.stringify(request.context)}`;
    }
    
    return prompt;
  }

  private async updateUsageStats(provider: string, model: string, response: any): Promise<void> {
    const key = `${provider}:${model}`;
    const existing = this.usageStats.get(key) || {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageConfidence: 0,
      lastUsed: new Date()
    };

    existing.totalRequests++;
    existing.totalTokens += response.tokenCount;
    existing.totalCost += response.cost;
    existing.averageConfidence = (existing.averageConfidence * (existing.totalRequests - 1) + response.confidence) / existing.totalRequests;
    existing.lastUsed = new Date();

    this.usageStats.set(key, existing);
  }

  private async getAlternatives(request: MultiModelRequest, selectedModel: ModelSelection): Promise<MultiModelResponse['alternatives']> {
    const alternatives = [];
    
    for (const [providerId, provider] of this.providers.entries()) {
      if (providerId === selectedModel.provider) continue;
      
      const bestModel = provider.models[0]; // Simplified - take first model
      const score = this.calculateModelScore(provider, bestModel, request);
      const cost = this.estimateCost(provider, request.query);
      
      alternatives.push({
        provider: providerId,
        model: bestModel,
        estimatedQuality: score,
        estimatedCost: cost
      });
    }
    
    return alternatives.slice(0, 3); // Return top 3 alternatives
  }

  // Public API methods
  async getAvailableProviders(): Promise<ModelProvider[]> {
    return Array.from(this.providers.values());
  }

  async getUsageStats(): Promise<any> {
    return Object.fromEntries(this.usageStats.entries());
  }

  async optimizeProviderSelection(userId?: string): Promise<void> {
    // This would analyze usage patterns and optimize model selection
    // for future requests based on success rates, user satisfaction, etc.
    console.log('🔄 Optimizing provider selection based on usage patterns...');
  }

  // Health check for all providers
  async healthCheck(): Promise<{[provider: string]: boolean}> {
    const health: {[provider: string]: boolean} = {};
    
    for (const [providerId] of this.providers.entries()) {
      try {
        const client = this.clients.get(providerId);
        health[providerId] = !!client; // Simplified health check
      } catch (error) {
        health[providerId] = false;
      }
    }
    
    return health;
  }
}
