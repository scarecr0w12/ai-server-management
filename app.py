from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='frontend/build', static_url_path='')
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/health')
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/api/servers')
def get_servers():
    # Will be implemented with MCP connections
    return jsonify({"servers": []})

@app.route('/api/chat', methods=['POST'])
def chat():
    # Will be implemented with LLM integration
    request_data = request.json
    return jsonify({"response": "Hello! I'm your server management assistant."})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
