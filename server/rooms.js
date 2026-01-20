class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  addUserToRoom(roomId, user) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        users: new Map(),
        createdAt: Date.now()
      });
    }

    const room = this.rooms.get(roomId);
    room.users.set(user.id, {
      ...user,
      joinedAt: Date.now()
    });

    return room;
  }

  removeUserFromRoom(roomId, userId) {
    if (!this.rooms.has(roomId)) return false;

    const room = this.rooms.get(roomId);
    const removed = room.users.delete(userId);

    if (room.users.size === 0) {
      this.rooms.delete(roomId);
    }

    return removed;
  }

  getRoomUsers(roomId) {
    if (!this.rooms.has(roomId)) return [];

    const room = this.rooms.get(roomId);
    return Array.from(room.users.values());
  }

  getUserCount(roomId) {
    if (!this.rooms.has(roomId)) return 0;
    return this.rooms.get(roomId).users.size;
  }

  isUserInRoom(roomId, userId) {
    if (!this.rooms.has(roomId)) return false;
    return this.rooms.get(roomId).users.has(userId);
  }

  getRoomInfo(roomId) {
    if (!this.rooms.has(roomId)) return null;

    const room = this.rooms.get(roomId);
    return {
      id: room.id,
      userCount: room.users.size,
      users: Array.from(room.users.values()),
      createdAt: room.createdAt
    };
  }

  getAllRooms() {
    return Array.from(this.rooms.keys());
  }
}

module.exports = RoomManager;