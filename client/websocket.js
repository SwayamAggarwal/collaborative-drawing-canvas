class WebSocketManager {
  constructor() {
    this.socket = null;
    this.currentUser = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io({
          reconnection: true,
          reconnectionDelay: this.reconnectDelay,
          reconnectionAttempts: this.maxReconnectAttempts
        });

        this.socket.on('connect', () => {
          console.log('Connected to server');
          this.reconnectAttempts = 0;
          this.joinAsUser();
        });

        this.socket.on('user:registered', (data) => {
          this.currentUser = data.user;
          this.emit('userRegistered', data);
          resolve(data);
        });

        this.socket.on('user:joined', (data) => {
          this.emit('userJoined', data);
        });

        this.socket.on('user:left', (data) => {
          this.emit('userLeft', data);
        });

        this.socket.on('draw:start', (data) => {
          this.emit('drawStart', data);
        });

        this.socket.on('draw:move', (data) => {
          this.emit('drawMove', data);
        });

        this.socket.on('draw:end', (data) => {
          this.emit('drawEnd', data);
        });

        this.socket.on('cursor:update', (data) => {
          this.emit('cursorUpdate', data);
        });

        this.socket.on('operation:undone', (data) => {
          this.emit('operationUndone', data);
        });

        this.socket.on('operation:redone', (data) => {
          this.emit('operationRedone', data);
        });

        this.socket.on('canvas:cleared', (data) => {
          this.emit('canvasCleared', data);
        });

        this.socket.on('disconnect', () => {
          console.log('Disconnected from server');
          this.emit('disconnected');
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Failed to connect after multiple attempts'));
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  joinAsUser() {
    const userData = {
      id: this.generateUserId(),
      name: this.generateUserName(),
      color: this.generateUserColor()
    };

    this.socket.emit('user:join', userData);
  }

  sendDrawStart(x, y) {
    if (!this.socket) return;
    
    this.socket.emit('draw:start', { x, y });
  }

  sendDrawMove(x, y) {
    if (!this.socket) return;
    
    this.socket.emit('draw:move', { x, y });
  }

  sendDrawEnd(pathData, color, size, tool) {
    if (!this.socket) return;
    
    this.socket.emit('draw:end', {
      path: pathData,
      color: color,
      size: size,
      tool: tool
    });
  }

  sendCursorMove(x, y) {
    if (!this.socket) return;
    
    this.socket.emit('cursor:move', { x, y });
  }

  sendUndo() {
    if (!this.socket) return;
    this.socket.emit('operation:undo');
  }

  sendRedo() {
    if (!this.socket) return;
    this.socket.emit('operation:redo');
  }

  sendClearCanvas() {
    if (!this.socket) return;
    this.socket.emit('canvas:clear');
  }

  requestState() {
    if (!this.socket) return;
    this.socket.emit('state:request');
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
  }

  generateUserName() {
    const adjectives = ['Swift', 'Bold', 'Bright', 'Creative', 'Dynamic'];
    const nouns = ['Artist', 'Painter', 'Drawer', 'Creator', 'Designer'];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adj} ${noun}`;
  }

  generateUserColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }
}