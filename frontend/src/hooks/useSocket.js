import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (onNewPaper) => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to backend (proxied in dev, direct in prod)
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
    
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log(`Socket connected: ${socketRef.current.id}`);
    });

    if (onNewPaper) {
      socketRef.current.on('new_paper', (paper) => {
        onNewPaper(paper);
      });
    }

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onNewPaper]);

  return socketRef.current;
};

export default useSocket;
