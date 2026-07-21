import { io, Socket } from 'socket.io-client';

// In dev, Vite proxies /socket.io to the server. In prod, same origin.
export const socket: Socket = io('/', {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});
