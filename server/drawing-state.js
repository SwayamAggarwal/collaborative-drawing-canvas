class DrawingStateManager {
  constructor() {
    this.roomStates = new Map();
  }

  initializeRoom(roomId) {
    if (!this.roomStates.has(roomId)) {
      this.roomStates.set(roomId, {
        operations: [],
        currentIndex: -1,
        activeStrokes: new Map(),
        lastUpdate: Date.now()
      });
    }
    return this.roomStates.get(roomId);
  }

  addOperation(roomId, operation) {
    const state = this.initializeRoom(roomId);
    
    const newOperations = state.operations.slice(0, state.currentIndex + 1);
    newOperations.push(operation);
    
    state.operations = newOperations;
    state.currentIndex = newOperations.length - 1;
    state.lastUpdate = Date.now();

    return operation;
  }

  addDrawingEvent(roomId, event) {
    const state = this.initializeRoom(roomId);
    state.activeStrokes.set(event.eventId, {
      ...event,
      points: []
    });
  }

  undo(roomId) {
    const state = this.roomStates.get(roomId);
    if (!state || state.currentIndex < 0) {
      return { success: false };
    }

    const operation = state.operations[state.currentIndex];
    state.currentIndex--;
    state.lastUpdate = Date.now();

    return {
      success: true,
      operationId: operation.operationId,
      newIndex: state.currentIndex
    };
  }

  redo(roomId) {
    const state = this.roomStates.get(roomId);
    if (!state || state.currentIndex >= state.operations.length - 1) {
      return { success: false };
    }

    state.currentIndex++;
    const operation = state.operations[state.currentIndex];
    state.lastUpdate = Date.now();

    return {
      success: true,
      operation: operation,
      newIndex: state.currentIndex
    };
  }

  clearCanvas(roomId) {
    const state = this.initializeRoom(roomId);
    state.operations = [];
    state.currentIndex = -1;
    state.activeStrokes.clear();
    state.lastUpdate = Date.now();
  }

  getFullState(roomId) {
    const state = this.roomStates.get(roomId);
    if (!state) {
      return {
        operations: [],
        currentIndex: -1
      };
    }

    return {
      operations: state.operations.slice(0, state.currentIndex + 1),
      currentIndex: state.currentIndex
    };
  }

  getOperationsSince(roomId, timestamp) {
    const state = this.roomStates.get(roomId);
    if (!state) return [];

    return state.operations
      .slice(0, state.currentIndex + 1)
      .filter(op => op.timestamp > timestamp);
  }

  getRoomState(roomId) {
    return this.roomStates.get(roomId) || null;
  }

  cleanupOldRooms(maxAge = 3600000) {
    const now = Date.now();
    for (const [roomId, state] of this.roomStates.entries()) {
      if (now - state.lastUpdate > maxAge) {
        this.roomStates.delete(roomId);
      }
    }
  }
}

module.exports = DrawingStateManager;