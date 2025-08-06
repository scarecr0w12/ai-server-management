"""Minimal stub MCP server for local development and testing.

It speaks a naive JSON-over-TCP protocol compatible with `mcp_client.MCPClient`.
The implementation is intentionally lightweight; it **does not** perform any
real server-management tasks.  Instead it returns canned responses that enable
end-to-end wiring tests without requiring an actual infrastructure backend.

Usage (development):
--------------------
>>> python mcp_stub_server.py           # listens on 0.0.0.0:5000

The module can also be imported and `run_server()` invoked programmatically
(e.g. from test suites) which starts the server in a background thread.
"""
from __future__ import annotations

import json
import logging
import socket
import threading
from types import TracebackType
from typing import Dict, Optional, Type

_HOST = "0.0.0.0"
_PORT = 5000  # Keep consistent with project port contract
_BUFFER_SIZE = 4096

logging.basicConfig(level=logging.INFO, format="[MCPStub] %(message)s")


class _ClientHandler(threading.Thread):
    """Handle a single client socket connection."""

    def __init__(self, conn: socket.socket, addr):  # noqa: ANN001
        super().__init__(daemon=True)
        self._conn = conn
        self._addr = addr

    def run(self) -> None:  # noqa: D401
        logging.info("Connection from %s", self._addr)
        try:
            while True:
                data = self._conn.recv(_BUFFER_SIZE)
                if not data:
                    break
                try:
                    request = json.loads(data.decode("utf-8"))
                    response = self._handle_request(request)
                except Exception as exc:  # pragma: no cover – any decoding error
                    response = {
                        "response_to": "ERROR",
                        "status": "error",
                        "message": str(exc),
                    }
                self._conn.sendall(json.dumps(response).encode("utf-8"))
        finally:
            self._conn.close()
            logging.info("Connection closed: %s", self._addr)

    @staticmethod
    def _handle_request(request: Dict[str, object]) -> Dict[str, object]:
        """Return canned response matching the request type."""
        rtype = request.get("type")
        if rtype == "GET_SERVER_STATUS":
            server_id = request.get("server_id", "unknown")
            return {
                "response_to": rtype,
                "status": "ok",
                "server_id": server_id,
                "server_status": {
                    "cpu": "10%",
                    "memory": "512Mi",
                    "uptime": "2d 4h",
                },
            }
        if rtype == "EXECUTE_COMMAND":
            cmd = request.get("command", "")
            server_id = request.get("server_id", "unknown")
            return {
                "response_to": rtype,
                "status": "ok",
                "server_id": server_id,
                "output": f"Executed '{cmd}' successfully",
            }
        return {
            "response_to": rtype or "UNKNOWN",
            "status": "error",
            "message": "Unsupported request type",
        }


class MCPStubServer:
    """Context-manager wrapper for the stub server (useful in tests)."""

    def __init__(self, host: str = _HOST, port: int = _PORT):
        self._host = host
        self._port = port
        self._sock: Optional[socket.socket] = None
        self._thread: Optional[threading.Thread] = None

    def __enter__(self):  # noqa: D401
        self.start()
        return self

    def __exit__(self, exc_type: Optional[Type[BaseException]], exc: Optional[BaseException], tb: Optional[TracebackType]):  # noqa: D401,E501
        self.stop()
        return False

    def start(self) -> None:
        """Start the server in a background thread."""
        if self._thread and self._thread.is_alive():
            return  # Already running

        self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        # Allow quick restart during dev
        self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._sock.bind((self._host, self._port))
        self._sock.listen()
        logging.info("MCP stub listening on %s:%d", self._host, self._port)

        def _accept_loop(sock: socket.socket):  # noqa: D401
            try:
                while True:
                    conn, addr = sock.accept()
                    _ClientHandler(conn, addr).start()
            finally:
                sock.close()

        self._thread = threading.Thread(target=_accept_loop, args=(self._sock,), daemon=True)
        self._thread.start()

    def stop(self) -> None:
        """Stop the server gracefully."""
        if self._sock:
            try:
                self._sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            self._sock.close()
        if self._thread:
            self._thread.join(timeout=1)
        logging.info("MCP stub stopped")


def run_server() -> None:  # pragma: no cover
    """Entry point when running the module as a script."""
    server = MCPStubServer()
    try:
        server.start()
        # Keep main thread alive
        threading.Event().wait()
    except KeyboardInterrupt:
        logging.info("Keyboard interrupt received – shutting down")
    finally:
        server.stop()


if __name__ == "__main__":
    run_server()
