import json
import socket
from typing import Dict, Any, Optional
import threading
import queue

class MCPClient:
    def __init__(self, host: str = 'localhost', port: int = 5000):
        self.host = host
        self.port = port
        self.socket = None
        self.connected = False
        self.message_queue = queue.Queue()
        self.response_queue = queue.Queue()
        
    def connect(self) -> bool:
        """
        Connect to the MCP server
        """
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.host, self.port))
            self.connected = True
            
            # Start listening thread
            threading.Thread(target=self._listen_for_messages, daemon=True).start()
            
            return True
        except Exception as e:
            print(f"Error connecting to MCP server: {e}")
            self.connected = False
            return False
            
    def disconnect(self) -> None:
        """
        Disconnect from the MCP server
        """
        if self.socket:
            self.socket.close()
        self.connected = False
        
    def send_message(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Send a message to the MCP server and wait for response
        """
        if not self.connected:
            return None
            
        try:
            # Send message
            msg_str = json.dumps(message)
            self.socket.sendall(msg_str.encode('utf-8'))
            
            # Wait for response
            response = self.response_queue.get(timeout=5)
            return response
        except Exception as e:
            print(f"Error sending message: {e}")
            return None
            
    def _listen_for_messages(self) -> None:
        """
        Listen for incoming messages from MCP server
        """
        while self.connected:
            try:
                data = self.socket.recv(4096)
                if not data:
                    break
                    
                message = json.loads(data.decode('utf-8'))
                self.message_queue.put(message)
                
                # If this is a response to our message, put it in response queue
                if 'response_to' in message:
                    self.response_queue.put(message)
                    
            except Exception as e:
                print(f"Error receiving message: {e}")
                break
                
        self.connected = False
        
    def get_server_status(self, server_id: str) -> Optional[Dict[str, Any]]:
        """
        Get status of a specific server
        """
        message = {
            'type': 'GET_SERVER_STATUS',
            'server_id': server_id
        }
        return self.send_message(message)
        
    def execute_command(self, server_id: str, command: str) -> Optional[Dict[str, Any]]:
        """
        Execute a command on a specific server
        """
        message = {
            'type': 'EXECUTE_COMMAND',
            'server_id': server_id,
            'command': command
        }
        return self.send_message(message)
