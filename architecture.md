# Architecture Documentation

## System Overview

This collaborative drawing application uses a client-server architecture with WebSocket-based real-time communication. The system prioritizes low latency and eventual consistency across all connected clients.

## Data Flow

Client A draws on canvas
Canvas sends coordinates to WebSocket Manager
WebSocket Manager sends data to Server
Server broadcasts to all other clients
Other clients receive data and update their canvas

## WebSocket Protocol

### Client to Server Messages

User Join
Event: user:join
Data: id, name, color

Drawing Start
Event: draw:start
Data: x, y coordinates

Drawing Move
Event: draw:move
Data: x, y coordinates

Drawing End
Event: draw:end
Data: complete path array with color, size, tool

Cursor Movement
Event: cursor:move
Data: x, y coordinates

Operations
Event: operation:undo or operation:redo
Event: canvas:clear

### Server to Client Messages

User Registered
Event: user:registered
Data: user object, all users list, current canvas state

User Joined
Event: user:joined
Data: new user object, updated users list

User Left
Event: user:left
Data: user id, updated users list

Drawing Broadcasts
Event: draw:start, draw:move, draw:end
Data: userId, timestamp, drawing data

Operation Results
Event: operation:undone or operation:redone
Data: operationId, newIndex, userId

Canvas Cleared
Event: canvas:cleared
Data: userId, timestamp

## Undo/Redo Strategy

We use an operation-based approach with server authority for conflict resolution.

### Data Structure

The server maintains an operations array with a currentIndex pointer:

operations: Array of all drawing operations
currentIndex: Points to the last valid operation

Each operation contains:
- type: stroke
- path: Array of points with x, y, color, size, tool
- userId: Who created it
- timestamp: When it was created
- operationId: Unique identifier

### Algorithm

Undo Process:
1. Client sends undo request
2. Server decrements currentIndex
3. Server broadcasts new index to all clients
4. Each client redraws canvas from operations 0 to currentIndex

Redo Process:
1. Client sends redo request
2. Server increments currentIndex
3. Server broadcasts the redone operation
4. Each client applies the operation

### Why This Approach

Pros:
- Simple to implement and debug
- Guaranteed consistency across all clients
- Single source of truth
- No complex conflict resolution needed

Cons:
- Undo from User A can remove User B's work
- Requires central server authority
- History can grow unbounded

### Alternative Considered

Per-user undo stacks where each user has their own history.

Rejected because:
- Complex conflict resolution when operations overlap
- Would require operational transformation or CRDT implementation
- Harder to maintain consistency

## Performance Decisions

### 1. Client-Side Prediction

Decision: Draw immediately on local canvas before server confirmation

Reasoning:
- Eliminates perceived latency
- Users see instant feedback
- Network delays don't affect drawing experience

Implementation:
Draw locally first, then broadcast to server

### 2. Event Batching Strategy

Decision: Send individual points during drawing, batch complete path on stroke end

Reasoning:
- Real-time feel - users see drawing in progress
- Final path sent complete for accurate history
- Balance between bandwidth and responsiveness

Implementation:
- draw:move events sent in real-time throttled to 50ms
- draw:end event contains full path array

### 3. Canvas Rendering Optimization

Decision: Use path-based rendering instead of pixel manipulation

Reasoning:
- Vector operations are faster than pixel operations
- Maintains quality at any zoom level
- Easier to implement undo and redo
- Better performance

### 4. Cursor Position Throttling

Decision: Throttle cursor updates to 50ms intervals

Reasoning:
- Mouse moves generate 100 plus events per second
- Network cannot handle that rate efficiently
- 20 updates per second is smooth enough for cursor tracking

### 5. High-DPI Canvas Scaling

Decision: Scale canvas for device pixel ratio

Reasoning:
- Crisp rendering on retina displays
- Better visual quality
- Modern standard for canvas applications

## Conflict Resolution

### Drawing Conflicts

Scenario: Two users draw in the same area simultaneously

Resolution Strategy: Last-write-wins based on server timestamp

Process:
1. Both users draw locally with instant feedback
2. Both send strokes to server
3. Server timestamps and broadcasts in order received
4. All clients apply operations in server order
5. Later stroke appears on top

Why Not Merge:
- Drawing strokes are discrete operations
- No meaningful way to merge two overlapping paths
- Users expect to see complete strokes not merged results

### Undo Conflicts

Scenario: User A undoes while User B is drawing

Resolution Strategy: Undo affects global history index

Process:
1. User A clicks undo
2. Server decrements history index
3. User B new stroke becomes next operation
4. All clients redraw from new state

Result: User B in-progress drawing is preserved, undo only affects completed operations

### Canvas State Synchronization

Scenario: New user joins mid-session

Resolution Strategy: Server sends complete current state

Process:
1. New user connects
2. Server sends all operations up to currentIndex
3. Client redraws entire canvas from history
4. Client is now synchronized

## State Management

### Client State

Each client maintains:
- Local canvas rendering context
- Operation history synchronized with server
- Current tool color and size settings
- Remote cursor positions map
- Connected users list

### Server State

Server maintains per room:
- Complete operation history array
- Current history index pointer
- Active users in room with metadata
- Last activity timestamp for cleanup

### State Synchronization Flow

On User Join:
Client sends user:join
Server responds with user:registered including full state
Server broadcasts user:joined to others

On Drawing:
Client sends draw:end with complete stroke
Server broadcasts to all other clients

On Undo or Redo:
Client sends operation request
Server broadcasts new index to all clients
All clients redraw from history

## Scalability Considerations

### Current Limitations

1. Memory: All state stored in server RAM
2. Single Server: No horizontal scaling support
3. History Size: Unbounded growth over time

### Production Recommendations

For 100 plus concurrent users:
- Implement Redis for state storage
- Add history compression or pruning
- Implement room-based load balancing
- Add database persistence for recovery

For 1000 plus concurrent users:
- Use Socket.io with Redis adapter for multi-server
- Implement CDN for static assets
- Add geographic load balancing
- Consider event sourcing with snapshotting

## Security Considerations

Current Implementation: Minimal security suitable for demo and learning

Production Requirements:
- Add authentication using JWT tokens
- Implement rate limiting on drawing events
- Validate all client inputs on server
- Add room access controls
- Implement content moderation
- Add CORS restrictions
- Use WSS WebSocket Secure protocol
- Sanitize user inputs
- Add spam prevention

## Testing Strategy

Manual Testing Checklist:
- Multi-user simultaneous drawing
- Undo and redo from different users
- Network disconnect and reconnect scenarios
- Canvas clear across all users
- New user joins mid-session
- Cursor tracking accuracy
- High-frequency drawing stress test

Automated Testing Recommendations:
- Unit tests for CanvasManager drawing logic
- Integration tests for WebSocket message flow
- Load testing with Socket.io benchmark tools
- Visual regression testing for canvas output
- End-to-end tests for user workflows

## Monitoring and Debugging

Recommended Metrics:
- Active connections per room
- Message throughput messages per second
- Operation history size per room
- Average latency from client to broadcast
- Memory usage per room
- WebSocket connection errors

Debug Tools:
- Console logging with levels info warn error
- WebSocket message inspector
- Canvas state snapshot capability
- Performance profiling for canvas operations