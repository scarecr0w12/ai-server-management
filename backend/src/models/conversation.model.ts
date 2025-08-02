export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    toolCalls?: any[];
    functionName?: string;
    tokenCount?: number;
  };
}

export interface Conversation {
  id: string;
  userId?: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  context?: {
    serverIds?: string[];
    currentTask?: string;
    diagnosticSession?: boolean;
  };
}

export class ConversationStorage {
  private conversations: Map<string, Conversation> = new Map();
  private userConversations: Map<string, string[]> = new Map();

  generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createConversation(userId?: string, title?: string): Conversation {
    const conversation: Conversation = {
      id: this.generateId(),
      userId,
      title: title || 'New Conversation',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      context: {}
    };

    this.conversations.set(conversation.id, conversation);

    if (userId) {
      const userConvs = this.userConversations.get(userId) || [];
      userConvs.push(conversation.id);
      this.userConversations.set(userId, userConvs);
    }

    return conversation;
  }

  getConversation(conversationId: string): Conversation | undefined {
    return this.conversations.get(conversationId);
  }

  addMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: any): Message | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    const message: Message = {
      id: this.generateMessageId(),
      conversationId,
      role,
      content,
      timestamp: new Date(),
      metadata
    };

    conversation.messages.push(message);
    conversation.updatedAt = new Date();

    // Update conversation title if it's the first user message
    if (role === 'user' && conversation.messages.length === 1) {
      conversation.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
    }

    return message;
  }

  getConversationHistory(conversationId: string, limit?: number): Message[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];

    const messages = conversation.messages;
    return limit ? messages.slice(-limit) : messages;
  }

  getUserConversations(userId: string): Conversation[] {
    const conversationIds = this.userConversations.get(userId) || [];
    return conversationIds
      .map(id => this.conversations.get(id))
      .filter(conv => conv !== undefined) as Conversation[];
  }

  updateConversationContext(conversationId: string, context: any): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;

    conversation.context = { ...conversation.context, ...context };
    conversation.updatedAt = new Date();
    return true;
  }

  deleteConversation(conversationId: string): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;

    this.conversations.delete(conversationId);

    if (conversation.userId) {
      const userConvs = this.userConversations.get(conversation.userId) || [];
      const index = userConvs.indexOf(conversationId);
      if (index > -1) {
        userConvs.splice(index, 1);
        this.userConversations.set(conversation.userId, userConvs);
      }
    }

    return true;
  }

  // Get all conversations
  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  // Get messages in OpenAI format for API calls
  getMessagesForOpenAI(conversationId: string, includeSystem: boolean = true): any[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];

    return conversation.messages
      .filter(msg => includeSystem || msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : msg.role,
        content: msg.content
      }));
  }
}
