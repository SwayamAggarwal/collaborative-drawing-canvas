# Real-Time Collaborative Drawing Canvas

A multi-user drawing application built with vanilla JavaScript, HTML Canvas API, and WebSockets that enables real-time synchronization across multiple users.

## Features

- Drawing Tools: Brush and eraser with adjustable sizes
- Color Palette: Pre-defined colors plus custom color picker
- Real-time Synchronization: See other users drawing in real-time
- User Cursors: Visual indicators showing where other users are drawing
- Global Undo/Redo: Operations synchronized across all connected users
- User Management: Display active users with color-coded indicators
- Canvas Persistence: New users see the current canvas state upon joining

## Setup Instructions

### Prerequisites
- Node.js v14 or higher
- npm or yarn

### Installation

1. Clone or download the project files

2. Install dependencies:
npm install

3. Start the server:
npm start

4. Open your browser and navigate to:
http://localhost:3000

### Testing with Multiple Users

To test the collaborative features:

1. Open the application in multiple browser windows or tabs
2. You can also open it on different devices on the same network using your local IP
3. Each window/tab will connect as a different user
4. Draw in one window and watch it appear in real-time in the others

Testing Checklist:
- Draw simultaneously in multiple windows
- Test undo/redo from different users
- Move cursor and verify it shows in other windows
- Clear canvas from one window and verify it clears for all
- Close one window and verify the user is removed from the list

## Project Structure

collaborative-canvas/
├── client/
│   ├── index.html
│   ├── style.css
│   ├── canvas.js
│   ├── websocket.js
│   └── main.js
├── server/
│   ├── server.js
│   ├── rooms.js
│   └── drawing-state.js
├── package.json
├── README.md
└── ARCHITECTURE.md

## Usage

### Drawing
- Select the brush tool and choose a color
- Click and drag on the canvas to draw
- Adjust brush size using the slider
- Switch to eraser to remove strokes

### Collaboration
- All connected users see drawings in real-time
- User cursors are visible as colored dots
- The user list shows who's currently online

### Undo/Redo
- Click Undo to reverse the last operation globally
- Click Redo to reapply an undone operation
- These operations affect all users

### Clear Canvas
- Click Clear Canvas to remove all drawings
- This action affects all connected users
- A confirmation dialog prevents accidental clears

## Known Limitations

1. Canvas History Size: The operation history is stored in memory and can grow large with extended use.

2. Network Latency: Drawing appears instantly locally but may have slight delays for remote users depending on network conditions.

3. Conflict Resolution: When multiple users draw in the same area, the last operation wins.

4. Scalability: The current implementation stores all room state in server memory.

5. Canvas Size: Canvas dimensions are fixed based on viewport.

6. Browser Compatibility: Optimized for modern browsers. IE not supported.

## Performance Considerations

- Mouse move events are throttled to 50ms to reduce network traffic
- Canvas uses high-DPI scaling for crisp rendering on retina displays
- Drawing operations use efficient path rendering instead of pixel manipulation
- WebSocket messages are kept minimal to reduce bandwidth

## Time Spent

- Planning and Architecture: 2 hours
- Canvas Implementation: 3 hours
- WebSocket Integration: 2.5 hours
- UI/UX Development: 2 hours
- State Management and Undo/Redo: 3 hours
- Testing and Debugging: 2 hours
- Documentation: 1.5 hours
- Total: 16 hours

## Future Enhancements

- Add shapes rectangle circle line
- Implement layers
- Add text tool
- Export canvas as image
- Save and load sessions
- Add authentication
- Implement rooms for separate drawing sessions
- Add chat functionality
- Mobile touch support improvements

## License

MIT License - Feel free to use this project for learning and development purposes.