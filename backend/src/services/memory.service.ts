import { Conversation } from '../models/conversation.model';

export interface UserPreference {
  userId: string;
  category: 'communication' | 'technical' | 'automation' | 'notification';
  key: string;
  value: any;
  confidence: number;
  lastUpdated: Date;
  source: 'explicit' | 'inferred' | 'learned';
}

export interface ProblemPattern {
  id: string;
  pattern: string;
  category: string;
  symptoms: string[];
  commonSolutions: Solution[];
  successRate: number;
  occurrenceCount: number;
  serverTypes: string[];
  contextFactors: string[];
  lastOccurrence: Date;
}

export interface Solution {
  description: string;
  steps: string[];
  successRate: number;
  executionTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  prerequisites: string[];
}

export interface MemoryContext {
  userId?: string;
  serverId?: string;
  conversationId?: string;
  timeframe?: 'recent' | 'historical' | 'all';
  category?: string[];
}

export class MemoryService {
  private userPreferences = new Map<string, UserPreference[]>();
  private problemPatterns = new Map<string, ProblemPattern>();
  private conversationInsights = new Map<string, any[]>();
  private serverProfiles = new Map<string, any>();

  constructor() {
    this.initializeMemorySystem();
  }

  private initializeMemorySystem(): void {
    // Initialize with some default patterns and preferences
    console.log('🧠 Memory Service initialized with advanced learning capabilities');
  }

  // User Preference Management
  async learnUserPreference(userId: string, category: UserPreference['category'], key: string, value: any, source: UserPreference['source'] = 'inferred'): Promise<void> {
    const preferences = this.userPreferences.get(userId) || [];
    
    const existingIndex = preferences.findIndex(p => p.category === category && p.key === key);
    
    if (existingIndex >= 0) {
      // Update existing preference
      preferences[existingIndex] = {
        ...preferences[existingIndex],
        value,
        confidence: source === 'explicit' ? 1.0 : Math.min(preferences[existingIndex].confidence + 0.1, 0.9),
        lastUpdated: new Date(),
        source
      };
    } else {
      // Add new preference
      preferences.push({
        userId,
        category,
        key,
        value,
        confidence: source === 'explicit' ? 1.0 : 0.6,
        lastUpdated: new Date(),
        source
      });
    }
    
    this.userPreferences.set(userId, preferences);
  }

  async getUserPreferences(userId: string, category?: UserPreference['category']): Promise<UserPreference[]> {
    const preferences = this.userPreferences.get(userId) || [];
    return category ? preferences.filter(p => p.category === category) : preferences;
  }

  // Problem Pattern Recognition and Learning
  async learnProblemPattern(symptoms: string[], solution: Solution, success: boolean, serverId: string, category: string = 'general'): Promise<void> {
    const patternKey = this.generatePatternKey(symptoms, category);
    const existingPattern = this.problemPatterns.get(patternKey);

    if (existingPattern) {
      // Update existing pattern
      existingPattern.occurrenceCount++;
      existingPattern.lastOccurrence = new Date();
      
      if (success) {
        // Add or update solution
        const solutionIndex = existingPattern.commonSolutions.findIndex(s => s.description === solution.description);
        if (solutionIndex >= 0) {
          existingPattern.commonSolutions[solutionIndex].successRate = 
            (existingPattern.commonSolutions[solutionIndex].successRate + (success ? 1 : 0)) / 2;
        } else {
          existingPattern.commonSolutions.push({
            ...solution,
            successRate: success ? 1.0 : 0.0
          });
        }
        
        // Update overall success rate
        existingPattern.successRate = existingPattern.commonSolutions.reduce((avg, s) => avg + s.successRate, 0) / existingPattern.commonSolutions.length;
      }

      if (!existingPattern.serverTypes.includes(serverId)) {
        existingPattern.serverTypes.push(serverId);
      }
    } else {
      // Create new pattern
      const newPattern: ProblemPattern = {
        id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        pattern: patternKey,
        category,
        symptoms,
        commonSolutions: [{ ...solution, successRate: success ? 1.0 : 0.0 }],
        successRate: success ? 1.0 : 0.0,
        occurrenceCount: 1,
        serverTypes: [serverId],
        contextFactors: [],
        lastOccurrence: new Date()
      };
      
      this.problemPatterns.set(patternKey, newPattern);
    }
  }

  async findSimilarPatterns(symptoms: string[], category?: string, threshold: number = 0.7): Promise<ProblemPattern[]> {
    const patterns = Array.from(this.problemPatterns.values());
    
    return patterns
      .filter(pattern => !category || pattern.category === category)
      .map(pattern => ({
        pattern,
        similarity: this.calculateSimilarity(symptoms, pattern.symptoms)
      }))
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .map(result => result.pattern);
  }

  private generatePatternKey(symptoms: string[], category: string): string {
    const sortedSymptoms = symptoms.map(s => s.toLowerCase().trim()).sort();
    return `${category}:${sortedSymptoms.join('|')}`;
  }

