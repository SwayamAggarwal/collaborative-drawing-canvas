class CanvasManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    this.tool = 'brush';
    this.color = '#000000';
    this.brushSize = 5;
    this.isDrawing = false;
    this.currentPath = [];
    this.lastPoint = null;
    
    this.setupCanvas();
    this.setupDrawingContext();
  }

  setupCanvas() {
    const resizeCanvas = () => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      
      this.ctx.scale(dpr, dpr);
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      
      this.setupDrawingContext();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  setupDrawingContext() {
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  getCanvasCoordinates(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  startPath(x, y) {
    this.isDrawing = true;
    this.currentPath = [];
    this.lastPoint = { x, y };
    
    this.currentPath.push({
      x, y,
      color: this.color,
      size: this.brushSize,
      tool: this.tool
    });
  }

  continuePath(x, y) {
    if (!this.isDrawing || !this.lastPoint) return;

    const distance = Math.sqrt(
      Math.pow(x - this.lastPoint.x, 2) + 
      Math.pow(y - this.lastPoint.y, 2)
    );

    if (distance < 1) return;

    this.drawSegment(this.lastPoint.x, this.lastPoint.y, x, y);
    
    this.currentPath.push({
      x, y,
      color: this.color,
      size: this.brushSize,
      tool: this.tool
    });

    this.lastPoint = { x, y };
  }

  endPath() {
    if (!this.isDrawing) return null;
    
    this.isDrawing = false;
    const path = [...this.currentPath];
    this.currentPath = [];
    this.lastPoint = null;
    
    return path;
  }

  drawSegment(x1, y1, x2, y2, color = this.color, size = this.brushSize, tool = this.tool) {
    this.ctx.save();
    
    if (tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = color;
    }
    
    this.ctx.lineWidth = size;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  drawPath(pathData) {
    if (!pathData || pathData.length < 2) return;

    for (let i = 1; i < pathData.length; i++) {
      const prev = pathData[i - 1];
      const curr = pathData[i];
      
      this.drawSegment(
        prev.x, prev.y,
        curr.x, curr.y,
        curr.color,
        curr.size,
        curr.tool
      );
    }
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  redrawFromHistory(operations) {
    this.clearCanvas();
    
    operations.forEach(operation => {
      if (operation.type === 'stroke' && operation.path) {
        this.drawPath(operation.path);
      }
    });
  }

  setTool(tool) {
    this.tool = tool;
  }

  setColor(color) {
    this.color = color;
  }

  setBrushSize(size) {
    this.brushSize = size;
  }

  getImageData() {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  putImageData(imageData) {
    this.ctx.putImageData(imageData, 0, 0);
  }
}