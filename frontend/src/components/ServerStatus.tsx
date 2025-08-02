import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Help as HelpIcon,
} from '@mui/icons-material';

interface ServerStatusProps {
  status: string;
  uptime?: number;
  lastCheck?: string;
}

const ServerStatus: React.FC<ServerStatusProps> = ({ status, uptime, lastCheck }) => {
  const getStatusConfig = (status: string) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'online' || statusLower === 'running' || statusLower === 'active') {
      return {
        color: 'success' as const,
        icon: <CheckCircleIcon />,
        label: 'Online'
      };
    } else if (statusLower === 'warning' || statusLower === 'degraded') {
      return {
        color: 'warning' as const,
        icon: <WarningIcon />,
        label: 'Warning'
      };
    } else if (statusLower === 'offline' || statusLower === 'error' || statusLower === 'failed') {
      return {
        color: 'error' as const,
        icon: <ErrorIcon />,
        label: 'Offline'
      };
    } else {
      return {
        color: 'default' as const,
        icon: <HelpIcon />,
        label: status || 'Unknown'
      };
    }
  };

  const statusConfig = getStatusConfig(status);

  const formatUptime = (uptime?: number): string => {
    if (!uptime) return 'Unknown';
    
    const days = Math.floor(uptime / (24 * 3600));
    const hours = Math.floor((uptime % (24 * 3600)) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const tooltipText = [
    `Status: ${statusConfig.label}`,
    uptime ? `Uptime: ${formatUptime(uptime)}` : '',
    lastCheck ? `Last Check: ${lastCheck}` : ''
  ].filter(Boolean).join('\n');

  return (
    <Tooltip title={tooltipText} arrow>
      <Box>
        <Chip
          icon={statusConfig.icon}
          label={statusConfig.label}
          color={statusConfig.color}
          size="small"
          variant="outlined"
        />
      </Box>
    </Tooltip>
  );
};

export default ServerStatus;
