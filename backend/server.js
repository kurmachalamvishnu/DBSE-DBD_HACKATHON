const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { connectMongo } = require('./config/mongo');

// Initialize Express & HTTP Server
const app = express();
const server = http.createServer(app);

// Setup Socket.IO for real-time live token & queue updates
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Attach io instance to express app context
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString().substring(11, 19)}] ${req.method} ${req.originalUrl}`);
  next();
});

// Mount Routes
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/tokens', require('./routes/tokenRoutes'));
app.use('/api/queues', require('./routes/queueRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/predict', require('./routes/predictionRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    service: 'Healthcare Queue Backend REST API',
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 5000,
    database: process.env.DB_NAME || 'healthcare_queue_db'
  });
});

// Socket.IO Connection Event
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('subscribe:doctor', (doctorId) => {
    socket.join(`doctor_${doctorId}`);
    console.log(`[Socket.io] Client ${socket.id} subscribed to doctor_${doctorId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Server Initialization
const PORT = process.env.PORT || 5000;

async function startServer() {
  // Connect to distributed Mongo telemetry stream (non-blocking)
  await connectMongo();

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  Healthcare Queue Management Backend REST API`);
    console.log(`  Server listening on: http://localhost:${PORT}`);
    console.log(`  WebSocket (Socket.io) Active on port: ${PORT}`);
    console.log(`  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

startServer();
