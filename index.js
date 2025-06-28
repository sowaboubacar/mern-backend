const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const privateMessagesRoutes = require('./routes/privateMessages');


const Message = require('./models/Message');
const User = require('./models/User');
const Room = require('./models/Room');
const PrivateMessage = require('./models/PrivateMessage');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages/private', privateMessagesRoutes);


const usersInRooms = {};
const socketUserMap = {};

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chat-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ Erreur MongoDB :', err.message));

io.on('connection', (socket) => {
  console.log('🟢 Connexion :', socket.id);

  // Changement ici : récupération du token dans handshake.auth
  const token = socket.handshake.auth?.token;

  if (!token) {
    console.log('❌ Connexion refusée : token manquant');
    socket.disconnect();
    return;
  }

  let userId;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
    socketUserMap[socket.id] = userId;
    console.log('✅ Utilisateur socket authentifié :', userId);
  } catch (err) {
    console.log('❌ Token invalide :', err.message);
    socket.disconnect();
    return;
  }

  socket.on('getRooms', async () => {
    try {
      const rooms = await Room.find({}, 'name description _id').sort({ createdAt: -1 });
      socket.emit('roomList', rooms);
    } catch (err) {
      console.error('Erreur récupération salons :', err.message);
      socket.emit('roomList', []);
    }
  });

  socket.on('joinRoom', async (roomId) => {
    if (!socketUserMap[socket.id]) {
      console.log('Utilisateur non authentifié tente de rejoindre une salle');
      return;
    }
    socket.join(roomId);
    if (!usersInRooms[roomId]) usersInRooms[roomId] = new Set();
    usersInRooms[roomId].add(socket.id);
    await emitOnlineUsers(roomId);
  });

  socket.on('leaveRoom', async (roomId) => {
    socket.leave(roomId);
    if (usersInRooms[roomId]) {
      usersInRooms[roomId].delete(socket.id);
      await emitOnlineUsers(roomId);
    }
  });

  socket.on('sendMessage', async ({ roomId, content }) => {
    try {
      const authorId = socketUserMap[socket.id];
      if (!authorId) throw new Error('Utilisateur non authentifié');
      if (!roomId) throw new Error('ID de la salle manquant');
      if (!content || !content.trim()) throw new Error('Message vide');

      const author = await User.findById(authorId);
      if (author.isBanned) throw new Error('Utilisateur banni');

      const message = new Message({ content, room: roomId, author: authorId });
      await message.save();
      const populated = await message.populate('author', 'username email');
      io.to(roomId).emit('newMessage', populated);
    } catch (err) {
      console.error('Erreur sendMessage:', err.message);
    }
  });

  socket.on('sendPrivateMessage', async ({ toUserId, content }) => {
    try {
      const fromUserId = socketUserMap[socket.id];
      if (!fromUserId) throw new Error('Utilisateur non authentifié');
      if (!toUserId) throw new Error('ID destinataire manquant');
      if (!content || !content.trim()) throw new Error('Message vide');

      const fromUser = await User.findById(fromUserId);
      if (fromUser.blockedUsers.includes(toUserId)) {
        throw new Error('Vous avez bloqué cet utilisateur');
      }
      const toUser = await User.findById(toUserId);
      if (toUser.blockedUsers.includes(fromUserId)) {
        throw new Error('Vous êtes bloqué par cet utilisateur');
      }

      const privateMsg = new PrivateMessage({
        content,
        from: fromUserId,
        to: toUserId,
      });
      await privateMsg.save();

      const populatedMsg = await PrivateMessage.findById(privateMsg._id)
        .populate('from', 'username email')
        .populate('to', 'username email');

      for (const [sockId, userId] of Object.entries(socketUserMap)) {
        if (
          userId.toString() === toUserId.toString() ||
          userId.toString() === fromUserId.toString()
        ) {
          io.to(sockId).emit('newPrivateMessage', populatedMsg);
        }
      }
    } catch (err) {
      console.error('Erreur sendPrivateMessage:', err.message);
      socket.emit('errorMessage', err.message);
    }
  });

  socket.on('getPrivateMessages', async ({ withUserId }) => {
    try {
      const userId = socketUserMap[socket.id];
      if (!userId) throw new Error('Utilisateur non authentifié');
      if (!withUserId) throw new Error('ID utilisateur cible manquant');

      const messages = await PrivateMessage.find({
        $or: [
          { from: userId, to: withUserId },
          { from: withUserId, to: userId },
        ],
      })
        .populate('from', 'username email')
        .populate('to', 'username email')
        .sort({ createdAt: 1 });

      socket.emit('privateMessageHistory', messages);
    } catch (err) {
      console.error('Erreur getPrivateMessages:', err.message);
      socket.emit('privateMessageHistory', []);
    }
  });

  socket.on('disconnect', async () => {
    for (const roomId in usersInRooms) {
      usersInRooms[roomId].delete(socket.id);
      await emitOnlineUsers(roomId);
    }
    delete socketUserMap[socket.id];
  });

  async function emitOnlineUsers(roomId) {
    const socketIds = Array.from(usersInRooms[roomId] || []);
    const userIds = [...new Set(socketIds.map(id => socketUserMap[id]).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }, 'username email');
    io.to(roomId).emit('onlineUsers', users);
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));
