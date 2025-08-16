import React from 'react';

const UserList = ({ onlineUsers }) => {
  return (
    <div className="p-4 border-t bg-gray-50">
      <h4 className="font-semibold text-gray-800 mb-3 text-sm">Online Users</h4>
      {onlineUsers.length > 0 ? (
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {onlineUsers.map((userId) => (
            <div key={userId} className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
              <span className="text-sm text-gray-600 truncate">User {userId.slice(-6)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No users online</p>
      )}
    </div>
  );
};

export default UserList;
