import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import Dashboard from './components/Dashboard';
import ServerDashboard from './components/ServerDashboard';
import AiChat from './components/AiChat';
import DiagnosticsPage from './components/DiagnosticsPage';
import MCPConnection from './components/MCPConnection';
import Layout from './components/Layout';

function App() {
  console.log('App rendering');
  console.log('Environment variables:', {
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    REACT_APP_WS_URL: process.env.REACT_APP_WS_URL
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/servers" element={<ServerDashboard />} />
            <Route path="/ai" element={<AiChat />} />
            <Route path="/diagnostics" element={<DiagnosticsPage />} />
            <Route path="/mcp" element={<MCPConnection />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
