"""Agentic Workflow Engine for autonomous diagnostics and server management.

This module provides workflow templates, decision trees, and autonomous
execution capabilities for complex server management tasks.
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timezone

from memory_client import store as mem_store, search as mem_search
from mcp_client import MCPClient

logging.basicConfig(level=logging.INFO, format="[WorkflowEngine] %(message)s")


class WorkflowStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"


class TaskType(Enum):
    DIAGNOSTIC = "diagnostic"
    REMEDIATION = "remediation"
    MONITORING = "monitoring"
    ANALYSIS = "analysis"


@dataclass
class WorkflowTask:
    id: str
    type: TaskType
    name: str
    description: str
    command: Optional[str] = None
    expected_output: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    timeout: int = 30
    dependencies: List[str] = None
    conditions: Dict[str, Any] = None

    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []
        if self.conditions is None:
            self.conditions = {}


@dataclass
class WorkflowResult:
    task_id: str
    status: WorkflowStatus
    output: str
    error: Optional[str] = None
    execution_time: float = 0.0
    timestamp: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc).isoformat()


class WorkflowTemplate:
    """Predefined workflow templates for common server management scenarios."""
    
    @staticmethod
    def web_server_diagnostic() -> List[WorkflowTask]:
        """Comprehensive web server diagnostic workflow."""
        return [
            WorkflowTask(
                id="check_service_status",
                type=TaskType.DIAGNOSTIC,
                name="Check Web Server Status",
                description="Verify if web server process is running",
                command="systemctl status apache2 nginx",
            ),
            WorkflowTask(
                id="check_ports",
                type=TaskType.DIAGNOSTIC,
                name="Check Port Availability",
                description="Verify web server ports are listening",
                command="netstat -tlnp | grep ':80\\|:443'",
                dependencies=["check_service_status"]
            ),
            WorkflowTask(
                id="check_logs",
                type=TaskType.ANALYSIS,
                name="Analyze Error Logs",
                description="Review recent error logs for issues",
                command="tail -n 50 /var/log/apache2/error.log /var/log/nginx/error.log",
                dependencies=["check_service_status"]
            ),
            WorkflowTask(
                id="test_connectivity",
                type=TaskType.DIAGNOSTIC,
                name="Test Web Connectivity", 
                description="Test HTTP/HTTPS connectivity",
                command="curl -I localhost && curl -Ik https://localhost",
                dependencies=["check_ports"]
            )
        ]

    @staticmethod
    def system_health_check() -> List[WorkflowTask]:
        """General system health diagnostic workflow."""
        return [
            WorkflowTask(
                id="check_disk_space",
                type=TaskType.MONITORING,
                name="Check Disk Usage",
                description="Monitor disk space across all partitions",
                command="df -h",
            ),
            WorkflowTask(
                id="check_memory",
                type=TaskType.MONITORING,
                name="Check Memory Usage",
                description="Monitor system memory and swap usage",
                command="free -h && ps aux --sort=-%mem | head -10",
            ),
            WorkflowTask(
                id="check_cpu",
                type=TaskType.MONITORING,
                name="Check CPU Usage",
                description="Monitor CPU usage and load average",
                command="top -bn1 | head -20 && uptime",
            ),
            WorkflowTask(
                id="check_processes",
                type=TaskType.ANALYSIS,
                name="Analyze Running Processes",
                description="Review critical system processes",
                command="ps aux | grep -E 'ssh|cron|systemd' | head -10",
                dependencies=["check_cpu"]
            )
        ]

    @staticmethod
    def security_audit() -> List[WorkflowTask]:
        """Security-focused diagnostic workflow."""
        return [
            WorkflowTask(
                id="check_failed_logins",
                type=TaskType.ANALYSIS,
                name="Check Failed Login Attempts",
                description="Review authentication failures",
                command="journalctl -u ssh --since='1 hour ago' | grep -i failed",
            ),
            WorkflowTask(
                id="check_open_ports",
                type=TaskType.DIAGNOSTIC,
                name="Scan Open Ports",
                description="List all listening network services",
                command="netstat -tlnp",
            ),
            WorkflowTask(
                id="check_updates",
                type=TaskType.MONITORING,
                name="Check Security Updates",
                description="Review available security patches",
                command="apt list --upgradable 2>/dev/null | grep -i security || yum check-update --security",
            )
        ]


class WorkflowEngine:
    """Autonomous workflow execution engine with decision-making capabilities."""
    
    def __init__(self, mcp_client: Optional[MCPClient] = None):
        self.mcp_client = mcp_client or MCPClient()
        self.active_workflows: Dict[str, Dict] = {}
        self.templates = WorkflowTemplate()
        
    def create_workflow(self, workflow_id: str, server_id: str, template_name: str) -> bool:
        """Create a new workflow instance from a template."""
        template_map = {
            "web_server_diagnostic": self.templates.web_server_diagnostic,
            "system_health_check": self.templates.system_health_check,
            "security_audit": self.templates.security_audit,
        }
        
        if template_name not in template_map:
            logging.error(f"Unknown template: {template_name}")
            return False
            
        tasks = template_map[template_name]()
        
        workflow = {
            "id": workflow_id,
            "server_id": server_id,
            "template": template_name,
            "status": WorkflowStatus.PENDING,
            "tasks": {task.id: task for task in tasks},
            "results": {},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "current_task": None
        }
        
        self.active_workflows[workflow_id] = workflow
        
        # Store workflow creation in memory
        mem_store(
            f"Created workflow {template_name} for server {server_id}",
            server_id=server_id,
            tags=["workflow", "created"]
        )
        
        logging.info(f"Created workflow {workflow_id} using template {template_name}")
        return True
    
    def execute_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """Execute a workflow with autonomous decision-making."""
        if workflow_id not in self.active_workflows:
            return {"error": "Workflow not found"}
            
        workflow = self.active_workflows[workflow_id]
        workflow["status"] = WorkflowStatus.RUNNING
        
        executed_tasks = set()
        
        try:
            while True:
                # Find next executable task
                next_task = self._find_next_task(workflow, executed_tasks)
                if not next_task:
                    break
                    
                workflow["current_task"] = next_task.id
                
                # Execute task
                result = self._execute_task(workflow["server_id"], next_task)
                workflow["results"][next_task.id] = asdict(result)
                executed_tasks.add(next_task.id)
                
                # Store result in memory for learning
                mem_store(
                    f"Task {next_task.name}: {result.output[:200]}",
                    server_id=workflow["server_id"],
                    tags=["workflow", "task_result", workflow["template"]]
                )
                
                # Decision-making: Stop on critical failures
                if result.status == WorkflowStatus.FAILED and next_task.type == TaskType.DIAGNOSTIC:
                    break
                    
                # Brief pause between tasks
                time.sleep(0.5)
                
            workflow["status"] = WorkflowStatus.COMPLETED
            workflow["current_task"] = None
            
        except Exception as e:
            workflow["status"] = WorkflowStatus.FAILED
            logging.error(f"Workflow {workflow_id} failed: {e}")
            
        return self._generate_workflow_summary(workflow)
    
    def _find_next_task(self, workflow: Dict, executed_tasks: set) -> Optional[WorkflowTask]:
        """Find the next task that can be executed based on dependencies."""
        for task_id, task in workflow["tasks"].items():
            if task_id in executed_tasks:
                continue
                
            # Check if all dependencies are satisfied
            deps_satisfied = all(dep in executed_tasks for dep in task.dependencies)
            if deps_satisfied:
                return task
                
        return None
    
    def _execute_task(self, server_id: str, task: WorkflowTask) -> WorkflowResult:
        """Execute a single workflow task."""
        start_time = time.time()
        
        try:
            if not self.mcp_client.connected:
                self.mcp_client.connect()
                
            response = self.mcp_client.execute_command(server_id, task.command)
            execution_time = time.time() - start_time
            
            if response and "status" in response:
                return WorkflowResult(
                    task_id=task.id,
                    status=WorkflowStatus.COMPLETED,
                    output=str(response.get("output", "")),
                    execution_time=execution_time
                )
            else:
                return WorkflowResult(
                    task_id=task.id,
                    status=WorkflowStatus.FAILED,
                    output="",
                    error="No valid response from MCP client",
                    execution_time=execution_time
                )
                
        except Exception as e:
            execution_time = time.time() - start_time
            return WorkflowResult(
                task_id=task.id,
                status=WorkflowStatus.FAILED,
                output="",
                error=str(e),
                execution_time=execution_time
            )
    
    def _generate_workflow_summary(self, workflow: Dict) -> Dict[str, Any]:
        """Generate a comprehensive workflow execution summary."""
        total_tasks = len(workflow["tasks"])
        completed_tasks = len([r for r in workflow["results"].values() 
                             if r["status"] == WorkflowStatus.COMPLETED.value])
        failed_tasks = len([r for r in workflow["results"].values() 
                           if r["status"] == WorkflowStatus.FAILED.value])
        
        summary = {
            "workflow_id": workflow["id"],
            "server_id": workflow["server_id"],
            "template": workflow["template"],
            "status": workflow["status"].value,
            "summary": {
                "total_tasks": total_tasks,
                "completed": completed_tasks,
                "failed": failed_tasks,
                "success_rate": round(completed_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0
            },
            "results": workflow["results"],
            "recommendations": self._generate_recommendations(workflow)
        }
        
        # Store summary in memory for future reference
        mem_store(
            f"Workflow {workflow['template']} completed with {completed_tasks}/{total_tasks} tasks successful",
            server_id=workflow["server_id"],
            tags=["workflow", "summary", "completed"]
        )
        
        return summary
    
    def _generate_recommendations(self, workflow: Dict) -> List[str]:
        """Generate actionable recommendations based on workflow results."""
        recommendations = []
        
        for task_id, result in workflow["results"].items():
            task = workflow["tasks"][task_id]
            
            if result["status"] == WorkflowStatus.FAILED.value:
                recommendations.append(f"CRITICAL: {task.name} failed - investigate {task.description}")
            elif task.type == TaskType.MONITORING and "error" in str(result["output"]).lower():
                recommendations.append(f"WARNING: {task.name} detected issues - review output")
                
        if not recommendations:
            recommendations.append("All diagnostic tasks completed successfully - system appears healthy")
            
        return recommendations
    
    def list_active_workflows(self) -> List[Dict[str, Any]]:
        """List all active workflows and their status."""
        return [
            {
                "id": wf["id"],
                "server_id": wf["server_id"],
                "template": wf["template"],
                "status": wf["status"].value,
                "current_task": wf.get("current_task"),
                "created_at": wf["created_at"]
            }
            for wf in self.active_workflows.values()
        ]


# Global workflow engine instance
_workflow_engine = None

def get_workflow_engine() -> WorkflowEngine:
    """Get or create the global workflow engine instance."""
    global _workflow_engine
    if _workflow_engine is None:
        _workflow_engine = WorkflowEngine()
    return _workflow_engine
