import { io } from 'socket.io-client';

const getSocketUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://10.1.222.134';
};

const socket = io(getSocketUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('⚡ Connected to Realtime Socket.IO server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from Socket.IO server');
});

export default socket;
