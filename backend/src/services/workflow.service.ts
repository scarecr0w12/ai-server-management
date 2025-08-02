import { AiService } from './ai.service';
import { DiagnosticsService, DiagnosticRequest, DiagnosticResult } from './diagnostics.service';
import { ServerManager } from './server-manager.service';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'diagnostic' | 'analysis' | 'action' | 'verification';
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  dependencies?: string[];
}

export interface WorkflowContext {
  serverId: string;
  symptoms: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  allowAutomatedActions: boolean;
  maxExecutionTime: number;
  learningEnabled: boolean;
}

export interface WorkflowExecution {
  id: string;
  name: string;
  context: WorkflowContext;
  steps: WorkflowStep[];
  status: 'running' | 'completed' | 'failed' | 'paused';
  startTime: Date;
  endTime?: Date;
  totalSteps: number;
  completedSteps: number;
  success: boolean;
  recommendations: string[];
  learningData?: WorkflowLearning;
}

export interface WorkflowLearning {
  problemPattern: string;
  successfulSteps: string[];
  failedSteps: string[];
  optimalSequence: string[];
  confidence: number;
  applicableScenarios: string[];
}

export class WorkflowService {
  private activeWorkflows = new Map<string, WorkflowExecution>();
  private workflowTemplates = new Map<string, WorkflowStep[]>();
  private learningDatabase = new Map<string, WorkflowLearning[]>();

  constructor(
    private aiService: AiService,
    private diagnosticsService: DiagnosticsService,
    private serverManager: ServerManager
  ) {
    this.initializeWorkflowTemplates();
  }

  private initializeWorkflowTemplates(): void {
    // Server Performance Issues Workflow
    this.workflowTemplates.set('performance_issues', [
      {
        id: 'perf_01',
        name: 'Initial Assessment',
        type: 'diagnostic',
        description: 'Gather server metrics and identify performance bottlenecks',
        status: 'pending',
        dependencies: []
      },
      {
        id: 'perf_02',
        name: 'Resource Analysis',
        type: 'analysis',
        description: 'Analyze CPU, memory, disk, and network utilization',
        status: 'pending',
        dependencies: ['perf_01']
      },
      {
        id: 'perf_03',
        name: 'Process Investigation',
        type: 'diagnostic',
        description: 'Identify top resource-consuming processes',
        status: 'pending',
        dependencies: ['perf_02']
      },
      {
        id: 'perf_04',
        name: 'Log Analysis',
        type: 'analysis',
        description: 'Analyze system and application logs for errors',
        status: 'pending',
        dependencies: ['perf_03']
      },
      {
        id: 'perf_05',
        name: 'Automated Optimization',
        type: 'action',
        description: 'Apply safe performance optimizations',
        status: 'pending',
        dependencies: ['perf_04']
      },
      {
        id: 'perf_06',
        name: 'Verification',
        type: 'verification',
        description: 'Verify improvements and measure impact',
        status: 'pending',
        dependencies: ['perf_05']
      }
    ]);

    // Service Failure Recovery Workflow
    this.workflowTemplates.set('service_failure', [
      {
        id: 'svc_01',
        name: 'Service Status Check',
        type: 'diagnostic',
        description: 'Check service status and dependencies',
        status: 'pending',
        dependencies: []
      },
      {
        id: 'svc_02',
        name: 'Log Investigation',
        type: 'analysis',
        description: 'Analyze service logs for failure reasons',
        status: 'pending',
        dependencies: ['svc_01']
      },
      {
        id: 'svc_03',
        name: 'Dependency Check',
        type: 'diagnostic',
        description: 'Verify all service dependencies are healthy',
        status: 'pending',
        dependencies: ['svc_02']
      },
      {
        id: 'svc_04',
        name: 'Configuration Validation',
        type: 'analysis',
        description: 'Validate service configuration files',
        status: 'pending',
        dependencies: ['svc_03']
      },
      {
        id: 'svc_05',
        name: 'Automated Recovery',
        type: 'action',
        description: 'Attempt automated service recovery',
        status: 'pending',
        dependencies: ['svc_04']
      },
      {
        id: 'svc_06',
        name: 'Health Verification',
        type: 'verification',
        description: 'Verify service is healthy and stable',
        status: 'pending',
        dependencies: ['svc_05']
      }
    ]);

    // Security Incident Response Workflow
    this.workflowTemplates.set('security_incident', [
      {
        id: 'sec_01',
        name: 'Threat Assessment',
        type: 'analysis',
        description: 'Assess the severity and scope of security incident',
        status: 'pending',
        dependencies: []
      },
      {
        id: 'sec_02',
        name: 'Log Collection',
        type: 'diagnostic',
        description: 'Collect security-related logs and evidence',
        status: 'pending',
        dependencies: ['sec_01']
      },
      {
        id: 'sec_03',
        name: 'Impact Analysis',
        type: 'analysis',
        description: 'Analyze potential impact and affected systems',
        status: 'pending',
        dependencies: ['sec_02']
      },
      {
        id: 'sec_04',
        name: 'Containment Actions',
        type: 'action',
        description: 'Implement containment measures if authorized',
        status: 'pending',
        dependencies: ['sec_03']
      },
      {
        id: 'sec_05',
        name: 'Evidence Preservation',
        type: 'action',
        description: 'Preserve forensic evidence and document findings',
        status: 'pending',
        dependencies: ['sec_04']
      },
      {
        id: 'sec_06',
        name: 'Recovery Verification',
        type: 'verification',
        description: 'Verify system security and recovery status',
        status: 'pending',
        dependencies: ['sec_05']
      }
    ]);
  }

