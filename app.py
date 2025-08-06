from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
import time
from dotenv import load_dotenv

from mcp_client import MCPClient
from llm_service import process_chat_message
from memory_client import wipe_all as mem_wipe_all, wipe_before as mem_wipe_before
from workflow_engine import get_workflow_engine
from multi_model_service import get_multi_model_service

load_dotenv()

app = Flask(__name__, static_folder='frontend/build', static_url_path='')
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/health')
def health_check():
    return jsonify({"status": "healthy"})

_MCP_CLIENT_FLASK = MCPClient()
_MCP_CLIENT_FLASK.connect()

@app.route('/api/servers')
def get_servers():
    """Return list/status of servers via MCP."""
    if not _MCP_CLIENT_FLASK.connected:
        _MCP_CLIENT_FLASK.connect()
    status = _MCP_CLIENT_FLASK.get_server_status("all") or {"status": "error"}
    return jsonify(status)

@app.route('/api/servers/<server_id>/memory', methods=['DELETE'])
def wipe_server_memory(server_id):
    """Wipe memory for a server. Optional ?before=unix_ts to do partial wipe."""
    before = request.args.get("before")
    if before is not None:
        try:
            before_ts = int(before)
        except ValueError:
            return jsonify({"status": "error", "message": "invalid 'before' timestamp"}), 400
        ok = mem_wipe_before(server_id, before_ts)
    else:
        ok = mem_wipe_all(server_id)
    return jsonify({"status": "ok" if ok else "error"})


@app.route('/api/workflows', methods=['POST'])
def create_workflow():
    """Create and execute a workflow for a server."""
    data = request.get_json()
    server_id = data.get('server_id')
    template = data.get('template', 'system_health_check')
    
    if not server_id:
        return jsonify({"error": "server_id required"}), 400
        
    engine = get_workflow_engine()
    workflow_id = f"wf_{server_id}_{int(time.time())}"
    
    if engine.create_workflow(workflow_id, server_id, template):
        # Execute workflow asynchronously
        result = engine.execute_workflow(workflow_id)
        return jsonify(result)
    else:
        return jsonify({"error": "Failed to create workflow"}), 500


@app.route('/api/workflows', methods=['GET'])
def list_workflows():
    """List all active workflows."""
    engine = get_workflow_engine()
    workflows = engine.list_active_workflows()
    return jsonify({"workflows": workflows})


@app.route('/api/models', methods=['GET'])
def list_models():
    """List available LLM models."""
    service = get_multi_model_service()
    models = service.list_available_models()
    return jsonify({"models": models})


@app.route('/api/models/<model_id>/default', methods=['POST'])
def set_default_model(model_id):
    """Set the default LLM model."""
    service = get_multi_model_service()
    if service.set_default_model(model_id):
        return jsonify({"status": "ok", "default_model": model_id})
    else:
        return jsonify({"error": "Model not found"}), 404


@app.route('/api/chat', methods=['POST'])
def chat():
    """Proxy chat message to LLM service."""
    request_data = request.json or {}
    message = request_data.get("message", "")
    history = request_data.get("history", [])
    response_text = process_chat_message(message, history=history)
    return jsonify({"response": response_text})

if __name__ == '__main__':
    app.run(debug=True, port=5010)
