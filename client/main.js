class CollaborativeDrawingApp {
  constructor() {
    this.canvas = null;
    this.wsManager = null;
    this.users = [];
    this.remoteCursors = new Map();
    this.operationHistory = [];
    this.currentHistoryIndex = -1;
    this.cursorThrottle = null;
    
    this.init();
  }

  async init() {
    this.initializeCanvas();
    this.initializeWebSocket();
    this.setupUIControls();
    this.setupEventListeners();
    
    try {
      await this.wsManager.connect();
      console.log('Application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize:', error);
      alert('Failed to connect to server. Please refresh the page.');
    }
  }

  initializeCanvas() {
    const canvasElement = document.getElementById('drawingCanvas');
    this.canvas = new CanvasManager(canvasElement);
  }

  initializeWebSocket() {
    this.wsManager = new WebSocketManager();
    
    this.wsManager.on('userRegistered', (data) => {
      this.handleUserRegistered(data);
    });

    this.wsManager.on('userJoined', (data) => {
      this.handleUserJoined(data);
    });

    this.wsManager.on('userLeft', (data) => {
      this.handleUserLeft(data);
    });

    this.wsManager.on('drawEnd', (data) => {
      this.handleRemoteDrawing(data);
    });

    this.wsManager.on('cursorUpdate', (data) => {
      this.handleRemoteCursor(data);
    });

    this.wsManager.on('operationUndone', (data) => {
      this.handleUndo(data);
    });

    this.wsManager.on('operationRedone', (data) => {
      this.handleRedo(data);
    });

    this.wsManager.on('canvasCleared', (data) => {
      this.handleCanvasCleared(data);
    });
  }

  setupUIControls() {
    const colors = [
      '#000000', '#FFFFFF', '#FF6B6B', '#4ECDC4',
      '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E2', '#96CEB4', '#FFEAA7'
    ];

    const colorPalette = document.getElementById('colorPalette');
    colors.forEach(color => {
      const colorBtn = document.createElement('button');
      colorBtn.className = 'color-option';
      colorBtn.style.backgroundColor = color;
      colorBtn.dataset.color = color;
      
      if (color === '#000000') {
        colorBtn.classList.add('active');
      }
      
      colorBtn.addEventListener('click', () => {
        this.selectColor(color);
      });
      
      colorPalette.appendChild(colorBtn);
    });

    const brushSizeSlider = document.getElementById('brushSize');
    const brushSizeValue = document.getElementById('brushSizeValue');
    const brushPreview = document.getElementById('brushPreview');

    brushSizeSlider.addEventListener('input', (e) => {
      const size = parseInt(e.target.value);
      this.canvas.setBrushSize(size);
      brushSizeValue.textContent = size;
      brushPreview.style.width = size + 'px';
      brushPreview.style.height = size + 'px';
    });

    brushPreview.style.width = '5px';
    brushPreview.style.height = '5px';
  }

  setupEventListeners() {
    const canvasElement = document.getElementById('drawingCanvas');

    canvasElement.addEventListener('mousedown', (e) => {
      this.handleMouseDown(e);
    });

    canvasElement.addEventListener('mousemove', (e) => {
      this.handleMouseMove(e);
    });

    canvasElement.addEventListener('mouseup', (e) => {
      this.handleMouseUp(e);
    });

    canvasElement.addEventListener('mouseleave', (e) => {
      this.handleMouseUp(e);
    });

    document.getElementById('brushTool').addEventListener('click', () => {
      this.selectTool('brush');
    });

    document.getElementById('eraserTool').addEventListener('click', () => {
      this.selectTool('eraser');
    });

    document.getElementById('undoBtn').addEventListener('click', () => {
      this.performUndo();
    });

    document.getElementById('redoBtn').addEventListener('click', () => {
      this.performRedo();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
      this.clearCanvas();
    });

    document.getElementById('customColor').addEventListener('input', (e) => {
      this.selectColor(e.target.value);
    });
  }

  handleMouseDown(e) {
    const coords = this.canvas.getCanvasCoordinates(e.clientX, e.clientY);
    this.canvas.startPath(coords.x, coords.y);
    this.wsManager.sendDrawStart(coords.x, coords.y);
  }

  handleMouseMove(e) {
    const coords = this.canvas.getCanvasCoordinates(e.clientX, e.clientY);
    
    if (this.canvas.isDrawing) {
      this.canvas.continuePath(coords.x, coords.y);
      this.wsManager.sendDrawMove(coords.x, coords.y);
    }

    if (!this.cursorThrottle) {
      this.wsManager.sendCursorMove(coords.x, coords.y);
      this.cursorThrottle = setTimeout(() => {
        this.cursorThrottle = null;
      }, 50);
    }
  }

  handleMouseUp(e) {
    const pathData = this.canvas.endPath();
    
    if (pathData && pathData.length > 0) {
      const operation = {
        type: 'stroke',
        path: pathData,
        color: this.canvas.color,
        size: this.canvas.brushSize,
        tool: this.canvas.tool,
        timestamp: Date.now()
      };

      this.addToHistory(operation);
      
      this.wsManager.sendDrawEnd(
        pathData,
        this.canvas.color,
        this.canvas.brushSize,
        this.canvas.tool
      );
    }
  }

  selectTool(tool) {
    this.canvas.setTool(tool);
    
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
  }

  selectColor(color) {
    this.canvas.setColor(color);
    
    document.querySelectorAll('.color-option').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const colorBtn = document.querySelector(`[data-color="${color}"]`);
    if (colorBtn) {
      colorBtn.classList.add('active');
    }
  }

  addToHistory(operation) {
    this.operationHistory = this.operationHistory.slice(0, this.currentHistoryIndex + 1);
    this.operationHistory.push(operation);
    this.currentHistoryIndex = this.operationHistory.length - 1;
    this.updateUndoRedoButtons();
  }

  performUndo() {
    if (this.currentHistoryIndex < 0) return;
    
    this.currentHistoryIndex--;
    this.canvas.redrawFromHistory(
      this.operationHistory.slice(0, this.currentHistoryIndex + 1)
    );
    
    this.wsManager.sendUndo();
    this.updateUndoRedoButtons();
  }

  performRedo() {
    if (this.currentHistoryIndex >= this.operationHistory.length - 1) return;
    
    this.currentHistoryIndex++;
    this.canvas.redrawFromHistory(
      this.operationHistory.slice(0, this.currentHistoryIndex + 1)
    );
    
    this.wsManager.sendRedo();
    this.updateUndoRedoButtons();
  }

  updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    undoBtn.disabled = this.currentHistoryIndex < 0;
    redoBtn.disabled = this.currentHistoryIndex >= this.operationHistory.length - 1;
  }

  clearCanvas() {
    if (confirm('Are you sure you want to clear the canvas? This will affect all users.')) {
      this.canvas.clearCanvas();
      this.operationHistory = [];
      this.currentHistoryIndex = -1;
      this.wsManager.sendClearCanvas();
      this.updateUndoRedoButtons();
    }
  }

  handleUserRegistered(data) {
    this.users = data.users;
    this.updateUsersList();
    
    if (data.canvasState && data.canvasState.operations) {
      this.operationHistory = data.canvasState.operations;
      this.currentHistoryIndex = data.canvasState.currentIndex;
      this.canvas.redrawFromHistory(this.operationHistory);
      this.updateUndoRedoButtons();
    }
  }

  handleUserJoined(data) {
    this.users = data.users;
    this.updateUsersList();
  }

  handleUserLeft(data) {
    this.users = data.users;
    this.updateUsersList();
    this.removeCursor(data.userId);
  }

  handleRemoteDrawing(data) {
    if (data.type === 'stroke' && data.path) {
      this.canvas.drawPath(data.path);
      this.addToHistory(data);
    }
  }

  handleRemoteCursor(data) {
    this.updateCursor(data.userId, data.x, data.y, data.color);
  }

  handleUndo(data) {
    this.currentHistoryIndex = data.newIndex;
    this.canvas.redrawFromHistory(
      this.operationHistory.slice(0, this.currentHistoryIndex + 1)
    );
    this.updateUndoRedoButtons();
  }

  handleRedo(data) {
    if (data.operation) {
      this.currentHistoryIndex = data.newIndex;
      this.canvas.redrawFromHistory(
        this.operationHistory.slice(0, this.currentHistoryIndex + 1)
      );
      this.updateUndoRedoButtons();
    }
  }

  handleCanvasCleared(data) {
    this.canvas.clearCanvas();
    this.operationHistory = [];
    this.currentHistoryIndex = -1;
    this.updateUndoRedoButtons();
  }

  updateUsersList() {
    const usersList = document.getElementById('usersList');
    const userCount = document.getElementById('userCount');
    
    usersList.innerHTML = '';
    userCount.textContent = `${this.users.length} users online`;
    
    const currentUser = this.wsManager.getCurrentUser();
    
    this.users.forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      
      const indicator = document.createElement('div');
      indicator.className = 'user-indicator';
      indicator.style.backgroundColor = user.color;
      
      const name = document.createElement('span');
      name.className = 'user-name';
      name.textContent = user.name;
      
      userItem.appendChild(indicator);
      userItem.appendChild(name);
      
      if (currentUser && user.id === currentUser.id) {
        const label = document.createElement('span');
        label.className = 'user-label';
        label.textContent = '(you)';
        userItem.appendChild(label);
      }
      
      usersList.appendChild(userItem);
    });
  }

  updateCursor(userId, x, y, color) {
    const cursorsLayer = document.getElementById('cursorsLayer');
    
    let cursorElement = this.remoteCursors.get(userId);
    
    if (!cursorElement) {
      cursorElement = document.createElement('div');
      cursorElement.className = 'remote-cursor';
      cursorElement.style.backgroundColor = color;
      cursorsLayer.appendChild(cursorElement);
      this.remoteCursors.set(userId, cursorElement);
    }
    
    cursorElement.style.left = x + 'px';
    cursorElement.style.top = y + 'px';
  }

  removeCursor(userId) {
    const cursorElement = this.remoteCursors.get(userId);
    if (cursorElement) {
      cursorElement.remove();
      this.remoteCursors.delete(userId);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new CollaborativeDrawingApp();
});