require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./models');
const chatHandler = require('./sockets/chatHandler');

const app = express();
const server = http.createServer(app);

// Serve static widget files
app.use(express.static('public'));

// Security and Middleware
app.use(helmet());
app.use(cors({ origin: '*' })); // Allow all origins for the widget
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // Increased limit for development
});
app.use(limiter);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  chatHandler(io, socket);
});

// Routes
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/bots', require('./routes/botRoutes'));
app.use('/api/conversations', require('./routes/conversationRoutes'));

// Database Sync and Server Start
const PORT = process.env.PORT || 10000;

sequelize.sync({ alter: true }).then(() => {
  console.log('Database connected and synced');
  if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});

// Export the Express API for Vercel
module.exports = app;
