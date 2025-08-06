import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Divider, Typography } from '@mui/material';
import DiagnosticsPage from './DiagnosticsPage';
import AiChat from './AiChat';

const ServerPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();

  if (!id) {
    return <Typography variant="h6">Server ID not specified</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Typography variant="h5" sx={{ p: 2 }}>
        Server Dashboard – {id}
      </Typography>
      <Divider />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <DiagnosticsPage serverId={id} />
      </Box>
      <Divider />
      <Box sx={{ height: '50vh' }}>
        <AiChat serverId={id} />
      </Box>
    </Box>
  );
};

export default ServerPage;
