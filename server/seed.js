require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('./models/Room');
const User = require('./models/User');

const seedRooms = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Create a default system user for seeding
    let systemUser = await User.findOne({ email: 'system@chatapp.com' });
    
    if (!systemUser) {
      systemUser = new User({
        googleId: 'system-user',
        name: 'System',
        email: 'system@chatapp.com',
        avatar: null
      });
      await systemUser.save();
      console.log('Created system user');
    }

    // Check if rooms already exist
    const existingRooms = await Room.find();
    if (existingRooms.length > 0) {
      console.log('Rooms already exist, skipping seed');
      process.exit(0);
    }

    // Create default rooms
    const defaultRooms = [
      {
        name: 'General',
        description: 'General discussion for everyone',
        createdBy: systemUser._id,
        members: [systemUser._id],
        isDefault: true
      },
      {
        name: 'Random',
        description: 'Random chats and fun conversations',
        createdBy: systemUser._id,
        members: [systemUser._id],
        isDefault: true
      },
      {
        name: 'Tech Talk',
        description: 'Discuss technology, programming, and innovations',
        createdBy: systemUser._id,
        members: [systemUser._id],
        isDefault: true
      },
      {
        name: 'Help & Support',
        description: 'Get help and support from the community',
        createdBy: systemUser._id,
        members: [systemUser._id],
        isDefault: true
      }
    ];

    await Room.insertMany(defaultRooms);
    console.log('Default rooms created successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedRooms();