  private calculateSimilarity(symptoms1: string[], symptoms2: string[]): number {
    const set1 = new Set(symptoms1.map(s => s.toLowerCase()));
    const set2 = new Set(symptoms2.map(s => s.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // Conversation Insights and Learning
  async analyzeConversation(conversation: Conversation): Promise<any> {
    const insights = {
      communicationStyle: this.inferCommunicationStyle(conversation),
      technicalLevel: this.inferTechnicalLevel(conversation),
      commonTopics: this.extractCommonTopics(conversation),
      preferredSolutions: this.identifyPreferredSolutions(conversation),
      responsePatterns: this.analyzeResponsePatterns(conversation)
    };

    this.conversationInsights.set(conversation.id, [
      ...(this.conversationInsights.get(conversation.id) || []),
      insights
    ]);

    return insights;
  }

  private inferCommunicationStyle(conversation: Conversation): string {
    const messages = conversation.messages.filter(m => m.role === 'user');
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    const avgLength = totalLength / messages.length;
    
    if (avgLength > 200) return 'detailed';
    if (avgLength > 100) return 'moderate';
    return 'concise';
  }

  private inferTechnicalLevel(conversation: Conversation): string {
    const technicalTerms = [
      'docker', 'kubernetes', 'nginx', 'apache', 'mysql', 'postgresql', 'redis',
      'ssh', 'systemctl', 'bash', 'shell', 'api', 'endpoint', 'microservices',
      'load balancer', 'proxy', 'firewall', 'ssl', 'tls', 'certificate'
    ];
    
    const messages = conversation.messages.filter(m => m.role === 'user');
    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    
    const technicalTermCount = technicalTerms.filter(term => content.includes(term)).length;
    
    if (technicalTermCount > 10) return 'expert';
    if (technicalTermCount > 5) return 'intermediate';
    if (technicalTermCount > 2) return 'beginner-plus';
    return 'beginner';
  }

  private extractCommonTopics(conversation: Conversation): string[] {
    const messages = conversation.messages;
    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    
    const topics = [
      'performance', 'security', 'deployment', 'monitoring', 'database',
      'configuration', 'troubleshooting', 'optimization', 'backup', 'scaling'
    ];
    
    return topics.filter(topic => content.includes(topic));
  }

  private identifyPreferredSolutions(conversation: Conversation): string[] {
    // This would analyze user responses to identify which types of solutions they prefer
    return ['automated', 'step-by-step', 'explanation-focused'];
  }

  private analyzeResponsePatterns(conversation: Conversation): any {
    const userMessages = conversation.messages.filter(m => m.role === 'user');
    
    return {
      questioningStyle: userMessages.some(m => m.content.includes('?')) ? 'inquisitive' : 'directive',
      urgencyLevel: userMessages.some(m => m.content.toLowerCase().includes('urgent')) ? 'high' : 'normal',
      followUpTendency: userMessages.length > 5 ? 'high' : 'normal'
    };
  }

  // Server Profile Learning
  async updateServerProfile(serverId: string, metrics: any, issues: string[], resolutions: string[]): Promise<void> {
    const existingProfile = this.serverProfiles.get(serverId) || {
      serverId,
      commonIssues: new Map(),
      performanceBaseline: {},
      maintenancePatterns: {},
      riskFactors: [],
      lastUpdated: new Date()
    };

    // Update common issues
    issues.forEach(issue => {
      const count = existingProfile.commonIssues.get(issue) || 0;
      existingProfile.commonIssues.set(issue, count + 1);
    });

    // Update performance baseline
    if (metrics) {
      existingProfile.performanceBaseline = {
        ...existingProfile.performanceBaseline,
        cpu: this.updateBaseline(existingProfile.performanceBaseline.cpu, metrics.cpu),
        memory: this.updateBaseline(existingProfile.performanceBaseline.memory, metrics.memory),
        disk: this.updateBaseline(existingProfile.performanceBaseline.disk, metrics.disk),
        lastUpdated: new Date()
      };
    }

    existingProfile.lastUpdated = new Date();
    this.serverProfiles.set(serverId, existingProfile);
  }

  private updateBaseline(existing: any, newValue: number): any {
    if (!existing) {
      return { min: newValue, max: newValue, avg: newValue, count: 1 };
    }
    
    return {
      min: Math.min(existing.min, newValue),
      max: Math.max(existing.max, newValue),
      avg: (existing.avg * existing.count + newValue) / (existing.count + 1),
      count: existing.count + 1
    };
  }

  // Memory Retrieval and Context
  async getRelevantMemory(context: MemoryContext): Promise<any> {
    const result: any = {};
    
    if (context.userId) {
      result.userPreferences = await this.getUserPreferences(context.userId);
      result.conversationInsights = this.conversationInsights.get(context.conversationId || '') || [];
    }
    
    if (context.serverId) {
      result.serverProfile = this.serverProfiles.get(context.serverId);
    }
    
    if (context.category) {
      result.patterns = [];
      for (const category of context.category) {
        const categoryPatterns = Array.from(this.problemPatterns.values())
          .filter(p => p.category === category);
        result.patterns.push(...categoryPatterns);
      }
    }
    
    return result;
  }

  // Memory Statistics and Health
  getMemoryStats(): any {
    return {
      userPreferences: this.userPreferences.size,
      problemPatterns: this.problemPatterns.size,
      conversationInsights: this.conversationInsights.size,
      serverProfiles: this.serverProfiles.size,
      totalMemoryItems: this.userPreferences.size + this.problemPatterns.size + 
                        this.conversationInsights.size + this.serverProfiles.size
    };
  }

  // Memory cleanup and optimization
  async optimizeMemory(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Clean old patterns with low success rates
    for (const [key, pattern] of this.problemPatterns.entries()) {
      if (pattern.lastOccurrence < thirtyDaysAgo && pattern.successRate < 0.3) {
        this.problemPatterns.delete(key);
      }
    }
    
    // Clean old conversation insights (keep only recent ones)
    for (const [conversationId, insights] of this.conversationInsights.entries()) {
      this.conversationInsights.set(conversationId, insights.slice(-5)); // Keep last 5
    }
    
    console.log('🧠 Memory optimized - removed outdated patterns and insights');
  }
}
