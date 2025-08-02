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
} from '@mui/material';
import { useSocket } from '../hooks/useSocket';

interface ServerConnectionProps {
  onConnected?: (serverId: string) => void;
}

export default function ServerConnection({ onConnected }: ServerConnectionProps) {
  const [serverName, setServerName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useKeyAuth, setUseKeyAuth] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const socket = useSocket();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    const serverId = `server_${Date.now()}`;
    
    const connectionInfo = {
      id: serverId,
      name: serverName,
      host,
      port: parseInt(port, 10),
      username,
      password: useKeyAuth ? undefined : password,
      privateKey: useKeyAuth ? privateKey : undefined,
      passphrase: useKeyAuth ? passphrase : undefined,
    };
    
    socket.emit('diagnostics:connect', connectionInfo);
  };

  React.useEffect(() => {
    const handleConnectionStatus = (data: { serverId: string; success: boolean }) => {
      setLoading(false);
      if (data.success) {
        setSuccess(true);
        setError(null);
        if (onConnected) {
          onConnected(data.serverId);
        }
      } else {
        setError('Failed to connect to server');
      }
    };

    const handleError = (data: { error: string }) => {
      setLoading(false);
      setError(data.error);
    };

    socket.on('diagnostics:connection-status', handleConnectionStatus);
    socket.on('diagnostics:error', handleError);

    return () => {
      socket.off('diagnostics:connection-status', handleConnectionStatus);
      socket.off('diagnostics:error', handleError);
    };
  }, [socket, onConnected]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Connect to Server
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully connected to server!
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Server Name"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            required
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={useKeyAuth}
                onChange={(e) => setUseKeyAuth(e.target.checked)}
              />
            }
            label="Use SSH Key Authentication"
          />
          
          {useKeyAuth ? (
            <>
              <TextField
                fullWidth
                label="Private Key"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                margin="normal"
                multiline
                rows={4}
                required
              />
              <TextField
                fullWidth
                label="Passphrase (if applicable)"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                margin="normal"
                type="password"
              />
            </>
          ) : (
            <TextField
              fullWidth
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              type="password"
              required
            />
          )}
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Connect'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
