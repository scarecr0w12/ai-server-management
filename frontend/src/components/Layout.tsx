import React from 'react';
import { AppBar, Toolbar, Typography, Container, Link } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'AI Chat', path: '/ai' },
    { name: 'Diagnostics', path: '/diagnostics' },
    { name: 'Workflows', path: '/workflows' },
    { name: 'MCP', path: '/mcp' },
  ];

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Server Management System
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <nav>
          {navItems.map((item) => (
            <Link
              key={item.path}
              component={RouterLink}
              to={item.path}
              sx={{
                mr: 2,
                fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                textDecoration: 'none',
              }}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        
        <main>
          {children}
        </main>
      </Container>
    </>
  );
}
