import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, Typography, CircularProgress, Alert } from '@mui/material';

const ServerDetails = () => {
  const { id } = useParams<{ id: string }>();
  
  // In a real app, this would fetch server details from an API
  // For now, we'll just show a placeholder
  const server = {
    id,
    name: `Server ${id}`,
    status: 'running',
    cpu: 45,
    memory: 60,
    disk: 70,
  };

  if (!id) {
    return <Alert severity="error">Server ID is required</Alert>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="div" gutterBottom>
          Server Details: {server.name}
        </Typography>
        <Typography variant="body1">Status: {server.status}</Typography>
        <Typography variant="body1">CPU Usage: {server.cpu}%</Typography>
        <Typography variant="body1">Memory Usage: {server.memory}%</Typography>
        <Typography variant="body1">Disk Usage: {server.disk}%</Typography>
      </CardContent>
    </Card>
  );
};

export default ServerDetails;
