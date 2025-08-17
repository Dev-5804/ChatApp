require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const multer = require('multer');
const path = require('path');

// Models
const User = require('./models/User');
const Room = require('./models/Room');
const Message = require('./models/Message');

// Cleanup function for empty rooms
const cleanupEmptyRooms = async () => {
  try {
    // Find all non-default rooms and check their member count manually
    const nonDefaultRooms = await Room.find({ isDefault: false });
    let deletedCount = 0;
    
    for (const room of nonDefaultRooms) {
      if (room.members.length === 0) {
        await Room.findByIdAndDelete(room._id);
        await Message.deleteMany({ room: room._id }); // Also delete messages
        deletedCount++;
        console.log(`Deleted empty room: ${room.name}`);
      }
    }
    
    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} empty room(s)`);
    }
  } catch (error) {
    console.error('Error cleaning up empty rooms:', error);
  }
};

// Run cleanup every 30 minutes
setInterval(cleanupEmptyRooms, 30 * 60 * 1000);

// Passport configuration
require('./config/passport');

const app = express();
const server = http.createServer(app);

// CORS configuration for multiple environments
const allowedOrigins = [
  'http://localhost:5173', // Development
  'http://localhost:3000', // Alternative development port
  process.env.CLIENT_URL,  // Production client URL
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
].filter(Boolean);

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'chatapp.session',
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
    // Remove deprecated mongoOptions
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
    httpOnly: true, // Prevents XSS attacks
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Cross-site cookies for production
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Static files for uploaded images with CORS headers
app.use('/uploads', (req, res, next) => {
  // Allow multiple origins for uploads
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// In production, serve the built frontend
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the built frontend
  app.use(express.static(path.join(__dirname, '../dist')));
}

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// MongoDB connection with proper error handling for Render
const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI;
    
    console.log('Attempting MongoDB connection...');
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    // Clean the MongoDB URI to remove deprecated parameters
    try {
      const url = new URL(mongoURI);
      
      // Keep only modern, supported parameters
      const allowedParams = [
        'retryWrites',
        'w',
        'authSource',
        'tls',
        'tlsAllowInvalidCertificates',
        'tlsAllowInvalidHostnames',
        'serverSelectionTimeoutMS',
        'connectTimeoutMS',
        'socketTimeoutMS',
        'maxPoolSize',
        'minPoolSize',
        'maxIdleTimeMS',
        'appName'
      ];
      
      const cleanParams = new URLSearchParams();
      for (const [key, value] of url.searchParams) {
        const lowerKey = key.toLowerCase();
        // Remove any deprecated parameters
        if (lowerKey === 'sslvalidate' || 
            lowerKey === 'ssl' || 
            lowerKey === 'buffermaxentries' ||
            lowerKey === 'usenewurlparser' ||
            lowerKey === 'useunifiedtopology' ||
            lowerKey === 'usecreateindex' ||
            lowerKey === 'usefindandmodify') {
          console.log(`Removing deprecated parameter: ${key}`);
          continue;
        }
        
        if (allowedParams.includes(key)) {
          cleanParams.append(key, value);
        }
      }
      
      // Rebuild the URI with only allowed parameters
      mongoURI = `${url.protocol}//${url.username}:${url.password}@${url.host}${url.pathname}`;
      
      // Ensure TLS is enabled for Atlas connections
      if (url.host.includes('mongodb.net')) {
        if (!cleanParams.has('tls')) {
          cleanParams.append('tls', 'true');
        }
        if (!cleanParams.has('authSource')) {
          cleanParams.append('authSource', 'admin');
        }
        if (!cleanParams.has('retryWrites')) {
          cleanParams.append('retryWrites', 'true');
        }
      }
      
      if (cleanParams.toString()) {
        mongoURI += `?${cleanParams.toString()}`;
      }
      
      console.log('Cleaned MongoDB URI (connection string ready)');
    } catch (urlError) {
      console.log('URL parsing failed, using string replacement method...');
      
      // Fallback: Remove all known deprecated parameters using string replacement
      const deprecatedParams = [
        'sslValidate',
        'ssl',
        'bufferMaxEntries',
        'buffermaxentries', 
        'useNewUrlParser',
        'useUnifiedTopology',
        'useCreateIndex',
        'useFindAndModify'
      ];
      
      for (const param of deprecatedParams) {
        const regex = new RegExp(`[&?]${param}=(true|false|\\d+)`, 'gi');
        mongoURI = mongoURI.replace(regex, '');
      }
      
      // Clean up malformed query strings
      mongoURI = mongoURI.replace(/[&?]{2,}/g, '&').replace(/[?&]$/, '');
      
      console.log('MongoDB URI cleaned using fallback method');
    }
    
    console.log('Connecting to MongoDB...');
    
    // Add specific connection options for better compatibility
    const connectionOptions = {
      // Connection management
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      
      // For MongoDB Atlas SSL/TLS
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false
    };
    
    console.log('Using connection options:', JSON.stringify(connectionOptions, null, 2));
    
    // Connect with specific options for Render compatibility
    await mongoose.connect(mongoURI, connectionOptions);

    console.log('✅ MongoDB connected successfully');
    
    // Seed default rooms after connection
    await seedDefaultRooms();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    
    // Specific handling for SSL/TLS errors
    if (error.message.includes('SSL') || error.message.includes('TLS')) {
      console.log('🔧 SSL/TLS error detected. Retrying with modified TLS settings...');
      
      // Try again with less strict TLS settings
      try {
        const relaxedOptions = {
          maxPoolSize: 10,
          minPoolSize: 2,
          maxIdleTimeMS: 30000,
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          connectTimeoutMS: 15000,
          tls: true,
          tlsAllowInvalidCertificates: true, // More permissive for problematic SSL
          tlsAllowInvalidHostnames: true
        };
        
        console.log('Attempting connection with relaxed TLS settings...');
        await mongoose.connect(mongoURI, relaxedOptions);
        console.log('✅ MongoDB connected with relaxed TLS settings');
        await seedDefaultRooms();
        return;
      } catch (retryError) {
        console.error('❌ Retry with relaxed TLS also failed:', retryError.message);
      }
    }
    
    // Don't exit the process, let Render retry
    console.log('⏰ Retrying connection in 10 seconds...');
    setTimeout(connectDB, 10000); // Retry after 10 seconds
  }
};

