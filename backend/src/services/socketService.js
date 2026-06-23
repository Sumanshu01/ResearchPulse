import { Server } from 'socket.io';
import logger from '../config/logger.js';

let io = null;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // In production, replace with specific domains
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected to real-time feed: ${socket.id}`);

    // Listen for room joins (e.g., specific categories, topics)
    socket.on('join_category', (category) => {
      socket.join(category);
      logger.info(`Socket ${socket.id} joined category room: ${category}`);
    });

    socket.on('leave_category', (category) => {
      socket.leave(category);
      logger.info(`Socket ${socket.id} left category room: ${category}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const broadcastNewPaper = (paper) => {
  if (io) {
    logger.info(`Broadcasting new paper: "${paper.title}"`);
    // Emit to general feed
    io.emit('new_paper', paper);

    // Emit to specific category rooms if the paper has categories
    if (paper.categories && Array.isArray(paper.categories)) {
      paper.categories.forEach((cat) => {
        io.to(cat).emit('category_paper', paper);
      });
    }
  } else {
    logger.warn('Socket.IO not initialized. Cannot broadcast new paper.');
  }
};
