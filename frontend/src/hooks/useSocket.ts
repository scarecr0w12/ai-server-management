import { useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

declare type SocketEventHandler = (...args: any[]) => void;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  if (!socketRef.current) {
    // In a real application, you would get this from an environment variable
    socketRef.current = io('http://localhost:5000');
  }

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const emit = (event: string, data?: any) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event: string, handler: SocketEventHandler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  };

  const off = (event: string, handler?: SocketEventHandler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  };

  return {
    emit,
    on,
    off,
  };
}
