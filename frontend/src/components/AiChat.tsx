import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Drawer,
  AppBar,
  Toolbar,
  Button,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Badge
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TimelineIcon from '@mui/icons-material/Timeline';
import SettingsIcon from '@mui/icons-material/Settings';
import { useSocket } from '../hooks/useSocket';

interface Message {
  id: string;
  conversationId?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: {
    toolCalls?: any[];
    functionName?: string;
    tokenCount?: number;
    promptTemplate?: string;
    reasoningChain?: string[];
    contextInfo?: {
      urgencyLevel?: string;
      expertiseLevel?: string;
      serverIds?: string[];
      currentTask?: string;
    };
    isToolExecution?: boolean;
    toolCall?: any;
  };
}

interface Conversation {
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

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('general');
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [expertiseLevel, setExpertiseLevel] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [conversationAnalysis, setConversationAnalysis] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (socket) {
      // Load initial conversations and templates
      socket.emit('ai:get-conversations');
      socket.emit('ai:get-prompt-templates');

      // Listen for AI responses
      socket.on('ai:response', (data: { response: string; conversationId: string; message: Message }) => {
        console.log('Received AI response:', data);
        setMessages(prevMessages => [...prevMessages, data.message]);
        setLoading(false);
        
        // Update conversation in list
        setConversations(prev => prev.map(conv => 
          conv.id === data.conversationId 
            ? { ...conv, updatedAt: new Date() }
            : conv
        ));
        
        // Load conversation analysis if available
        if (data.conversationId) {
          loadConversationAnalysis(data.conversationId);
        }
      });

      // Listen for conversation updates
      socket.on('ai:conversations', (convs: Conversation[]) => {
        setConversations(convs);
        if (!currentConversationId && convs.length > 0) {
          setCurrentConversationId(convs[0].id);
        }
      });

      socket.on('ai:conversation-created', (conversation: Conversation) => {
        setConversations(prev => [conversation, ...prev]);
        setCurrentConversationId(conversation.id);
        setMessages([]);
      });

      socket.on('ai:conversation-messages', (data: { conversationId: string; messages: Message[] }) => {
        if (data.conversationId === currentConversationId) {
          setMessages(data.messages);
        }
      });

      // Listen for prompt templates
      socket.on('ai:prompt-templates', (templates: string[]) => {
        setPromptTemplates(templates);
      });

      // Listen for conversation analysis
      socket.on('ai:conversation-analysis', (analysis: any) => {
        setConversationAnalysis(analysis);
      });

      return () => {
        socket.off('ai:response');
        socket.off('ai:conversations');
        socket.off('ai:conversation-created');
        socket.off('ai:conversation-messages');
        socket.off('ai:prompt-templates');
        socket.off('ai:conversation-analysis');
      };
    }
  }, [socket, currentConversationId]);

  const loadConversation = (conversationId: string) => {
    socket.emit('ai:get-conversation', conversationId);
  };

  const deleteConversation = (conversationId: string) => {
    socket.emit('ai:delete-conversation', conversationId);
  };

  const loadConversationAnalysis = (conversationId: string) => {
    if (socket) {
      socket.emit('ai:analyze-conversation', { conversationId });
    }
  };

  const handleSendMessage = () => {
    if (input.trim() && socket && currentConversationId) {
      const userMessage: Message = {
        id: Date.now().toString(),
        conversationId: currentConversationId,
        role: 'user',
        content: input.trim(),
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, userMessage]);
      setLoading(true);
      
      // Include prompt engineering context
      socket.emit('ai:query', {
        query: input.trim(),
        conversationId: currentConversationId,
        includeHistory: true,
        context: {
          promptTemplate: selectedTemplate,
          urgencyLevel,
          expertiseLevel,
          customSettings: {
            temperature: urgencyLevel === 'critical' ? 0.3 : 0.7,
            maxTokens: expertiseLevel === 'beginner' ? 1500 : 1000
          }
        }
      });
      
      setInput('');
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      {/* Conversation History Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: 300,
          '& .MuiDrawer-paper': {
            width: 300,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            fullWidth
            onClick={() => socket.emit('ai:create-conversation', { userId: 'user-' + Math.random().toString(36).substr(2, 9), title: 'New Chat' })}
            sx={{ mb: 2 }}
          >
            New Conversation
          </Button>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Conversations
          </Typography>
          <List>
            {conversations.map((conversation) => (
              <ListItem
                key={conversation.id}
                button
                selected={conversation.id === currentConversationId}
                onClick={() => loadConversation(conversation.id)}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  mb: 1,
                  '&.Mui-selected': {
                    backgroundColor: '#e3f2fd',
                  }
                }}
              >
                <ListItemText
                  primary={conversation.title}
                  secondary={
                    <Box>
                      <Typography variant="caption">
                        {new Date(conversation.updatedAt).toLocaleDateString()}
                      </Typography>
                      {conversation.context?.currentTask && (
                        <Chip
                          label={conversation.context.currentTask}
                          size="small"
                          sx={{ ml: 1, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  }
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conversation.id);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <IconButton
              color="inherit"
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{ mr: 2 }}
            >
              <HistoryIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              AI Chat
              {currentConversationId && (
                <Chip
                  label={`Conversation: ${currentConversationId.substr(0, 8)}...`}
                  size="small"
                  sx={{ ml: 2, color: 'white', backgroundColor: 'rgba(255,255,255,0.2)' }}
                />
              )}
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Messages Area */}
        <Paper elevation={1} sx={{ flex: 1, p: 2, overflow: 'auto' }}>
          {messages.map((message, index) => {
            const isToolExecution = message.metadata?.isToolExecution;
            const toolCalls = message.metadata?.toolCalls || [];
            
            return (
              <Box
                key={message.id || index}
                sx={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  mb: 1,
                }}
              >
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    backgroundColor: 
                      message.role === 'user' ? '#1976d2' : 
                      message.role === 'system' ? '#fff3e0' : '#f5f5f5',
                    color: message.role === 'user' ? 'white' : 'black',
                    border: isToolExecution ? '2px solid #ff9800' : 'none',
                  }}
                >
                  <Typography variant="body1">{message.content}</Typography>
                  
                  {/* Display tool execution details */}
                  {isToolExecution && message.metadata?.toolCall && (
                    <Box sx={{ mt: 1, p: 1, backgroundColor: 'rgba(255,152,0,0.1)', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                        Arguments: {JSON.stringify(message.metadata.toolCall.arguments, null, 2)}
                      </Typography>
                      <br />
                      <Typography variant="caption" sx={{ 
                        color: message.metadata.toolCall.success ? 'green' : 'red',
                        fontWeight: 'bold'
                      }}>
                        Status: {message.metadata.toolCall.success ? '✅ Success' : '❌ Failed'}
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Display tool calls summary for assistant messages */}
                  {toolCalls.length > 0 && message.role === 'assistant' && (
                    <Box sx={{ mt: 1 }}>
                      {toolCalls.map((toolCall: any, toolIndex: number) => (
                        <Chip
                          key={toolIndex}
                          label={`🔧 ${toolCall.name}`}
                          size="small"
                          color={toolCall.success ? 'success' : 'error'}
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}
                  
                  {/* Context and Template Information */}
                  {message.metadata?.contextInfo && (
                    <Box sx={{ mt: 1, mb: 1 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                        {message.metadata.promptTemplate && (
                          <Chip
                            icon={<PsychologyIcon />}
                            label={`Template: ${message.metadata.promptTemplate}`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        )}
                        {message.metadata.contextInfo.urgencyLevel && (
                          <Chip
                            label={`Urgency: ${message.metadata.contextInfo.urgencyLevel}`}
                            size="small"
                            color={message.metadata.contextInfo.urgencyLevel === 'critical' ? 'error' : 'default'}
                            variant="outlined"
                          />
                        )}
                        {message.metadata.contextInfo.expertiseLevel && (
                          <Chip
                            label={`Level: ${message.metadata.contextInfo.expertiseLevel}`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  )}
                  
                  {/* Reasoning Chain Display */}
                  {message.metadata?.reasoningChain && message.metadata.reasoningChain.length > 0 && (
                    <Accordion sx={{ mt: 1, mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TimelineIcon fontSize="small" />
                          Reasoning Process ({message.metadata.reasoningChain.length} steps)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List dense>
                          {message.metadata.reasoningChain.map((step, index) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={`${index + 1}. ${step}`}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  )}
                  
                  {message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Tool executions:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {message.metadata.toolCalls.map((tool, index) => (
                          <Chip
                            key={index}
                            label={tool.function?.name || 'Unknown tool'}
                            size="small"
                            color={tool.success === false ? 'error' : 'primary'}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            );
          })}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
              <Paper elevation={2} sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                <CircularProgress size={20} />
                <Typography variant="body1" sx={{ ml: 1, display: 'inline' }}>
                  AI is thinking...
                </Typography>
              </Paper>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Paper>

        {/* Prompt Engineering Controls */}
        <Accordion sx={{ mx: 2, mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SettingsIcon fontSize="small" />
              AI Settings & Context
              {conversationAnalysis && (
                <Badge badgeContent={conversationAnalysis.toolUsageCount} color="primary" sx={{ ml: 1 }}>
                  <TimelineIcon fontSize="small" />
                </Badge>
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Template</InputLabel>
                  <Select
                    value={selectedTemplate}
                    label="Template"
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                  >
                    {promptTemplates.map((template) => (
                      <MenuItem key={template} value={template}>
                        {template.charAt(0).toUpperCase() + template.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Urgency</InputLabel>
                  <Select
                    value={urgencyLevel}
                    label="Urgency"
                    onChange={(e) => setUrgencyLevel(e.target.value as any)}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Expertise</InputLabel>
                  <Select
                    value={expertiseLevel}
                    label="Expertise"
                    onChange={(e) => setExpertiseLevel(e.target.value as any)}
                  >
                    <MenuItem value="beginner">Beginner</MenuItem>
                    <MenuItem value="intermediate">Intermediate</MenuItem>
                    <MenuItem value="expert">Expert</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {conversationAnalysis && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Conversation Insights:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    <Chip
                      label={`${conversationAnalysis.messageCount} messages`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${conversationAnalysis.toolUsageCount} tools used`}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                    {conversationAnalysis.errorPatterns.length > 0 && (
                      <Chip
                        label={`${conversationAnalysis.errorPatterns.length} errors`}
                        size="small"
                        variant="outlined"
                        color="error"
                      />
                    )}
                    {conversationAnalysis.successPatterns.length > 0 && (
                      <Chip
                        label={`${conversationAnalysis.successPatterns.length} successes`}
                        size="small"
                        variant="outlined"
                        color="success"
                      />
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
        
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={loading}
              size="small"
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={!input.trim() || loading}
              sx={{ minWidth: 'auto' }}
            >
              {loading ? <CircularProgress size={20} /> : <SendIcon />}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
