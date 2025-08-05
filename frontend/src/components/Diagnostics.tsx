import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSocket } from '../hooks/useSocket';

interface DiagnosticsProps {
  serverId: string | null;
}

interface DiagnosticResult {
  serverId: string;
  symptoms: string;
  logs: string;
  analysis: string;
  recommendations: string[];
}

export default function Diagnostics({ serverId }: DiagnosticsProps) {
  const [symptoms, setSymptoms] = useState('');
  const [logPaths, setLogPaths] = useState('/var/log/syslog,/var/log/messages');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const socket = useSocket();

  const handleAnalyze = () => {
    if (!serverId) {
      setError('Please connect to a server first');
      return;
    }
    
    if (!symptoms.trim()) {
      setError('Please describe the symptoms');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    const diagnosticRequest = {
      serverId,
      symptoms,
      logPaths: logPaths.split(',').map(path => path.trim()),
    };
    
    socket.emit('diagnostics:analyze', diagnosticRequest);
  };

  useEffect(() => {
    const handleDiagnosticResult = (data: DiagnosticResult) => {
      console.log('🔍 Frontend received diagnostics result:', data);
      console.log('🔍 Result has analysis:', !!data.analysis);
      console.log('🔍 Result has recommendations:', data.recommendations?.length || 0);
      setLoading(false);
      setResult(data);
    };

    const handleError = (data: { error: string }) => {
      console.log('❌ Frontend received diagnostics error:', data);
      setLoading(false);
      setError(data.error);
    };

    socket.on('diagnostics:result', handleDiagnosticResult);
    socket.on('diagnostics:error', handleError);

    return () => {
      socket.off('diagnostics:result', handleDiagnosticResult);
      socket.off('diagnostics:error', handleError);
    };
  }, [socket]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Server Diagnostics
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 2 }}>
          Describe the symptoms you're experiencing with your server, and we'll analyze the logs to help identify the issue.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <TextField
          fullWidth
          label="Describe the symptoms"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          multiline
          rows={4}
          margin="normal"
          helperText="Example: Server is running slowly, high CPU usage, application crashes, etc."
        />
        
        <TextField
          fullWidth
          label="Log file paths (comma separated)"
          value={logPaths}
          onChange={(e) => setLogPaths(e.target.value)}
          margin="normal"
          helperText="Default paths are /var/log/syslog and /var/log/messages"
        />
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleAnalyze}
          disabled={loading || !serverId}
          fullWidth
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Analyze Server Issues'}
        </Button>
        
        {result && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Analysis Complete</strong>
            </Alert>
            
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Analysis</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                  {result.analysis}
                </Typography>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Recommendations</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {result.recommendations.map((rec, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={rec} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Logs Analyzed</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {result.logs}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
