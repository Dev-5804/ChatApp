import React, { useState } from 'react';

const RoomList = ({ rooms, currentRoom, currentUser, onRoomSelect, onCreateRoom, onJoinRoom, onLeaveRoom }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter rooms based on search query
  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      const roomData = {
        name: newRoomName.trim(),
        description: newRoomDescription.trim()
      };
      
      const newRoom = await onCreateRoom(roomData);
      if (newRoom) {
        setNewRoomName('');
        setNewRoomDescription('');
        setShowCreateForm(false);
        onRoomSelect(newRoom);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Chat Rooms</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Create Room"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Create Room Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateRoom} className="mb-4 p-3 bg-gray-50 rounded-lg">
            <input
              type="text"
              placeholder="Room name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full mb-2 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={newRoomDescription}
              onChange={(e) => setNewRoomDescription(e.target.value)}
              className="w-full mb-2 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="2"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Room List */}
        <div className="space-y-2">
          {filteredRooms.map((room) => {
            const isJoined = room.members?.some(member => member._id === currentUser?._id);
            const canSelect = isJoined;
            
            return (
              <div
                key={room._id}
                className={`p-3 rounded-lg transition-colors ${
                  currentRoom?._id === room._id && isJoined
                    ? 'bg-blue-100 border-l-4 border-blue-600'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div 
                    className={`flex-1 min-w-0 ${canSelect ? 'cursor-pointer' : ''}`}
                    onClick={() => canSelect && onRoomSelect(room)}
                  >
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 truncate">{room.name}</h4>
                      {isJoined && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Joined
                        </span>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-sm text-gray-600 truncate mt-1">{room.description}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {room.members?.length || 0} {room.members?.length === 1 ? 'member' : 'members'}
                    </div>
                  </div>
                  
                  <div className="ml-2 flex-shrink-0">
                    {isJoined ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLeaveRoom(room._id);
                        }}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        title="Leave Room"
                      >
                        Leave
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onJoinRoom(room._id);
                        }}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        title="Join Room"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* No results message */}
        {searchQuery && filteredRooms.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="mt-2">No rooms found</p>
            <p className="text-sm">Try searching with different keywords</p>
          </div>
        )}

        {/* No rooms at all */}
        {!searchQuery && rooms.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>No rooms available</p>
            <p className="text-sm">Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomList;
