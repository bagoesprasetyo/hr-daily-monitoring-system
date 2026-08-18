let ioInstance = null;

function initSocket(io) {
  ioInstance = io;
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected to Realtime Socket.IO: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}

function getIO() {
  return ioInstance;
}

function emitRealtimeEvent(event, data = {}) {
  if (ioInstance) {
    ioInstance.emit(event, { ...data, timestamp: Date.now() });
  }
}

module.exports = { initSocket, getIO, emitRealtimeEvent };
