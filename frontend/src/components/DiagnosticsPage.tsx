import React, { useState } from 'react';
import { Box, Grid, Typography, Alert } from '@mui/material';
import ServerConnection from './ServerConnection';
import Diagnostics from './Diagnostics';

export default function DiagnosticsPage() {
  const [connectedServerId, setConnectedServerId] = useState<string | null>(null);
  const [serverName, setServerName] = useState<string | null>(null);

  const handleServerConnected = (serverId: string) => {
    setConnectedServerId(serverId);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Server Diagnostics
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Connect to a server and describe any issues you're experiencing. Our AI-powered diagnostics will analyze the logs and provide recommendations.
      </Typography>
      
      {connectedServerId && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Connected to server: {serverName || connectedServerId}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ServerConnection onConnected={handleServerConnected} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Diagnostics serverId={connectedServerId} />
        </Grid>
      </Grid>
    </Box>
  );
}
