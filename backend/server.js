require('dotenv').config();
const express = require('express');
const http = require('http');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const reviewRoutes = require('./routes/reviews');
const commentRoutes = require('./routes/comments');
const listRoutes = require('./routes/lists');
const messageRoutes = require('./routes/messages');
const messageController = require('./controllers/messageController');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 5000;

// Connect DB
connectDB();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/messages', messageRoutes);

// Socket.io basic messaging
io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('private_message', async (payload) => {
    // payload: { from, to, text }
    try {
      const saved = await messageController.createMessage(payload);
      // emit to recipient room / id
      io.emit(`message:${payload.to}`, saved);
      io.emit(`message:${payload.from}`, saved);
    } catch (err) {
      console.error('socket message error', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
