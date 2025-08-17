# ChatApp - Real-time Chat Application

A modern real-time chat application built with React, Node.js, Socket.io, and MongoDB. Features include multiple chat rooms, image sharing, Google OAuth authentication, and push notifications.

## 🚀 Quick Deploy

### Deploy on Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. **Fork this repository**
2. **Connect to [Render.com](https://render.com)**
3. **Use the included `render.yaml` configuration**
4. **Add environment variables** (see `RENDER_DEPLOY.md`)
5. **Deploy automatically!**

**📖 Complete deployment guide:** [RENDER_DEPLOY.md](RENDER_DEPLOY.md)

---

## Features

- ✅ Real-time messaging with Socket.io
- ✅ Multiple public chat rooms
- ✅ Google OAuth authentication
- ✅ Image sharing (max 10MB)
- ✅ Browser push notifications
- ✅ Sound notifications
- ✅ Typing indicators
- ✅ Online user status
- ✅ Responsive design with Tailwind CSS

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Socket.io Client
- Axios

### Backend
- Node.js
- Express.js
- Socket.io
- MongoDB with Mongoose
- Passport.js (Google OAuth)
- Multer (File uploads)

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (running locally or MongoDB Atlas)
- Google OAuth credentials

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
```

### 2. Environment Setup

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatapp
SESSION_SECRET=your_strong_session_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_URL=http://localhost:5173
```

## 🌐 Production Environment Variables

For deployment, you'll need these environment variables:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
SESSION_SECRET=your-super-secure-random-string-here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_URL=https://your-deployed-app-url.com
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set authorized redirect URI: `http://localhost:5000/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

### 4. Database Setup

```bash
# Make sure MongoDB is running, then seed the database with default rooms
cd server
npm run seed
```

### 5. Run the Application

```bash
# Terminal 1: Start the backend server
cd server
npm run dev

# Terminal 2: Start the frontend (in project root)
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Usage

1. Open http://localhost:5173 in your browser
2. Click "Continue with Google" to authenticate
3. Select a chat room from the sidebar
4. Start chatting!

### Features Guide

- **Send Messages**: Type in the input field and press Enter
- **Share Images**: Click the image icon to upload and share images
- **Create Rooms**: Click the "+" button in the rooms section
- **Notifications**: Browser will show notifications for new messages when tab is inactive
- **Typing Indicators**: See when other users are typing
- **Online Status**: See who's currently online

## Project Structure

```
Chat App/
├── src/                          # Frontend React app
│   ├── components/              # React components
│   │   ├── Chat.jsx            # Main chat interface
│   │   ├── MessageList.jsx     # Message display
│   │   ├── MessageInput.jsx    # Message input with file upload
│   │   ├── RoomList.jsx        # Chat rooms sidebar
│   │   ├── UserList.jsx        # Online users list
│   │   └── LoginPage.jsx       # Login page
│   ├── contexts/               # React contexts
│   │   ├── AuthContext.jsx     # Authentication state
│   │   └── SocketContext.jsx   # Socket.io connection
│   ├── App.jsx                 # Main app component
│   └── main.jsx               # App entry point
├── server/                      # Backend Node.js app
│   ├── models/                 # MongoDB models
│   │   ├── User.js            # User model
│   │   ├── Room.js            # Chat room model
│   │   └── Message.js         # Message model
│   ├── config/                # Configuration files
│   │   └── passport.js        # Passport OAuth config
│   ├── uploads/               # File upload directory
│   ├── index.js               # Main server file
│   └── seed.js                # Database seeding script
└── README.md                   # This file
```

## API Endpoints

- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/user` - Get current user
- `GET /auth/logout` - Logout user
- `GET /api/rooms` - Get all chat rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/:id/messages` - Get room messages
- `POST /api/upload` - Upload image file

## Socket Events

### Client to Server
- `user-connected` - User connects to socket
- `join-room` - Join a chat room
- `leave-room` - Leave a chat room
- `send-message` - Send a message
- `typing` - User is typing
- `stop-typing` - User stopped typing

### Server to Client
- `new-message` - New message received
- `user-typing` - User is typing notification
- `user-stop-typing` - User stopped typing
- `user-status-changed` - User online/offline status
- `message-error` - Message sending error

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
