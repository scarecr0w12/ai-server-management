import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPServerInfo {
  connected: boolean;
  name?: string;
  version?: string;
  description?: string;
  capabilities?: {
    resources: boolean;
    tools: boolean;
    prompts: boolean;
  };
}

export default function MCPConnection() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<MCPServerInfo | null>(null);
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [resourceContent, setResourceContent] = useState<string>('');
  const [toolResult, setToolResult] = useState<string>('');

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Check connection status on component mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/mcp/status`);
      const data = await response.json();
      
      if (data.connected) {
        setConnected(true);
        setServerInfo(data);
        await loadResources();
        await loadTools();
      } else {
        setConnected(false);
        setServerInfo(null);
      }
    } catch (error) {
      console.error('Failed to check MCP status:', error);
      setConnected(false);
      setError('Failed to connect to MCP server');
    }
  };

  const loadResources = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/mcp/resources`);
      const data = await response.json();
      setResources(data.resources || []);
    } catch (error) {
      console.error('Failed to load resources:', error);
      setError('Failed to load MCP resources');
    }
  };

  const loadTools = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/mcp/tools`);
      const data = await response.json();
      setTools(data.tools || []);
    } catch (error) {
      console.error('Failed to load tools:', error);
      setError('Failed to load MCP tools');
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await checkConnectionStatus();
    } catch (error) {
      setError('Failed to connect to MCP server');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setServerInfo(null);
    setResources([]);
    setTools([]);
    setSelectedResource(null);
    setResourceContent('');
    setToolResult('');
  };

  const handleReadResource = async (uri: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/mcp/resources/${encodeURIComponent(uri)}`);
      const data = await response.json();
      setSelectedResource(uri);
      setResourceContent(data.resource.contents[0]?.text || 'No content available');
    } catch (error) {
      setError('Failed to read resource');
    } finally {
      setLoading(false);
    }
  };

  const handleCallTool = async (toolName: string, args: any = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/mcp/tools/${toolName}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ arguments: args }),
      });
      const data = await response.json();
      setToolResult(data.result.content[0]?.text || 'No result available');
    } catch (error) {
      setError('Failed to call tool');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        MCP Protocol Connection
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Connect to Model Context Protocol (MCP) servers to extend the capabilities of your server management system.
      </Typography>
      
      {/* Connection Status Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Connection Status
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={checkConnectionStatus} disabled={loading}>
                <RefreshIcon />
              </IconButton>
              <Chip 
                label={connected ? 'Connected' : 'Disconnected'} 
                color={connected ? 'success' : 'error'}
                variant="filled"
              />
            </Box>
          </Box>
          
          {serverInfo && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Server: {serverInfo.name} v{serverInfo.version}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {serverInfo.description}
              </Typography>
              <Box sx={{ mt: 1 }}>
                {serverInfo.capabilities?.resources && <Chip label="Resources" size="small" sx={{ mr: 1 }} />}
                {serverInfo.capabilities?.tools && <Chip label="Tools" size="small" sx={{ mr: 1 }} />}
                {serverInfo.capabilities?.prompts && <Chip label="Prompts" size="small" />}
              </Box>
            </Box>
          )}
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={handleConnect}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : connected ? 'Reconnect' : 'Connect'}
            </Button>
            
            {connected && (
              <Button
                variant="outlined"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {connected && (
        <>
          {/* MCP Resources Section */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                MCP Resources ({resources.length})
              </Typography>
              
              {resources.length > 0 ? (
                <List>
                  {resources.map((resource, index) => (
                    <ListItem 
                      key={index}
                      secondaryAction={
                        <Button 
                          size="small" 
                          onClick={() => handleReadResource(resource.uri)}
                          disabled={loading}
                        >
                          Read
                        </Button>
                      }
                    >
                      <ListItemText 
                        primary={resource.name}
                        secondary={`${resource.description} (${resource.mimeType})`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary">
                  No resources available
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* MCP Tools Section */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                MCP Tools ({tools.length})
              </Typography>
              
              {tools.length > 0 ? (
                tools.map((tool, index) => (
                  <Accordion key={index}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">{tool.name}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        {tool.description}
                      </Typography>
                      <Button 
                        variant="outlined" 
                        startIcon={<PlayIcon />}
                        onClick={() => handleCallTool(tool.name)}
                        disabled={loading}
                        size="small"
                      >
                        Execute Tool
                      </Button>
                    </AccordionDetails>
                  </Accordion>
                ))
              ) : (
                <Typography color="textSecondary">
                  No tools available
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Resource Content Display */}
          {selectedResource && resourceContent && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resource Content: {selectedResource}
                </Typography>
                <Box 
                  component="pre" 
                  sx={{ 
                    backgroundColor: 'grey.100', 
                    p: 2, 
                    borderRadius: 1, 
                    overflow: 'auto',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}
                >
                  {resourceContent}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Tool Result Display */}
          {toolResult && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Tool Execution Result
                </Typography>
                <Box 
                  component="pre" 
                  sx={{ 
                    backgroundColor: 'grey.100', 
                    p: 2, 
                    borderRadius: 1, 
                    overflow: 'auto',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}
                >
                  {toolResult}
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
}
