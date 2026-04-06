require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const { sequelize } = require('./models');
const chatHandler = require('./sockets/chatHandler');

const app = express();
const server = http.createServer(app);

// Serve static widget files
app.use(express.static('public'));

// CORS Configuration Whitelist
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'https://your-production-app.com'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Security and Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // Increased limit for development
});
app.use(limiter);

// Socket.io Setup
const io = new Server(server, {
  cors: corsOptions
});

io.on('connection', (socket) => {
  chatHandler(io, socket);
});



app.use(compression({
  filter: (req, res) => {
    if (req.headers.accept === 'text/event-stream') {
      return false; // ❌ disable for SSE
    }
    return compression.filter(req, res);
  }
}));

// Routes
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/bots', require('./routes/botRoutes'));
app.use('/api/conversations', require('./routes/conversationRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/pdfs', require('./routes/pdfRoutes')); // Added PDF routes
app.use('/api/leads', require('./routes/leadRoutes'));

// Database Sync and Server Start
const PORT = process.env.PORT || 10000;

sequelize.sync({ alter: true }).then(() => {
  console.log('Database connected and synced');
  //if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  //}
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});

// Export the Express API for Vercel
module.exports = app;