  async startWorkflow(workflowName: string, context: WorkflowContext): Promise<string> {
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const template = this.workflowTemplates.get(workflowName);
    
    if (!template) {
      throw new Error(`Unknown workflow template: ${workflowName}`);
    }

    // Apply learning from previous executions
    const optimizedSteps = await this.applyLearning(workflowName, [...template]);

    const workflow: WorkflowExecution = {
      id: workflowId,
      name: workflowName,
      context,
      steps: optimizedSteps,
      status: 'running',
      startTime: new Date(),
      totalSteps: optimizedSteps.length,
      completedSteps: 0,
      success: false,
      recommendations: []
    };

    this.activeWorkflows.set(workflowId, workflow);

    // Start workflow execution asynchronously
    this.executeWorkflow(workflowId).catch(error => {
      console.error(`Workflow ${workflowId} failed:`, error);
      workflow.status = 'failed';
      workflow.endTime = new Date();
    });

    return workflowId;
  }

  private async executeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    const maxExecutionTime = workflow.context.maxExecutionTime || 30 * 60 * 1000; // 30 minutes default
    const startTime = Date.now();

    try {
      for (let i = 0; i < workflow.steps.length; i++) {
        // Check timeout
        if (Date.now() - startTime > maxExecutionTime) {
          workflow.status = 'failed';
          workflow.recommendations.push('Workflow execution timed out');
          break;
        }

        const step = workflow.steps[i];
        
        // Check dependencies
        const dependenciesMet = await this.checkDependencies(workflow, step);
        if (!dependenciesMet) {
          step.status = 'skipped';
          continue;
        }

        await this.executeStep(workflow, step);
        workflow.completedSteps++;
      }

      // Finalize workflow
      workflow.status = workflow.steps.every(s => s.status === 'completed' || s.status === 'skipped') ? 'completed' : 'failed';
      workflow.success = workflow.status === 'completed';
      workflow.endTime = new Date();

      // Generate final recommendations
      await this.generateRecommendations(workflow);

      // Learn from execution
      if (workflow.context.learningEnabled) {
        await this.learnFromExecution(workflow);
      }

    } catch (error) {
      workflow.status = 'failed';
      workflow.endTime = new Date();
      workflow.recommendations.push(`Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeStep(workflow: WorkflowExecution, step: WorkflowStep): Promise<void> {
    step.status = 'running';
    step.startTime = new Date();

    try {
      switch (step.type) {
        case 'diagnostic':
          step.result = await this.executeDiagnosticStep(workflow, step);
          break;
        case 'analysis':
          step.result = await this.executeAnalysisStep(workflow, step);
          break;
        case 'action':
          step.result = await this.executeActionStep(workflow, step);
          break;
        case 'verification':
          step.result = await this.executeVerificationStep(workflow, step);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      step.status = 'completed';
      step.endTime = new Date();

    } catch (error) {
      step.status = 'failed';
      step.error = error instanceof Error ? error.message : 'Unknown error';
      step.endTime = new Date();
      throw error;
    }
  }

  private async executeDiagnosticStep(workflow: WorkflowExecution, step: WorkflowStep): Promise<any> {
    const { serverId } = workflow.context;
    
    switch (step.id) {
      case 'perf_01':
      case 'svc_01':
        return await this.serverManager.getServerStatus(serverId);
      
      case 'perf_03':
        return await this.diagnosticsService.executeCommand(serverId, 'ps aux --sort=-%cpu | head -20');
      
      case 'svc_03':
        // Check service dependencies - this would need to be implemented
        return await this.diagnosticsService.executeCommand(serverId, 'systemctl list-dependencies --all');
        
      case 'sec_02':
        return await this.diagnosticsService.fetchLogs(serverId, ['/var/log/auth.log', '/var/log/syslog']);
        
      default:
        return null;
    }
  }

  private async executeAnalysisStep(workflow: WorkflowExecution, step: WorkflowStep): Promise<any> {
    const { serverId, symptoms } = workflow.context;
    
    // Use AI service to analyze collected data
    const analysisContext = {
      serverId,
      stepId: step.id,
      stepName: step.name,
      symptoms: symptoms.join(', '),
      previousResults: workflow.steps.filter(s => s.result).map(s => ({ id: s.id, result: s.result }))
    };

    const analysisPrompt = `
Analyze the following server diagnostic data for step "${step.name}":
Context: ${JSON.stringify(analysisContext, null, 2)}

Provide specific insights and recommendations for this analysis step.
`;

    // This would use the AI service to analyze the data
    const fullPrompt = `${analysisPrompt}

Context Data: ${JSON.stringify(analysisContext, null, 2)}`;
    return await this.aiService.processQuery(fullPrompt);
  }

  private async executeActionStep(workflow: WorkflowExecution, step: WorkflowStep): Promise<any> {
    if (!workflow.context.allowAutomatedActions) {
      return { message: 'Automated actions disabled - manual intervention required' };
    }

    const { serverId } = workflow.context;

    switch (step.id) {
      case 'perf_05':
        // Safe performance optimizations
        return await this.diagnosticsService.executeCommand(serverId, 'sync && echo 3 > /proc/sys/vm/drop_caches');
      
      case 'svc_05':
        // Service restart - this would need service name from context
        return { message: 'Service restart would be performed here' };
      
      case 'sec_04':
        // Security containment
        return { message: 'Security containment measures would be applied here' };
      
      default:
        return null;
    }
  }

  private async executeVerificationStep(workflow: WorkflowExecution, step: WorkflowStep): Promise<any> {
    const { serverId } = workflow.context;
    
    // Wait a moment for changes to take effect
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Re-check system status to verify improvements
    return await this.serverManager.getServerStatus(serverId);
  }

  private async checkDependencies(workflow: WorkflowExecution, step: WorkflowStep): Promise<boolean> {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true;
    }

    return step.dependencies.every(depId => {
      const depStep = workflow.steps.find(s => s.id === depId);
      return depStep && (depStep.status === 'completed' || depStep.status === 'skipped');
    });
  }

  private async applyLearning(workflowName: string, steps: WorkflowStep[]): Promise<WorkflowStep[]> {
    const learningData = this.learningDatabase.get(workflowName);
    if (!learningData || learningData.length === 0) {
      return steps;
    }

    // Find the most confident learning data
    const bestLearning = learningData.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    if (bestLearning.confidence < 0.7) {
      return steps; // Don't apply if confidence is too low
    }

    // Apply learned optimizations
    // This could include skipping unnecessary steps or reordering for efficiency
    return steps.map(step => ({
      ...step,
      // Mark steps that historically fail as lower priority
      ...(bestLearning.failedSteps.includes(step.id) && { 
        description: `${step.description} (Historical failure risk)` 
      })
    }));
  }

  private async generateRecommendations(workflow: WorkflowExecution): Promise<void> {
    const completedSteps = workflow.steps.filter(s => s.status === 'completed');
    const failedSteps = workflow.steps.filter(s => s.status === 'failed');

    workflow.recommendations = [
      `Workflow completed ${completedSteps.length}/${workflow.totalSteps} steps successfully`,
      ...failedSteps.map(s => `Failed step: ${s.name} - ${s.error}`),
      `Total execution time: ${workflow.endTime ? workflow.endTime.getTime() - workflow.startTime.getTime() : 0}ms`
    ];
  }

  private async learnFromExecution(workflow: WorkflowExecution): Promise<void> {
    const learning: WorkflowLearning = {
      problemPattern: workflow.context.symptoms.join(', '),
      successfulSteps: workflow.steps.filter(s => s.status === 'completed').map(s => s.id),
      failedSteps: workflow.steps.filter(s => s.status === 'failed').map(s => s.id),
      optimalSequence: workflow.steps.map(s => s.id),
      confidence: workflow.completedSteps / workflow.totalSteps,
      applicableScenarios: [workflow.context.serverId]
    };

    const existingLearning = this.learningDatabase.get(workflow.name) || [];
    existingLearning.push(learning);
    
    // Keep only the most recent 10 learning entries
    if (existingLearning.length > 10) {
      existingLearning.splice(0, existingLearning.length - 10);
    }
    
    this.learningDatabase.set(workflow.name, existingLearning);
  }

  async getWorkflowStatus(workflowId: string): Promise<WorkflowExecution | null> {
    return this.activeWorkflows.get(workflowId) || null;
  }

  async listActiveWorkflows(): Promise<WorkflowExecution[]> {
    return Array.from(this.activeWorkflows.values());
  }

  async getAvailableWorkflows(): Promise<string[]> {
    return Array.from(this.workflowTemplates.keys());
  }

  async pauseWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow && workflow.status === 'running') {
      workflow.status = 'paused';
      return true;
    }
    return false;
  }

  async resumeWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow && workflow.status === 'paused') {
      workflow.status = 'running';
      this.executeWorkflow(workflowId); // Resume execution
      return true;
    }
    return false;
  }
}
