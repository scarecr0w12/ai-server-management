import { useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

declare type SocketEventHandler = (...args: any[]) => void;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  if (!socketRef.current) {
    // In a real application, you would get this from an environment variable
    const wsUrl = process.env.REACT_APP_WS_URL || 'http://localhost:5000';
    console.log('Creating socket connection to:', wsUrl);
    socketRef.current = io(wsUrl, {
      transports: ['polling'], // Force polling-only to eliminate WebSocket errors in Docker
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 30000,
      upgrade: false,
      autoConnect: true,
      forceNew: true,
    });

    if (socketRef.current) {
      socketRef.current.on('connect', () => {
        console.log('Socket connected, socket id:', socketRef.current?.id);
      });

      socketRef.current.on('disconnect', (reason: string) => {
        console.log('Socket disconnected, reason:', reason);
      });

      socketRef.current.on('connect_error', (error: Error) => {
        console.log('Socket connection error:', error);
      });
    }
    socketRef.current.on('reconnect_failed', () => {
      console.log('Socket reconnect failed');
    });
    
    socketRef.current.on('error', (error) => {
      console.log('Socket error:', error);
    });
    
    // Manually connect if not already connected
    if (!socketRef.current.connected) {
      console.log('Manually connecting socket');
      socketRef.current.connect();
    }
    
    // Log current connection state
    console.log('Socket connection state:', socketRef.current.connected);
    console.log('Socket disconnected state:', socketRef.current.disconnected);
  }

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('Disconnecting socket');
        socketRef.current.disconnect();
      }
    };
  }, []);

  const emit = (event: string, data?: any) => {
    if (socketRef.current) {
      console.log('Emitting event:', event, 'with data:', data);
      socketRef.current.emit(event, data);
    }
  };

  const on = (event: string, handler: SocketEventHandler) => {
    if (socketRef.current) {
      console.log('Adding listener for event:', event);
      // Wrap the handler to add debug logging
      const wrappedHandler = (...args: any[]) => {
        console.log('Received event:', event, 'with args:', args);
        return handler(...args);
      };
      socketRef.current.on(event, wrappedHandler);
    }
  };

  const off = (event: string, handler?: SocketEventHandler) => {
    if (socketRef.current) {
      console.log('Removing listener for event:', event);
      socketRef.current.off(event, handler);
    }
  };

  return {
    emit,
    on,
    off,
    socket: socketRef.current,
  };
}
