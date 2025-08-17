import React, { useEffect, useRef } from 'react';
import { getApiUrl } from '../utils/apiUrl';

const MessageList = ({ messages, currentUser, typingUsers }) => {
  const messagesEndRef = useRef(null);
  const apiUrl = getApiUrl();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const shouldShowDateSeparator = (currentMsg, previousMsg) => {
    if (!previousMsg) return true;
    
    const currentDate = new Date(currentMsg.createdAt).toDateString();
    const previousDate = new Date(previousMsg.createdAt).toDateString();
    
    return currentDate !== previousDate;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      <div className="space-y-4">
        {messages.map((message, index) => {
        const isCurrentUser = message.user._id === currentUser._id;
        const previousMessage = index > 0 ? messages[index - 1] : null;
        const showDateSeparator = shouldShowDateSeparator(message, previousMessage);

        return (
          <div key={message._id}>
            {/* Date Separator */}
            {showDateSeparator && (
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {formatDate(message.createdAt)}
                </div>
              </div>
            )}

            {/* Message */}
            <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-2`}>
              <div className={`flex max-w-xs lg:max-w-md xl:max-w-lg ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                {!isCurrentUser && (
                  <img
                    src={message.user.avatar || '/vite.svg'}
                    alt={message.user.name}
                    className="w-8 h-8 rounded-full mr-3 flex-shrink-0 mt-1"
                  />
                )}
                
                {/* Message Content */}
                <div className={`px-4 py-2 rounded-2xl ${
                  isCurrentUser 
                    ? 'bg-blue-600 text-white rounded-br-md' 
                    : 'bg-white text-gray-800 shadow-sm border rounded-bl-md'
                }`}>
                  {/* Username for other users */}
                  {!isCurrentUser && (
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {message.user.name}
                    </p>
                  )}
                  
                  {/* Message content */}
                  {message.messageType === 'image' ? (
                    <div>
                      {/* Debug info */}
                      <div className="text-xs text-gray-500 mb-1">
                        Image URL: {apiUrl}{message.image?.url}
                      </div>
                      <img
                        src={`${apiUrl}${message.image?.url || ''}`}
                        alt="Shared image"
                        className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity mb-1"
                        onClick={() => window.open(`${apiUrl}${message.image?.url}`, '_blank')}
                        onError={(e) => {
                          console.error('Image failed to load:', `${apiUrl}${message.image?.url}`);
                          console.error('Image object:', message.image);
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'block';
                        }}
                        onLoad={() => console.log('Image loaded successfully:', `${apiUrl}${message.image?.url}`)}
                      />
                      <div style={{display: 'none'}} className="text-red-500 p-2 border border-red-300 rounded bg-red-50">
                        ❌ Failed to load image: {message.image?.originalName || 'Unknown'}
                        <br />
                        URL: {apiUrl}{message.image?.url}
                      </div>
                      {message.content && (
                        <p className="mt-2">{message.content}</p>
                      )}
                    </div>
                  ) : (
                    <p className="break-words">{message.content}</p>
                  )}
                  
                  {/* Timestamp */}
                  <p className={`text-xs mt-1 ${
                    isCurrentUser ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {formatTime(message.createdAt)}
                    {message.isEdited && ' (edited)'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start mb-2">
            <div className="flex items-center space-x-2">
              <div className="bg-gray-200 px-4 py-2 rounded-2xl rounded-bl-md">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {typingUsers.length === 1 
                      ? `${typingUsers[0].username} is typing`
                      : `${typingUsers.length} people are typing`
                    }
                  </span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      
      <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
