import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/useAuth';
import { useSocket } from '../contexts/useSocket';
import RoomList from './RoomList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import axios from 'axios';

const Chat = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const loadRooms = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/rooms`, {
        withCredentials: true
      });
      setRooms(response.data);
      
      // Only auto-select a room if user hasn't selected one and user is a member of at least one room
      if (response.data.length > 0 && !currentRoom && user) {
        const joinedRoom = response.data.find(room => 
          room.members?.some(member => member._id === user._id)
        );
        if (joinedRoom) {
          setCurrentRoom(joinedRoom);
        }
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  }, [currentRoom, user]);

  useEffect(() => {
    if (socket && user) {
      // Connect user to socket
      socket.emit('user-connected', user._id);

      // Load rooms
      loadRooms();

      // Socket event listeners
      socket.on('new-message', (message) => {
        if (currentRoom && message.room === currentRoom._id) {
          setMessages(prev => {
            // Remove any optimistic message with the same user and timestamp
            const filteredMessages = prev.filter(msg => 
              !msg.isOptimistic || 
              msg.user._id !== message.user._id ||
              Math.abs(new Date(msg.createdAt).getTime() - new Date(message.createdAt).getTime()) > 5000
            );
            
            // Check if this message already exists (to avoid duplicates)
            const messageExists = filteredMessages.some(msg => msg._id === message._id);
            if (messageExists) {
              return filteredMessages;
            }
            
            return [...filteredMessages, message];
          });
          
          // Only play notification sound for messages from other users
          if (message.user._id !== user._id) {
            playNotificationSound();
            
            // Show browser notification if tab is not active
            if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`${message.user.name} in ${currentRoom.name}`, {
                body: message.messageType === 'image' ? 'Sent an image' : message.content,
                icon: message.user.avatar || '/vite.svg'
              });
            }
          }
        }
      });

      socket.on('user-typing', ({ userId, username }) => {
        if (userId !== user._id) {
          setTypingUsers(prev => [...prev.filter(u => u.userId !== userId), { userId, username }]);
        }
      });

      socket.on('user-stop-typing', ({ userId }) => {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      });

      socket.on('user-status-changed', ({ userId, isOnline }) => {
        setOnlineUsers(prev => {
          if (isOnline) {
            return [...prev.filter(u => u !== userId), userId];
          } else {
            return prev.filter(u => u !== userId);
          }
        });
      });

      socket.on('message-error', ({ error }) => {
        alert('Error: ' + error);
        // Remove any optimistic messages that might have failed
        setMessages(prev => prev.filter(msg => !msg.isOptimistic));
      });

      return () => {
        socket.off('new-message');
        socket.off('user-typing');
        socket.off('user-stop-typing');
        socket.off('user-status-changed');
        socket.off('message-error');
      };
    }
  }, [socket, user, currentRoom, loadRooms]);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Load messages when currentRoom changes
  useEffect(() => {
    if (currentRoom && socket) {
      socket.emit('join-room', currentRoom._id);
      loadMessages(currentRoom._id);
    }
  }, [currentRoom, socket]);

  const loadMessages = async (roomId) => {
    try {
      const response = await axios.get(`${apiUrl}/api/rooms/${roomId}/messages`, {
        withCredentials: true
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleRoomSelect = (room) => {
    if (currentRoom) {
      socket.emit('leave-room', currentRoom._id);
    }
    setCurrentRoom(room);
    // Room joining and message loading will be handled by useEffect
  };

  const handleSendMessage = (content, image = null) => {
    if (socket && currentRoom && (content.trim() || image)) {
      // Create optimistic message for immediate UI update
      const optimisticMessage = {
        _id: `temp-${Date.now()}`,
        content: content.trim(),
        user: {
          _id: user._id,
          name: user.name,
          avatar: user.avatar
        },
        room: currentRoom._id,
        image,
        messageType: image ? 'image' : 'text',
        createdAt: new Date().toISOString(),
        isOptimistic: true
      };

      // Add message to UI immediately
      setMessages(prev => [...prev, optimisticMessage]);

      socket.emit('send-message', {
        content: content.trim(),
        roomId: currentRoom._id,
        userId: user._id,
        image
      });
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      const response = await axios.post(`${apiUrl}/api/rooms/${roomId}/join`, {}, {
        withCredentials: true
      });
      
      // Reload rooms to get updated member status
      await loadRooms();
      
      // If this is the current room, reload messages
      if (currentRoom && currentRoom._id === roomId) {
        loadMessages(roomId);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room: ' + (error.response?.data?.error || 'Unknown error'));
      return null;
    }
  };

  const handleLeaveRoom = async (roomId) => {
    try {
      const response = await axios.post(`${apiUrl}/api/rooms/${roomId}/leave`, {}, {
        withCredentials: true
      });
      
      // Check if room was deleted
      if (response.data.roomDeleted) {
        // Room was deleted, so reload rooms to remove it from the list
        await loadRooms();
        
        // If this was the current room, clear it and switch to another joined room
        if (currentRoom && currentRoom._id === roomId) {
          setMessages([]);
          socket.emit('leave-room', roomId);
          
          // Find another room the user has joined
          const updatedRooms = await axios.get(`${apiUrl}/api/rooms`, {
            withCredentials: true
          });
          const joinedRoom = updatedRooms.data.find(r => 
            r.members?.some(m => m._id === user._id)
          );
          
          setCurrentRoom(joinedRoom || null);
        }
        
        alert('Room was deleted because it had no members.');
      } else {
        // Normal leave - reload rooms to get updated member status
        await loadRooms();
        
        // If this is the current room, clear messages and leave socket room
        if (currentRoom && currentRoom._id === roomId) {
          setMessages([]);
          socket.emit('leave-room', roomId);
          // Switch to another room if available
          const otherRoom = rooms.find(r => r._id !== roomId && r.members.some(m => m._id === user._id));
          if (otherRoom) {
            setCurrentRoom(otherRoom);
          } else {
            setCurrentRoom(null);
          }
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to leave room:', error);
      alert('Failed to leave room: ' + (error.response?.data?.error || 'Unknown error'));
      return null;
    }
  };

  const handleTyping = () => {
    if (socket && currentRoom && user) {
      socket.emit('typing', {
        roomId: currentRoom._id,
        userId: user._id,
        username: user.name
      });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', {
          roomId: currentRoom._id,
          userId: user._id
        });
      }, 3000);
    }
  };

  const handleStopTyping = () => {
    if (socket && currentRoom && user) {
      socket.emit('stop-typing', {
        roomId: currentRoom._id,
        userId: user._id
      });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const playNotificationSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const createRoom = async (roomData) => {
    try {
      const response = await axios.post(`${apiUrl}/api/rooms`, roomData, {
        withCredentials: true
      });
      setRooms(prev => [response.data, ...prev]);
      return response.data;
    } catch (error) {
      console.error('Failed to create room:', error);
      return null;
    }
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg flex flex-col border-r border-gray-200">
        {/* Header */}
        <div className="p-4 border-b bg-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full border-2 border-white/20"
              />
              <div>
                <h2 className="font-semibold">{user.name}</h2>
                <p className="text-sm opacity-75">Online</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-white hover:text-red-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Room List */}
        <RoomList
          rooms={rooms}
          currentRoom={currentRoom}
          currentUser={user}
          onRoomSelect={handleRoomSelect}
          onCreateRoom={createRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={handleLeaveRoom}
        />

        {/* Online Users */}
        <UserList onlineUsers={onlineUsers} />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800">{currentRoom.name}</h3>
              {currentRoom.description && (
                <p className="text-sm text-gray-600">{currentRoom.description}</p>
              )}
            </div>

            {/* Messages */}
            <MessageList
              messages={messages}
              currentUser={user}
              typingUsers={typingUsers}
            />

            {/* Message Input */}
            <MessageInput
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              onStopTyping={handleStopTyping}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 max-w-md">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-xl font-semibold mb-2">Welcome to ChatApp</h3>
              <p className="mb-4">Join a room to start chatting with others!</p>
              <div className="text-sm text-gray-400">
                <p>• Browse available rooms on the left</p>
                <p>• Click "Join" to become a member</p>
                <p>• Start chatting once you've joined</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
