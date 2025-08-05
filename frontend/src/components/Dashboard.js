import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Card, CardContent, CardHeader, IconButton, Avatar, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Dashboard as DashboardIcon, Storage as ServerIcon, Chat as ChatIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getConfig, getApiUrl, loadConfig } from '../services/configService';

function Dashboard() {
  console.log('Dashboard component rendering');
  
  const navigate = useNavigate();
  const [serverStats, setServerStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    warning: 0
  });
  const [openAddServer, setOpenAddServer] = useState(false);
  const [newServer, setNewServer] = useState({
    name: '',
    status: 'online',
    load: 0,
    memory: { used: 0, total: 0, percentage: 0 },
    cpu: { usage: 0, cores: 0 },
    disk: { used: 0, total: 0, percentage: 0 },
    network: { bytesIn: 0, bytesOut: 0 },
    uptime: 0,
    alerts: 0,
    services: { running: 0, total: 0 }
  });

  useEffect(() => {
    console.log('Dashboard useEffect running');
    
    // Load configuration
    console.log('Loading configuration...');
    loadConfig().then(() => {
      console.log('Configuration loaded successfully');
      const apiUrl = getApiUrl();
      console.log('API URL from config:', apiUrl);
      
      // Check if API URL is defined
      if (!apiUrl) {
        console.error('API URL is not defined');
        return;
      }
      
      // Fetch server statistics
      console.log('Fetching server stats from:', `${apiUrl}/api/servers`);
      fetch(`${apiUrl}/api/servers`)
        .then(response => {
          console.log('Server stats response:', response);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log('Server stats data:', data);
          setServerStats({
            total: data.length,
            online: data.filter(server => server.status === 'online').length,
            offline: data.filter(server => server.status === 'offline').length,
            warning: data.filter(server => server.alerts > 0).length
          });
        })
        .catch(error => {
          console.error('Error fetching server stats:', error);
        });
    }).catch(error => {
      console.error('Error loading configuration:', error);
    });
  }, []);

  const statsCards = [
    {
      title: 'Total Servers',
      value: serverStats.total,
      icon: <ServerIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2'
    },
    {
      title: 'Online',
      value: serverStats.online,
      icon: <ServerIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      color: '#4caf50'
    },
    {
      title: 'Offline',
      value: serverStats.offline,
      icon: <ServerIcon sx={{ fontSize: 40, color: 'error.main' }} />,
      color: '#f44336'
    },
    {
      title: 'Warnings',
      value: serverStats.warning,
      icon: <ServerIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      color: '#ff9800'
    }
  ];

  const quickActions = [
    {
      title: 'Manage Servers',
      icon: <ServerIcon sx={{ fontSize: 30 }} />,
      onClick: () => navigate('/servers')
    },
    {
      title: 'Chat with Assistant',
      icon: <ChatIcon sx={{ fontSize: 30 }} />,
      onClick: () => navigate('/chat')
    },
    {
      title: 'View Reports',
      icon: <DashboardIcon sx={{ fontSize: 30 }} />,
      onClick: () => navigate('/reports')
    }
  ];

  // Handle adding a new server
  const handleAddServer = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newServer,
          id: `server-${Date.now()}`,
          lastCheck: new Date().toISOString()
        }),
      });

      if (response.ok) {
        // Refresh server stats
        fetch(`${apiUrl}/api/servers`)
          .then(response => response.json())
          .then(data => {
            setServerStats({
              total: data.length,
              online: data.filter(server => server.status === 'online').length,
              offline: data.filter(server => server.status === 'offline').length,
              warning: data.filter(server => server.alerts > 0).length
            });
          });
        
        // Close dialog and reset form
        setOpenAddServer(false);
        setNewServer({
          name: '',
          status: 'online',
          load: 0,
          memory: { used: 0, total: 0, percentage: 0 },
          cpu: { usage: 0, cores: 0 },
          disk: { used: 0, total: 0, percentage: 0 },
          network: { bytesIn: 0, bytesOut: 0 },
          uptime: 0,
          alerts: 0,
          services: { running: 0, total: 0 }
        });
      } else {
        console.error('Failed to add server');
      }
    } catch (error) {
      console.error('Error adding server:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12}>
          <Grid container spacing={3}>
            {statsCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Paper
                  sx={{
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: card.color + '10',
                    borderRadius: 2
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: card.color, mr: 2 }}>
                      {card.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="div">
                        {card.value}
                      </Typography>
                      <Typography variant="subtitle1" color="text.secondary">
                        {card.title}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenAddServer(true)}
            >
              Add Server
            </Button>
          </Box>
          <Grid container spacing={3}>
            {quickActions.map((action, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer'
                  }}
                  onClick={action.onClick}
                >
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {action.icon}
                      </Avatar>
                    }
                    title={action.title}
                  />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Quick access to common tasks
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Box sx={{ height: 300 }}>
              {/* Activity log will be implemented with MCP connections */}
              <Typography variant="body2" color="text.secondary">
                Activity log will be implemented with MCP connections
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Add Server Dialog */}
      <Dialog open={openAddServer} onClose={() => setOpenAddServer(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Server</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Server Name"
              value={newServer.name}
              onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              select
              label="Status"
              value={newServer.status}
              onChange={(e) => setNewServer({ ...newServer, status: e.target.value })}
              margin="normal"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </TextField>
            <TextField
              fullWidth
              label="CPU Usage (%)"
              type="number"
              value={newServer.cpu.usage}
              onChange={(e) => setNewServer({ 
                ...newServer, 
                cpu: { ...newServer.cpu, usage: parseInt(e.target.value) || 0 }
              })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Memory Used (GB)"
              type="number"
              value={newServer.memory.used}
              onChange={(e) => setNewServer({ 
                ...newServer, 
                memory: { ...newServer.memory, used: parseFloat(e.target.value) || 0 }
              })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Total Memory (GB)"
              type="number"
              value={newServer.memory.total}
              onChange={(e) => setNewServer({ 
                ...newServer, 
                memory: { ...newServer.memory, total: parseFloat(e.target.value) || 0 }
              })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Disk Used (GB)"
              type="number"
              value={newServer.disk.used}
              onChange={(e) => setNewServer({ 
                ...newServer, 
                disk: { ...newServer.disk, used: parseFloat(e.target.value) || 0 }
              })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Total Disk (GB)"
              type="number"
              value={newServer.disk.total}
              onChange={(e) => setNewServer({ 
                ...newServer, 
                disk: { ...newServer.disk, total: parseFloat(e.target.value) || 0 }
              })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddServer(false)}>Cancel</Button>
          <Button onClick={handleAddServer} variant="contained">Add Server</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
