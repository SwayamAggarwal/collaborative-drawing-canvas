const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const RoomManager = require('./rooms');
const DrawingStateManager = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 3000;

// IMPORTANT: This line serves the client files
app.use(express.static(path.join(__dirname, '../client')));

const roomManager = new RoomManager();
const stateManager = new DrawingStateManager();

io.on('connection', (socket) => {
  console.log(`New connection established: ${socket.id}`);
  
  let currentUser = null;
  let currentRoom = 'default';

  socket.on('user:join', (userData) => {
    currentUser = {
      id: userData.id || uuidv4(),
      name: userData.name || `User${Math.floor(Math.random() * 1000)}`,
      color: userData.color || generateRandomColor(),
      socketId: socket.id
    };

    socket.join(currentRoom);
    roomManager.addUserToRoom(currentRoom, currentUser);

    socket.emit('user:registered', {
      user: currentUser,
      users: roomManager.getRoomUsers(currentRoom),
      canvasState: stateManager.getFullState(currentRoom)
    });

    socket.to(currentRoom).emit('user:joined', {
      user: currentUser,
      users: roomManager.getRoomUsers(currentRoom)
    });

    console.log(`User ${currentUser.name} joined room ${currentRoom}`);
  });

  socket.on('draw:start', (data) => {
    if (!currentUser) return;

    const drawingEvent = {
      ...data,
      userId: currentUser.id,
      timestamp: Date.now(),
      eventId: uuidv4()
    };

    stateManager.addDrawingEvent(currentRoom, drawingEvent);
    
    socket.to(currentRoom).emit('draw:start', drawingEvent);
  });

  socket.on('draw:move', (data) => {
    if (!currentUser) return;

    const drawingEvent = {
      ...data,
      userId: currentUser.id,
      timestamp: Date.now()
    };

    socket.to(currentRoom).emit('draw:move', drawingEvent);
  });

  socket.on('draw:end', (data) => {
    if (!currentUser) return;

    const strokeData = {
      type: 'stroke',
      path: data.path,
      color: data.color,
      size: data.size,
      tool: data.tool,
      userId: currentUser.id,
      timestamp: Date.now(),
      operationId: uuidv4()
    };

    stateManager.addOperation(currentRoom, strokeData);
    
    socket.to(currentRoom).emit('draw:end', strokeData);
  });

  socket.on('cursor:move', (data) => {
    if (!currentUser) return;

    socket.to(currentRoom).emit('cursor:update', {
      userId: currentUser.id,
      x: data.x,
      y: data.y,
      color: currentUser.color
    });
  });

  socket.on('operation:undo', () => {
    if (!currentUser) return;

    const result = stateManager.undo(currentRoom);
    
    if (result.success) {
      io.to(currentRoom).emit('operation:undone', {
        operationId: result.operationId,
        newIndex: result.newIndex,
        userId: currentUser.id
      });
    }
  });

  socket.on('operation:redo', () => {
    if (!currentUser) return;

    const result = stateManager.redo(currentRoom);
    
    if (result.success) {
      io.to(currentRoom).emit('operation:redone', {
        operation: result.operation,
        newIndex: result.newIndex,
        userId: currentUser.id
      });
    }
  });

  socket.on('canvas:clear', () => {
    if (!currentUser) return;

    stateManager.clearCanvas(currentRoom);
    
    io.to(currentRoom).emit('canvas:cleared', {
      userId: currentUser.id,
      timestamp: Date.now()
    });
  });

  socket.on('state:request', () => {
    socket.emit('state:update', {
      canvasState: stateManager.getFullState(currentRoom),
      users: roomManager.getRoomUsers(currentRoom)
    });
  });

  socket.on('disconnect', () => {
    if (currentUser) {
      roomManager.removeUserFromRoom(currentRoom, currentUser.id);
      
      io.to(currentRoom).emit('user:left', {
        userId: currentUser.id,
        users: roomManager.getRoomUsers(currentRoom)
      });

      console.log(`User ${currentUser.name} disconnected from room ${currentRoom}`);
    }
  });
});

function generateRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in multiple browser tabs to test`);
});