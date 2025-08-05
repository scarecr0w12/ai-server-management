import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useSocket } from '../hooks/useSocket';

interface Server {
  id: string;
  name: string;
  status: string;
  uniqueKey?: string;
  load?: number;
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu?: {
    usage: number;
    cores: number;
  };
  disk?: {
    used: number;
    total: number;
    percentage: number;
  };
  network?: {
    bytesIn: number;
    bytesOut: number;
  };
  uptime?: number;
  lastCheck?: string;
  alerts?: number;
  services?: {
    running: number;
    total: number;
  };
}

function ServerDashboard() {
  console.log('ServerDashboard component mounting');
  
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const { socket, on, off, emit } = useSocket();
  
  // Log socket object
  console.log('Socket object:', socket);

  useEffect(() => {
    console.log('ServerDashboard mounted, socket:', socket);
    
    // Log socket connection events
    if (socket) {
      console.log('Socket exists, adding event listeners');
      
      const handleConnect = () => {
        console.log('WebSocket connected, socket id:', socket.id);
      };

      const handleDisconnect = (reason: string) => {
        console.log('WebSocket disconnected, reason:', reason);
      };

      const handleConnectError = (error: Error) => {
        console.log('WebSocket connection error:', error);
      };

      on('connect', handleConnect);
      on('disconnect', handleDisconnect);
      on('connect_error', handleConnectError);

      // Log connection state
      console.log('Socket connected:', socket.connected);
      console.log('Socket disconnected:', socket.disconnected);
      
      // Try to manually connect if not connected
      if (!socket.connected) {
        console.log('Socket not connected, attempting to connect');
        socket.connect();
      }
    } else {
      console.log('Socket is null');
    }
    
    // Cleanup function
    return () => {
      console.log('ServerDashboard unmounting, cleaning up socket listeners');
      if (socket) {
        off('connect');
        off('disconnect');
        off('connect_error');
      }
    };
  }, [socket]);

  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/servers`);
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched data:', data);
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setServers(data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching servers:', err);
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setError('Failed to fetch servers');
      }
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleServersUpdate = (updatedServers: Server[]) => {
    console.log('Received servers update:', updatedServers);
    // Only update state if component is still mounted
    if (isMountedRef.current) {
      setServers(updatedServers);
      // Clear any previous errors when we receive data via WebSocket
      setError(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();

    on('servers:update', handleServersUpdate);

    // Cleanup function
    return () => {
      console.log('ServerDashboard unmounting, cleaning up event listeners');
      isMountedRef.current = false;
      if (socket) {
        off('connect');
        off('disconnect');
        off('connect_error');
      }
      off('servers:update', handleServersUpdate);
    };
  }, []);

  // Render components...

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <h1>Server Dashboard</h1>
      <p>Number of servers: {servers.length}</p>
      {servers.map((server) => (
        <Box key={server.uniqueKey || server.id || server.name} sx={{ border: '1px solid #ccc', borderRadius: 2, p: 2, mb: 2 }}>
          <h2>{server.name || 'Unknown Server'}</h2>
          <p>Status: {server.status || 'Unknown'}</p>
          {server.memory && (
            <p>Memory: {server.memory.used} GB / {server.memory.total} GB ({server.memory.percentage.toFixed(1)}%)</p>
          )}
          {server.cpu && (
            <p>CPU: {server.cpu.usage}% ({server.cpu.cores} cores)</p>
          )}
          {server.disk && (
            <p>Disk: {server.disk.used} GB / {server.disk.total} GB ({server.disk.percentage.toFixed(1)}%)</p>
          )}
          {server.load !== undefined && (
            <p>Load: {server.load}%</p>
          )}
          {server.uptime && (
            <p>Uptime: {Math.floor(server.uptime / 3600)} hours</p>
          )}
          {server.alerts !== undefined && (
            <p>Alerts: {server.alerts}</p>
          )}
          {server.services && (
            <p>Services: {server.services.running} / {server.services.total} running</p>
          )}
        </Box>
      ))}
    </Box>
  );
}

export default ServerDashboard;
