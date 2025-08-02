import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  AutoFixHigh as AutoFixIcon
} from '@mui/icons-material';

interface WorkflowStep {
  id: string;
  name: string;
  type: 'diagnostic' | 'analysis' | 'action' | 'verification';
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  startTime?: string;
  endTime?: string;
  dependencies?: string[];
}

interface WorkflowExecution {
  id: string;
  name: string;
  context: {
    serverId: string;
    symptoms: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    allowAutomatedActions: boolean;
    maxExecutionTime: number;
    learningEnabled: boolean;
  };
  steps: WorkflowStep[];
  status: 'running' | 'completed' | 'failed' | 'paused';
  startTime: string;
  endTime?: string;
  totalSteps: number;
  completedSteps: number;
  success: boolean;
  recommendations: string[];
}

export default function WorkflowManager() {
  const [workflows, setWorkflows] = useState<WorkflowExecution[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowExecution | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const [newWorkflow, setNewWorkflow] = useState({
    template: '',
    serverId: '',
    symptoms: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    allowAutomatedActions: false,
    maxExecutionTime: 30,
    learningEnabled: true
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchWorkflows, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchWorkflows(),
        fetchTemplates(),
        fetchServers()
      ]);
    } catch (err) {
      setError('Failed to load workflow data');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/workflows');
      const data = await response.json();
      setWorkflows(data);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/workflows/templates');
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const fetchServers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/servers');
      const data = await response.json();
      setServers(data);
    } catch (err) {
      console.error('Failed to fetch servers:', err);
    }
  };

  const handleStartWorkflow = async () => {
    try {
      const context = {
        serverId: newWorkflow.serverId,
        symptoms: newWorkflow.symptoms.split(',').map(s => s.trim()).filter(s => s),
        priority: newWorkflow.priority,
        allowAutomatedActions: newWorkflow.allowAutomatedActions,
        maxExecutionTime: newWorkflow.maxExecutionTime * 60 * 1000, // Convert to ms
        learningEnabled: newWorkflow.learningEnabled
      };

      const response = await fetch('http://localhost:5000/api/workflows/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowName: newWorkflow.template,
          context
        })
      });

      if (response.ok) {
        setStartDialogOpen(false);
        setNewWorkflow({
          template: '',
          serverId: '',
          symptoms: '',
          priority: 'medium',
          allowAutomatedActions: false,
          maxExecutionTime: 30,
          learningEnabled: true
        });
        fetchWorkflows();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start workflow');
      }
    } catch (err) {
      setError('Failed to start workflow');
    }
  };

  const handlePauseWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/workflows/${workflowId}/pause`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchWorkflows();
      }
    } catch (err) {
      console.error('Failed to pause workflow:', err);
    }
  };

  const handleResumeWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/workflows/${workflowId}/resume`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchWorkflows();
      }
    } catch (err) {
      console.error('Failed to resume workflow:', err);
    }
  };

  const getStatusColor = (status: string): 'primary' | 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'running': return 'primary';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'paused': return 'warning';
      default: return 'info';
    }
  };

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed': return <CheckIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'running': return <RefreshIcon className="animate-spin" />;
      default: return <ScheduleIcon color="disabled" />;
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const diff = endTime.getTime() - startTime.getTime();
    return Math.round(diff / 1000) + 's';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <RefreshIcon className="animate-spin" />
        <Typography ml={2}>Loading workflows...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" display="flex" alignItems="center" gap={1}>
          <AutoFixIcon /> Agentic Workflows
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchWorkflows}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayIcon />}
            onClick={() => setStartDialogOpen(true)}
          >
            Start Workflow
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Active Workflows */}
      <Grid container spacing={3}>
        {workflows.map((workflow) => (
          <Grid item xs={12} md={6} lg={4} key={workflow.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" noWrap>
                    {workflow.name.replace('_', ' ').toUpperCase()}
                  </Typography>
                  <Chip 
                    label={workflow.status} 
                    color={getStatusColor(workflow.status)}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" mb={2}>
                  Server: {servers.find(s => s.id === workflow.context.serverId)?.name || workflow.context.serverId}
                </Typography>

                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Progress</Typography>
                    <Typography variant="body2">
                      {workflow.completedSteps}/{workflow.totalSteps}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(workflow.completedSteps / workflow.totalSteps) * 100}
                    color={getStatusColor(workflow.status)}
                  />
                </Box>

                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Duration: {formatDuration(workflow.startTime, workflow.endTime)}
                </Typography>

                <Box display="flex" gap={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setSelectedWorkflow(workflow);
                      setDetailsDialogOpen(true);
                    }}
                  >
                    Details
                  </Button>
                  {workflow.status === 'running' && (
                    <IconButton
                      size="small"
                      onClick={() => handlePauseWorkflow(workflow.id)}
                    >
                      <PauseIcon />
                    </IconButton>
                  )}
                  {workflow.status === 'paused' && (
                    <IconButton
                      size="small"
                      onClick={() => handleResumeWorkflow(workflow.id)}
                    >
                      <PlayIcon />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {workflows.length === 0 && (
        <Card sx={{ textAlign: 'center', py: 4 }}>
          <CardContent>
            <AutoFixIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Active Workflows
            </Typography>
            <Typography variant="body2" color="text.disabled" mb={3}>
              Start an autonomous diagnostic workflow to get automated problem resolution
            </Typography>
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={() => setStartDialogOpen(true)}
            >
              Start Your First Workflow
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Start Workflow Dialog */}
      <Dialog open={startDialogOpen} onClose={() => setStartDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Start Autonomous Workflow</Typography>
            <IconButton onClick={() => setStartDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Workflow Template</InputLabel>
                <Select
                  value={newWorkflow.template}
                  label="Workflow Template"
                  onChange={(e) => setNewWorkflow(prev => ({ ...prev, template: e.target.value }))}
                >
                  {templates.map(template => (
                    <MenuItem key={template} value={template}>
                      {template.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Target Server</InputLabel>
                <Select
                  value={newWorkflow.serverId}
                  label="Target Server"
                  onChange={(e) => setNewWorkflow(prev => ({ ...prev, serverId: e.target.value }))}
                >
                  {servers.map(server => (
                    <MenuItem key={server.id} value={server.id}>
                      {server.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Symptoms (comma-separated)"
                value={newWorkflow.symptoms}
                onChange={(e) => setNewWorkflow(prev => ({ ...prev, symptoms: e.target.value }))}
                placeholder="e.g., high CPU usage, slow response times, memory leaks"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newWorkflow.priority}
                  label="Priority"
                  onChange={(e) => setNewWorkflow(prev => ({ ...prev, priority: e.target.value as any }))}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Execution Time (minutes)"
                type="number"
                value={newWorkflow.maxExecutionTime}
                onChange={(e) => setNewWorkflow(prev => ({ ...prev, maxExecutionTime: parseInt(e.target.value) || 30 }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newWorkflow.allowAutomatedActions}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, allowAutomatedActions: e.target.checked }))}
                  />
                }
                label="Allow Automated Actions (enables automatic fixes)"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newWorkflow.learningEnabled}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, learningEnabled: e.target.checked }))}
                  />
                }
                label="Enable Learning (system will learn from this execution)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setStartDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleStartWorkflow}
            disabled={!newWorkflow.template || !newWorkflow.serverId}
          >
            Start Workflow
          </Button>
        </DialogActions>
      </Dialog>

      {/* Workflow Details Dialog */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        {selectedWorkflow && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">
                  {selectedWorkflow.name.replace('_', ' ').toUpperCase()} - Details
                </Typography>
                <IconButton onClick={() => setDetailsDialogOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Execution Summary</Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Status" 
                            secondary={
                              <Chip 
                                label={selectedWorkflow.status} 
                                color={getStatusColor(selectedWorkflow.status)}
                                size="small"
                              />
                            }
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Progress" 
                            secondary={`${selectedWorkflow.completedSteps}/${selectedWorkflow.totalSteps} steps`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Duration" 
                            secondary={formatDuration(selectedWorkflow.startTime, selectedWorkflow.endTime)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Priority" 
                            secondary={selectedWorkflow.context.priority.toUpperCase()}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Step Progress</Typography>
                      <Stepper orientation="vertical">
                        {selectedWorkflow.steps.map((step, index) => (
                          <Step key={step.id} active={step.status === 'running'} completed={step.status === 'completed'}>
                            <StepLabel
                              error={step.status === 'failed'}
                              icon={getStepIcon(step)}
                            >
                              {step.name}
                            </StepLabel>
                            <StepContent>
                              <Typography variant="body2" color="text.secondary" mb={1}>
                                {step.description}
                              </Typography>
                              {step.error && (
                                <Alert severity="error">
                                  {step.error}
                                </Alert>
                              )}
                              {step.result && typeof step.result === 'string' && (
                                <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mt: 1 }}>
                                  {step.result.substring(0, 200)}...
                                </Typography>
                              )}
                            </StepContent>
                          </Step>
                        ))}
                      </Stepper>
                    </CardContent>
                  </Card>
                </Grid>
                {selectedWorkflow.recommendations.length > 0 && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Recommendations</Typography>
                        <List>
                          {selectedWorkflow.recommendations.map((rec, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <SettingsIcon />
                              </ListItemIcon>
                              <ListItemText primary={rec} />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
