/**
 * Rover Path Planning Backend Server
 * 
 * Express + WebSocket communication server acting as an intermediary between
 * the Three.js frontend simulation and future ROS 2 / PX4 SITL / Gazebo layers.
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const missionRoutes = require('./routes/missionRoutes');
const waypointRoutes = require('./routes/waypointRoutes');
const px4Routes = require('./routes/px4Routes');
const wsManager = require('./websocket/websocketServer');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

// 1. CORS Configuration (supports flexible local development ports e.g. 8080, 5173, etc.)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin || FRONTEND_URL === '*' || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 2. Request Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Lightweight Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      // console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// 4. API Routes
app.use('/api/mission', missionRoutes);
app.use('/api/waypoints', waypointRoutes);
app.use('/api/px4', px4Routes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'rover-navigation-backend',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint Not Found',
    path: req.originalUrl
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack || err.message);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// 5. Create HTTP Server & Bind WebSocket Manager
const server = http.createServer(app);
wsManager.init(server);

// 6. Start Listening
server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 Rover Navigation Backend running on port ${PORT}`);
  console.log(`📡 REST API:   http://localhost:${PORT}/api`);
  console.log(`🔌 WebSockets: ws://localhost:${PORT}/ws`);
  console.log(`🛰️  PX4 Bridge: Initialized (Status: DISCONNECTED)`);
  console.log('====================================================');
});

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down backend server gracefully...`);
  server.close(() => {
    console.log('HTTP and WebSocket servers closed. Exiting process.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forcefully terminating server after timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = { app, server };