// Function to seed default rooms
const seedDefaultRooms = async () => {
  try {
    const defaultRooms = [
      { name: 'General', description: 'General discussion', isDefault: true },
      { name: 'Random', description: 'Random conversations', isDefault: true },
      { name: 'Tech Talk', description: 'Technology discussions', isDefault: true },
      { name: 'Help & Support', description: 'Get help and support', isDefault: true }
    ];

    for (const roomData of defaultRooms) {
      const existingRoom = await Room.findOne({ name: roomData.name, isDefault: true });
      if (!existingRoom) {
        await Room.create({
          ...roomData,
          members: [],
          createdBy: null
        });
        console.log(`Created default room: ${roomData.name}`);
      }
    }
  } catch (error) {
    console.error('Error seeding default rooms:', error);
  }
};

// Connect to MongoDB
connectDB();

// Authentication routes
app.get('/auth/google', (req, res, next) => {
  console.log('Starting Google OAuth flow...');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Google Client ID set:', !!process.env.GOOGLE_CLIENT_ID);
  next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    console.log('OAuth callback - NODE_ENV:', process.env.NODE_ENV);
    console.log('OAuth callback - CLIENT_URL:', process.env.CLIENT_URL);
    
    // Fix the redirect URL to use the correct production URL
    let redirectUrl;
    if (process.env.NODE_ENV === 'production') {
      redirectUrl = process.env.CLIENT_URL || 'https://chatter-qwcb.onrender.com';
    } else {
      redirectUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    }
      
    console.log('Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// API Routes
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true })
      .populate('createdBy', 'name')
      .populate('members', 'name')
      .sort({ createdAt: -1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rooms', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { name, description } = req.body;
    const room = new Room({
      name,
      description,
      createdBy: req.user._id,
      members: [req.user._id]
    });
    await room.save();
    await room.populate('createdBy', 'name');
    await room.populate('members', 'name');
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rooms/:roomId/messages', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    // Check if user is a member of the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.members.includes(userId)) {
      return res.status(403).json({ error: 'You must join the room to view messages' });
    }

    const messages = await Message.find({ room: roomId })
      .populate('user', 'name avatar')
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Image upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    url: `/uploads/${req.file.filename}`
  });
});

// Join room endpoint
app.post('/api/rooms/:roomId/join', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is already a member
    if (!room.members.includes(userId)) {
      room.members.push(userId);
      await room.save();
    }

    const updatedRoom = await Room.findById(roomId)
      .populate('createdBy', 'name')
      .populate('members', 'name');

    res.json({ message: 'Joined room successfully', room: updatedRoom });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave room endpoint
app.post('/api/rooms/:roomId/leave', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Remove user from members
    room.members = room.members.filter(memberId => !memberId.equals(userId));
    await room.save();

    // Check if room is now empty and not a default room, then delete it
    if (room.members.length === 0 && !room.isDefault) {
      await Room.findByIdAndDelete(roomId);
      await Message.deleteMany({ room: roomId }); // Also delete messages
      res.json({ message: 'Left room successfully and room was deleted (empty)', roomDeleted: true });
      return;
    }

    const updatedRoom = await Room.findById(roomId)
      .populate('createdBy', 'name')
      .populate('members', 'name');

    res.json({ message: 'Left room successfully', room: updatedRoom });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user-connected', async (userId) => {
    try {
      connectedUsers.set(socket.id, userId);
      
      // Update user online status
      await User.findByIdAndUpdate(userId, { 
        isOnline: true,
        lastSeen: new Date()
      });

      // Broadcast user online status to all clients
      socket.broadcast.emit('user-status-changed', {
        userId,
        isOnline: true
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  });

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  socket.on('send-message', async (data) => {
    try {
      const { content, roomId, userId, image } = data;
      
      // Check if user is a member of the room
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit('message-error', { error: 'Room not found' });
        return;
      }

      if (!room.members.includes(userId)) {
        socket.emit('message-error', { error: 'You must join the room to send messages' });
        return;
      }
      
      const message = new Message({
        content,
        user: userId,
        room: roomId,
        image,
        messageType: image ? 'image' : 'text'
      });
      
      await message.save();
      await message.populate('user', 'name avatar');
      
      // Emit message only to members of the room
      io.to(roomId).emit('new-message', message);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('message-error', { error: 'Failed to send message' });
    }
  });

  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('user-typing', {
      userId: data.userId,
      username: data.username
    });
  });

  socket.on('stop-typing', (data) => {
    socket.to(data.roomId).emit('user-stop-typing', {
      userId: data.userId
    });
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      try {
        // Update user offline status
        await User.findByIdAndUpdate(userId, { 
          isOnline: false,
          lastSeen: new Date()
        });

        // Broadcast user offline status
        socket.broadcast.emit('user-status-changed', {
          userId,
          isOnline: false
        });

        connectedUsers.delete(socket.id);
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    }
  });
});

// Catch-all handler: send back React's index.html file in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Client URL: ${process.env.CLIENT_URL}`);
  console.log(`MongoDB URI set: ${!!process.env.MONGODB_URI}`);
});
