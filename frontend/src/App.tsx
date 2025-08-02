import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Tabs, Tab } from '@mui/material';
import { Chat as ChatIcon, Dashboard as DashboardIcon, Settings as SettingsIcon, AutoFixHigh as WorkflowIcon } from '@mui/icons-material';
import theme from './theme';
import ServerDashboard from './components/ServerDashboard';
import AiChat from './components/AiChat';
import ServerDetails from './components/ServerDetails';
import Layout from './components/Layout';
import MCPConnection from './components/MCPConnection';
import DiagnosticsPage from './components/DiagnosticsPage';
import WorkflowManager from './components/WorkflowManager';

function App() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: 'Dashboard', icon: <DashboardIcon />, component: <ServerDashboard /> },
    { label: 'AI Chat', icon: <ChatIcon />, component: <AiChat /> },
    { label: 'Workflows', icon: <WorkflowIcon />, component: <WorkflowManager /> },
    { label: 'MCP Client', icon: <SettingsIcon />, component: <MCPConnection /> }
  ];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="navigation tabs">
            {tabs.map((tab, index) => (
              <Tab key={index} icon={tab.icon} label={tab.label} component={Link} to={index === 0 ? '/' : `/${tab.label.toLowerCase()}`} />
            ))}
          </Tabs>
          <Routes>
            <Route path="/" element={<ServerDashboard />} />
            <Route path="/ai" element={<AiChat />} />
            <Route path="/workflows" element={<WorkflowManager />} />
            <Route path="/mcp" element={<MCPConnection />} />
            <Route path="/server/:id" element={<ServerDetails />} />
            <Route path="/diagnostics" element={<DiagnosticsPage />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
