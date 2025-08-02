import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  TextField,
  LinearProgress,
  Chip,
  Divider,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Computer as ServerIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  NetworkCheck as NetworkIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useSocket } from '../hooks/useSocket';
import ServerStatus from './ServerStatus';

interface Server {
  id: string;
  name: string;
  status: string;
  load: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
  uptime: number;
  lastCheck: string;
  alerts: number;
  services: {
    running: number;
    total: number;
  };
}

export default function ServerDashboard() {
  const [servers, setServers] = useState<Server[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'load' | 'alerts'>('name');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [newServer, setNewServer] = useState({
    name: '',
    host: '',
    port: '22',
    username: '',
    password: '',
    description: '',
    environment: 'production'
  });
  const socket = useSocket();

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/servers');
        const data = await response.json();
        setServers(data);
      } catch (err) {
        setError('Failed to fetch server data');
      } finally {
        setLoading(false);
      }
    };

    fetchServers();

    // Listen for server updates via WebSocket
    socket.on('server:status', (updatedServer) => {
      setServers((prev) =>
        prev.map((server) =>
          server.id === updatedServer.id ? updatedServer : server
        )
      );
    });

    return () => {
      socket.off('server:status');
    };
  }, [socket]);

  const handleAddServer = () => {
    setAddDialogOpen(true);
  };

  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
    setNewServer({
      name: '',
      host: '',
      port: '22',
      username: '',
      password: '',
      description: '',
      environment: 'production'
    });
  };

  const handleServerInputChange = (field: string, value: string) => {
    setNewServer(prev => ({ ...prev, [field]: value }));
  };

  const validateServerForm = () => {
    const { name, host, username } = newServer;
    if (!name.trim()) return 'Server name is required';
    if (!host.trim()) return 'Host address is required';
    if (!username.trim()) return 'Username is required';
    if (!/^[\w.-]+$/.test(name)) return 'Server name can only contain letters, numbers, dots, and dashes';
    if (!/^[\w.-]+\.[\w.-]+$|^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      return 'Please enter a valid hostname or IP address';
    }
    return null;
  };

  const handleSubmitServer = async () => {
    const validationError = validateServerForm();
    if (validationError) {
      setSnackbarMessage(validationError);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newServer,
          port: parseInt(newServer.port) || 22,
          id: `server_${Date.now()}`,
          status: 'pending',
          memory: { used: 0, total: 0 },
          lastSeen: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const addedServer = await response.json();
        setServers(prev => [...prev, addedServer]);
        setSnackbarMessage('Server added successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        handleCloseAddDialog();
        
        // Trigger a refresh to get updated server status
        setTimeout(() => {
          handleRefresh();
        }, 1000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add server');
      }
    } catch (err) {
      setSnackbarMessage(err instanceof Error ? err.message : 'Failed to add server');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('http://localhost:5000/api/servers');
      const data = await response.json();
      setServers(data);
    } catch (err) {
      setError('Failed to refresh server data');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredServers = servers.filter(server =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedServers = [...filteredServers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'load':
        return b.load - a.load;
      case 'alerts':
        return b.alerts - a.alerts;
      default:
        return 0;
    }
  });

  const getProgressColor = (percentage: number) => {
    if (percentage < 70) return 'success';
    if (percentage < 90) return 'warning';
    return 'error';
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

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
      {/* Enhanced Header with Search and Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" display="flex" alignItems="center" gap={1}>
            <ServerIcon /> Enhanced Server Dashboard
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh Data">
              <IconButton 
                color="primary" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshIcon className={refreshing ? 'animate-spin' : ''} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Add Server">
              <IconButton color="primary" onClick={handleAddServer}>
                <AddIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <Typography variant="body2" color="text.secondary">
            {sortedServers.length} server{sortedServers.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Paper>

      {/* Server Grid with Enhanced Cards */}
      <Grid container spacing={3}>
        {sortedServers.map((server) => (
          <Grid item xs={12} sm={6} lg={4} key={server.id}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                },
                border: server.alerts > 0 ? '2px solid' : '1px solid',
                borderColor: server.alerts > 0 ? 'error.main' : 'divider'
              }}
            >
              <CardContent>
                {/* Server Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" noWrap>
                    {server.name}
                  </Typography>
                  {server.alerts > 0 && (
                    <Chip
                      icon={<WarningIcon />}
                      label={`${server.alerts} alerts`}
                      color="error"
                      size="small"
                    />
                  )}
                </Box>

                {/* Status and Uptime */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <ServerStatus 
                    status={server.status} 
                    uptime={server.uptime}
                    lastCheck={server.lastCheck}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Uptime: {formatUptime(server.uptime)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Resource Metrics */}
                <Box sx={{ space: 2 }}>
                  {/* CPU Usage */}
                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <SpeedIcon color="primary" fontSize="small" />
                        <Typography variant="body2">CPU</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        {server.cpu.usage}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={server.cpu.usage} 
                      color={getProgressColor(server.cpu.usage)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {server.cpu.cores} cores
                    </Typography>
                  </Box>

                  {/* Memory Usage */}
                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <MemoryIcon color="secondary" fontSize="small" />
                        <Typography variant="body2">Memory</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        {server.memory.percentage}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={server.memory.percentage} 
                      color={getProgressColor(server.memory.percentage)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatBytes(server.memory.used * 1024 * 1024 * 1024)} / {formatBytes(server.memory.total * 1024 * 1024 * 1024)}
                    </Typography>
                  </Box>

                  {/* Disk Usage */}
                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <StorageIcon color="info" fontSize="small" />
                        <Typography variant="body2">Disk</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        {server.disk.percentage}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={server.disk.percentage} 
                      color={getProgressColor(server.disk.percentage)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatBytes(server.disk.used * 1024 * 1024 * 1024)} / {formatBytes(server.disk.total * 1024 * 1024 * 1024)}
                    </Typography>
                  </Box>

                  {/* Network & Services */}
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                      <NetworkIcon fontSize="small" />
                      <Typography variant="caption" color="text.secondary">
                        ↑{formatBytes(server.network.bytesOut)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ↓{formatBytes(server.network.bytesIn)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Services: {server.services.running}/{server.services.total}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {sortedServers.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ServerIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? 'No servers match your search' : 'No servers configured'}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {searchQuery ? 'Try adjusting your search terms' : 'Add a server to get started'}
          </Typography>
        </Paper>
      )}

      {/* Server Addition Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={handleCloseAddDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Add New Server</Typography>
            <IconButton onClick={handleCloseAddDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Server Name"
                  value={newServer.name}
                  onChange={(e) => handleServerInputChange('name', e.target.value)}
                  placeholder="e.g., web-server-01"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Environment</InputLabel>
                  <Select
                    value={newServer.environment}
                    label="Environment"
                    onChange={(e) => handleServerInputChange('environment', e.target.value)}
                  >
                    <MenuItem value="production">Production</MenuItem>
                    <MenuItem value="staging">Staging</MenuItem>
                    <MenuItem value="development">Development</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Host Address"
                  value={newServer.host}
                  onChange={(e) => handleServerInputChange('host', e.target.value)}
                  placeholder="e.g., example.com or 192.168.1.100"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="SSH Port"
                  type="number"
                  value={newServer.port}
                  onChange={(e) => handleServerInputChange('port', e.target.value)}
                  placeholder="22"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={newServer.username}
                  onChange={(e) => handleServerInputChange('username', e.target.value)}
                  placeholder="e.g., admin, ubuntu, root"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={newServer.password}
                  onChange={(e) => handleServerInputChange('password', e.target.value)}
                  placeholder="SSH password (optional if using keys)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={newServer.description}
                  onChange={(e) => handleServerInputChange('description', e.target.value)}
                  placeholder="Optional description for this server..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={handleCloseAddDialog}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmitServer}
            disabled={!newServer.name.trim() || !newServer.host.trim() || !newServer.username.trim()}
          >
            Add Server
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
