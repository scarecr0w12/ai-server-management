import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Card, CardContent, CardHeader, IconButton, Avatar } from '@mui/material';
import { Dashboard as DashboardIcon, Server as ServerIcon, ChatBubble as ChatIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [serverStats, setServerStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    warning: 0
  });

  useEffect(() => {
    // Fetch server statistics
    fetch('http://localhost:5000/api/servers')
      .then(response => response.json())
      .then(data => {
        // Update stats based on server data
        setServerStats({
          total: data.servers.length,
          online: data.servers.filter(s => s.status === 'online').length,
          offline: data.servers.filter(s => s.status === 'offline').length,
          warning: data.servers.filter(s => s.status === 'warning').length
        });
      })
      .catch(error => console.error('Error fetching server stats:', error));
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
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
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
    </Box>
  );
};

export default Dashboard;
