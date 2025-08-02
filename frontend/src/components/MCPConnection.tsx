import React, { useState } from 'react';
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
} from '@mui/material';

export default function MCPConnection() {
  const [connectionUrl, setConnectionUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableResources, setAvailableResources] = useState<string[]>([]);

  const handleConnect = async () => {
    if (!connectionUrl.trim()) {
      setError('Please enter a connection URL');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Simulate connection process
    setTimeout(() => {
      setLoading(false);
      setConnected(true);
      setAvailableResources([
        'Server Management API',
        'Log Analysis Service',
        'Performance Monitoring',
        'Security Scanner',
      ]);
    }, 1500);
  };

  const handleDisconnect = () => {
    setConnected(false);
    setAvailableResources([]);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        MCP Connection
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Connect to Model Context Protocol (MCP) servers to extend the capabilities of your server management system.
      </Typography>
      
      <Card>
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {connected ? (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Successfully connected to MCP server
              </Alert>
              
              <Typography variant="h6" sx={{ mb: 2 }}>
                Available Resources
              </Typography>
              
              <List>
                {availableResources.map((resource, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={resource} />
                  </ListItem>
                ))}
              </List>
              
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleDisconnect}
                fullWidth
                sx={{ mt: 2 }}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Box component="form" sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="MCP Server URL"
                value={connectionUrl}
                onChange={(e) => setConnectionUrl(e.target.value)}
                margin="normal"
                placeholder="https://mcp-server.example.com"
                required
              />
              
              <TextField
                fullWidth
                label="API Key (if required)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                margin="normal"
                type="password"
              />
              
              <FormControlLabel
                control={<Switch />}
                label="Use secure connection (HTTPS)"
              />
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleConnect}
                disabled={loading}
                fullWidth
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Connect to MCP'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
