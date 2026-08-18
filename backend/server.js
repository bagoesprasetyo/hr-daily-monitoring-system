require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { initializeDatabase } = require('./src/config/database');
const { seed } = require('./src/seeds/seed');
const { initSocket } = require('./src/utils/socket');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Initialize database
    console.log('📦 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database ready.\n');

    // Run seeds
    await seed();

    // Create HTTP Server & attach Socket.IO
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true
      }
    });

    initSocket(io);

    // Start server listening on 0.0.0.0 (LAN network interface)
    server.listen(PORT, HOST, () => {
      console.log(`\n🚀 HR Daily Monitoring System (Realtime Socket.IO Enabled)`);
      console.log(`   LAN Access URL: http://10.1.222.134:${PORT}`);
      console.log(`   Running on: http://${HOST}:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log(`   API Base: http://10.1.222.134:${PORT}/api\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
